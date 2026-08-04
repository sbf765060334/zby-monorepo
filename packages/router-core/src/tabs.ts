/**
 * 文件职责：管理页签与页面实例，包括创建、排序、固定、收藏、关闭和页面地址订阅。
 *
 * 这里是“页签管家”：createRouterCore 负责决定要去哪里，本文件负责把对应页签和页面
 * 状态维护好，并在关闭时按顺序执行守卫、清理缓存和通知宿主。
 */
import type { StoreApi } from 'zustand/vanilla'

import { enforceKeepAlive, shouldRefreshTouchedAt } from './keepAlive'
import type { RouteRegistry } from './registry'
import {
  areStringArraysEqual,
  sanitizeFavoriteRoutePaths,
  sortTabs,
} from './tabState'
import type {
  RouterAfterTabCloseInfo,
  RouterBeforeCloseHook,
  RouterCloseOptions,
  RouterCoreState,
  RouterHost,
  RouterKeepAliveConfig,
  RouterLocationEventPayload,
  RouterRoute,
  RouterRuntimeOptions,
} from './types'
import { buildUrl } from './urlState'
import type { RouterUrlCache } from './urlState'

export interface CloseTabTransaction {
  /** 守卫完成后、提交删除前再次确认外部条件仍成立。 */
  canCommit?: () => boolean
  /** 删除成功后由组合命令接管导航；返回值会成为 closeTab 的最终结果。 */
  navigateAfterClose?: () => boolean
}

/** 创建页签控制器所需的同一 RouterCore 实例内部依赖。 */
interface CreateRouterTabsOptions<Route extends RouterRoute> {
  /** 查询路由、页签 key 和页面身份。 */
  registry: RouteRegistry<Route>
  /** 读写每个页签自己的 URL 片段。 */
  cache: RouterUrlCache
  /** 创建 Core 时固定的页面保留规则。 */
  keepAlive: boolean | RouterKeepAliveConfig<Route>
  /** 始终读取最新 Store 快照。 */
  getState: () => RouterCoreState<Route>
  /** 提交页签和页面领域状态。 */
  setState: StoreApi<RouterCoreState<Route>>['setState']
  /** 获取当前有效导航宿主；卸载后可能为 null。 */
  getHost: () => RouterHost | null
  /** 读取宿主最后确认的完整地址，供晚订阅页面补发。 */
  getLatestLocation: () => RouterLocationEventPayload | null
  /** 每次通知关闭时获取最新回调引用。 */
  getOnTabClose: () => RouterRuntimeOptions['onTabClose'] | null
  /** 固定页签变化后的持久化命令。 */
  persistFixedTabs: (value: readonly string[]) => void
  /** 收藏路由变化后的持久化命令。 */
  persistFavoriteRoutePaths: (value: readonly string[]) => void
}

/** 创建页签、页面缓存、关闭事务和页面订阅控制器。 */
export function createRouterTabs<Route extends RouterRoute>(
  options: CreateRouterTabsOptions<Route>,
) {
  const {
    registry,
    cache,
    keepAlive,
    getState,
    setState,
    getHost,
    getLatestLocation,
    getOnTabClose,
    persistFixedTabs,
    persistFavoriteRoutePaths,
  } = options
  // 每个页签可以有多个关闭守卫，全部返回 true 才能真正关闭。
  const beforeCloseMap = new Map<string, RouterBeforeCloseHook[]>()
  // 一个保留页面实例只需要当前 listener；新订阅会接管旧订阅。
  const pageLocationListenerMap = new Map<
    string,
    (location: RouterLocationEventPayload) => void
  >()
  // 防止用户连续点击关闭时，同一个页签并发执行两套异步守卫和清理事务。
  const closingTabKeys = new Set<string>()

  /** 确保 pathname 对应的页签存在，并按需要创建或刷新页面实例。 */
  function ensureTabState(pathname: string, ensurePage: boolean) {
    const leaf = registry.resolveLeafRoute(pathname, { withinAuth: true })
    const route = leaf?.route
    if (!route || !registry.isPageRoute(route))
      return null
    const tabKey = registry.getTabKey(pathname)
    if (!tabKey)
      return null

    // 所有相关字段在一次 setState 中计算和提交，订阅者不会看到半完成的中间状态。
    setState((previous) => {
      let tabs = previous.tabs
      let pages = previous.pages
      if (!tabs.some((tab) => tab.key === tabKey)) {
        // 新页签先加入，再由 sortTabs 保证固定组始终位于普通组前面。
        tabs = sortTabs(
          tabs.concat({
            key: tabKey,
            label: route.title,
            labelCustomized: false,
          }),
          previous.fixedSet,
        )
      }

      if (ensurePage) {
        // 页签描述和实际页面实例分开；某些导航只需要选中页签，不应创建受限页面。
        const now = Date.now()
        const pageIndex = pages.findIndex((page) => page.key === tabKey)
        if (pageIndex < 0) {
          pages = pages.concat({ key: tabKey, pathname, route, touchedAt: now })
        } else if (
          pages[pageIndex].pathname !== pathname ||
          shouldRefreshTouchedAt(keepAlive)
        ) {
          pages = pages.map((page) =>
            page.key === tabKey
              ? { ...page, pathname, route, touchedAt: now }
              : page,
          )
        }
        // 新页面建立后立即应用 include/exclude 和 LRU，避免缓存短暂超过上限。
        pages = enforceKeepAlive(
          pages,
          tabKey,
          keepAlive,
          previous.fixedSet,
        )
      }

      // Zustand 依赖引用变化通知订阅者；没有领域变化时返回旧对象最省渲染。
      if (
        tabs === previous.tabs &&
        pages === previous.pages &&
        previous.activeTabKey === tabKey &&
        (!ensurePage || previous.activePage === tabKey)
      ) {
        return previous
      }

      return {
        ...previous,
        tabs,
        pages,
        activeTabKey: tabKey,
        ...(ensurePage ? { activePage: tabKey } : {}),
      }
    })

    // 共享动态页签还要记住本次真实 pathname，下一次从页签跳回时才能恢复参数。
    if (tabKey !== pathname && !route.supportMultipleTabs)
      cache.setParamsPath(tabKey, pathname)
    return tabKey
  }

  /** 校验调用方提供的是当前全部页签的合法新顺序，然后一次提交排序。 */
  function reorderTabs(tabKeys: readonly string[]) {
    const state = getState()
    if (!Array.isArray(tabKeys) || tabKeys.length !== state.tabs.length)
      return false

    const tabMap = new Map(state.tabs.map((tab) => [tab.key, tab]))
    const fixedKeySet = new Set(state.fixedSet)
    const seen = new Set<string>()
    let normalTabReached = false

    // 一次遍历同时检查重复、未知 key，以及固定页签不能排在普通页签之后。
    for (const key of tabKeys) {
      if (seen.has(key) || !tabMap.has(key))
        return false
      seen.add(key)

      if (fixedKeySet.has(key)) {
        if (normalTabReached)
          return false
      } else {
        normalTabReached = true
      }
    }

    // 合法但顺序相同时仍返回 true，表示命令被接受，只是不需要发布新状态。
    const currentKeys = state.tabs.map((tab) => tab.key)
    if (areStringArraysEqual(currentKeys, [...tabKeys]))
      return true

    const tabs = tabKeys.map((key) => tabMap.get(key)!)
    const fixedSet = tabKeys.filter((key) => fixedKeySet.has(key))
    const fixedOrderChanged = !areStringArraysEqual(state.fixedSet, fixedSet)

    // 只有固定页签内部顺序变化才需要更新持久化数据，普通页签顺序只属于本次会话。
    if (fixedOrderChanged)
      persistFixedTabs(fixedSet)

    setState({
      tabs,
      ...(fixedOrderChanged ? { fixedSet } : {}),
    })
    return true
  }

  /** 覆盖一个已经打开页签的标题；相同自定义标题不会重复发布状态。 */
  function setTabLabel(key: string, label: string) {
    setState((state) => {
      const hit = state.tabs.find((tab) => tab.key === key)
      if (!hit || (hit.label === label && hit.labelCustomized))
        return state
      return {
        ...state,
        tabs: state.tabs.map((tab) =>
          tab.key === key ? { ...tab, label, labelCustomized: true } : tab,
        ),
      }
    })
  }

  /** 固定或取消固定一个已打开页签，并维护固定组排序与数量上限。 */
  function toggleFixed(tabKey: string) {
    const state = getState()
    if (!state.tabs.some((tab) => tab.key === tabKey))
      return false

    const isFixed = state.fixedSet.includes(tabKey)
    if (!isFixed && state.fixedSet.length >= state.maxFixedTabCount)
      return false
    // fixedSet 同时承担“是否固定”和“固定页签显示顺序”两种信息。
    const fixedSet = isFixed
      ? state.fixedSet.filter((key) => key !== tabKey)
      : state.fixedSet.concat(tabKey)
    persistFixedTabs(fixedSet)
    setState({ fixedSet, tabs: sortTabs(state.tabs, fixedSet) })
    return true
  }

  /** 收藏或取消收藏一个已注册页面，并保存完整有序收藏快照。 */
  function toggleFavoriteRoute(path: string) {
    const state = getState()
    const routeKey = sanitizeFavoriteRoutePaths([path], registry)[0]
    if (!routeKey)
      return false

    // 点击已有项就是取消；新收藏追加到末尾，保持用户操作顺序。
    const favoriteRoutePaths = state.favoriteRoutePaths.includes(routeKey)
      ? state.favoriteRoutePaths.filter((item) => item !== routeKey)
      : state.favoriteRoutePaths.concat(routeKey)
    persistFavoriteRoutePaths(favoriteRoutePaths)
    setState({ favoriteRoutePaths })
    return true
  }

  /** onTabClose 自己报错时只记日志，不能让已完成的页签关闭回滚或产生未处理异常。 */
  function reportTabCloseError(error: unknown) {
    console.error('[RouterCore] onTabClose callback failed.', error)
  }

  /** 在页签及关联资源全部清理后，安全通知最新的 onTabClose 回调。 */
  function notifyTabClose(
    tabKey: string,
    info: RouterAfterTabCloseInfo,
  ) {
    const callback = getOnTabClose()
    if (!callback)
      return

    try {
      // 通知不是关闭事务的一部分：异步结果不等待，失败也只单独报告。
      void Promise.resolve(callback(tabKey, info)).catch(reportTabCloseError)
    } catch (error) {
      reportTabCloseError(error)
    }
  }

  /** 执行关闭守卫、提交删除、清理资源、导航和通知组成的完整页签关闭事务。 */
  async function closeTab(
    tabKey: string,
    closeOptions?: RouterCloseOptions,
    transaction?: CloseTabTransaction,
  ) {
    if (!getState().tabs.some((tab) => tab.key === tabKey))
      return false
    if (closingTabKeys.has(tabKey))
      return false

    closingTabKeys.add(tabKey)
    try {
      if (!closeOptions?.skipBeforeClose) {
        // 多个守卫可以并行询问，但必须全部明确返回 true；undefined 也代表拒绝。
        const hooks = beforeCloseMap.get(tabKey) || []
        const results = await Promise.all(hooks.map((hook) => hook()))
        if (!results.every((result) => result === true))
          return false
      }

      // await 期间页签或宿主可能已变化，因此守卫结束后必须重新读取和校验最新状态。
      const state = getState()
      if (!state.tabs.some((tab) => tab.key === tabKey))
        return false
      if (transaction?.canCommit && !transaction.canCommit())
        return false
      const closedIndex = state.tabs.findIndex((tab) => tab.key === tabKey)
      const nextTabs = state.tabs.filter((tab) => tab.key !== tabKey)
      // 关闭活动页时优先选择左侧相邻页，没有左侧再选原位置右侧页。
      const nextActive =
        state.activeTabKey === tabKey
          ? nextTabs[Math.max(0, closedIndex - 1)] || nextTabs[closedIndex] || null
          : null
      const closedPathname = cache.getParamsPath(tabKey) || tabKey
      const fixedSet = state.fixedSet.includes(tabKey)
        ? state.fixedSet.filter((key) => key !== tabKey)
        : state.fixedSet
      if (!areStringArraysEqual(fixedSet, state.fixedSet))
        persistFixedTabs(fixedSet)

      const pages = state.pages.filter((page) => page.key !== tabKey)
      // 同一共享动态页签可能对应多个真实 pathname 描述，关闭时要一起清掉。
      const descriptions = { ...state.pathnameDescriptionMap }
      Object.keys(descriptions).forEach((pathname) => {
        if (registry.getTabKey(pathname) === tabKey)
          delete descriptions[pathname]
      })
      setState({
        tabs: nextTabs,
        pages,
        fixedSet,
        activeTabKey: nextActive
          ? nextActive.key
          : state.activeTabKey === tabKey
            ? null
            : state.activeTabKey,
        activePage: nextActive
          ? pages.some((page) => page.key === nextActive.key)
            ? nextActive.key
            : null
          : state.activePage === tabKey
            ? null
            : state.activePage,
        pathnameDescriptionMap: descriptions,
      })

      // Store 提交后再清理不可观察资源，确保后续命令不会拿到已经关闭页面的旧能力。
      beforeCloseMap.delete(tabKey)
      pageLocationListenerMap.delete(tabKey)
      cache.clear(tabKey)

      // 组合命令可以接管关闭后的唯一导航；普通关闭则回到相邻页或根路径。
      let result = true
      if (transaction?.navigateAfterClose) {
        result = transaction.navigateAfterClose()
      } else {
        if (nextActive) {
          getHost()?.navigate(
            buildUrl({
              pathname: cache.getParamsPath(nextActive.key) || nextActive.key,
              searchParams: cache.getSearch(nextActive.key),
              hash: cache.getHash(nextActive.key),
            }),
          )
        } else if (getState().activeTabKey === null) {
          getHost()?.navigate('/')
        }
      }

      // 通知放在导航之后，避免回调解绑宿主时阻断本次必要导航。
      notifyTabClose(tabKey, { pathname: closedPathname })
      return result
    } finally {
      // 无论守卫拒绝、抛错还是关闭成功，都必须释放并发锁，允许用户稍后重试。
      closingTabKeys.delete(tabKey)
    }
  }

  /** 给 pathname 所属页签追加一个关闭前守卫；未知路径直接忽略。 */
  function addBeforeCloseHook(
    handler: RouterBeforeCloseHook,
    pathname: string,
  ) {
    const tabKey = registry.getTabKey(pathname)
    if (!tabKey)
      return
    beforeCloseMap.set(
      tabKey,
      (beforeCloseMap.get(tabKey) || []).concat(handler),
    )
  }

  /** 删除指定守卫；未传 handler 时删除该页签全部守卫。 */
  function clearBeforeCloseHook(
    pathname: string,
    handler?: RouterBeforeCloseHook,
  ) {
    const tabKey = registry.getTabKey(pathname)
    if (!tabKey)
      return
    if (!handler) {
      beforeCloseMap.delete(tabKey)
      return
    }
    // 只移除引用完全相同的那个函数，其它页面或组件注册的守卫继续保留。
    const next = (beforeCloseMap.get(tabKey) || []).filter(
      (item) => item !== handler,
    )
    if (next.length)
      beforeCloseMap.set(tabKey, next)
    else
      beforeCloseMap.delete(tabKey)
  }

  /** 注册页面级 location listener，并在它对应当前地址时立即补发一次快照。 */
  function subscribePageLocation(
    tabKey: string,
    listener: (location: RouterLocationEventPayload) => void,
  ) {
    if (!tabKey)
      return () => undefined
    pageLocationListenerMap.set(tabKey, listener)

    // 取消函数只删除自己；如果已有新 listener 接管相同 tabKey，旧清理不会误删新订阅。
    const unsubscribe = () => {
      if (pageLocationListenerMap.get(tabKey) === listener)
        pageLocationListenerMap.delete(tabKey)
    }

    try {
      // 页面可能晚于首次 syncLocation 挂载，立即补发可以避免它永远缺少首个地址。
      const latestLocation = getLatestLocation()
      if (
        latestLocation &&
        registry.getTabKey(latestLocation.pathname) === tabKey
      ) {
        listener(latestLocation)
      }
    } catch (error) {
      // listener 首次执行就报错时撤销注册，避免以后每次地址变化都重复抛错。
      unsubscribe()
      throw error
    }

    return unsubscribe
  }

  /** 把宿主确认的最新地址发送给这个页签当前注册的页面 listener。 */
  function publishPageLocation(
    tabKey: string,
    location: RouterLocationEventPayload,
  ) {
    pageLocationListenerMap.get(tabKey)?.(location)
  }

  /** 在 403、404 或空目录场景清空活动页面，并按 KeepAlive 规则收缩页面缓存。 */
  function setInactiveState(activeTabKey: string | null) {
    setState((state) => {
      const pages = enforceKeepAlive(
        state.pages,
        null,
        keepAlive,
        state.fixedSet,
      )

      // 选中身份、活动页面和缓存数组都没变时复用原状态，避免无意义渲染。
      if (
        state.activeTabKey === activeTabKey &&
        state.activePage === null &&
        pages === state.pages
      ) {
        return state
      }

      return {
        ...state,
        activeTabKey,
        activePage: null,
        pages,
      }
    })
  }

  // 只暴露 createRouterCore 真正需要的页签命令，三个内部 Map/Set 保持实例私有。
  return {
    ensureTabState,
    reorderTabs,
    setTabLabel,
    toggleFixed,
    toggleFavoriteRoute,
    closeTab,
    addBeforeCloseHook,
    clearBeforeCloseHook,
    subscribePageLocation,
    publishPageLocation,
    setInactiveState,
  }
}

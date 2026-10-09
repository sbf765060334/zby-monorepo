/**
 * 文件职责：管理页签与页面实例，包括创建、排序、固定、收藏、关闭和页面地址订阅。
 *
 * 这里是“页签管家”：createRouterCore 负责决定要去哪里，本文件负责把对应页签和页面
 * 状态维护好，并在关闭时按顺序执行守卫、清理缓存和通知宿主。
 */
import type { StoreApi } from 'zustand/vanilla'

import { enforceKeepAlive, shouldRefreshTouchedAt } from './keepAlive'
import { normalizeRoutePath, type RouteRegistry } from './registry'
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
  RouterTitle,
} from './types'
import { buildUrl, parseUrl } from './urlState'
import type { RouterUrlCache } from './urlState'

export interface CloseTabTransaction {
  /** 守卫完成后、提交删除前再次确认外部条件仍成立。只在这次关闭真的要导航时检查。 */
  canCommit?: () => boolean
  /**
   * 为 true 时，navigation 只用于守卫结束后仍是活动页的情况。
   * 后台页当场删除，且这次导航不能作为关掉最后一个页签的理由。
   */
  onlyWhenActive?: boolean
  /** 组合命令提供的最终导航。默认后台页也会先跳再删；onlyWhenActive 时后台页不跳。 */
  navigation?: {
    getPathname: () => string
    execute: () => boolean
  }
  /** 批量关闭等待异步守卫时通知 UI。同步返回的守卫不调用。 */
  onAsyncGuard?: (waiting: boolean) => void
}

/** 关页确认把尾斜杠和百分号编码当成同一页，避免 /dashboard 和 /dashboard/ 对不上。 */
function areClosePathnamesEqual(left: string, right: string) {
  return canonicalizeClosePathname(left) === canonicalizeClosePathname(right)
}

function canonicalizeClosePathname(pathname: string) {
  let decoded = pathname
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    decoded = pathname
  }
  return normalizeRoutePath(decoded)
}

/** 创建页签控制器所需的同一 RouterCore 实例内部依赖。 */
interface CreateRouterTabsOptions<Route extends RouterRoute> {
  /** 查询路由、页签 key 和页面身份。 */
  registry: RouteRegistry<Route>
  /** 读写每个页签自己的 URL 片段。 */
  cache: RouterUrlCache
  /** 创建 Core 时固定的页面保留规则。 */
  keepAlive: boolean | RouterKeepAliveConfig<Route>
  /** 创建 Core 时固定的标题描述符相等判断。 */
  isSameTitle: (left: RouterTitle, right: RouterTitle) => boolean
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
  /**
   * 有守卫的后台页要先变成活动页，用户才能看到确认框。
   * 已经是活动页或同步宿主时直接返回 boolean，避免多让出一次微任务。
   * 返回 false 表示没能打开这一页，调用方应留下页签。
   */
  activateTabForClose: (tabKey: string) => boolean | Promise<boolean>
}

/** 创建页签、页面缓存、关闭事务和页面订阅控制器。 */
export function createRouterTabs<Route extends RouterRoute>(
  options: CreateRouterTabsOptions<Route>,
) {
  const {
    registry,
    cache,
    keepAlive,
    isSameTitle,
    getState,
    setState,
    getHost,
    getLatestLocation,
    getOnTabClose,
    persistFixedTabs,
    persistFavoriteRoutePaths,
    activateTabForClose,
  } = options
  // 每个页签可以有多个关闭守卫，全部返回 true 才能真正关闭。
  const beforeCloseMap = new Map<string, RouterBeforeCloseHook[]>()
  // 一个保留页面实例只需要当前 listener；新订阅会接管旧订阅。
  const pageLocationListenerMap = new Map<
    string,
    (location: RouterLocationEventPayload) => void
  >()
  // 防止同一页签并发关闭。活动页在宿主确认已经离开被关页之前都占着这把锁。
  const closingTabKeys = new Set<string>()
  // 这一次关闭自己的 Promise。对外第二次 closeTab 仍立即返回 false；
  // 批量关闭可以等它结束，而不是把它当成守卫拒绝。
  const inFlightTabCloses = new Map<string, Promise<boolean>>()
  // 活动页签必须等宿主确认已经离开被关页后再删除，避免导航被阻止时丢失当前页面。
  let pendingTabClose: {
    tabKey: string
    closedPathname: string
  } | null = null
  // 批量关闭在 closeTab 返回后仍要等活动页签真正删除，避免下一次关闭提前删掉落点。
  const pendingCloseWaiters = new Map<string, Array<() => void>>()

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
  function setTabLabel(key: string, label: RouterTitle) {
    setState((state) => {
      const hit = state.tabs.find((tab) => tab.key === key)
      // 描述符可能是每次新建的对象，必须用创建期注入的规则比较，不能只比引用。
      if (!hit || (isSameTitle(hit.label, label) && hit.labelCustomized))
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

  /**
   * 请求宿主切换关闭后的地址；真正删除活动页签由 location 确认流程完成。
   *
   * 必须 replace：关页不是新开一条历史，否则后退会回到已关地址并把页签救活。
   */
  function requestCloseNavigation(target: string) {
    const host = getHost()
    if (!host)
      return false

    // 同步宿主可能在 navigate 内立即回传 location，因此状态必须先进入 navigating。
    setState((state) => state.navigationStatus === 'navigating'
      ? state
      : { ...state, navigationStatus: 'navigating' })
    host.navigate(target, { replace: true })
    return true
  }

  /** 删除页签及其页面、持久化身份和私有资源，但不猜测下一个活动页面。 */
  function commitTabClose(tabKey: string) {
    const state = getState()
    if (!state.tabs.some((tab) => tab.key === tabKey))
      return false

    const fixedSet = state.fixedSet.includes(tabKey)
      ? state.fixedSet.filter((key) => key !== tabKey)
      : state.fixedSet
    if (!areStringArraysEqual(fixedSet, state.fixedSet))
      persistFixedTabs(fixedSet)

    const descriptions = { ...state.pathnameDescriptionMap }
    Object.keys(descriptions).forEach((pathname) => {
      if (registry.getTabKey(pathname) === tabKey)
        delete descriptions[pathname]
    })
    setState({
      tabs: state.tabs.filter((tab) => tab.key !== tabKey),
      pages: state.pages.filter((page) => page.key !== tabKey),
      fixedSet,
      activeTabKey: state.activeTabKey === tabKey ? null : state.activeTabKey,
      activePage: state.activePage === tabKey ? null : state.activePage,
      pathnameDescriptionMap: descriptions,
    })

    beforeCloseMap.delete(tabKey)
    pageLocationListenerMap.delete(tabKey)
    cache.clear(tabKey)
    return true
  }

  /**
   * 宿主已经离开被关页时提交删除，并返回延后通知。
   *
   * 还停在被关页（含尾斜杠、编码差异）时继续等待。已经离开则提交，不要求回传
   * 字符串精确等于当初记下的下一页。
   */
  function confirmPendingTabClose(pathname: string) {
    const pending = pendingTabClose
    if (!pending || areClosePathnamesEqual(pathname, pending.closedPathname))
      return

    pendingTabClose = null
    closingTabKeys.delete(pending.tabKey)
    const committed = commitTabClose(pending.tabKey)
    // 通知批量关闭可以继续。await 要等这次 syncLocation 返回后才恢复，落点会先被激活。
    settlePendingCloseWaiters(pending.tabKey)
    if (!committed)
      return

    // Core 完成目标 pathname 的页面激活和 location 发布后再执行关闭通知。
    return () => notifyTabClose(pending.tabKey, { pathname: pending.closedPathname })
  }

  /**
   * 活动页还在等宿主确认时返回等待；已经结束或本来就没有 pending 时同步返回，
   * 调用方据此决定要不要让出一次微任务。
   */
  function waitForPendingTabClose(tabKey: string): Promise<void> | void {
    if (pendingTabClose?.tabKey !== tabKey)
      return
    return new Promise<void>((resolve) => {
      const waiters = pendingCloseWaiters.get(tabKey) || []
      waiters.push(resolve)
      pendingCloseWaiters.set(tabKey, waiters)
    })
  }

  function settlePendingCloseWaiters(tabKey: string) {
    const waiters = pendingCloseWaiters.get(tabKey)
    if (!waiters)
      return
    pendingCloseWaiters.delete(tabKey)
    waiters.forEach((resolve) => resolve())
  }

  /** 批量关闭用来等待已经开始的那一次关闭；没有进行中的关闭时返回 undefined。 */
  function getInFlightTabClose(tabKey: string) {
    return inFlightTabCloses.get(tabKey)
  }

  /** 活动页已经发出跳转、还在等宿主确认时，返回那一页。 */
  function getPendingCloseTabKey() {
    return pendingTabClose?.tabKey
  }

  function hasBeforeCloseHook(tabKey: string) {
    return Boolean(beforeCloseMap.get(tabKey)?.length)
  }

  /** 执行关闭守卫；活动页签以宿主 location 确认为删除事务的提交点。 */
  async function closeTab(
    tabKey: string,
    closeOptions?: RouterCloseOptions,
    transaction?: CloseTabTransaction,
  ) {
    // 组合命令的最终新地址关完还会打开另一页。onlyWhenActive 只在该页仍是活动页时
    // 导航，后台页删掉后没有替补，不能用来放行最后一个页签。
    const opensAnotherPage = Boolean(transaction?.navigation) && !transaction?.onlyWhenActive
    if (!getState().tabs.some((tab) => tab.key === tabKey))
      return false
    // 第二次关闭不加入进行中的 Promise，避免改写已经发出的跳转。
    if (closingTabKeys.has(tabKey))
      return false
    // 只剩一个页签时关掉会变成空工作区，或经 / 再被默认页打开。普通 closeTab 直接拒绝。
    if (getState().tabs.length === 1 && !opensAnotherPage)
      return false

    const attempt = runCloseAttempt(tabKey, closeOptions, transaction, opensAnotherPage)
    inFlightTabCloses.set(tabKey, attempt)
    try {
      return await attempt
    } finally {
      if (inFlightTabCloses.get(tabKey) === attempt)
        inFlightTabCloses.delete(tabKey)
    }
  }

  async function runCloseAttempt(
    tabKey: string,
    closeOptions: RouterCloseOptions | undefined,
    transaction: CloseTabTransaction | undefined,
    opensAnotherPage: boolean,
  ) {
    closingTabKeys.add(tabKey)
    try {
      // 组合关闭自己带着最终地址，不先把后台页打开。普通关闭和批量关闭要先让用户看到这一页。
      const shouldPresent = hasBeforeCloseHook(tabKey)
        && getState().activeTabKey !== tabKey
        && (!transaction?.navigation || transaction.onlyWhenActive)
      if (shouldPresent) {
        const presented = activateTabForClose(tabKey)
        if (!(typeof presented === 'boolean' ? presented : await presented))
          return false
      }

      if (!closeOptions?.skipBeforeClose) {
        // 按注册顺序一个一个问；不是 true 就停，后面的守卫不会再跑。
        const hooks = [...(beforeCloseMap.get(tabKey) || [])]
        for (const hook of hooks) {
          const result = hook()
          if (typeof result === 'object' && result !== null && typeof result.then === 'function') {
            transaction?.onAsyncGuard?.(true)
            try {
              if ((await result) !== true)
                return false
            } finally {
              transaction?.onAsyncGuard?.(false)
            }
            continue
          }
          if (result !== true)
            return false
        }
      }

      // await 期间页签或宿主可能已变化，因此守卫结束后必须重新读取和校验最新状态。
      const state = getState()
      if (!state.tabs.some((tab) => tab.key === tabKey))
        return false
      if (state.tabs.length === 1 && !opensAnotherPage)
        return false
      const isActive = state.activeTabKey === tabKey
      // onlyWhenActive 要等守卫结束后再看。等待期间变成活动页就改走 anchor，
      // 仍然是后台页则忽略这次导航，当场删除。
      const useTransactionNavigation = Boolean(transaction?.navigation)
        && (isActive || !transaction?.onlyWhenActive)
      if (useTransactionNavigation && transaction?.canCommit && !transaction.canCommit())
        return false
      const closedIndex = state.tabs.findIndex((tab) => tab.key === tabKey)
      const nextTabs = state.tabs.filter((tab) => tab.key !== tabKey)
      // 关闭活动页时优先选择左侧相邻页，没有左侧再选原位置右侧页。
      const nextActive = isActive
        ? nextTabs[Math.max(0, closedIndex - 1)] || nextTabs[closedIndex] || null
        : null
      const closedPathname = cache.getParamsPath(tabKey) || tabKey
      const providedNavigation = useTransactionNavigation ? transaction?.navigation : undefined
      const navigation = providedNavigation ?? (nextActive
        ? (() => {
            const target = buildUrl({
              pathname: cache.getParamsPath(nextActive.key) || nextActive.key,
              searchParams: cache.getSearch(nextActive.key),
              hash: cache.getHash(nextActive.key),
            })
            return {
              getPathname: () => parseUrl(target).pathname,
              execute: () => requestCloseNavigation(target),
            }
          })()
        : isActive
          ? {
              getPathname: () => '/',
              execute: () => requestCloseNavigation('/'),
            }
          : undefined)

      if (state.activeTabKey === tabKey) {
        if (!navigation)
          return false

        const confirmationPathname = navigation.getPathname()
        // 相同 pathname 不会产生新的宿主确认，不能把页面留在永久 pending 状态。
        if (areClosePathnamesEqual(confirmationPathname, closedPathname))
          return false

        const pending = { tabKey, closedPathname }
        pendingTabClose = pending
        try {
          const result = navigation.execute()
          if (!result && pendingTabClose === pending)
            pendingTabClose = null
          return result
        } catch (error) {
          if (pendingTabClose === pending)
            pendingTabClose = null
          setState((current) => current.navigationStatus === 'settled'
            ? current
            : { ...current, navigationStatus: 'settled' })
          throw error
        }
      }

      // 后台页当场关即可。还要跳新地址时先跳，成功了再删，避免跳失败页签已经没了。
      if (!navigation) {
        if (!commitTabClose(tabKey))
          return false
        notifyTabClose(tabKey, { pathname: closedPathname })
        return true
      }

      try {
        const result = navigation.execute()
        if (!result)
          return false
      } catch (error) {
        setState((current) => current.navigationStatus === 'settled'
          ? current
          : { ...current, navigationStatus: 'settled' })
        throw error
      }

      // 同步宿主可能在 execute 里已经把同一共享页签激活成当前页，不能再删。
      if (getState().activeTabKey === tabKey)
        return true

      if (!commitTabClose(tabKey))
        return false
      notifyTabClose(tabKey, { pathname: closedPathname })
      return true
    } finally {
      // 仍在等宿主确认时不要放锁，避免连点或交错的 closeThisTabOpenNewOne 盖掉 pending。
      if (pendingTabClose?.tabKey !== tabKey)
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

    // 页面可能晚于首次 syncLocation 挂载，立即补发可以避免它永远缺少首个地址。
    const latestLocation = getLatestLocation()
    if (
      latestLocation &&
      registry.getTabKey(latestLocation.pathname) === tabKey
    ) {
      publishPageLocation(tabKey, latestLocation)
    }

    return unsubscribe
  }

  /** 把宿主确认的最新地址发送给这个页签当前注册的页面 listener。 */
  function publishPageLocation(
    tabKey: string,
    location: RouterLocationEventPayload,
  ) {
    const listener = pageLocationListenerMap.get(tabKey)
    if (!listener)
      return
    try {
      listener(location)
    } catch (error) {
      // listener 不是提交点：抛错只记日志，不能打断 syncLocation 后的关页通知。
      console.error('[RouterCore] page location listener failed.', error)
    }
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

  // 只暴露 createRouterCore 真正需要的页签命令，内部 Map/Set 保持实例私有。
  return {
    confirmPendingTabClose,
    getInFlightTabClose,
    getPendingCloseTabKey,
    hasBeforeCloseHook,
    ensureTabState,
    reorderTabs,
    setTabLabel,
    toggleFixed,
    toggleFavoriteRoute,
    closeTab,
    waitForPendingTabClose,
    addBeforeCloseHook,
    clearBeforeCloseHook,
    subscribePageLocation,
    publishPageLocation,
    setInactiveState,
  }
}

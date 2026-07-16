import { buildUrlForTab } from './url'
import { enforceKeepAliveLimit, shouldRefreshPageTouchedAt } from './keepAlive'
import {
  persistCollection,
  persistFixedTabs,
} from './persistence'
import type { ProLayoutStoreRuntime } from './runtime'
import { sortTabs } from './tabModel'
import type {
  GetProLayoutStoreState,
  ProLayoutTab,
  SetProLayoutStoreState,
} from './types'
import type { ProLayoutCloseOptions } from '../interface'

/**
 * 确保 pathname 对应的页签和页面状态已经存在并处于活动状态。
 *
 * 路由解析和 tabKey 计算统一委托给 Registry；普通参数路由共享页签时，真实
 * pathname 额外写入 Cache。页面集合随后应用 KeepAlive 过滤和 LRU 上限。
 */
export function ensureTabStateForPathname(
  set: SetProLayoutStoreState,
  get: GetProLayoutStoreState,
  pathname: string,
  options?: { ensurePage?: boolean },
) {
  const state = get()
  const leaf = state.resolveLeafRoute(pathname)
  if (!leaf?.route)
    return null

  const tabKey = state.getTabKey(pathname)
  if (!tabKey)
    return null

  const ensurePage = options?.ensurePage ?? true

  set((previous) => {
    const next: Partial<ReturnType<GetProLayoutStoreState>> = {}
    let tabs = previous.tabs
    let pages = previous.pages

    if (!tabs.some((tab) => tab.key === tabKey)) {
      tabs = sortTabs(
        tabs.concat({ key: tabKey, label: leaf.route.title }),
        previous.fixedSet,
      )
      next.tabs = tabs
    }

    if (previous.activeTabKey !== tabKey)
      next.activeTabKey = tabKey

    if (ensurePage) {
      const now = Date.now()
      const pageIndex = pages.findIndex((page) => page.key === tabKey)

      if (pageIndex < 0) {
        pages = pages.concat({
          key: tabKey,
          pathname,
          route: leaf.route,
          touchedAt: now,
        })
      } else if (pages[pageIndex].pathname !== pathname) {
        pages = pages.map((page) =>
          page.key === tabKey
            ? { ...page, pathname, route: leaf.route, touchedAt: now }
            : page,
        )
      } else if (shouldRefreshPageTouchedAt(previous.keepAlive)) {
        pages = pages.map((page) =>
          page.key === tabKey && page.touchedAt !== now
            ? { ...page, touchedAt: now }
            : page,
        )
      }

      pages = enforceKeepAliveLimit(
        pages,
        tabKey,
        previous.keepAlive,
        previous.fixedSet,
      )

      if (previous.pages !== pages)
        next.pages = pages
      if (previous.activePage !== tabKey)
        next.activePage = tabKey
    }

    return Object.keys(next).length > 0 ? next : previous
  })

  if (tabKey !== pathname && !leaf.route.supportMultipleTabs)
    get().cache.setParamsPath(tabKey, pathname)

  return tabKey
}

/**
 * 替换页签顺序，并在固定页签组内顺序确实变化时同步持久化。
 *
 * 拖拽组件即使没有产生有效重排，也可能返回一个内容相同的新数组，因此不能只比较
 * 数组引用。普通页签之间的顺序不属于持久化数据；只有固定页签的相对顺序变化时，
 * 才同时更新 fixedSet 并写入 Storage Adapter。
 */
export function setTabs(
  set: SetProLayoutStoreState,
  get: GetProLayoutStoreState,
  runtime: ProLayoutStoreRuntime,
  tabs: ProLayoutTab[],
) {
  const state = get()
  if (areTabsEqual(state.tabs, tabs))
    return

  const orderedFixedTabs = tabs
    .filter((tab) => state.fixedSet.includes(tab.key))
    .map((tab) => tab.key)
  const fixedOrderChanged = !areStringArraysEqual(
    state.fixedSet,
    orderedFixedTabs,
  )

  if (fixedOrderChanged)
    persistFixedTabs(set, get, runtime, orderedFixedTabs)

  set({
    tabs,
    ...(fixedOrderChanged ? { fixedSet: orderedFixedTabs } : {}),
  })
}

/** 收藏或取消收藏路由，并保持参考实现的成功提示。 */
export function toggleCollection(
  set: SetProLayoutStoreState,
  get: GetProLayoutStoreState,
  runtime: ProLayoutStoreRuntime,
  path: string,
) {
  const state = get()
  const isCollected = state.collectionSet.includes(path)
  const next = isCollected
    ? state.collectionSet.filter((item) => item !== path)
    : state.collectionSet.concat(path)

  persistCollection(set, get, runtime, next)
  set({ collectionSet: next })
  state.messageApi?.success?.(
    isCollected
      ? state.intl.getMessage('proLayout.uncollectSuccess', '取消收藏成功')
      : state.intl.getMessage('proLayout.collectSuccess', '收藏成功'),
  )
}

/** 固定或取消固定页签，并执行最大固定数量限制。 */
export function toggleFixed(
  set: SetProLayoutStoreState,
  get: GetProLayoutStoreState,
  runtime: ProLayoutStoreRuntime,
  path: string,
) {
  const state = get()
  const isFixed = state.fixedSet.includes(path)

  if (!isFixed && state.fixedSet.length >= state.maxFixedTabCount) {
    state.messageApi?.open?.({
      type: 'info',
      content: state.intl.getMessage(
        'proLayout.maxFixedTabs',
        '最多钉住{{count}}个标签，请先取消一个钉住标签',
        { count: state.maxFixedTabCount },
      ),
    })
    return
  }

  const next = isFixed
    ? state.fixedSet.filter((item) => item !== path)
    : state.fixedSet.concat(path)

  persistFixedTabs(set, get, runtime, next)
  set({ fixedSet: next, tabs: sortTabs(state.tabs, next) })
  state.messageApi?.success?.(
    isFixed
      ? state.intl.getMessage('proLayout.unfixedSuccess', '已取消页签固定')
      : state.intl.getMessage('proLayout.fixedSuccess', '页签固定成功'),
  )
}

/**
 * 关闭页签并清理其页面、URL Cache、事件发射器和关闭前 Hook。
 *
 * Hook 完成后会重新检查页签是否仍存在，避免两个并发关闭操作重复清理和重复触发
 * afterTabClose。固定页签允许沿用现有关闭交互，但关闭时会同步取消固定并持久化，
 * 防止隐藏 key 继续占用固定数量或在下次挂载时重新出现。
 */
export async function closeTab(
  set: SetProLayoutStoreState,
  get: GetProLayoutStoreState,
  runtime: ProLayoutStoreRuntime,
  tabKey: string,
  options?: ProLayoutCloseOptions,
) {
  const initialState = get()
  if (!initialState.tabs.some((tab) => tab.key === tabKey))
    return false

  if (!options?.skipBeforeClose) {
    const hooks = runtime.beforeTabCloseMap.get(tabKey) || []
    if (hooks.length > 0) {
      const results = await Promise.all(hooks.map((hook) => hook()))
      if (!results.every((result) => result === true))
        return false
    }
  }

  // 等待异步 Hook 期间另一个关闭操作可能已经完成，必须基于最新状态再次确认。
  const state = get()
  if (!state.tabs.some((tab) => tab.key === tabKey))
    return false

  const closedIndex = state.tabs.findIndex((tab) => tab.key === tabKey)
  const nextTabs = state.tabs.filter((tab) => tab.key !== tabKey)
  const nextActive =
    state.activeTabKey === tabKey
      ? nextTabs[Math.max(0, closedIndex - 1)] || nextTabs[closedIndex] || null
      : null
  const closedPathname = state.cache.getParamsPathByTabKey(tabKey) || tabKey
  const wasFixed = state.fixedSet.includes(tabKey)
  const nextFixedSet = wasFixed
    ? state.fixedSet.filter((key) => key !== tabKey)
    : state.fixedSet

  if (wasFixed)
    persistFixedTabs(set, get, runtime, nextFixedSet)

  set((previous) => {
    const pathnameDescriptionMap = { ...previous.pathnameDescriptionMap }
    delete pathnameDescriptionMap[closedPathname]

    return {
      tabs: nextTabs,
      pages: previous.pages.filter((page) => page.key !== tabKey),
      fixedSet: nextFixedSet,
      activeTabKey: nextActive
        ? nextActive.key
        : previous.activeTabKey === tabKey
          ? null
          : previous.activeTabKey,
      activePage: nextActive
        ? nextActive.key
        : previous.activePage === tabKey
          ? null
          : previous.activePage,
      pathnameDescriptionMap,
    }
  })

  const latest = get()
  runtime.beforeTabCloseMap.delete(tabKey)
  runtime.pageLocationEmitterMap.delete(tabKey)
  latest.cache.clearTab(tabKey)
  latest.afterTabClose?.(tabKey, { pathname: closedPathname })

  if (nextActive) {
    const path = latest.cache.getParamsPathByTabKey(nextActive.key) || nextActive.key
    latest.navigate?.(
      buildUrlForTab({
        pathname: path,
        searchParams: latest.cache.getSearchParamsForTabKey(nextActive.key),
        hash: latest.cache.getHashForTabKey(nextActive.key),
      }),
    )
  } else if (latest.activeTabKey === null) {
    latest.navigate?.('/')
  }

  return true
}

/** 比较页签领域数据，过滤只因调用方创建新数组或新对象产生的无效更新。 */
function areTabsEqual(left: ProLayoutTab[], right: ProLayoutTab[]) {
  return left === right || (
    left.length === right.length &&
    left.every(
      (tab, index) =>
        tab.key === right[index]?.key && tab.label === right[index]?.label,
    )
  )
}

/** 按顺序比较固定页签 key，顺序变化本身就是需要持久化的业务状态。 */
function areStringArraysEqual(left: string[], right: string[]) {
  return left === right || (
    left.length === right.length &&
    left.every((item, index) => item === right[index])
  )
}

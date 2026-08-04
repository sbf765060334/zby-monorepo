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
  canCommit?: () => boolean
  navigateAfterClose?: () => boolean
}

interface CreateRouterTabsOptions<Route extends RouterRoute> {
  registry: RouteRegistry<Route>
  cache: RouterUrlCache
  keepAlive: boolean | RouterKeepAliveConfig<Route>
  getState: () => RouterCoreState<Route>
  setState: StoreApi<RouterCoreState<Route>>['setState']
  getHost: () => RouterHost | null
  getLatestLocation: () => RouterLocationEventPayload | null
  getOnTabClose: () => RouterRuntimeOptions['onTabClose'] | null
  persistFixedTabs: (value: readonly string[]) => void
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
  const beforeCloseMap = new Map<string, RouterBeforeCloseHook[]>()
  const pageLocationListenerMap = new Map<
    string,
    (location: RouterLocationEventPayload) => void
  >()
  const closingTabKeys = new Set<string>()

  function ensureTabState(pathname: string, ensurePage: boolean) {
    const leaf = registry.resolveLeafRoute(pathname, { withinAuth: true })
    const route = leaf?.route
    if (!route || !registry.isPageRoute(route))
      return null
    const tabKey = registry.getTabKey(pathname)
    if (!tabKey)
      return null

    setState((previous) => {
      let tabs = previous.tabs
      let pages = previous.pages
      if (!tabs.some((tab) => tab.key === tabKey)) {
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
        pages = enforceKeepAlive(
          pages,
          tabKey,
          keepAlive,
          previous.fixedSet,
        )
      }

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

    if (tabKey !== pathname && !route.supportMultipleTabs)
      cache.setParamsPath(tabKey, pathname)
    return tabKey
  }

  function reorderTabs(tabKeys: readonly string[]) {
    const state = getState()
    if (!Array.isArray(tabKeys) || tabKeys.length !== state.tabs.length)
      return false

    const tabMap = new Map(state.tabs.map((tab) => [tab.key, tab]))
    const fixedKeySet = new Set(state.fixedSet)
    const seen = new Set<string>()
    let normalTabReached = false

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

    const currentKeys = state.tabs.map((tab) => tab.key)
    if (areStringArraysEqual(currentKeys, [...tabKeys]))
      return true

    const tabs = tabKeys.map((key) => tabMap.get(key)!)
    const fixedSet = tabKeys.filter((key) => fixedKeySet.has(key))
    const fixedOrderChanged = !areStringArraysEqual(state.fixedSet, fixedSet)

    if (fixedOrderChanged)
      persistFixedTabs(fixedSet)

    setState({
      tabs,
      ...(fixedOrderChanged ? { fixedSet } : {}),
    })
    return true
  }

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

  function toggleFixed(tabKey: string) {
    const state = getState()
    if (!state.tabs.some((tab) => tab.key === tabKey))
      return false

    const isFixed = state.fixedSet.includes(tabKey)
    if (!isFixed && state.fixedSet.length >= state.maxFixedTabCount)
      return false
    const fixedSet = isFixed
      ? state.fixedSet.filter((key) => key !== tabKey)
      : state.fixedSet.concat(tabKey)
    persistFixedTabs(fixedSet)
    setState({ fixedSet, tabs: sortTabs(state.tabs, fixedSet) })
    return true
  }

  function toggleFavoriteRoute(path: string) {
    const state = getState()
    const routeKey = sanitizeFavoriteRoutePaths([path], registry)[0]
    if (!routeKey)
      return false

    const favoriteRoutePaths = state.favoriteRoutePaths.includes(routeKey)
      ? state.favoriteRoutePaths.filter((item) => item !== routeKey)
      : state.favoriteRoutePaths.concat(routeKey)
    persistFavoriteRoutePaths(favoriteRoutePaths)
    setState({ favoriteRoutePaths })
    return true
  }

  function reportTabCloseError(error: unknown) {
    console.error('[RouterCore] onTabClose callback failed.', error)
  }

  function notifyTabClose(
    tabKey: string,
    info: RouterAfterTabCloseInfo,
  ) {
    const callback = getOnTabClose()
    if (!callback)
      return

    try {
      void Promise.resolve(callback(tabKey, info)).catch(reportTabCloseError)
    } catch (error) {
      reportTabCloseError(error)
    }
  }

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
        const hooks = beforeCloseMap.get(tabKey) || []
        const results = await Promise.all(hooks.map((hook) => hook()))
        if (!results.every((result) => result === true))
          return false
      }

      const state = getState()
      if (!state.tabs.some((tab) => tab.key === tabKey))
        return false
      if (transaction?.canCommit && !transaction.canCommit())
        return false
      const closedIndex = state.tabs.findIndex((tab) => tab.key === tabKey)
      const nextTabs = state.tabs.filter((tab) => tab.key !== tabKey)
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

      beforeCloseMap.delete(tabKey)
      pageLocationListenerMap.delete(tabKey)
      cache.clear(tabKey)

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

      notifyTabClose(tabKey, { pathname: closedPathname })
      return result
    } finally {
      closingTabKeys.delete(tabKey)
    }
  }

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
    const next = (beforeCloseMap.get(tabKey) || []).filter(
      (item) => item !== handler,
    )
    if (next.length)
      beforeCloseMap.set(tabKey, next)
    else
      beforeCloseMap.delete(tabKey)
  }

  function subscribePageLocation(
    tabKey: string,
    listener: (location: RouterLocationEventPayload) => void,
  ) {
    if (!tabKey)
      return () => undefined
    pageLocationListenerMap.set(tabKey, listener)

    const unsubscribe = () => {
      if (pageLocationListenerMap.get(tabKey) === listener)
        pageLocationListenerMap.delete(tabKey)
    }

    try {
      const latestLocation = getLatestLocation()
      if (
        latestLocation &&
        registry.getTabKey(latestLocation.pathname) === tabKey
      ) {
        listener(latestLocation)
      }
    } catch (error) {
      unsubscribe()
      throw error
    }

    return unsubscribe
  }

  function publishPageLocation(
    tabKey: string,
    location: RouterLocationEventPayload,
  ) {
    pageLocationListenerMap.get(tabKey)?.(location)
  }

  function setInactiveState(activeTabKey: string | null) {
    setState((state) => {
      const pages = enforceKeepAlive(
        state.pages,
        null,
        keepAlive,
        state.fixedSet,
      )

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

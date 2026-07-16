import { createStore as createZustandStore } from 'zustand/vanilla'

import { enforceKeepAliveLimit } from './keepAlive'
import { createProLayoutInitialState } from './initialState'
import {
  bootstrapByPathname,
  closeThisTabOpenNewOne,
  jumpTo,
  smartNavigate,
  syncByPathname,
} from './navigation'
import {
  createStorageMutationVersions,
  hydrateStorage,
  resolveStorageAdapter,
} from './persistence'
import { ProLayoutCache } from './cache'
import {
  closeTab,
  persistCacheParamsPathMap,
  setTabs,
  toggleCollection,
  toggleFixed,
} from './tabs'
import type {
  CreateProLayoutStoreParams,
  GetProLayoutStoreState,
  ProLayoutExternalDeps,
  ProLayoutStoreState,
  SetProLayoutStoreState,
} from './types'
import type { ProLayoutCurrentRoute, ProLayoutSystemItem } from '../interface'

/**
 * 创建独立、与 React 生命周期解耦的 ProLayout Zustand Store。
 *
 * 创建过程只根据参数生成同步首屏快照；外部存储 hydration 由 Core 挂载后调用
 * hydrateStorage 触发。Store 不直接依赖 antd、React Router 或 Next.js，宿主能力
 * 统一通过 syncExternalDeps 注入。
 */
export function createProLayoutStore(params: CreateProLayoutStoreParams) {
  const initial = createProLayoutInitialState(params)
  const storageAdapter = resolveStorageAdapter(params.storageAdapter)
  const hasInitialStorageState = Boolean(params.initialStorageState)

  return createZustandStore<ProLayoutStoreState>((set, get) => {
    const cache = new ProLayoutCache(
      initial.fixedParamsPathMap,
      (fixedParamsPathMap) =>
        persistCacheParamsPathMap(set, get, fixedParamsPathMap),
    )

    return {
      navigate: null,
      messageApi: null,
      intl: params.intl,
      registry: params.registry,
      storageKey: params.storageKey,
      hasAuth: params.hasAuth,
      maxFixedTabCount: params.maxFixedTabCount,
      keepAlive: params.keepAlive,
      fullRouteMapping: params.registry.fullRouteMapping,
      routeMapping: params.registry.routeMapping,
      routes: params.registry.routes,
      permissionRoutes: params.registry.permissionRoutes,
      onPageDisplay: params.onPageDisplay || null,
      afterTabClose: params.afterTabClose || null,
      renderLogo: params.renderLogo || null,
      systemList: params.systemList || [],
      noBar: params.noBar,
      showBreadcrumb: params.showBreadcrumb,
      headerHeight: params.headerHeight,
      breadcrumbHeight: params.breadcrumbHeight,
      pathnameDescriptionMap: {},
      currentRoutes: initial.currentRoutes,
      currentSelectedPath: initial.currentSelectedPath,
      currentPathname: initial.currentPathname,
      activeTabKey: initial.activeTabKey,
      tabs: initial.tabs,
      pages: initial.pages,
      activePage: initial.activePage,
      collectionSet: initial.collectionSet,
      fixedSet: initial.fixedSet,
      cache,
      storageAdapter,
      storageHydrated: hasInitialStorageState || storageAdapter === false,
      storageLoading: false,
      storageLoadError: undefined,
      storageSourceGeneration: 0,
      storageMutationVersions: createStorageMutationVersions(),
      onStorageLoadError: params.onStorageLoadError || null,
      pageLocationEmitterMap: new Map(),
      beforeTabCloseMap: new Map(),

      hydrateStorage: () => hydrateStorage(set, get),

      registerPageLocationEmitter: (tabKey, emitter) => {
        if (!tabKey || !emitter)
          return () => undefined

        const map = get().pageLocationEmitterMap
        map.set(tabKey, emitter)

        return () => {
          if (map.get(tabKey) === emitter)
            map.delete(tabKey)
        }
      },

      emitPageLocationEvent: (tabKey, payload) => {
        get().pageLocationEmitterMap.get(tabKey)?.emit(payload)
      },

      syncExternalDeps: (data) => syncExternalDeps(set, get, data),

      bootstrapByPathname: (data) => bootstrapByPathname(set, get, data),

      syncByPathname: (pathname) => syncByPathname(set, get, pathname),

      setPathnameDescription: (map) => {
        set((state) => ({
          pathnameDescriptionMap: {
            ...state.pathnameDescriptionMap,
            ...map,
          },
        }))
      },

      setTabLabel: (key, label) => {
        set((state) => {
          const hit = state.tabs.find((tab) => tab.key === key)
          if (!hit || hit.label === label)
            return state

          return {
            tabs: state.tabs.map((tab) =>
              tab.key === key ? { ...tab, label } : tab,
            ),
          }
        })
      },

      setTabs: (tabs) => setTabs(set, get, tabs),

      closeTab: (key, options) => closeTab(set, get, key, options),

      closeThisTabOpenNewOne: (data, options) =>
        closeThisTabOpenNewOne(set, get, data, options),

      addBeforeCloseHook: (handler, pathname) => {
        const tabKey = get().getTabKey(pathname)
        if (!tabKey)
          return

        const map = get().beforeTabCloseMap
        map.set(tabKey, (map.get(tabKey) || []).concat(handler))
      },

      clearBeforeCloseHook: (pathname, handler) => {
        const tabKey = get().getTabKey(pathname)
        if (!tabKey)
          return

        const map = get().beforeTabCloseMap
        if (!handler) {
          map.delete(tabKey)
          return
        }

        const list = map.get(tabKey)
        if (!list)
          return

        const next = list.filter((item) => item !== handler)
        if (next.length > 0)
          map.set(tabKey, next)
        else
          map.delete(tabKey)
      },

      getTabKey: (pathname) => get().registry.getTabKey(pathname),

      jumpTo: (url) => jumpTo(set, get, url),

      smartNavigate: (data) => smartNavigate(get, data),

      resolveLeafRoute: (pathname, withinAuth = false) =>
        get().registry.resolveLeafRoute(pathname, { withinAuth }),

      getCurrentRoutes: (pathname) => get().registry.getCurrentRoutes(pathname),

      toggleCollection: (path) => toggleCollection(set, get, path),

      toggleFixed: (path) => toggleFixed(set, get, path),
    }
  })
}

/**
 * 把 Core 中可能变化的依赖同步进稳定 Store。
 *
 * storageKey/Adapter 被视为一组持久化来源身份。身份变化时递增 generation、重置
 * hydration 标记并立刻加载新来源；旧来源正在执行的异步 load 即使晚到，也会因
 * generation 不一致而被 persistence 模块忽略。
 */
function syncExternalDeps(
  set: SetProLayoutStoreState,
  get: GetProLayoutStoreState,
  data: ProLayoutExternalDeps,
) {
  const previous = get()
  const nextStorageKey =
    'storageKey' in data && data.storageKey !== undefined
      ? data.storageKey
      : previous.storageKey
  const nextStorageAdapter =
    'storageAdapter' in data
      ? resolveStorageAdapter(data.storageAdapter)
      : previous.storageAdapter
  const storageSourceChanged =
    previous.storageKey !== nextStorageKey ||
    previous.storageAdapter !== nextStorageAdapter

  set((state) => {
    const next: Partial<ProLayoutStoreState> = {}

    assignIfChanged(next, state, data, 'navigate', data.navigate ?? null)
    assignIfChanged(next, state, data, 'messageApi', data.messageApi ?? null)
    assignIfChanged(next, state, data, 'intl', data.intl)
    assignIfChanged(next, state, data, 'maxFixedTabCount', data.maxFixedTabCount)
    assignIfChanged(next, state, data, 'headerHeight', data.headerHeight)
    assignIfChanged(next, state, data, 'breadcrumbHeight', data.breadcrumbHeight)
    assignIfChanged(next, state, data, 'currentPathname', data.currentPathname)
    assignIfChanged(next, state, data, 'noBar', data.noBar)
    assignIfChanged(next, state, data, 'showBreadcrumb', data.showBreadcrumb)
    assignIfChanged(next, state, data, 'onPageDisplay', data.onPageDisplay ?? null)
    assignIfChanged(next, state, data, 'afterTabClose', data.afterTabClose ?? null)
    assignIfChanged(next, state, data, 'renderLogo', data.renderLogo ?? null)
    assignIfChanged(
      next,
      state,
      data,
      'onStorageLoadError',
      data.onStorageLoadError ?? null,
    )

    // hasAuth 必须允许从函数显式恢复为 undefined，不能使用忽略 undefined 的通用辅助。
    if ('hasAuth' in data && state.hasAuth !== data.hasAuth)
      next.hasAuth = data.hasAuth

    if ('systemList' in data && !areSystemListsEqual(state.systemList, data.systemList))
      next.systemList = data.systemList || []

    if (
      'currentRoutes' in data &&
      !areCurrentRoutesEqual(state.currentRoutes, data.currentRoutes)
    ) {
      next.currentRoutes = data.currentRoutes || []
    }

    if (
      'currentSelectedPath' in data &&
      !areStringArraysEqual(state.currentSelectedPath, data.currentSelectedPath)
    ) {
      next.currentSelectedPath = data.currentSelectedPath || []
    }

    if ('registry' in data && data.registry && state.registry !== data.registry) {
      next.registry = data.registry
      next.fullRouteMapping = data.registry.fullRouteMapping
      next.routeMapping = data.registry.routeMapping
      next.routes = data.registry.routes
      next.permissionRoutes = data.registry.permissionRoutes
    }

    if ('keepAlive' in data && data.keepAlive !== undefined && state.keepAlive !== data.keepAlive) {
      next.keepAlive = data.keepAlive
      next.pages = enforceKeepAliveLimit(
        state.pages,
        state.activePage,
        data.keepAlive,
        state.fixedSet,
      )
    }

    if (storageSourceChanged) {
      next.storageKey = nextStorageKey
      next.storageAdapter = nextStorageAdapter
      next.storageHydrated = nextStorageAdapter === false
      next.storageLoading = false
      next.storageLoadError = undefined
      next.storageSourceGeneration = state.storageSourceGeneration + 1
      next.storageMutationVersions = createStorageMutationVersions()
    }

    return Object.keys(next).length > 0 ? next : state
  })

  if (!storageSourceChanged)
    return

  const latest = get()
  // 新来源不继承旧来源的参数映射，只保留当前活动动态页签已经确认的真实 pathname。
  latest.cache.hydrateFixedParamsPathMap(getActiveParamsPathOverlay(latest))

  if (latest.storageAdapter !== false)
    void latest.hydrateStorage()
}

/** 计算当前活动动态页签在切换持久化来源时必须保留的真实 pathname。 */
function getActiveParamsPathOverlay(state: ProLayoutStoreState) {
  const activeKey = state.activePage || state.activeTabKey
  const activePage = activeKey
    ? state.pages.find((page) => page.key === activeKey)
    : undefined
  const pathname = activePage?.pathname || state.currentPathname
  if (!pathname)
    return {}

  const leaf = state.registry.resolveLeafRoute(pathname)
  const tabKey = state.registry.getTabKey(pathname)
  if (!leaf || !tabKey || tabKey === pathname || leaf.route.supportMultipleTabs)
    return {}

  return { [tabKey]: pathname }
}

/** 仅当 data 明确包含字段且值不是 undefined 时同步普通标量依赖。 */
function assignIfChanged<Key extends keyof ProLayoutStoreState>(
  next: Partial<ProLayoutStoreState>,
  state: ProLayoutStoreState,
  data: ProLayoutExternalDeps,
  key: Key,
  value: ProLayoutStoreState[Key] | undefined,
) {
  if (!(key in data) || value === undefined)
    return
  if (state[key] !== value)
    next[key] = value
}

/** 按顺序比较字符串数组，避免外部每次创建新数组导致无意义 Store 更新。 */
function areStringArraysEqual(left: string[] = [], right: string[] = []) {
  return left === right || (
    left.length === right.length &&
    left.every((item, index) => item === right[index])
  )
}

/** 只比较 Store/菜单真正消费的路由层级字段。 */
function areCurrentRoutesEqual(
  left: ProLayoutCurrentRoute[] = [],
  right: ProLayoutCurrentRoute[] = [],
) {
  return left === right || (
    left.length === right.length &&
    left.every(
      (item, index) =>
        item.realPath === right[index]?.realPath &&
        item.route.path === right[index]?.route.path,
    )
  )
}

/** 比较系统切换入口的可见字段，避免只因数组引用变化触发订阅者刷新。 */
function areSystemListsEqual(
  left: ProLayoutSystemItem[] = [],
  right: ProLayoutSystemItem[] = [],
) {
  return left === right || (
    left.length === right.length &&
    left.every((item, index) => {
      const other = right[index]
      return (
        item.systemName === other?.systemName &&
        item.name === other.name &&
        item.description === other.description &&
        item.logo === other.logo &&
        item.url === other.url &&
        Boolean(item.active) === Boolean(other.active)
      )
    })
  )
}

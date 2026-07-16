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
  hydrateStorage,
  persistFixedParamsPathMap,
  resolveStorageAdapter,
} from './persistence'
import {
  createProLayoutStoreRuntime,
  resetStorageRuntime,
} from './runtime'
import { ProLayoutCache } from './cache'
import {
  closeTab,
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
  // 首屏数据必须在创建 Zustand 之前一次性算完，避免订阅者先观察到空状态，随后再
  // 收到一轮仅用于初始化的更新；这也让 SSR 和浏览器使用完全相同的同步快照。
  const initial = createProLayoutInitialState(params)
  const storageAdapter = resolveStorageAdapter(params.storageAdapter)
  // 调用方显式注入 initialStorageState 时，它就是本次挂载的 hydration 结果；纯内存
  // 模式同样不需要异步加载。其余情况由 Core 在挂载后调用 hydrateStorage。
  const hasInitialStorageState = Boolean(params.initialStorageState)
  // runtime 保存异步任务版本和命令处理器，不放入 Zustand，以免这些内部协调动作
  // 触发 React 订阅更新。每次创建 Store 都会得到独立实例，不能跨布局共享。
  const runtime = createProLayoutStoreRuntime()

  return createZustandStore<ProLayoutStoreState>((set, get) => {
    // Cache 在 Store 整个生命周期中保持同一引用。只有动态 pathname 映射需要持久化，
    // 高频变化的 search/hash 留在 Cache 内部，不进入 Zustand 快照。
    const cache = new ProLayoutCache(
      initial.fixedParamsPathMap,
      (fixedParamsPathMap) =>
        persistFixedParamsPathMap(set, get, runtime, fixedParamsPathMap),
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
      onStorageLoadError: params.onStorageLoadError || null,

      // 动作只做薄封装，共享同一组 set/get/runtime，具体领域逻辑放在拆分模块中。
      hydrateStorage: () => hydrateStorage(set, get, runtime),

      registerPageLocationEmitter: (tabKey, emitter) => {
        // 页面尚未得到稳定 tabKey，或卸载过程没有 emitter 时，返回可安全调用的空清理器。
        if (!tabKey || !emitter)
          return () => undefined

        const map = runtime.pageLocationEmitterMap
        map.set(tabKey, emitter)

        return () => {
          // 同一 tabKey 可能已经被新页面实例重新注册。旧实例卸载时只能删除自己注册的
          // emitter，不能误删后来接管该 key 的新 emitter。
          if (map.get(tabKey) === emitter)
            map.delete(tabKey)
        }
      },

      emitPageLocationEvent: (tabKey, payload) => {
        runtime.pageLocationEmitterMap.get(tabKey)?.emit(payload)
      },

      syncExternalDeps: (data) => syncExternalDeps(set, get, runtime, data),

      bootstrapByPathname: (data) => bootstrapByPathname(set, get, data),

      syncByPathname: (pathname) => syncByPathname(set, get, pathname),

      setPathnameDescription: (map) => {
        // 动态页面描述允许分批上报，因此采用增量合并；关闭页签时再按真实 pathname
        // 删除对应项，避免一个页面更新描述时覆盖其它已打开页面。
        set((state) => ({
          pathnameDescriptionMap: {
            ...state.pathnameDescriptionMap,
            ...map,
          },
        }))
      },

      setTabLabel: (key, label) => {
        set((state) => {
          // 不存在的页签不补建，标题相同也不创建新数组，减少 Tabs 订阅者无效刷新。
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

      setTabs: (tabs) => setTabs(set, get, runtime, tabs),

      closeTab: (key, options) => closeTab(set, get, runtime, key, options),

      closeThisTabOpenNewOne: (data, options) =>
        closeThisTabOpenNewOne(set, get, runtime, data, options),

      addBeforeCloseHook: (handler, pathname) => {
        // Hook 以 tabKey 归组，而不是直接使用 pathname：共享动态路由的不同真实地址
        // 属于同一个页签，关闭时必须统一执行该页签下登记的全部 Hook。
        const tabKey = get().getTabKey(pathname)
        if (!tabKey)
          return

        const map = runtime.beforeTabCloseMap
        map.set(tabKey, (map.get(tabKey) || []).concat(handler))
      },

      clearBeforeCloseHook: (pathname, handler) => {
        const tabKey = get().getTabKey(pathname)
        if (!tabKey)
          return

        const map = runtime.beforeTabCloseMap
        if (!handler) {
          // 未指定 handler 表示页面整体清理，直接注销该页签的全部关闭守卫。
          map.delete(tabKey)
          return
        }

        const list = map.get(tabKey)
        if (!list)
          return

        const next = list.filter((item) => item !== handler)
        // Map 中不保留空数组，关闭页签时即可用“无记录”快速跳过 Hook 阶段。
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

      toggleCollection: (path) => toggleCollection(set, get, runtime, path),

      toggleFixed: (path) => toggleFixed(set, get, runtime, path),
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
  runtime: ReturnType<typeof createProLayoutStoreRuntime>,
  data: ProLayoutExternalDeps,
) {
  const previous = get()
  // storageKey 与 Adapter 共同标识一个持久化来源。字段缺席表示沿用旧值；显式传入
  // undefined 的 Adapter 则由 resolveStorageAdapter 恢复为默认 IndexedDB Adapter。
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
  // 切换来源前先从旧 Cache 提取“仍打开页签”所需的动态 pathname。reset 只处理运行时
  // 版本，但后续 hydrate 会替换 Cache，若不保留该覆盖层，用户当前地址可能倒退。
  const openParamsPathOverlay = storageSourceChanged
    ? getOpenParamsPathOverlay(previous)
    : null

  // generation 必须在发起新 load 之前递增，使旧来源的晚到 Promise 立即失效。
  if (storageSourceChanged)
    resetStorageRuntime(runtime)

  set((state) => {
    // 只收集真正变化的字段并一次提交，保证一轮 Core props 同步最多触发一轮订阅更新。
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
      // Registry 是路由树和所有索引的唯一数据源；这里只替换引用，不复制派生映射。
      next.registry = data.registry
    }

    if ('keepAlive' in data && data.keepAlive !== undefined && state.keepAlive !== data.keepAlive) {
      next.keepAlive = data.keepAlive
      // 配置收紧时立即按新规则裁剪已有页面，不能等到下次导航才淘汰超限实例。
      next.pages = enforceKeepAliveLimit(
        state.pages,
        state.activePage,
        data.keepAlive,
        state.fixedSet,
      )
    }

    if (storageSourceChanged) {
      // 新来源从未完成 hydration；纯内存模式没有外部数据可加载，因此直接视为完成。
      next.storageKey = nextStorageKey
      next.storageAdapter = nextStorageAdapter
      next.storageHydrated = nextStorageAdapter === false
      next.storageLoading = false
      next.storageLoadError = undefined
    }

    // Zustand 接受原 state 表示无变化，可避免空对象也触发订阅者重新计算。
    return Object.keys(next).length > 0 ? next : state
  })

  if (!storageSourceChanged)
    return

  const latest = get()
  // false 只关闭外部持久化，当前挂载期间的全部内存地址必须保持可用。
  if (latest.storageAdapter === false)
    return

  // 新来源不继承已经关闭页签的旧映射，但仍打开的共享动态页签必须保留真实地址。
  latest.cache.hydrateFixedParamsPathMap(openParamsPathOverlay || {})
  void latest.hydrateStorage()
}

/**
 * 计算持久化来源切换时仍需保留的共享动态页签真实 pathname。
 *
 * 以 tabs 而不是 pages 为准：KeepAlive 可以淘汰页面实例，但只要页签仍然打开，
 * 用户再次点击时就必须能从注册 pattern 恢复到最后访问的真实地址。
 */
function getOpenParamsPathOverlay(state: ProLayoutStoreState) {
  const currentParamsPathMap = state.cache.getFixedParamsPathMap()

  return state.tabs.reduce<Record<string, string>>((result, tab) => {
    // 只有 Cache 中确实记录过真实 pathname 的共享动态页签才需要进入覆盖层。
    const pathname = currentParamsPathMap[tab.key]
    if (!pathname)
      return result

    const leaf = state.registry.resolveLeafRoute(pathname)
    const resolvedTabKey = state.registry.getTabKey(pathname)
    // Registry 可能已变化：无法解析、tabKey 已不一致，或路由改为多页签模式时，旧映射
    // 都不再符合当前页签语义，不能带入新持久化来源。
    if (
      !leaf ||
      resolvedTabKey !== tab.key ||
      leaf.route.supportMultipleTabs
    ) {
      return result
    }

    result[tab.key] = pathname
    return result
  }, {})
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

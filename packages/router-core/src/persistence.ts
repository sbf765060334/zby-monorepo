/**
 * 文件职责：协调 RouterCore 内存状态与外部存储之间的加载、合并和保存。
 *
 * 最难的地方是加载期间用户仍可能点击固定或收藏。本文件会记录这些本地变化，等旧数
 * 据加载回来后再安全合并，避免“较晚返回的旧数据”覆盖用户刚做的操作。写入一律走
 * Adapter.update(latest => next)，对着磁盘最新值改字段或单个 pathname。
 */
import type { StoreApi } from 'zustand/vanilla'

import type { RouteRegistry } from './registry'
import {
  createIndexedDBRouterStorageAdapter,
  createStorageWriteQueue,
  normalizeRouterStorageState,
} from './storage'
import {
  areStringArraysEqual,
  mergeTabsWithFixedSet,
  sanitizeFavoriteRoutePaths,
  sanitizeFixedTabKeys,
} from './tabState'
import type {
  RouterCoreState,
  RouterRoute,
  RouterRuntimeOptions,
  RouterStorageAdapter,
  RouterStorageErrorInfo,
  RouterStorageState,
} from './types'
import type { RouterUrlCache } from './urlState'

/** 未显式注入 Adapter 时复用同一个懒加载 IndexedDB 实现。 */
const DEFAULT_STORAGE_ADAPTER = createIndexedDBRouterStorageAdapter()
/** 每个 Adapter 实例自己的同 key 队列，裸自定义 Adapter 经 Core 调用时也会串行。 */
const adapterCallQueues = new WeakMap<
  RouterStorageAdapter,
  ReturnType<typeof createStorageWriteQueue>
>()

/** 把创建参数统一成“明确关闭”或“可直接调用的 Adapter”两种内部状态。 */
export function resolveStorageAdapter(
  value: false | RouterStorageAdapter | undefined,
) {
  // false 是明确关闭；传入对象就使用对象；什么都没传才回退到默认 IndexedDB。
  return value === false ? false : value || DEFAULT_STORAGE_ADAPTER
}

/** 创建持久化协调器所需的内部依赖；这些能力全部属于同一个 RouterCore 实例。 */
interface CreateRouterPersistenceOptions<Route extends RouterRoute> {
  /** 固定使用的存储实现，false 表示完全不读写。 */
  storageAdapter: false | RouterStorageAdapter
  /** 用来清洗加载结果中的失效路由。 */
  registry: RouteRegistry<Route>
  /** 保存共享动态页签真实 pathname 的实例私有缓存。 */
  cache: RouterUrlCache
  /** 读取最新 Store 快照，不能捕获创建时的旧状态。 */
  getState: () => RouterCoreState<Route>
  /** 只允许协调器更新持久化相关字段。 */
  setState: StoreApi<RouterCoreState<Route>>['setState']
  /** 每次报错时取得最新 onStorageError 回调。 */
  getOnStorageError: () => RouterRuntimeOptions['onStorageError'] | null
}

/** 持久化协调器向 createRouterCore 和页签模块提供的内部命令。 */
export interface RouterPersistence {
  /** Cache 的单个动态 pathname 变化入口。 */
  handleParamsPathMapChange: (tabKey: string, pathname: string | null) => void
  /** 保存完整固定页签快照。 */
  persistFixedTabs: (value: readonly string[]) => void
  /** 保存完整收藏路由快照。 */
  persistFavoriteRoutePaths: (value: readonly string[]) => void
  /** 加载并合并持久化状态；并发调用复用同一个 Promise。 */
  hydrateStorage: () => Promise<void>
}

/** 创建单个 RouterCore 实例私有的持久化协调器。 */
export function createRouterPersistence<Route extends RouterRoute>(
  options: CreateRouterPersistenceOptions<Route>,
): RouterPersistence {
  const {
    storageAdapter,
    registry,
    cache,
    getState,
    setState,
    getOnStorageError,
  } = options
  let storageHydrationPromise: Promise<void> | null = null
  // 数字版本只关心“加载期间有没有本地改过”，不需要记录每一次具体操作。
  let fixedTabsMutationVersion = 0
  let favoriteRoutesMutationVersion = 0
  // 动态 pathname 需要按 tabKey 保存最后增量，因为加载结果里可能还有其它未触达 key。
  const pendingParamsPathMutations = new Map<string, string | null>()

  /** 根据 hydration 是否完成，决定立即按 key 补丁保存还是暂存一条增量。 */
  function handleParamsPathMapChange(
    tabKey: string,
    pathname: string | null,
  ) {
    if (!getState().storageHydrated) {
      // 相同 tabKey 后来的值覆盖前面的值，最终只需合并用户最后确认的地址。
      pendingParamsPathMutations.set(tabKey, pathname)
      return
    }
    persistParamsPathChange(tabKey, pathname)
  }

  /** 标记固定页签发生本地修改，并按字段后写赢保存。 */
  function persistFixedTabs(value: readonly string[]) {
    const fixedTabs = [...value]
    fixedTabsMutationVersion += 1
    persist((current) => ({ ...current, fixedTabs }))
  }

  /** 在磁盘最新 map 上增删一个动态 pathname。 */
  function persistParamsPathChange(
    tabKey: string,
    pathname: string | null,
  ) {
    persist((current) => ({
      ...current,
      fixedParamsPathMap: patchParamsPathMap(
        current.fixedParamsPathMap,
        tabKey,
        pathname,
      ),
    }))
  }

  /** 标记收藏发生本地修改，并按字段后写赢保存。 */
  function persistFavoriteRoutePaths(value: readonly string[]) {
    const favoriteRoutePaths = [...value]
    favoriteRoutesMutationVersion += 1
    persist((current) => ({ ...current, favoriteRoutePaths }))
  }

  /** onStorageError 自己失败时只记录日志，不能再递归调用同一个错误回调。 */
  function reportStorageErrorCallbackError(error: unknown) {
    console.error('[RouterCore] onStorageError callback failed.', error)
  }

  /** 安全调用最新错误回调，同时隔离同步 throw 和异步 rejection。 */
  function notifyStorageError(
    error: unknown,
    info: RouterStorageErrorInfo,
  ) {
    const callback = getOnStorageError()
    if (!callback)
      return

    try {
      void Promise.resolve(callback(error, info))
        .catch(reportStorageErrorCallbackError)
    } catch (callbackError) {
      reportStorageErrorCallbackError(callbackError)
    }
  }

  /** 在微任务中对着磁盘最新值执行一次 recipe，失败交给错误回调。 */
  function persist(
    recipe: (current: RouterStorageState) => RouterStorageState,
  ) {
    if (storageAdapter === false)
      return
    const storageKey = getState().storageKey
    void Promise.resolve()
      .then(() =>
        runAdapterCall(storageAdapter, storageKey, () =>
          storageAdapter.update(storageKey, (current) =>
            recipe(normalizeRouterStorageState(current)))))
      .catch((error) => {
        notifyStorageError(error, { storageKey, phase: 'update' })
      })
  }

  /** 启动一次 hydration；重复或并发调用不会创建第二个加载任务。 */
  function hydrateStorage() {
    if (storageHydrationPromise)
      return storageHydrationPromise
    if (storageAdapter === false || getState().storageHydrated)
      return Promise.resolve()

    const promise = executeHydration().finally(() => {
      storageHydrationPromise = null
    })
    storageHydrationPromise = promise
    return promise
  }

  /** 执行“读取 → 清洗内存 → 必要时对着磁盘最新值修订”的完整事务。 */
  async function executeHydration() {
    if (storageAdapter === false)
      return
    const storageKey = getState().storageKey
    const fixedTabsVersion = fixedTabsMutationVersion
    const favoriteRoutesVersion = favoriteRoutesMutationVersion
    setState({ storageLoading: true, storageLoadError: undefined })

    try {
      const loaded = normalizeRouterStorageState(
        await runAdapterCall(storageAdapter, storageKey, () =>
          storageAdapter.load(storageKey)),
      )
      const state = getState()
      const fixedUnchanged = fixedTabsVersion === fixedTabsMutationVersion
      const favoritesUnchanged = favoriteRoutesVersion === favoriteRoutesMutationVersion
      const pendingMutations = [...pendingParamsPathMutations]

      const mergedParamsPathMap = { ...loaded.fixedParamsPathMap }
      pendingMutations.forEach(([tabKey, pathname]) => {
        if (pathname)
          mergedParamsPathMap[tabKey] = pathname
        else
          delete mergedParamsPathMap[tabKey]
      })
      const nextFixedSet = fixedUnchanged
        ? sanitizeFixedTabKeys(
            loaded.fixedTabs,
            mergedParamsPathMap,
            registry,
          ).slice(0, state.maxFixedTabCount)
        : state.fixedSet
      const nextFavoriteRoutePaths = favoritesUnchanged
        ? sanitizeFavoriteRoutePaths(loaded.favoriteRoutePaths, registry)
        : state.favoriteRoutePaths

      cache.hydrateParamsPathMap(mergedParamsPathMap)
      pendingParamsPathMutations.clear()
      setState({
        fixedSet: nextFixedSet,
        favoriteRoutePaths: nextFavoriteRoutePaths,
        tabs: fixedUnchanged
          ? mergeTabsWithFixedSet(state.tabs, nextFixedSet, registry)
          : state.tabs,
        storageHydrated: true,
        storageLoading: false,
      })
      persistHydrationRevision({
        pendingMutations,
        loaded,
        nextFixedSet,
        nextFavoriteRoutePaths,
        fixedUnchanged,
        favoritesUnchanged,
      })
    } catch (error) {
      setState({ storageLoading: false, storageLoadError: error })
      notifyStorageError(error, {
        storageKey,
        phase: 'load',
      })
    }
  }

  /**
   * 把 pending pathname 和内存清洗结果写到磁盘最新值上。
   *
   * 不能把刚 load 的那份快照整表 save 回去；recipe 会再读一次当时磁盘。
   */
  function persistHydrationRevision(input: {
    pendingMutations: Array<[string, string | null]>
    loaded: RouterStorageState
    nextFixedSet: readonly string[]
    nextFavoriteRoutePaths: readonly string[]
    fixedUnchanged: boolean
    favoritesUnchanged: boolean
  }) {
    const pendingParams = input.pendingMutations.length > 0
    const dirtyFixed = input.fixedUnchanged &&
      !areStringArraysEqual(input.nextFixedSet, input.loaded.fixedTabs)
    const dirtyFavorites = input.favoritesUnchanged &&
      !areStringArraysEqual(
        input.nextFavoriteRoutePaths,
        input.loaded.favoriteRoutePaths,
      )
    if (!pendingParams && !dirtyFixed && !dirtyFavorites)
      return

    persist((current) => {
      const fixedParamsPathMap = { ...current.fixedParamsPathMap }
      input.pendingMutations.forEach(([tabKey, pathname]) => {
        if (pathname)
          fixedParamsPathMap[tabKey] = pathname
        else
          delete fixedParamsPathMap[tabKey]
      })
      return {
        fixedTabs: input.fixedUnchanged
          ? sanitizeFixedTabKeys(
              current.fixedTabs,
              fixedParamsPathMap,
              registry,
            ).slice(0, getState().maxFixedTabCount)
          : current.fixedTabs,
        fixedParamsPathMap,
        favoriteRoutePaths: input.favoritesUnchanged
          ? sanitizeFavoriteRoutePaths(current.favoriteRoutePaths, registry)
          : current.favoriteRoutePaths,
      }
    })
  }

  return {
    handleParamsPathMapChange,
    persistFixedTabs,
    persistFavoriteRoutePaths,
    hydrateStorage,
  }
}

/** 在完整 map 上增删一个 tabKey，pathname 为 null 时删除。 */
function patchParamsPathMap(
  map: Record<string, string>,
  tabKey: string,
  pathname: string | null,
) {
  const next = { ...map }
  if (pathname)
    next[tabKey] = pathname
  else
    delete next[tabKey]
  return next
}

/** 同一 Adapter 实例、同一 storageKey 的 load/update 经 Core 调用时串行。 */
function runAdapterCall<T>(
  adapter: RouterStorageAdapter,
  storageKey: string,
  action: () => Promise<T>,
): Promise<T> {
  let enqueue = adapterCallQueues.get(adapter)
  if (!enqueue) {
    enqueue = createStorageWriteQueue()
    adapterCallQueues.set(adapter, enqueue)
  }
  let result!: T
  return enqueue(storageKey, async () => {
    result = await action()
  }).then(() => result)
}

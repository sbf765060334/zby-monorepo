/**
 * 文件职责：协调 RouterCore 内存状态与外部存储之间的加载、合并和保存。
 *
 * 最难的地方是加载期间用户仍可能点击固定或收藏。本文件会记录这些本地变化，等旧数
 * 据加载回来后再安全合并，避免“较晚返回的旧数据”覆盖用户刚做的操作。
 */
import type { StoreApi } from 'zustand/vanilla'

import type { RouteRegistry } from './registry'
import { createIndexedDBRouterStorageAdapter, normalizeRouterStorageState } from './storage'
import {
  areStringArraysEqual,
  areStringRecordsEqual,
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
  RouterStorageErrorPhase,
} from './types'
import type { RouterUrlCache } from './urlState'

/** 未显式注入 Adapter 时复用同一个懒加载 IndexedDB 实现。 */
const DEFAULT_STORAGE_ADAPTER = createIndexedDBRouterStorageAdapter()

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
  /** Cache 的动态 pathname 映射变化入口。 */
  handleParamsPathMapChange: (
    value: Record<string, string>,
    tabKey: string,
    pathname: string | null,
  ) => void
  /** 保存完整固定页签快照。 */
  persistFixedTabs: (value: readonly string[]) => void
  /** 保存完整动态 pathname 映射。 */
  persistParamsPathMap: (value: Record<string, string>) => void
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

  /** 根据 hydration 是否完成，决定立即保存完整 Map 还是暂存一条增量。 */
  function handleParamsPathMapChange(
    value: Record<string, string>,
    tabKey: string,
    pathname: string | null,
  ) {
    if (!getState().storageHydrated) {
      // 相同 tabKey 后来的值覆盖前面的值，最终只需合并用户最后确认的地址。
      pendingParamsPathMutations.set(tabKey, pathname)
      return
    }
    persistParamsPathMap(value)
  }

  /** 标记固定页签发生本地修改，并异步保存当前完整快照。 */
  function persistFixedTabs(value: readonly string[]) {
    fixedTabsMutationVersion += 1
    persist('saveFixedTabs', (adapter, storageKey) =>
      adapter.saveFixedTabs(storageKey, [...value]))
  }

  /** 异步保存共享动态页签的完整 pathname 映射。 */
  function persistParamsPathMap(value: Record<string, string>) {
    persist(
      'saveFixedParamsPathMap',
      (adapter, storageKey) =>
        adapter.saveFixedParamsPathMap(storageKey, value),
    )
  }

  /** 标记收藏发生本地修改，并异步保存当前完整快照。 */
  function persistFavoriteRoutePaths(value: readonly string[]) {
    favoriteRoutesMutationVersion += 1
    persist('saveFavoriteRoutePaths', (adapter, storageKey) =>
      adapter.saveFavoriteRoutePaths(storageKey, [...value]))
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
      // Promise.resolve 同时兼容普通返回值和 Promise 返回值。
      void Promise.resolve(callback(error, info))
        .catch(reportStorageErrorCallbackError)
    } catch (callbackError) {
      reportStorageErrorCallbackError(callbackError)
    }
  }

  /** 在微任务中执行一次保存，并把所有失败统一交给错误回调。 */
  function persist(
    phase: Exclude<RouterStorageErrorPhase, 'load'>,
    action: (adapter: RouterStorageAdapter, storageKey: string) => Promise<void>,
  ) {
    if (storageAdapter === false)
      return
    // storageKey 在实例内固定，但仍从 Store 读取，保持唯一事实来源。
    const storageKey = getState().storageKey
    void Promise.resolve().then(() => action(storageAdapter, storageKey)).catch((error) => {
      notifyStorageError(error, { storageKey, phase })
    })
  }

  /** 启动一次 hydration；重复或并发调用不会创建第二个加载任务。 */
  function hydrateStorage() {
    // 已在加载时，后来的调用方必须等待同一个 Promise，而不是提前认为加载完成。
    if (storageHydrationPromise)
      return storageHydrationPromise
    if (storageAdapter === false || getState().storageHydrated)
      return Promise.resolve()

    // 完成后清空任务引用：成功状态会阻止重复加载，失败状态则允许调用方再次尝试。
    const promise = executeHydration().finally(() => {
      storageHydrationPromise = null
    })
    storageHydrationPromise = promise
    return promise
  }

  /** 执行“读取 → 清洗 → 合并本地变化 → 更新 Store → 必要时回写”的完整事务。 */
  async function executeHydration() {
    if (storageAdapter === false)
      return
    const storageKey = getState().storageKey
    // 记住加载开始时的版本，回来后就能判断用户是否在等待期间做过修改。
    const fixedTabsVersion = fixedTabsMutationVersion
    const favoriteRoutesVersion = favoriteRoutesMutationVersion
    setState({ storageLoading: true, storageLoadError: undefined })

    try {
      // 外部 Adapter 返回的数据不可信，先补齐字段并复制数组/对象。
      const loaded = normalizeRouterStorageState(
        await storageAdapter.load(storageKey),
      )
      const state = getState()
      const fixedUnchanged = fixedTabsVersion === fixedTabsMutationVersion
      const favoritesUnchanged = favoriteRoutesVersion === favoriteRoutesMutationVersion

      // 先以存储全量数据为底，再叠加本次会话尚未保存的每个 tabKey 增量。
      const mergedParamsPathMap = { ...loaded.fixedParamsPathMap }
      pendingParamsPathMutations.forEach((pathname, tabKey) => {
        if (pathname)
          mergedParamsPathMap[tabKey] = pathname
        else
          delete mergedParamsPathMap[tabKey]
      })
      // 加载期间未修改才采用存储值；已经修改就保留更“新”的当前内存值。
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

      // Cache 要先拿到完整映射，再把 Store 标为 hydrated，后续变化才能直接完整保存。
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
      // 清洗、去重或裁剪改变了存储内容时主动回写，避免下次启动重复清理。
      if (fixedUnchanged && !areStringArraysEqual(nextFixedSet, loaded.fixedTabs))
        persistFixedTabs(nextFixedSet)
      if (!areStringRecordsEqual(mergedParamsPathMap, loaded.fixedParamsPathMap))
        persistParamsPathMap(mergedParamsPathMap)
      if (
        favoritesUnchanged &&
        !areStringArraysEqual(nextFavoriteRoutePaths, loaded.favoriteRoutePaths)
      ) {
        persistFavoriteRoutePaths(nextFavoriteRoutePaths)
      }
    } catch (error) {
      // 加载失败不清空当前内存页签/收藏，只结束 loading 并暴露错误供 UI 决定展示。
      setState({ storageLoading: false, storageLoadError: error })
      notifyStorageError(error, {
        storageKey,
        phase: 'load',
      })
    }
  }

  // 只返回其它模块真正需要的命令，版本号和 pending Map 继续留在私有闭包中。
  return {
    handleParamsPathMapChange,
    persistFixedTabs,
    persistParamsPathMap,
    persistFavoriteRoutePaths,
    hydrateStorage,
  }
}

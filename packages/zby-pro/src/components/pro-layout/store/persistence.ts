import type { ProLayoutStorageErrorPhase } from './interface'
import {
  createIndexedDBProLayoutStorageAdapter,
  normalizeProLayoutStorageState,
} from './storage'
import { mergeTabsWithFixedSet, sanitizeFixedTabKeys } from './tabModel'
import type {
  GetProLayoutStoreState,
  ProLayoutStorageField,
  ProLayoutStorageMutationVersions,
  SetProLayoutStoreState,
} from './types'

/** 所有未显式提供 Adapter 的 Store 共享默认 IndexedDB Adapter。 */
const DEFAULT_STORAGE_ADAPTER = createIndexedDBProLayoutStorageAdapter()

/** 创建三个字段均从 0 开始的本地修改版本。 */
export function createStorageMutationVersions(): ProLayoutStorageMutationVersions {
  return {
    collection: 0,
    fixedTabs: 0,
    fixedParamsPathMap: 0,
  }
}

/** undefined 恢复默认 IndexedDB Adapter，false 明确关闭外部持久化。 */
export function resolveStorageAdapter(
  adapter: false | ReturnType<typeof createIndexedDBProLayoutStorageAdapter> | undefined,
) {
  return adapter === false ? false : adapter || DEFAULT_STORAGE_ADAPTER
}

/** 保存收藏集合，并标记 collection 字段已经发生本地修改。 */
export function persistCollection(
  set: SetProLayoutStoreState,
  get: GetProLayoutStoreState,
  collection: string[],
) {
  persistStorageAction(
    set,
    get,
    'collection',
    'saveCollection',
    (adapter, storageKey) => adapter.saveCollection(storageKey, collection),
  )
}

/** 保存固定页签集合，并标记 fixedTabs 字段已经发生本地修改。 */
export function persistFixedTabs(
  set: SetProLayoutStoreState,
  get: GetProLayoutStoreState,
  fixedTabs: string[],
) {
  persistStorageAction(
    set,
    get,
    'fixedTabs',
    'saveFixedTabs',
    (adapter, storageKey) => adapter.saveFixedTabs(storageKey, fixedTabs),
  )
}

/** 保存参数路径映射，并标记 fixedParamsPathMap 字段已经发生本地修改。 */
export function persistFixedParamsPathMap(
  set: SetProLayoutStoreState,
  get: GetProLayoutStoreState,
  fixedParamsPathMap: Record<string, string>,
) {
  persistStorageAction(
    set,
    get,
    'fixedParamsPathMap',
    'saveFixedParamsPathMap',
    (adapter, storageKey) =>
      adapter.saveFixedParamsPathMap(storageKey, fixedParamsPathMap),
  )
}

/**
 * 从当前持久化来源加载状态，并按字段合并并发本地修改。
 *
 * 处理规则：
 *
 * 1. storageKey/Adapter 变化后 generation 不同，旧请求结果直接失效；
 * 2. 某字段加载期间发生本地修改，只保留该字段当前内存值；
 * 3. 未修改字段正常使用加载结果；
 * 4. 参数路径还会叠加加载开始前的当前会话快照，让首屏真实 URL 优先于旧存储；
 * 5. 无效固定 key 会被清理并回写，避免继续占用固定数量。
 */
export async function hydrateStorage(
  set: SetProLayoutStoreState,
  get: GetProLayoutStoreState,
) {
  const state = get()
  if (state.storageAdapter === false || state.storageHydrated || state.storageLoading)
    return

  const adapter = state.storageAdapter
  const storageKey = state.storageKey
  const sourceGeneration = state.storageSourceGeneration
  const startMutationVersions = { ...state.storageMutationVersions }
  const startParamsPathMap = state.cache.getFixedParamsPathMap()

  set({ storageLoading: true, storageLoadError: undefined })

  try {
    const loaded = normalizeProLayoutStorageState(await adapter.load(storageKey))
    let fixedTabsToPersist: string[] | null = null
    let paramsPathMapToPersist: Record<string, string> | null = null

    set((previous) => {
      // 新来源已经接管 Store 时，旧请求不得再修改 loading、error 或业务状态。
      if (previous.storageSourceGeneration !== sourceGeneration)
        return previous

      const collectionUnchanged =
        previous.storageMutationVersions.collection === startMutationVersions.collection
      const fixedTabsUnchanged =
        previous.storageMutationVersions.fixedTabs === startMutationVersions.fixedTabs
      const paramsPathMapUnchanged =
        previous.storageMutationVersions.fixedParamsPathMap ===
        startMutationVersions.fixedParamsPathMap

      const collectionSet = collectionUnchanged
        ? loaded.collection
        : previous.collectionSet
      const fixedSet = fixedTabsUnchanged
        ? sanitizeFixedTabKeys(loaded.fixedTabs, previous.registry)
        : previous.fixedSet

      if (fixedTabsUnchanged && !areStringArraysEqual(fixedSet, loaded.fixedTabs))
        fixedTabsToPersist = fixedSet

      if (paramsPathMapUnchanged) {
        const mergedParamsPathMap = {
          ...loaded.fixedParamsPathMap,
          ...startParamsPathMap,
        }

        previous.cache.hydrateFixedParamsPathMap(mergedParamsPathMap)

        if (!areStringMapsEqual(mergedParamsPathMap, loaded.fixedParamsPathMap))
          paramsPathMapToPersist = mergedParamsPathMap
      }

      return {
        collectionSet,
        fixedSet,
        tabs: fixedTabsUnchanged
          ? mergeTabsWithFixedSet(previous.tabs, fixedSet, previous.registry)
          : previous.tabs,
        storageHydrated: true,
        storageLoading: false,
      }
    })

    // setState 期间只计算需要回写的修正，真正 I/O 放到状态提交之后执行。
    if (get().storageSourceGeneration === sourceGeneration) {
      if (fixedTabsToPersist)
        persistFixedTabs(set, get, fixedTabsToPersist)
      if (paramsPathMapToPersist)
        persistFixedParamsPathMap(set, get, paramsPathMapToPersist)
    }
  } catch (error) {
    const latest = get()
    if (latest.storageSourceGeneration !== sourceGeneration)
      return

    set({ storageLoading: false, storageLoadError: error })
    latest.onStorageLoadError?.(error, {
      storageKey,
      phase: 'load',
      retry: () => get().hydrateStorage(),
    })
  }
}

/**
 * 执行一个字段保存动作。
 *
 * 版本在纯内存模式下也会递增，因为它同时承担 hydration 冲突标记。保存失败不会
 * 回滚内存状态；错误通过统一回调暴露，retry 精确重放原 Adapter、storageKey 和值。
 */
function persistStorageAction(
  set: SetProLayoutStoreState,
  get: GetProLayoutStoreState,
  field: ProLayoutStorageField,
  phase: Exclude<ProLayoutStorageErrorPhase, 'load'>,
  action: (
    adapter: Exclude<ReturnType<typeof resolveStorageAdapter>, false>,
    storageKey: string,
  ) => Promise<void>,
) {
  const state = get()
  set({
    storageMutationVersions: {
      ...state.storageMutationVersions,
      [field]: state.storageMutationVersions[field] + 1,
    },
  })

  if (state.storageAdapter === false)
    return

  const adapter = state.storageAdapter
  const storageKey = state.storageKey

  void action(adapter, storageKey).catch((error) => {
    get().onStorageLoadError?.(error, {
      storageKey,
      phase,
      retry: () => action(adapter, storageKey),
    })
  })
}

/** 按顺序比较字符串数组，用于判断清理后是否需要回写。 */
function areStringArraysEqual(left: string[], right: string[]) {
  return left.length === right.length && left.every((item, index) => item === right[index])
}

/** 比较两个字符串映射是否包含完全相同的 key/value。 */
function areStringMapsEqual(
  left: Record<string, string>,
  right: Record<string, string>,
) {
  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)

  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every((key) => left[key] === right[key])
  )
}

import type { ProLayoutStorageErrorPhase } from './interface'
import {
  createIndexedDBProLayoutStorageAdapter,
  normalizeProLayoutStorageState,
} from './storage'
import type { ProLayoutStoreRuntime, ProLayoutStorageField } from './runtime'
import { mergeTabsWithFixedSet, sanitizeFixedTabKeys } from './tabModel'
import type {
  GetProLayoutStoreState,
  SetProLayoutStoreState,
} from './types'

/** 所有未显式提供 Adapter 的 Store 共享默认 IndexedDB Adapter。 */
const DEFAULT_STORAGE_ADAPTER = createIndexedDBProLayoutStorageAdapter()

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
  runtime: ProLayoutStoreRuntime,
  collection: string[],
) {
  persistStorageAction(
    set,
    get,
    runtime,
    'collection',
    'saveCollection',
    (adapter, storageKey) => adapter.saveCollection(storageKey, collection),
  )
}

/** 保存固定页签集合，并标记 fixedTabs 字段已经发生本地修改。 */
export function persistFixedTabs(
  set: SetProLayoutStoreState,
  get: GetProLayoutStoreState,
  runtime: ProLayoutStoreRuntime,
  fixedTabs: string[],
) {
  persistStorageAction(
    set,
    get,
    runtime,
    'fixedTabs',
    'saveFixedTabs',
    (adapter, storageKey) => adapter.saveFixedTabs(storageKey, fixedTabs),
  )
}

/** 保存参数路径映射，并标记 fixedParamsPathMap 字段已经发生本地修改。 */
export function persistFixedParamsPathMap(
  set: SetProLayoutStoreState,
  get: GetProLayoutStoreState,
  runtime: ProLayoutStoreRuntime,
  fixedParamsPathMap: Record<string, string>,
) {
  persistStorageAction(
    set,
    get,
    runtime,
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
  runtime: ProLayoutStoreRuntime,
) {
  const state = get()
  // 三种情况都不能重复加载：纯内存模式没有外部来源；已完成 hydration 无需重放；
  // loading 期间复用当前请求，避免两个 load 以相同 generation 竞争提交结果。
  if (state.storageAdapter === false || state.storageHydrated || state.storageLoading)
    return

  // Adapter、key 和 generation 构成本次请求的来源快照。后续即使 Core 切换来源，
  // 当前 Promise 仍只代表旧来源，完成时必须用 generation 判断是否还能提交。
  const adapter = state.storageAdapter
  const storageKey = state.storageKey
  const sourceGeneration = runtime.storageSourceGeneration
  // 记录三个字段各自的起始版本，而不是用一个全局 dirty 标记；这样加载期间只改收藏
  // 时，固定页签和动态 pathname 仍能采用远端结果。
  const startMutationVersions = { ...runtime.storageMutationVersions }
  // 当前会话已从首屏 URL 确认的动态 pathname 比持久化旧值更新，合并时应最后覆盖。
  const startParamsPathMap = state.cache.getFixedParamsPathMap()

  // 先清理上次错误再进入 loading，使重试期间 UI 不会同时展示旧错误和加载状态。
  set({ storageLoading: true, storageLoadError: undefined })

  try {
    // 所有 Adapter 的返回值都再次经过边界标准化，Store 后续逻辑只处理完整结构。
    const loaded = normalizeProLayoutStorageState(await adapter.load(storageKey))
    // hydration 可能发现存储中的无效固定 key，或需要用当前会话 pathname 修正旧映射；
    // 这里先记录修正值，等 Zustand 状态提交完成后再执行外部 I/O。
    let fixedTabsToPersist: string[] | null = null
    let paramsPathMapToPersist: Record<string, string> | null = null

    set((previous) => {
      // 新来源已经接管 Store 时，旧请求不得再修改 loading、error 或业务状态。
      if (runtime.storageSourceGeneration !== sourceGeneration)
        return previous

      const collectionUnchanged =
        runtime.storageMutationVersions.collection === startMutationVersions.collection
      const fixedTabsUnchanged =
        runtime.storageMutationVersions.fixedTabs === startMutationVersions.fixedTabs
      const paramsPathMapUnchanged =
        runtime.storageMutationVersions.fixedParamsPathMap ===
        startMutationVersions.fixedParamsPathMap

      // 字段版本未变化说明加载期间没有本地写入，可以接受存储值；否则保留用户刚完成的
      // 内存操作，避免异步 load 把它覆盖回旧状态。
      const collectionSet = collectionUnchanged
        ? loaded.collection
        : previous.collectionSet
      const fixedSet = fixedTabsUnchanged
        ? sanitizeFixedTabKeys(loaded.fixedTabs, previous.registry)
        : previous.fixedSet

      // sanitize 只影响非法或重复 key；清理结果需要回写，避免下次挂载重复清理。
      if (fixedTabsUnchanged && !areStringArraysEqual(fixedSet, loaded.fixedTabs))
        fixedTabsToPersist = fixedSet

      if (paramsPathMapUnchanged) {
        // 展开顺序刻意让当前会话快照覆盖存储值。比如存储中是 /project/42，而本次首屏
        // 已打开 /project/99，共享页签恢复时必须保留 /project/99。
        const mergedParamsPathMap = {
          ...loaded.fixedParamsPathMap,
          ...startParamsPathMap,
        }

        // 使用 hydrate 方法直接替换 Cache，避免把“刚加载的数据”误当成本地修改再次保存。
        previous.cache.hydrateFixedParamsPathMap(mergedParamsPathMap)

        if (!areStringMapsEqual(mergedParamsPathMap, loaded.fixedParamsPathMap))
          paramsPathMapToPersist = mergedParamsPathMap
      }

      return {
        collectionSet,
        fixedSet,
        // hydration 只补入新固定页签，不删除本次会话已经打开的普通页签。
        tabs: fixedTabsUnchanged
          ? mergeTabsWithFixedSet(previous.tabs, fixedSet, previous.registry)
          : previous.tabs,
        storageHydrated: true,
        storageLoading: false,
      }
    })

    // setState 期间只计算需要回写的修正，真正 I/O 放到状态提交之后执行。
    if (runtime.storageSourceGeneration === sourceGeneration) {
      if (fixedTabsToPersist)
        persistFixedTabs(set, get, runtime, fixedTabsToPersist)
      if (paramsPathMapToPersist)
        persistFixedParamsPathMap(set, get, runtime, paramsPathMapToPersist)
    }
  } catch (error) {
    const latest = get()
    if (runtime.storageSourceGeneration !== sourceGeneration)
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
  runtime: ProLayoutStoreRuntime,
  field: ProLayoutStorageField,
  phase: Exclude<ProLayoutStorageErrorPhase, 'load'>,
  action: (
    adapter: Exclude<ReturnType<typeof resolveStorageAdapter>, false>,
    storageKey: string,
  ) => Promise<void>,
) {
  // 先递增版本再检查 Adapter。即使当前是纯内存模式，这次用户操作也必须阻止已经
  // 在途的 hydration 使用旧值覆盖对应字段。
  runtime.storageMutationVersions[field] += 1

  const state = get()
  if (state.storageAdapter === false)
    return

  // 保存动作绑定触发当下的 Adapter 和 storageKey。来源随后切换时，旧写入仍由旧
  // Adapter 自己完成；错误重试也必须重放同一次提交，而不能误写当前的新来源。
  const adapter = state.storageAdapter
  const storageKey = state.storageKey

  // 从 Promise 微任务中调用外部 Adapter，使同步 throw 和异步 rejection 进入同一错误
  // 通道；同时让调用动作先完成内存提交，不被不规范的同步抛错中断。
  const execute = () => Promise.resolve().then(() => action(adapter, storageKey))

  void execute().catch((error) => {
    // 内存状态已经先行提交，持久化失败不回滚 UI；由调用方决定何时展示错误和重试。
    get().onStorageLoadError?.(error, {
      storageKey,
      phase,
      retry: execute,
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

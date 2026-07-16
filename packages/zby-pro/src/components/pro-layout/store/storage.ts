import { createStore, get, update } from 'idb-keyval'

import type {
  ProLayoutRemoteStorageAdapterConfig,
  ProLayoutStorageAdapter,
  ProLayoutStorageState,
} from './interface'

/** ZBY ProLayout 默认持久化使用的独立 IndexedDB 数据库。 */
const DB_NAME = 'zby-pro-layout'

/** 数据库中按 storageKey 保存完整布局状态的 object store。 */
const STATE_STORE = 'layout-state'

type StorageWriteAction = () => Promise<void>
type StorageWriteQueue = (storageKey: string, action: StorageWriteAction) => Promise<void>

/**
 * 默认 IndexedDB Adapter 的模块级写队列。
 *
 * 多个 ProLayout 实例即使分别创建 Adapter，只要 storageKey 相同，也会共享提交
 * 顺序。不同 storageKey 使用独立队列，不会互相阻塞。
 */
const enqueueIndexedDBWrite = createStorageWriteQueue()

/** idb-keyval store 延迟到浏览器实际支持 IndexedDB 时再创建。 */
let indexedDBStore: ReturnType<typeof createStore> | undefined

/**
 * 将未知或部分持久化数据规范化为完整、可安全消费的 ProLayout 状态。
 *
 * 远程接口、旧版本数据库或人工修改的数据都可能缺少字段或包含错误类型。
 * 规范化始终返回新数组和新对象，避免调用方修改存储层持有的引用。
 */
export function normalizeProLayoutStorageState(
  state?: Partial<ProLayoutStorageState> | null,
): ProLayoutStorageState {
  return {
    collection: normalizeStringArray(state?.collection),
    fixedTabs: normalizeStringArray(state?.fixedTabs),
    fixedParamsPathMap: normalizeStringMap(state?.fixedParamsPathMap),
  }
}

/**
 * 创建默认 IndexedDB 持久化适配器。
 *
 * 每个 save 方法只提交一个字段，但底层通过 idb-keyval 的原子 update 在同一个
 * readwrite transaction 中读取最新记录并合并 patch，避免参考实现中分离的
 * read/write transaction 互相覆盖。写队列进一步保证同一 storageKey 的调用按
 * 提交顺序执行，因此同一字段连续快速保存时最终结果为最后一次提交。
 *
 * 当前环境完全没有 IndexedDB 时，load 返回空状态，save 安全 no-op；数据库
 * 已存在但真实操作失败时 Promise 继续 reject，交给上层错误回调处理。
 */
export function createIndexedDBProLayoutStorageAdapter(): ProLayoutStorageAdapter {
  return {
    async load(storageKey) {
      // SSR、测试或禁用 IndexedDB 的浏览器环境没有 store，按“尚无持久化数据”处理。
      const store = getIndexedDBStore()
      if (!store)
        return normalizeProLayoutStorageState()

      // 数据库可能仍是旧版本或部分结构，读取后必须再次走公开边界的标准化流程。
      const current = await get<Partial<ProLayoutStorageState>>(storageKey, store)
      return normalizeProLayoutStorageState(current)
    },

    saveCollection(storageKey, collection) {
      // 每个入口只生成自己负责的字段 patch，不能用调用方快照重写其它并发字段。
      return updateIndexedDBState(storageKey, {
        collection: normalizeStringArray(collection),
      })
    },

    saveFixedTabs(storageKey, fixedTabs) {
      return updateIndexedDBState(storageKey, {
        fixedTabs: normalizeStringArray(fixedTabs),
      })
    },

    saveFixedParamsPathMap(storageKey, fixedParamsPathMap) {
      return updateIndexedDBState(storageKey, {
        fixedParamsPathMap: normalizeStringMap(fixedParamsPathMap),
      })
    },
  }
}

/**
 * 包装调用方提供的远程持久化实现。
 *
 * load 结果会在边界标准化；save 入参会复制并清理非法值。三个保存方法共享
 * storageKey 级串行队列，使调用顺序成为明确契约，避免较早请求较晚完成后覆盖
 * 较新的状态。底层错误原样 reject，队列会在错误后继续处理后续操作。
 */
export function createRemoteProLayoutStorageAdapter(
  config: ProLayoutRemoteStorageAdapterConfig,
): ProLayoutStorageAdapter {
  // 队列属于本次 Adapter 实例；同一远端配置内相同 storageKey 串行，不同 key 并行。
  const enqueueWrite = createStorageWriteQueue()

  return {
    async load(storageKey) {
      return normalizeProLayoutStorageState(await config.load(storageKey))
    },

    saveCollection(storageKey, collection) {
      // 入队前完成标准化并创建新数组，调用方后续修改原数组不会改变排队中的请求值。
      const normalized = normalizeStringArray(collection)
      return enqueueWrite(storageKey, () => config.saveCollection(storageKey, normalized))
    },

    saveFixedTabs(storageKey, fixedTabs) {
      const normalized = normalizeStringArray(fixedTabs)
      return enqueueWrite(storageKey, () => config.saveFixedTabs(storageKey, normalized))
    },

    saveFixedParamsPathMap(storageKey, fixedParamsPathMap) {
      const normalized = normalizeStringMap(fixedParamsPathMap)
      return enqueueWrite(
        storageKey,
        () => config.saveFixedParamsPathMap(storageKey, normalized),
      )
    },
  }
}

/** 获取当前环境可用的 idb-keyval store；SSR 或不支持 IndexedDB 时返回 null。 */
function getIndexedDBStore() {
  if (typeof indexedDB === 'undefined')
    return null

  // 同一模块只创建一次 idb-keyval Store 描述，后续读写复用相同数据库与 object store。
  indexedDBStore ||= createStore(DB_NAME, STATE_STORE)
  return indexedDBStore
}

/**
 * 对单个 storageKey 原子合并字段 patch。
 *
 * update 的 updater 会在 readwrite transaction 内拿到该 key 最新的已提交值；
 * 返回的新对象随后在同一 transaction 中写回，因此并发字段更新不会从过期快照
 * 重建整条记录。
 */
async function updateIndexedDBState(
  storageKey: string,
  patch: Partial<ProLayoutStorageState>,
) {
  const store = getIndexedDBStore()
  if (!store)
    return

  // 队列保证调用顺序；update 自身再保证“读取最新值 + 合并 patch + 写回”位于同一事务。
  await enqueueIndexedDBWrite(
    storageKey,
    () =>
      update<ProLayoutStorageState>(
        storageKey,
        (current) => ({
          ...normalizeProLayoutStorageState(current),
          ...patch,
        }),
        store,
      ),
  )
}

/**
 * 创建按 storageKey 分组的 Promise 写队列。
 *
 * operation 返回给调用方以保留本次真实成功或失败结果；queueTail 会吸收错误，
 * 确保一次失败不会让同一 key 的后续保存永远短路。队列空闲后删除 tail，避免
 * 长期持有已经完成的 storageKey。
 */
function createStorageWriteQueue(): StorageWriteQueue {
  // Map 只保存每个 key 当前队尾的“永不 reject”Promise，作为下一次操作的起点。
  const queueTails = new Map<string, Promise<void>>()

  return (storageKey, action) => {
    // 没有前序任务时从已完成 Promise 开始；有前序任务时等待其成功或失败结束。
    const previous = queueTails.get(storageKey) || Promise.resolve()
    // catch 吸收前序错误，使本次 action 仍会执行；operation 保留本次 action 的真实
    // resolve/reject，调用方因此仍能感知自己的保存结果。
    const operation = previous.catch(() => undefined).then(action)
    // 队尾只用于串联后续任务，必须把本次失败转换为 fulfilled，避免失败永久截断队列。
    const queueTail = operation.then(
      () => undefined,
      () => undefined,
    )

    queueTails.set(storageKey, queueTail)
    void queueTail.then(() => {
      // 完成时该 key 可能已有更新任务接在后面；只有自己仍是最新队尾才能删除 Map 项。
      if (queueTails.get(storageKey) === queueTail)
        queueTails.delete(storageKey)
    })

    return operation
  }
}

/** 从未知值中保留字符串数组项，并始终返回新数组。 */
function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

/** 从未知对象中保留字符串 value，并始终返回普通对象。 */
function normalizeStringMap(value: unknown): Record<string, string> {
  if (!isRecord(value))
    return {}

  // reduce 构造全新普通对象，同时丢弃非字符串 value；key 本身来自 Object.keys，
  // 不遍历原型链上的可疑字段。
  return Object.keys(value).reduce<Record<string, string>>((result, itemKey) => {
    const itemValue = value[itemKey]
    if (typeof itemValue === 'string')
      result[itemKey] = itemValue

    return result
  }, {})
}

/** 判断值是否可以作为键值记录读取；数组不属于路径映射。 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

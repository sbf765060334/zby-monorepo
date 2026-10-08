/**
 * 文件职责：提供持久化数据的清洗规则，以及默认 IndexedDB 存储适配器。
 *
 * 它只解决“数据怎么读写”，不决定何时加载。Adapter 对外只有 load 和
 * update(latest => next)；同一个 storageKey 的两次调用会排队。
 */
import { createStore, get, update } from 'idb-keyval'

import type { RouterStorageAdapter, RouterStorageState } from './types'

/**
 * router-core 的持久化边界。
 *
 * 本模块只负责数据标准化和 Adapter 实现，不决定何时 hydration，也不直接修改
 * RouterCoreState。异步加载冲突由 createRouterCore 中的字段版本处理。
 */

/** 默认 IndexedDB 数据库与 object store，和旧 ProLayout 存储空间相互隔离。 */
const DB_NAME = 'zby-router-core'
const STATE_STORE = 'router-state'

/** 队列里实际执行的一次异步任务。 */
type StorageWriteAction = () => Promise<void>
/** 传入命名空间和任务，把任务接到对应命名空间队尾。 */
type StorageWriteQueue = (
  storageKey: string,
  action: StorageWriteAction,
) => Promise<void>

/** 默认 IndexedDB Adapter 的跨实例队列；相同 storageKey 严格串行。 */
const enqueueIndexedDBWrite = createStorageWriteQueue()
/** idb-keyval Store 延迟创建，保证 SSR 与无 IndexedDB 环境可以安全导入模块。 */
let indexedDBStore: ReturnType<typeof createStore> | undefined

/**
 * 将外部、旧版本或部分持久化数据转换成 core 可以安全消费的完整结构。
 *
 * 返回值始终使用新的数组和对象，避免调用方后续修改 Adapter 持有的原始引用。
 */
export function normalizeRouterStorageState(
  state?: Partial<RouterStorageState> | null,
): RouterStorageState {
  return {
    fixedTabs: normalizeStringArray(state?.fixedTabs),
    fixedParamsPathMap: normalizeStringMap(state?.fixedParamsPathMap),
    favoriteRoutePaths: normalizeStringArray(state?.favoriteRoutePaths),
  }
}

/** 创建按 storageKey 分组的 Promise 队列，供 Adapter 和持久化协调器共用。 */
export function createStorageWriteQueue(): StorageWriteQueue {
  // Map 只保存每个 storageKey 当前队尾的永不 reject Promise。
  const queueTails = new Map<string, Promise<void>>()

  return (storageKey, action) => {
    // 前序失败不能阻断本次任务，因此从吸收错误后的队尾继续执行 action。
    const previous = queueTails.get(storageKey) || Promise.resolve()
    const operation = previous.catch(() => undefined).then(action)
    // operation 保留本次真实结果；queueTail 仅用于串联后续任务，必须吸收错误。
    const queueTail = operation.then(
      () => undefined,
      () => undefined,
    )
    queueTails.set(storageKey, queueTail)
    void queueTail.then(() => {
      // 完成时可能已有新任务接在后面，只允许最新队尾清理自己的 Map 项。
      if (queueTails.get(storageKey) === queueTail)
        queueTails.delete(storageKey)
    })
    return operation
  }
}

/** 创建浏览器默认使用的 IndexedDB 存储适配器。 */
export function createIndexedDBRouterStorageAdapter(): RouterStorageAdapter {
  return {
    async load(storageKey) {
      // SSR、测试或禁用 IndexedDB 的浏览器按“尚无持久化状态”处理。
      const store = getIndexedDBStore()
      if (!store)
        return normalizeRouterStorageState()
      let loaded = normalizeRouterStorageState()
      await enqueueIndexedDBWrite(storageKey, async () => {
        const current = await get<Partial<RouterStorageState>>(storageKey, store)
        loaded = normalizeRouterStorageState(current)
      })
      return loaded
    },
    update(storageKey, recipe) {
      const store = getIndexedDBStore()
      if (!store)
        return Promise.resolve()
      // 队列保证提交顺序；idb-keyval update 保证对着磁盘最新值执行 recipe。
      return enqueueIndexedDBWrite(
        storageKey,
        () =>
          update<RouterStorageState>(
            storageKey,
            (current) => recipe(normalizeRouterStorageState(current)),
            store,
          ),
      )
    },
  }
}

/** 懒创建 idb-keyval Store；SSR 或不支持 IndexedDB 时返回 null。 */
function getIndexedDBStore() {
  if (typeof indexedDB === 'undefined')
    return null
  // 同一模块只创建一个 Store 描述，实际读写仍按 storageKey 隔离。
  indexedDBStore ||= createStore(DB_NAME, STATE_STORE)
  return indexedDBStore
}

/** 把不可信输入收敛为只含字符串的新数组。 */
function normalizeStringArray(value: unknown): string[] {
  // 非数组视为空状态；数组中只保留可以作为持久化路径的字符串。
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

/** 把不可信输入收敛为 key/value 都是字符串的新普通对象。 */
function normalizeStringMap(value: unknown): Record<string, string> {
  // 数组虽然属于 object，但不能作为 pathname 键值记录读取。
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return {}

  return Object.keys(value).reduce<Record<string, string>>((result, key) => {
    // Object.keys 不遍历原型链；非字符串 value 在边界直接丢弃。
    const item = (value as Record<string, unknown>)[key]
    if (typeof item === 'string')
      result[key] = item
    return result
  }, {})
}

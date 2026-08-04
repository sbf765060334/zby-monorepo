/**
 * 文件职责：提供持久化数据的清洗规则，以及 IndexedDB/远程存储适配器实现。
 *
 * 它只解决“数据怎么读写”，不决定何时加载。所有外部数据都会先被整理成可信的完整
 * 结构，同一个 storageKey 的写操作也会排队，避免并发保存互相覆盖。
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

/** 队列里实际执行的一次异步保存任务。 */
type StorageWriteAction = () => Promise<void>
/** 传入命名空间和任务，把任务接到对应命名空间队尾。 */
type StorageWriteQueue = (
  storageKey: string,
  action: StorageWriteAction,
) => Promise<void>

/** 默认 IndexedDB Adapter 的跨实例写队列；相同 storageKey 严格串行。 */
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

/** 创建浏览器默认使用的 IndexedDB 存储适配器。 */
export function createIndexedDBRouterStorageAdapter(): RouterStorageAdapter {
  return {
    async load(storageKey) {
      // SSR、测试或禁用 IndexedDB 的浏览器按“尚无持久化状态”处理。
      const store = getIndexedDBStore()
      if (!store)
        return normalizeRouterStorageState()
      // 数据库可能包含旧版或人工写入的部分数据，读取后再次执行边界标准化。
      const current = await get<Partial<RouterStorageState>>(storageKey, store)
      return normalizeRouterStorageState(current)
    },
    saveFixedTabs(storageKey, fixedTabs) {
      // 每次只生成自己负责字段的 patch，不能用过期快照覆盖参数路径字段。
      return updateIndexedDBState(storageKey, {
        fixedTabs: normalizeStringArray(fixedTabs),
      })
    },
    saveFixedParamsPathMap(storageKey, fixedParamsPathMap) {
      // 与固定页签相同，只提交本字段的 patch，保留数据库中的其它最新字段。
      return updateIndexedDBState(storageKey, {
        fixedParamsPathMap: normalizeStringMap(fixedParamsPathMap),
      })
    },
    saveFavoriteRoutePaths(storageKey, favoriteRoutePaths) {
      // 收藏顺序有展示意义，因此标准化时保留原数组顺序。
      return updateIndexedDBState(storageKey, {
        favoriteRoutePaths: normalizeStringArray(favoriteRoutePaths),
      })
    },
  }
}

/**
 * 包装业务提供的远程适配器，为它补上输入清洗和同一 storageKey 的串行写入。
 *
 * 远程接口本身仍由调用方实现；本函数只保证 Core 调用它时的数据边界与写入顺序一致。
 */
export function createRemoteRouterStorageAdapter(
  config: RouterStorageAdapter,
): RouterStorageAdapter {
  // 队列属于本次远程 Adapter：相同 key 串行，不同 key 可以并行。
  const enqueueWrite = createStorageWriteQueue()

  return {
    async load(storageKey) {
      // 不信任远程实现的边界数据，统一补齐缺失字段并复制引用。
      return normalizeRouterStorageState(await config.load(storageKey))
    },
    saveFixedTabs(storageKey, fixedTabs) {
      // 入队前创建稳定快照，调用方随后修改原数组不会改变排队中的请求。
      const normalized = normalizeStringArray(fixedTabs)
      return enqueueWrite(
        storageKey,
        () => config.saveFixedTabs(storageKey, normalized),
      )
    },
    saveFixedParamsPathMap(storageKey, fixedParamsPathMap) {
      // 对象也要在入队前复制，否则等待期间被调用方修改会改变实际请求内容。
      const normalized = normalizeStringMap(fixedParamsPathMap)
      return enqueueWrite(
        storageKey,
        () => config.saveFixedParamsPathMap(storageKey, normalized),
      )
    },
    saveFavoriteRoutePaths(storageKey, favoriteRoutePaths) {
      // 每种字段共享同一条 storageKey 队列，所以服务器收到的顺序与用户操作顺序一致。
      const normalized = normalizeStringArray(favoriteRoutePaths)
      return enqueueWrite(
        storageKey,
        () => config.saveFavoriteRoutePaths(storageKey, normalized),
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

/** 在同一 storageKey 的写队列里，读取最新整份状态并只合并本次字段。 */
async function updateIndexedDBState(
  storageKey: string,
  patch: Partial<RouterStorageState>,
) {
  const store = getIndexedDBStore()
  if (!store)
    return

  // 队列保证提交顺序；update 保证“读最新值 + 合并单字段 patch + 写回”原子完成。
  await enqueueIndexedDBWrite(
    storageKey,
    () =>
      update<RouterStorageState>(
        storageKey,
        (current) => ({
          ...normalizeRouterStorageState(current),
          ...patch,
        }),
        store,
      ),
  )
}

/** 创建一条按 storageKey 分组的 Promise 写队列。 */
function createStorageWriteQueue(): StorageWriteQueue {
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

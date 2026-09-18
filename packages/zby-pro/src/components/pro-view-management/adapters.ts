/**
 * 文件职责：把自定义视图状态落到本地 IndexedDB。
 *
 * Adapter 对外只有 load 和 update(latest => next)。开库方式和 Core 一样走
 * idb-keyval，不维护 IndexedDB 库版本。同一个 instanceId 的读写会排队。
 */
import { createStore, get, update } from 'idb-keyval'

import type {
  ProViewManagementAdapter,
  ProViewManagementStorageState,
} from './interface'
import { normalizeCustomViews } from './utils'

/** 默认 IndexedDB 数据库与 object store，和旧的分条视图库相互隔离。 */
const DB_NAME = 'zby-pro-view-management'
const STATE_STORE = 'view-state'

type StorageWriteAction = () => Promise<void>
type StorageWriteQueue = (
  instanceId: string,
  action: StorageWriteAction,
) => Promise<void>

/** 默认 IndexedDB Adapter 的跨实例队列；相同 instanceId 严格串行。 */
const enqueueIndexedDBWrite = createStorageWriteQueue()
/** idb-keyval Store 延迟创建，保证 SSR 与无 IndexedDB 环境可以安全导入模块。 */
let indexedDBStore: ReturnType<typeof createStore> | undefined

/**
 * 将外部或部分持久化数据转换成组件可以安全消费的完整结构。
 *
 * 返回值始终使用新的数组，避免调用方后续修改 Adapter 持有的原始引用。
 */
export function normalizeProViewManagementStorageState<TSnapshot = unknown>(
  state?: Partial<ProViewManagementStorageState<TSnapshot>> | null,
): ProViewManagementStorageState<TSnapshot> {
  return {
    views: normalizeCustomViews(
      Array.isArray(state?.views) ? state.views : [],
    ),
    activeViewId:
      typeof state?.activeViewId === 'string' && state.activeViewId
        ? state.activeViewId
        : undefined,
  }
}

/** 创建浏览器默认使用的 IndexedDB 视图存储适配器。 */
export function createIndexedDBProViewManagementAdapter<
  TSnapshot = unknown,
>(): ProViewManagementAdapter<TSnapshot> {
  return {
    async load(instanceId) {
      const store = getIndexedDBStore()
      if (!store)
        return normalizeProViewManagementStorageState<TSnapshot>()
      let loaded = normalizeProViewManagementStorageState<TSnapshot>()
      await enqueueIndexedDBWrite(instanceId, async () => {
        const current = await get<
          Partial<ProViewManagementStorageState<TSnapshot>>
        >(instanceId, store)
        loaded = normalizeProViewManagementStorageState(current)
      })
      return loaded
    },
    update(instanceId, recipe) {
      const store = getIndexedDBStore()
      if (!store)
        return Promise.resolve()
      return enqueueIndexedDBWrite(
        instanceId,
        () =>
          update<ProViewManagementStorageState<TSnapshot>>(
            instanceId,
            (current) => recipe(normalizeProViewManagementStorageState(current)),
            store,
          ),
      )
    },
  }
}

/** 创建按 instanceId 分组的 Promise 队列。 */
function createStorageWriteQueue(): StorageWriteQueue {
  const queueTails = new Map<string, Promise<void>>()

  return (instanceId, action) => {
    const previous = queueTails.get(instanceId) || Promise.resolve()
    const operation = previous.catch(() => undefined).then(action)
    const queueTail = operation.then(
      () => undefined,
      () => undefined,
    )
    queueTails.set(instanceId, queueTail)
    void queueTail.then(() => {
      if (queueTails.get(instanceId) === queueTail)
        queueTails.delete(instanceId)
    })
    return operation
  }
}

/** 懒创建 idb-keyval Store；SSR 或不支持 IndexedDB 时返回 null。 */
function getIndexedDBStore() {
  if (typeof indexedDB === 'undefined')
    return null
  indexedDBStore ||= createStore(DB_NAME, STATE_STORE)
  return indexedDBStore
}

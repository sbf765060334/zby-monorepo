/**
 * 文件职责：把自定义视图状态落到本地 IndexedDB。
 *
 * Adapter 对外只有 load 和 update(latest => next)。同一个 instanceId 的读写会排队，
 * 写入在同一笔事务里对着磁盘最新值执行 recipe，不再先读后写拆成两笔事务。
 */
import type {
  ProViewManagementAdapter,
  ProViewManagementStorageState,
  ProViewManagementView,
} from './interface'
import { normalizeCustomViews } from './utils'

const DB_NAME = 'zby-ui-pro-view-management'
const DB_VERSION = 2
const STATE_STORE = 'state'
const LEGACY_VIEW_STORE = 'views'
const LEGACY_META_STORE = 'meta'

type StoredState<TSnapshot> = ProViewManagementStorageState<TSnapshot> & {
  instanceId: string
}

type LegacyStoredView<TSnapshot> = ProViewManagementView<TSnapshot> & {
  instanceId: string
  storageKey: string
}

type LegacyStoredMeta = {
  instanceId: string
  activeViewId?: string
}

type StorageWriteAction = () => Promise<void>
type StorageWriteQueue = (
  instanceId: string,
  action: StorageWriteAction,
) => Promise<void>

/** 默认 IndexedDB Adapter 的跨实例队列；相同 instanceId 严格串行。 */
const enqueueIndexedDBWrite = createStorageWriteQueue()

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
      let loaded = normalizeProViewManagementStorageState<TSnapshot>()
      await enqueueIndexedDBWrite(instanceId, async () => {
        loaded = await readState<TSnapshot>(instanceId)
      })
      return loaded
    },
    update(instanceId, recipe) {
      return enqueueIndexedDBWrite(instanceId, () =>
        updateState(instanceId, recipe))
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

function canUseIndexedDB() {
  return typeof indexedDB !== 'undefined'
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (!canUseIndexedDB()) {
    return Promise.resolve(null)
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = request.result
      const transaction = request.transaction

      if (!db.objectStoreNames.contains(STATE_STORE)) {
        db.createObjectStore(STATE_STORE, {
          keyPath: 'instanceId',
        })
      }

      if (transaction) {
        migrateLegacyStores(db, transaction, event.oldVersion)
      }
    }
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

function migrateLegacyStores(
  db: IDBDatabase,
  transaction: IDBTransaction,
  oldVersion: number,
) {
  if (oldVersion >= 2) {
    return
  }

  const hasLegacyViews = db.objectStoreNames.contains(LEGACY_VIEW_STORE)
  const hasLegacyMeta = db.objectStoreNames.contains(LEGACY_META_STORE)
  if (!hasLegacyViews && !hasLegacyMeta) {
    return
  }

  const stateStore = transaction.objectStore(STATE_STORE)
  const writeState = (
    views: LegacyStoredView<unknown>[],
    metas: LegacyStoredMeta[],
  ) => {
    const grouped = new Map<string, LegacyStoredView<unknown>[]>()
    views.forEach((item) => {
      const list = grouped.get(item.instanceId) ?? []
      list.push(item)
      grouped.set(item.instanceId, list)
    })
    const activeViewIds = new Map(
      metas.map((item) => [item.instanceId, item.activeViewId]),
    )
    const instanceIds = new Set([
      ...grouped.keys(),
      ...activeViewIds.keys(),
    ])

    instanceIds.forEach((instanceId) => {
      const storedViews = grouped.get(instanceId) ?? []
      stateStore.put({
        instanceId,
        ...normalizeProViewManagementStorageState({
          views: storedViews.map(
            ({
              instanceId: _instanceId,
              storageKey: _storageKey,
              ...view
            }) => view,
          ),
          activeViewId: activeViewIds.get(instanceId),
        }),
      } satisfies StoredState<unknown>)
    })

    if (hasLegacyViews) {
      db.deleteObjectStore(LEGACY_VIEW_STORE)
    }
    if (hasLegacyMeta) {
      db.deleteObjectStore(LEGACY_META_STORE)
    }
  }

  if (hasLegacyViews && hasLegacyMeta) {
    const viewsRequest = transaction
      .objectStore(LEGACY_VIEW_STORE)
      .getAll() as IDBRequest<LegacyStoredView<unknown>[]>
    viewsRequest.onsuccess = () => {
      const metaRequest = transaction
        .objectStore(LEGACY_META_STORE)
        .getAll() as IDBRequest<LegacyStoredMeta[]>
      metaRequest.onsuccess = () => {
        writeState(viewsRequest.result ?? [], metaRequest.result ?? [])
      }
    }
    return
  }

  if (hasLegacyViews) {
    const viewsRequest = transaction
      .objectStore(LEGACY_VIEW_STORE)
      .getAll() as IDBRequest<LegacyStoredView<unknown>[]>
    viewsRequest.onsuccess = () => {
      writeState(viewsRequest.result ?? [], [])
    }
    return
  }

  const metaRequest = transaction
    .objectStore(LEGACY_META_STORE)
    .getAll() as IDBRequest<LegacyStoredMeta[]>
  metaRequest.onsuccess = () => {
    writeState([], metaRequest.result ?? [])
  }
}

async function readState<TSnapshot>(instanceId: string) {
  const db = await openDatabase()
  if (!db) {
    return normalizeProViewManagementStorageState<TSnapshot>()
  }

  return new Promise<ProViewManagementStorageState<TSnapshot>>(
    (resolve, reject) => {
      const transaction = db.transaction(STATE_STORE, 'readonly')
      const request = transaction
        .objectStore(STATE_STORE)
        .get(instanceId) as IDBRequest<StoredState<TSnapshot> | undefined>

      transaction.oncomplete = () => {
        db.close()
        resolve(normalizeProViewManagementStorageState(request.result))
      }
      transaction.onerror = () => {
        db.close()
        reject(transaction.error)
      }
    },
  )
}

async function updateState<TSnapshot>(
  instanceId: string,
  recipe: (
    current: ProViewManagementStorageState<TSnapshot>,
  ) => ProViewManagementStorageState<TSnapshot>,
) {
  const db = await openDatabase()
  if (!db) {
    return
  }

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STATE_STORE, 'readwrite')
    const store = transaction.objectStore(STATE_STORE)
    const request = store.get(instanceId) as IDBRequest<
      StoredState<TSnapshot> | undefined
    >

    request.onsuccess = () => {
      const next = recipe(
        normalizeProViewManagementStorageState(request.result),
      )
      store.put({
        instanceId,
        views: next.views,
        activeViewId: next.activeViewId,
      } satisfies StoredState<TSnapshot>)
    }
    transaction.oncomplete = () => {
      db.close()
      resolve()
    }
    transaction.onerror = () => {
      db.close()
      reject(transaction.error)
    }
  })
}

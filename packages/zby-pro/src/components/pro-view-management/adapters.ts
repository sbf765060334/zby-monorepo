import type {
  ProViewManagementAdapter,
  ProViewManagementRemoteAdapterConfig,
  ProViewManagementStorageState,
  ProViewManagementView,
} from './interface'
import {
  normalizeCustomViews,
  validateCreateViewName,
  validateRenameViewName,
  type ViewNameValidationMessages,
} from './utils'

const DB_NAME = 'zby-ui-pro-view-management'
const DB_VERSION = 1
const VIEW_STORE = 'views'
const META_STORE = 'meta'

type StoredView<TSnapshot> = ProViewManagementView<TSnapshot> & {
  instanceId: string
  storageKey: string
}

type StoredMeta = {
  instanceId: string
  activeViewId?: string
}

export type IndexedDBProViewManagementAdapterOptions = {
  validationMessages?: ViewNameValidationMessages
}

const DEFAULT_VIEW_NAME_VALIDATION_MESSAGES: ViewNameValidationMessages = {
  required: '请输入视图名称',
  duplicated: '视图名称已存在',
  maxCustomViews: (count) => `最多只能创建 ${count} 个自定义视图`,
}

function canUseIndexedDB() {
  return typeof indexedDB !== 'undefined'
}

function getStorageKey(instanceId: string, viewId: string) {
  return `${instanceId}:${viewId}`
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (!canUseIndexedDB()) {
    return Promise.resolve(null)
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains(VIEW_STORE)) {
        const store = db.createObjectStore(VIEW_STORE, {
          keyPath: 'storageKey',
        })
        store.createIndex('instanceId', 'instanceId', { unique: false })
      }

      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'instanceId' })
      }
    }
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T> | void,
) {
  const db = await openDatabase()

  if (!db) {
    return undefined
  }

  return new Promise<T | undefined>((resolve, reject) => {
    const transaction = db.transaction(storeName, mode)
    const store = transaction.objectStore(storeName)
    const request = action(store)

    transaction.oncomplete = () => {
      db.close()
      resolve(request ? request.result : undefined)
    }
    transaction.onerror = () => {
      db.close()
      reject(transaction.error)
    }
  })
}

async function readViews<TSnapshot>(instanceId: string) {
  const db = await openDatabase()

  if (!db) {
    return []
  }

  return new Promise<ProViewManagementView<TSnapshot>[]>((resolve, reject) => {
    const transaction = db.transaction(VIEW_STORE, 'readonly')
    const store = transaction.objectStore(VIEW_STORE)
    const index = store.index('instanceId')
    const request = index.getAll(instanceId)

    request.onsuccess = () => {
      const storedViews = (request.result ?? []) as Array<
        StoredView<TSnapshot>
      >
      resolve(
        normalizeCustomViews(
          storedViews.map(
            ({ instanceId: _instanceId, storageKey: _storageKey, ...view }) =>
              view,
          ),
        ),
      )
    }
    request.onerror = () => reject(request.error)
    transaction.oncomplete = () => db.close()
    transaction.onerror = () => {
      db.close()
      reject(transaction.error)
    }
  })
}

async function readMeta(instanceId: string) {
  return withStore<StoredMeta>(META_STORE, 'readonly', (store) =>
    store.get(instanceId))
}

export function createIndexedDBProViewManagementAdapter<TSnapshot = unknown>(
  options: IndexedDBProViewManagementAdapterOptions = {},
): ProViewManagementAdapter<TSnapshot> {
  const validationMessages =
    options.validationMessages ?? DEFAULT_VIEW_NAME_VALIDATION_MESSAGES

  return {
    async load(instanceId) {
      const [views, meta] = await Promise.all([
        readViews<TSnapshot>(instanceId),
        readMeta(instanceId),
      ])

      return {
        views,
        activeViewId: meta?.activeViewId,
      }
    },
    async validateCreate(instanceId, payload) {
      const currentViews = await readViews<TSnapshot>(instanceId)

      return validateCreateViewName(
        {
          ...payload,
          customViews: currentViews,
        },
        validationMessages,
      )
    },
    async validateRename(instanceId, payload) {
      const currentViews = await readViews<TSnapshot>(instanceId)

      return validateRenameViewName(
        {
          ...payload,
          customViews: currentViews,
        },
        validationMessages,
      )
    },
    async create(instanceId, view) {
      await withStore(VIEW_STORE, 'readwrite', (store) =>
        store.put({
          ...view,
          scope: 'custom',
          instanceId,
          storageKey: getStorageKey(instanceId, view.id),
        } satisfies StoredView<TSnapshot>))
    },
    async update(instanceId, viewId, patch) {
      const storageKey = getStorageKey(instanceId, viewId)
      const current = await withStore<StoredView<TSnapshot>>(
        VIEW_STORE,
        'readonly',
        (store) => store.get(storageKey),
      )

      if (!current) {
        return
      }

      await withStore(VIEW_STORE, 'readwrite', (store) =>
        store.put({
          ...current,
          ...patch,
          id: current.id,
          scope: 'custom',
          instanceId,
          storageKey,
        }))
    },
    async remove(instanceId, viewId) {
      await withStore(VIEW_STORE, 'readwrite', (store) =>
        store.delete(getStorageKey(instanceId, viewId)))
    },
    async reorder(instanceId, orderedViewIds) {
      const currentViews = await readViews<TSnapshot>(instanceId)
      const orderLookup = new Map(
        orderedViewIds.map((viewId, index) => [viewId, index]),
      )

      await Promise.all(
        currentViews.map(async (view, index) => {
          const storageKey = getStorageKey(instanceId, view.id)
          await withStore(VIEW_STORE, 'readwrite', (store) =>
            store.put({
              ...view,
              instanceId,
              storageKey,
              order: orderLookup.get(view.id) ?? index,
            } satisfies StoredView<TSnapshot>))
        }),
      )
    },
    async setActiveViewId(instanceId, viewId) {
      await withStore(META_STORE, 'readwrite', (store) =>
        store.put({
          instanceId,
          activeViewId: viewId,
        } satisfies StoredMeta))
    },
  }
}

export function createRemoteProViewManagementAdapter<TSnapshot = unknown>(
  config: ProViewManagementRemoteAdapterConfig<TSnapshot>,
): ProViewManagementAdapter<TSnapshot> {
  return config
}

export type { ProViewManagementStorageState }

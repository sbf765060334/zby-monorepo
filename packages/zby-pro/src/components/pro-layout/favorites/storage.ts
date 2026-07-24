import { createStore, get, set } from 'idb-keyval'

/**
 * 菜单收藏使用自己的数据库与 object store，不和 router-core 的固定页签记录混写。
 * 这样既保持 UI 状态与路由状态的职责边界，也避免两个模块更新同一条记录时互相覆盖。
 */
const DB_NAME = 'zby-pro-layout'
const FAVORITES_STORE_NAME = 'menu-favorites'

type StorageWriteAction = () => Promise<void>

/** 相同 storageKey 的保存严格串行，保证快速收藏、取消收藏时最后一次操作最终落盘。 */
const writeQueueTails = new Map<string, Promise<void>>()

/** 延迟创建 IndexedDB Store，使 SSR 和没有 IndexedDB 的环境仍然可以安全导入 ProLayout。 */
let favoritesStore: ReturnType<typeof createStore> | undefined

/** 从独立的 IndexedDB 记录中读取当前应用的菜单收藏。 */
export async function loadFavoriteMenuPaths(storageKey: string): Promise<string[]> {
  const store = getFavoritesStore()
  if (!store)
    return []

  return normalizeFavoriteMenuPaths(await get<unknown>(storageKey, store))
}

/**
 * 保存完整的菜单收藏快照。
 * 入队前会复制并标准化数组，调用方随后修改原数组不会影响已经排队的写入内容。
 */
export function saveFavoriteMenuPaths(
  storageKey: string,
  favoritePaths: readonly string[],
): Promise<void> {
  const store = getFavoritesStore()
  if (!store)
    return Promise.resolve()

  const snapshot = normalizeFavoriteMenuPaths(favoritePaths)
  return enqueueWrite(storageKey, () => set(storageKey, snapshot, store))
}

/** 不信任 IndexedDB 中的历史数据，只保留非空字符串并按首次出现顺序去重。 */
export function normalizeFavoriteMenuPaths(value: unknown): string[] {
  if (!Array.isArray(value))
    return []

  return Array.from(new Set(
    value.filter((item): item is string => typeof item === 'string' && item.length > 0),
  ))
}

function getFavoritesStore() {
  if (typeof indexedDB === 'undefined')
    return null

  favoritesStore ||= createStore(DB_NAME, FAVORITES_STORE_NAME)
  return favoritesStore
}

function enqueueWrite(storageKey: string, action: StorageWriteAction) {
  // 前一次保存失败不应阻断后续保存，因此新任务从一个已吸收错误的队尾继续执行。
  const previous = writeQueueTails.get(storageKey) || Promise.resolve()
  const operation = previous.catch(() => undefined).then(action)
  const queueTail = operation.then(
    () => undefined,
    () => undefined,
  )

  writeQueueTails.set(storageKey, queueTail)
  void queueTail.then(() => {
    // 完成时可能已有新任务入队，只清理仍指向当前队尾的记录。
    if (writeQueueTails.get(storageKey) === queueTail)
      writeQueueTails.delete(storageKey)
  })

  return operation
}

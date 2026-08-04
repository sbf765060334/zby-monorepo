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

export function resolveStorageAdapter(
  value: false | RouterStorageAdapter | undefined,
) {
  return value === false ? false : value || DEFAULT_STORAGE_ADAPTER
}

interface CreateRouterPersistenceOptions<Route extends RouterRoute> {
  storageAdapter: false | RouterStorageAdapter
  registry: RouteRegistry<Route>
  cache: RouterUrlCache
  getState: () => RouterCoreState<Route>
  setState: StoreApi<RouterCoreState<Route>>['setState']
  getOnStorageError: () => RouterRuntimeOptions['onStorageError'] | null
}

export interface RouterPersistence {
  handleParamsPathMapChange: (
    value: Record<string, string>,
    tabKey: string,
    pathname: string | null,
  ) => void
  persistFixedTabs: (value: readonly string[]) => void
  persistParamsPathMap: (value: Record<string, string>) => void
  persistFavoriteRoutePaths: (value: readonly string[]) => void
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
  let fixedTabsMutationVersion = 0
  let favoriteRoutesMutationVersion = 0
  const pendingParamsPathMutations = new Map<string, string | null>()

  function handleParamsPathMapChange(
    value: Record<string, string>,
    tabKey: string,
    pathname: string | null,
  ) {
    if (!getState().storageHydrated) {
      pendingParamsPathMutations.set(tabKey, pathname)
      return
    }
    persistParamsPathMap(value)
  }

  function persistFixedTabs(value: readonly string[]) {
    fixedTabsMutationVersion += 1
    persist('saveFixedTabs', (adapter, storageKey) =>
      adapter.saveFixedTabs(storageKey, [...value]))
  }

  function persistParamsPathMap(value: Record<string, string>) {
    persist(
      'saveFixedParamsPathMap',
      (adapter, storageKey) =>
        adapter.saveFixedParamsPathMap(storageKey, value),
    )
  }

  function persistFavoriteRoutePaths(value: readonly string[]) {
    favoriteRoutesMutationVersion += 1
    persist('saveFavoriteRoutePaths', (adapter, storageKey) =>
      adapter.saveFavoriteRoutePaths(storageKey, [...value]))
  }

  function reportStorageErrorCallbackError(error: unknown) {
    console.error('[RouterCore] onStorageError callback failed.', error)
  }

  function notifyStorageError(
    error: unknown,
    info: RouterStorageErrorInfo,
  ) {
    const callback = getOnStorageError()
    if (!callback)
      return

    try {
      void Promise.resolve(callback(error, info))
        .catch(reportStorageErrorCallbackError)
    } catch (callbackError) {
      reportStorageErrorCallbackError(callbackError)
    }
  }

  function persist(
    phase: Exclude<RouterStorageErrorPhase, 'load'>,
    action: (adapter: RouterStorageAdapter, storageKey: string) => Promise<void>,
  ) {
    if (storageAdapter === false)
      return
    const storageKey = getState().storageKey
    void Promise.resolve().then(() => action(storageAdapter, storageKey)).catch((error) => {
      notifyStorageError(error, { storageKey, phase })
    })
  }

  function hydrateStorage() {
    if (storageHydrationPromise)
      return storageHydrationPromise
    if (storageAdapter === false || getState().storageHydrated)
      return Promise.resolve()

    const promise = executeHydration().finally(() => {
      storageHydrationPromise = null
    })
    storageHydrationPromise = promise
    return promise
  }

  async function executeHydration() {
    if (storageAdapter === false)
      return
    const storageKey = getState().storageKey
    const fixedTabsVersion = fixedTabsMutationVersion
    const favoriteRoutesVersion = favoriteRoutesMutationVersion
    setState({ storageLoading: true, storageLoadError: undefined })

    try {
      const loaded = normalizeRouterStorageState(
        await storageAdapter.load(storageKey),
      )
      const state = getState()
      const fixedUnchanged = fixedTabsVersion === fixedTabsMutationVersion
      const favoritesUnchanged = favoriteRoutesVersion === favoriteRoutesMutationVersion

      const mergedParamsPathMap = { ...loaded.fixedParamsPathMap }
      pendingParamsPathMutations.forEach((pathname, tabKey) => {
        if (pathname)
          mergedParamsPathMap[tabKey] = pathname
        else
          delete mergedParamsPathMap[tabKey]
      })
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
      setState({ storageLoading: false, storageLoadError: error })
      notifyStorageError(error, {
        storageKey,
        phase: 'load',
      })
    }
  }

  return {
    handleParamsPathMapChange,
    persistFixedTabs,
    persistParamsPathMap,
    persistFavoriteRoutePaths,
    hydrateStorage,
  }
}

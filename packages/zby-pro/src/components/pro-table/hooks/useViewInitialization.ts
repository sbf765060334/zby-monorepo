import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import type {
  ProViewManagementAdapter,
  ProViewManagementStorageState,
} from '../../pro-view-management'
import {
  normalizeCustomViews,
  normalizeSystemViews,
  resolveActiveView,
} from '../../pro-view-management/utils'
import type { ProTableController, ProTableQueryRecord, ProTableViewSnapshot } from '../interface'
import { DEFAULT_VIEW_LABEL } from '../search-region/constants'
import type { ProTableViewState, ProTableViewStore } from '../store'
import { mergeViewQueryWithOverlay, PRO_TABLE_DEFAULT_VIEW_ID } from '../utils'
import { consumeProTableQueryOverlay } from '../controller'

type ViewInitializationParams<RecordType, Query extends ProTableQueryRecord, Summary> = {
  controller: ProTableController<RecordType, Query, Summary>
  viewStore: ProTableViewStore
  buildSystemDefaultSnapshot: () => ProTableViewSnapshot<Query>
  normalizeSnapshotForCurrentSchema: (
    snapshot: ProTableViewSnapshot<Query> | null | undefined,
  ) => ProTableViewSnapshot<Query>
  viewsEnabled: boolean
  viewManagementAdapter?: ProViewManagementAdapter<ProTableViewSnapshot<Query>>
  viewManagementInstanceId: string
}

type ViewInitializationResult = {
  error?: unknown
  loading: boolean
  ready: boolean
  refetch?: boolean
}

const EMPTY_STORAGE_STATE = {
  views: [],
} satisfies ProViewManagementStorageState<never>

type ViewSession = {
  adapter: unknown
  instanceId: string
  state: Pick<ProTableViewState, 'mergedColumnsPreferences' | 'mergedFilterPreferences' | 'viewStorage'>
}

// 页面可以缓存外部 controller；视图运行状态跟随它存活，不持有页面 DOM 或弹窗状态。
const viewSessions = new WeakMap<object, ViewSession>()
const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

export function useViewInitialization<RecordType, Query extends ProTableQueryRecord, Summary>({
  controller,
  viewStore,
  buildSystemDefaultSnapshot,
  normalizeSnapshotForCurrentSchema,
  viewsEnabled,
  viewManagementAdapter,
  viewManagementInstanceId,
}: ViewInitializationParams<RecordType, Query, Summary>) {
  const [retryVersion, setRetryVersion] = useState(0)
  const initializationScope = useMemo(
    () => ({ controller, viewManagementAdapter, viewManagementInstanceId, viewsEnabled, retryVersion }),
    [controller, retryVersion, viewManagementAdapter, viewManagementInstanceId, viewsEnabled],
  )
  const applyContext = {
    scope: initializationScope,
    buildSystemDefaultSnapshot,
    normalizeSnapshotForCurrentSchema,
  }
  const applyContextRef = useRef(applyContext)
  useBrowserLayoutEffect(() => {
    // 异步完成时使用最新已提交的字段配置；Suspense 中未提交的渲染不能改变应用目标。
    applyContextRef.current = applyContext
  })
  const [initialization, setInitialization] = useState<
    ViewInitializationResult & { scope: typeof initializationScope }
  >({
    scope: initializationScope,
    loading: viewsEnabled,
    ready: false,
  })
  const retry = useCallback(() => {
    setInitialization((current) => ({
      ...current,
      error: undefined,
      loading: true,
      ready: false,
    }))
    setRetryVersion((version) => version + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    const updateInitialization = (result: ViewInitializationResult) => {
      setInitialization({ ...result, scope: initializationScope })
    }
    const {
      normalizeSnapshotForCurrentSchema: normalizeSnapshot,
    } = applyContextRef.current
    const tableController = controller
    const store = viewStore

    let rememberSession = false
    const saveSession = () => {
      if (!rememberSession) return
      const state = store.getState()
      viewSessions.set(tableController, {
        adapter: viewManagementAdapter,
        instanceId: viewManagementInstanceId,
        state: {
          mergedColumnsPreferences: state.mergedColumnsPreferences,
          mergedFilterPreferences: state.mergedFilterPreferences,
          viewStorage: state.viewStorage,
        },
      })
    }
    const unsubscribe = store.subscribe(saveSession)
    const cleanup = () => {
      cancelled = true
      unsubscribe()
    }
    const cached = viewSessions.get(tableController)
    if (
      viewsEnabled && cached &&
      cached.adapter === viewManagementAdapter &&
      cached.instanceId === viewManagementInstanceId
    ) {
      const actions = store.getState()
      const preferences = normalizeSnapshot({
        query: {},
        columnPreferences: cached.state.mergedColumnsPreferences,
        filterPreferences: cached.state.mergedFilterPreferences,
      })
      actions.setMergedColumnsPreferences(preferences.columnPreferences)
      actions.setMergedFilterPreferences(preferences.filterPreferences)
      actions.setViewStorage(cached.state.viewStorage)
      actions.setColumnsReady(true)
      rememberSession = true
      saveSession()
      updateInitialization({ loading: false, ready: true })
      return cleanup
    }
    viewSessions.delete(tableController)

    const applyLoadedStorageState = (
      storageState: ProViewManagementStorageState<ProTableViewSnapshot<Query>>,
      error?: unknown,
    ) => {
      const context = applyContextRef.current
      if (cancelled || context.scope !== initializationScope) {
        return
      }

      const defaultSnapshot = context.buildSystemDefaultSnapshot()
      const normalizedSystemViews = normalizeSystemViews([
        {
          id: PRO_TABLE_DEFAULT_VIEW_ID,
          name: DEFAULT_VIEW_LABEL,
          scope: 'system' as const,
          order: 0,
          snapshot: defaultSnapshot,
        },
      ])
      const normalizedCustomViews = normalizeCustomViews(storageState.views)
      const activeView = viewsEnabled
        ? resolveActiveView(
            storageState.activeViewId ?? null,
            normalizedSystemViews,
            normalizedCustomViews,
          )
        : normalizedSystemViews[0]
      const initialSnapshot = context.normalizeSnapshotForCurrentSchema(activeView?.snapshot ?? defaultSnapshot)
      const overlay = consumeProTableQueryOverlay(tableController)
      const controllerState = tableController.getState()
      const actions = store.getState()
      const hasCustomSort = controllerState.sort.length > 0

      actions.setMergedColumnsPreferences(initialSnapshot.columnPreferences)
      actions.setMergedFilterPreferences(initialSnapshot.filterPreferences)
      actions.setViewStorage(
        viewsEnabled
          ? {
              views: normalizedCustomViews,
              activeViewId: activeView?.id,
            }
          : undefined,
      )
      if (viewsEnabled) {
        tableController.setViewState({
          query: mergeViewQueryWithOverlay(
            controllerState.defaultQuery,
            initialSnapshot.query,
            overlay,
          ),
          ...(hasCustomSort ? {} : { sorter: initialSnapshot.sorter ?? null }),
          committed: true,
        })
      }
      actions.setColumnsReady(true)
      rememberSession = viewsEnabled && error === undefined
      saveSession()
      updateInitialization({
        error,
        loading: false,
        ready: true,
        // 只记录补查意图，先让状态提交并通知 onReady，再由统一请求入口执行。
        refetch: viewsEnabled && controllerState.requested === true,
      })
    }

    updateInitialization({
      error: undefined,
      loading: viewsEnabled,
      ready: !viewsEnabled,
    })

    if (!viewsEnabled || !viewManagementAdapter) {
      applyLoadedStorageState(
        EMPTY_STORAGE_STATE as ProViewManagementStorageState<ProTableViewSnapshot<Query>>,
      )
      return cleanup
    }

    void Promise.resolve()
      .then(() => viewManagementAdapter.load(viewManagementInstanceId))
      .then((storageState) => {
        applyLoadedStorageState(storageState)
      })
      .catch((error) => {
        // Promise 可以用 undefined 等假值拒绝，仍必须保留失败状态并提供重试入口。
        const loadError = error || new Error('Failed to load ProTable views.')
        applyLoadedStorageState(
          EMPTY_STORAGE_STATE as ProViewManagementStorageState<ProTableViewSnapshot<Query>>,
          loadError,
        )
      })

    return cleanup
  }, [initializationScope])

  const matchesScope = initialization.scope === initializationScope
  return {
    error: matchesScope ? initialization.error : undefined,
    loading: matchesScope ? initialization.loading : viewsEnabled,
    ready: matchesScope && initialization.ready,
    refetch: matchesScope && initialization.refetch === true,
    key: initializationScope,
    retry,
  }
}

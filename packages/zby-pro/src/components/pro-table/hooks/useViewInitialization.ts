import { useCallback, useEffect, useRef, useState } from 'react'

import type {
  ProViewManagementAdapter,
  ProViewManagementStorageState,
} from '../../pro-view-management'
import {
  normalizeCustomViews,
  normalizeSystemViews,
  resolveActiveView,
} from '../../pro-view-management/utils'
import type { ProTableController, ProTableViewSnapshot } from '../interface'
import { DEFAULT_VIEW_LABEL } from '../search-region/constants'
import type { ProTableViewStore } from '../store'
import { mergeViewQueryWithOverlay, PRO_TABLE_DEFAULT_VIEW_ID } from '../utils'
import { consumeProTableQueryOverlay, ignoreProTableRequestError } from '../controller'

type ViewInitializationParams<RecordType, Query extends Record<string, unknown>, Summary> = {
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
}

const EMPTY_STORAGE_STATE = {
  views: [],
} satisfies ProViewManagementStorageState<never>

export function useViewInitialization<RecordType, Query extends Record<string, unknown>, Summary>({
  controller,
  viewStore,
  buildSystemDefaultSnapshot,
  normalizeSnapshotForCurrentSchema,
  viewsEnabled,
  viewManagementAdapter,
  viewManagementInstanceId,
}: ViewInitializationParams<RecordType, Query, Summary>) {
  const applyContextRef = useRef({
    buildSystemDefaultSnapshot,
    controller,
    normalizeSnapshotForCurrentSchema,
    viewStore,
  })
  applyContextRef.current = {
    buildSystemDefaultSnapshot,
    controller,
    normalizeSnapshotForCurrentSchema,
    viewStore,
  }
  const [retryVersion, setRetryVersion] = useState(0)
  const [initialization, setInitialization] = useState<ViewInitializationResult>({
    loading: viewsEnabled,
    ready: false,
  })
  const retry = useCallback(() => {
    setInitialization((current) => ({
      ...current,
      error: undefined,
      loading: true,
    }))
    setRetryVersion((version) => version + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    const {
      buildSystemDefaultSnapshot: buildDefaultSnapshot,
      controller: tableController,
      normalizeSnapshotForCurrentSchema: normalizeSnapshot,
      viewStore: store,
    } = applyContextRef.current

    const applyLoadedStorageState = (
      storageState: ProViewManagementStorageState<ProTableViewSnapshot<Query>>,
      error?: unknown,
    ) => {
      if (cancelled) {
        return
      }

      const defaultSnapshot = buildDefaultSnapshot()
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
      const initialSnapshot = normalizeSnapshot(activeView?.snapshot ?? defaultSnapshot)
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
        if (controllerState.requested === true) {
          ignoreProTableRequestError(tableController.submitQuery({ resetPage: true }))
        }
      }
      actions.setColumnsReady(true)
      setInitialization({
        error,
        loading: false,
        ready: true,
      })
    }

    setInitialization({
      error: undefined,
      loading: viewsEnabled,
      ready: !viewsEnabled,
    })

    if (!viewsEnabled || !viewManagementAdapter) {
      applyLoadedStorageState(
        EMPTY_STORAGE_STATE as ProViewManagementStorageState<ProTableViewSnapshot<Query>>,
      )
      return () => {
        cancelled = true
      }
    }

    void viewManagementAdapter
      .load(viewManagementInstanceId)
      .then((storageState) => {
        applyLoadedStorageState(storageState)
      })
      .catch((error) => {
        applyLoadedStorageState(
          EMPTY_STORAGE_STATE as ProViewManagementStorageState<ProTableViewSnapshot<Query>>,
          error,
        )
      })

    return () => {
      cancelled = true
    }
  }, [retryVersion, viewManagementAdapter, viewManagementInstanceId, viewsEnabled])

  return {
    ...initialization,
    retry,
  }
}

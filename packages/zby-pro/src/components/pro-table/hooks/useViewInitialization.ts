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
import { consumeProTableQueryOverlay } from '../controller'

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

type ViewInitializationResult<Query extends Record<string, unknown>> = {
  error?: unknown
  loading: boolean
  ready: boolean
  initialStorageState?: ProViewManagementStorageState<ProTableViewSnapshot<Query>>
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
  const initializedVersionRef = useRef<number | null>(null)
  const [retryVersion, setRetryVersion] = useState(0)
  const [initialization, setInitialization] = useState<ViewInitializationResult<Query>>({
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
    if (initializedVersionRef.current === retryVersion) {
      return
    }

    let cancelled = false

    const applyInitialSnapshot = async () => {
      const defaultSnapshot = buildSystemDefaultSnapshot()
      const normalizedSystemViews = normalizeSystemViews([
        {
          id: PRO_TABLE_DEFAULT_VIEW_ID,
          name: DEFAULT_VIEW_LABEL,
          scope: 'system' as const,
          order: 0,
          snapshot: defaultSnapshot,
        },
      ])

      setInitialization((current) => ({
        ...current,
        error: undefined,
        loading: viewsEnabled,
        ready: current.ready,
      }))

      const applyLoadedStorageState = (
        storageState: ProViewManagementStorageState<ProTableViewSnapshot<Query>>,
        error?: unknown,
      ) => {
        if (cancelled) {
          return
        }

        const normalizedCustomViews = normalizeCustomViews(storageState.views)
        const activeView = viewsEnabled
          ? resolveActiveView(
              storageState.activeViewId ?? null,
              normalizedSystemViews,
              normalizedCustomViews,
            )
          : normalizedSystemViews[0]
        const initialSnapshot = normalizeSnapshotForCurrentSchema(
          activeView?.snapshot ?? defaultSnapshot,
        )
        const overlay = consumeProTableQueryOverlay(controller)
        const controllerState = controller.getState()
        const actions = viewStore.getState()
        const hasCustomSort = controllerState.sort.length > 0

        actions.setMergedColumnsPreferences(initialSnapshot.columnPreferences)
        actions.setMergedFilterPreferences(initialSnapshot.filterPreferences)
        if (viewsEnabled) {
          controller.setViewState({
            query: mergeViewQueryWithOverlay(
              controllerState.defaultQuery,
              initialSnapshot.query,
              overlay,
            ),
            ...(hasCustomSort ? {} : { sorter: initialSnapshot.sorter ?? null }),
            committed: true,
          })
          if (controllerState.requested === true) {
            void controller.submitQuery({ resetPage: true }).catch(() => undefined)
          }
        }
        actions.setColumnsReady(true)
        initializedVersionRef.current = retryVersion

        setInitialization({
          error,
          loading: false,
          ready: true,
          initialStorageState: viewsEnabled
            ? {
                views: normalizedCustomViews,
                activeViewId: activeView?.id,
              }
            : undefined,
        })
      }

      if (!viewsEnabled || !viewManagementAdapter) {
        applyLoadedStorageState(
          EMPTY_STORAGE_STATE as ProViewManagementStorageState<ProTableViewSnapshot<Query>>,
        )
        return
      }

      try {
        const storageState = await viewManagementAdapter.load(viewManagementInstanceId)
        applyLoadedStorageState(storageState)
      } catch (error) {
        applyLoadedStorageState(
          EMPTY_STORAGE_STATE as ProViewManagementStorageState<ProTableViewSnapshot<Query>>,
          error,
        )
      }
    }

    void applyInitialSnapshot()

    return () => {
      cancelled = true
    }
  }, [
    buildSystemDefaultSnapshot,
    controller,
    normalizeSnapshotForCurrentSchema,
    retryVersion,
    viewManagementAdapter,
    viewManagementInstanceId,
    viewStore,
    viewsEnabled,
  ])

  return {
    ...initialization,
    retry,
  }
}

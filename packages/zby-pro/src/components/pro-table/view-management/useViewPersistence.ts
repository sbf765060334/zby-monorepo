import { useCallback, useMemo } from 'react'

import {
  createIndexedDBProViewManagementAdapter,
  type ProViewManagementAdapter,
  type ProViewManagementView,
} from '../../pro-view-management'
import type {
  ProTableController,
  ProTableNewColumnPolicy,
  ProTableSearchField,
  ProTableViewSnapshot,
  ProTableViewsConfig,
} from '../interface'
import type { ProTableViewStore } from '../store'
import {
  buildDefaultColumnPreferences,
} from '../utils/field-config'
import {
  buildViewSnapshot,
  getViewsScopeKey,
  normalizeViewSnapshot,
  pickSearchQuery,
} from '../utils'
import type { ProTableColumnDefinition } from '../utils/columns'

const UNPERSISTED_VIEW_MANAGEMENT_INSTANCE_ID = '__pro_table_unpersisted_views__'
const DEFAULT_VIEW_MANAGEMENT_ADAPTER =
  createIndexedDBProViewManagementAdapter<ProTableViewSnapshot<any>>()

type ViewPersistenceParams<RecordType, Query extends Record<string, unknown>, Summary> = {
  controller: ProTableController<RecordType, Query, Summary>
  viewStore: ProTableViewStore
  views: false | ProTableViewsConfig<Query>
  persistenceKey?: string
  searchFields: ProTableSearchField<Query, RecordType, Summary>[]
  columnDefinitions: ProTableColumnDefinition[]
  newColumnPolicy?: ProTableNewColumnPolicy
}

function createTransientViewManagementAdapter<TSnapshot>(): ProViewManagementAdapter<TSnapshot> {
  let views: ProViewManagementView<TSnapshot>[] = []
  let activeViewId: string | undefined

  return {
    async load() {
      return {
        views,
        activeViewId,
      }
    },
    async create(_instanceId, view) {
      views = views.concat({
        ...view,
        scope: 'custom',
      })
    },
    async update(_instanceId, viewId, patch) {
      views = views.map((view) =>
        view.id === viewId
          ? {
              ...view,
              ...patch,
              id: view.id,
              scope: 'custom',
            }
          : view,
      )
    },
    async remove(_instanceId, viewId) {
      views = views.filter((view) => view.id !== viewId)
      if (activeViewId === viewId) {
        activeViewId = undefined
      }
    },
    async reorder(_instanceId, orderedViewIds) {
      const orderLookup = new Map(orderedViewIds.map((viewId, index) => [viewId, index]))
      views = views
        .map((view, index) => ({
          ...view,
          order: orderLookup.get(view.id) ?? index,
        }))
        .sort((left, right) => left.order - right.order || left.name.localeCompare(right.name))
    },
    async setActiveViewId(_instanceId, viewId) {
      activeViewId = viewId
    },
  }
}

export function useViewPersistence<RecordType, Query extends Record<string, unknown>, Summary>({
  controller,
  viewStore,
  views,
  persistenceKey,
  searchFields,
  columnDefinitions,
  newColumnPolicy,
}: ViewPersistenceParams<RecordType, Query, Summary>) {
  const normalizeSnapshotForCurrentSchema = useCallback(
    (snapshot: ProTableViewSnapshot<Query> | null | undefined) => {
      return normalizeViewSnapshot(snapshot, searchFields, columnDefinitions, newColumnPolicy)
    },
    [columnDefinitions, newColumnPolicy, searchFields],
  )

  const buildSystemDefaultSnapshot = useCallback(
    () =>
      normalizeSnapshotForCurrentSchema({
        query: pickSearchQuery(controller.getState().defaultQuery, searchFields),
        columnPreferences: buildDefaultColumnPreferences(columnDefinitions),
      }),
    [columnDefinitions, controller, normalizeSnapshotForCurrentSchema, searchFields],
  )

  const transientViewManagementAdapter = useMemo(
    () => createTransientViewManagementAdapter<ProTableViewSnapshot<Query>>(),
    [],
  )
  const viewManagementAdapter = useMemo(() => {
    if (views === false) {
      return undefined
    }

    if (views.adapter) {
      return views.adapter
    }

    if (views.adapter === false || !persistenceKey) {
      return transientViewManagementAdapter
    }

    return DEFAULT_VIEW_MANAGEMENT_ADAPTER as ProViewManagementAdapter<ProTableViewSnapshot<Query>>
  }, [persistenceKey, transientViewManagementAdapter, views])
  const viewManagementInstanceId = persistenceKey
    ? getViewsScopeKey(persistenceKey)
    : UNPERSISTED_VIEW_MANAGEMENT_INSTANCE_ID

  const applySnapshotToTable = useCallback(
    async (snapshot: ProTableViewSnapshot<Query>, options?: { submit?: boolean }) => {
      const actions = viewStore.getState()
      const nextQuery = {
        ...(controller.getState().defaultQuery as Record<string, unknown>),
        ...(snapshot.query as Record<string, unknown>),
      } as Query

      actions.setMergedColumnsPreferences(snapshot.columnPreferences)
      controller.setViewState({
        query: nextQuery,
        sorter: snapshot.sorter ?? null,
        committed: true,
      })
      actions.setAdvancedOverlayOpen(false)
      actions.setAdvancedDraftQuery(null)

      if (options?.submit !== false) {
        await controller.submitQuery({ resetPage: true })
      }
    },
    [controller, viewStore],
  )

  const createCurrentSnapshot = useCallback(() => {
    const state = controller.getState()
    const storeState = viewStore.getState()

    return buildViewSnapshot(
      state.committedQuery,
      searchFields,
      columnDefinitions,
      storeState.mergedColumnsPreferences,
      state.sortField && state.sortOrder
        ? {
            field: state.sortField,
            order: state.sortOrder,
          }
        : null,
    )
  }, [columnDefinitions, controller, searchFields, viewStore])

  const handleApplyManagedView = useCallback(
    async (view: ProViewManagementView<ProTableViewSnapshot<Query>>) => {
      await applySnapshotToTable(normalizeSnapshotForCurrentSchema(view.snapshot))
    },
    [applySnapshotToTable, normalizeSnapshotForCurrentSchema],
  )

  const handleResetManagedView = useCallback(
    async (view: ProViewManagementView<ProTableViewSnapshot<Query>>) => {
      await applySnapshotToTable(normalizeSnapshotForCurrentSchema(view.snapshot))
    },
    [applySnapshotToTable, normalizeSnapshotForCurrentSchema],
  )

  return {
    normalizeSnapshotForCurrentSchema,
    buildSystemDefaultSnapshot,
    applySnapshotToTable,
    createCurrentSnapshot,
    viewManagementAdapter,
    viewManagementInstanceId,
    handleApplyManagedView,
    handleResetManagedView,
  }
}

import { useCallback, useMemo } from 'react'

import {
  createIndexedDBProViewManagementAdapter,
  type ProViewManagementAdapter,
  type ProViewManagementView,
} from '../../pro-view-management'
import type {
  ProTableController,
  ProTableFilter,
  ProTableNewColumnPolicy,
  ProTableViewSnapshot,
  ProTableViewsConfig,
} from '../interface'
import type { ProTableViewStore } from '../store'
import {
  buildDefaultColumnPreferences,
} from '../utils/field-config'
import { buildDefaultFilterPreferences } from '../utils/filter-config'
import {
  buildViewSnapshot,
  getViewsScopeKey,
  isSearchValueEqual,
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
  filters: ProTableFilter<Query>[]
  columnDefinitions: ProTableColumnDefinition[]
  newColumnPolicy?: ProTableNewColumnPolicy
}

function createTransientViewManagementAdapter<TSnapshot>(): ProViewManagementAdapter<TSnapshot> {
  let views: ProViewManagementView<TSnapshot>[] = []
  let activeViewId: string | undefined

  return {
    async load() {
      return {
        views: views.map((view) => ({ ...view })),
        activeViewId,
      }
    },
    async update(_instanceId, recipe) {
      const next = recipe({
        views: views.map((view) => ({ ...view })),
        activeViewId,
      })
      views = next.views.map((view) => ({ ...view }))
      activeViewId = next.activeViewId
    },
  }
}

export function useViewPersistence<RecordType, Query extends Record<string, unknown>, Summary>({
  controller,
  viewStore,
  views,
  persistenceKey,
  filters,
  columnDefinitions,
  newColumnPolicy,
}: ViewPersistenceParams<RecordType, Query, Summary>) {
  const normalizeSnapshotForCurrentSchema = useCallback(
    (snapshot: ProTableViewSnapshot<Query> | null | undefined) => {
      return normalizeViewSnapshot(snapshot, filters, columnDefinitions, newColumnPolicy)
    },
    [columnDefinitions, filters, newColumnPolicy],
  )

  const buildSystemDefaultSnapshot = useCallback(
    () =>
      normalizeSnapshotForCurrentSchema({
        query: pickSearchQuery(controller.getState().defaultQuery, filters) as Partial<Query>,
        columnPreferences: buildDefaultColumnPreferences(columnDefinitions),
        filterPreferences: buildDefaultFilterPreferences(filters),
      }),
    [columnDefinitions, controller, filters, normalizeSnapshotForCurrentSchema],
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
      actions.setMergedFilterPreferences(snapshot.filterPreferences)
      controller.setViewState({
        query: nextQuery,
        sorter: snapshot.sorter ?? null,
        committed: true,
      })
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
      state.query,
      filters,
      columnDefinitions,
      storeState.mergedColumnsPreferences,
      state.sortField && state.sortOrder
        ? {
            field: state.sortField,
            order: state.sortOrder,
          }
        : null,
      storeState.mergedFilterPreferences,
    )
  }, [columnDefinitions, controller, filters, viewStore])

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

  const handleSaveManagedView = useCallback(async () => {
    const state = controller.getState()
    const draftQuery = pickSearchQuery(state.query, filters)
    const committedQuery = pickSearchQuery(state.committedQuery, filters)
    const queryKeys = new Set([
      ...Object.keys(draftQuery ?? {}),
      ...Object.keys(committedQuery ?? {}),
    ])

    for (const key of queryKeys) {
      if (
        !isSearchValueEqual(
          (draftQuery as Record<string, unknown>)[key],
          (committedQuery as Record<string, unknown>)[key],
        )
      ) {
        await controller.submitQuery({ resetPage: true })
        return
      }
    }
  }, [controller, filters])

  return {
    normalizeSnapshotForCurrentSchema,
    buildSystemDefaultSnapshot,
    applySnapshotToTable,
    createCurrentSnapshot,
    viewManagementAdapter,
    viewManagementInstanceId,
    handleApplyManagedView,
    handleResetManagedView,
    handleSaveManagedView,
  }
}

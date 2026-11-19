import { useCallback, useMemo } from 'react'

import {
  createIndexedDBProViewManagementAdapter,
  type ProViewManagementAdapter,
  type ProViewManagementStorageState,
  type ProViewManagementView,
} from '../../pro-view-management'
import type {
  ProTableController,
  ProTableFilter,
  ProTableNewColumnPolicy,
  ProTableQueryRecord,
  ProTableViewSnapshot,
  ProTableViewsConfig,
} from '../interface'
import { cancelProTableControllerRequests, clearProTableQueryOverlay } from '../controller'
import { resolveActiveView } from '../../pro-view-management/utils'
import { DEFAULT_VIEW_LABEL } from '../search-region/constants'
import type { ProTableViewStore } from '../store'
import {
  buildDefaultColumnPreferences,
} from '../utils/field-config'
import { buildDefaultFilterPreferences } from '../utils/filter-config'
import {
  buildViewSnapshot,
  getViewsScopeKey,
  isSearchValueEqual,
  mergeSearchQuery,
  normalizeViewSnapshot,
  pickSearchQuery,
  PRO_TABLE_DEFAULT_VIEW_ID,
} from '../utils'
import type { ProTableColumnDefinition } from '../utils/columns'

const UNPERSISTED_VIEW_MANAGEMENT_INSTANCE_ID = '__pro_table_unpersisted_views__'
const DEFAULT_VIEW_MANAGEMENT_ADAPTER =
  createIndexedDBProViewManagementAdapter<ProTableViewSnapshot<any>>()

type ViewPersistenceParams<RecordType, Query extends ProTableQueryRecord, Summary> = {
  controller: ProTableController<RecordType, Query, Summary>
  viewStore: ProTableViewStore
  views: false | ProTableViewsConfig<Query>
  persistenceKey?: string
  filters: ProTableFilter<Query>[]
  columnDefinitions: ProTableColumnDefinition[]
  newColumnPolicy?: ProTableNewColumnPolicy
}

function createTransientViewManagementAdapter<TSnapshot>(): ProViewManagementAdapter<TSnapshot> {
  const states = new Map<string, ProViewManagementStorageState<TSnapshot>>()
  const readState = (instanceId: string): ProViewManagementStorageState<TSnapshot> => {
    const state = states.get(instanceId)
    return {
      views: (state?.views ?? []).map((view) => ({ ...view })),
      activeViewId: state?.activeViewId,
    }
  }

  return {
    async load(instanceId) {
      return readState(instanceId)
    },
    async update(instanceId, recipe) {
      const next = recipe(readState(instanceId))
      states.set(instanceId, {
        views: next.views.map((view) => ({ ...view })),
        activeViewId: next.activeViewId,
      })
    },
  }
}

const transientAdapters = new WeakMap<object, ProViewManagementAdapter<ProTableViewSnapshot<any>>>()

export function useViewPersistence<RecordType, Query extends ProTableQueryRecord, Summary>({
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
      return normalizeViewSnapshot(
        snapshot,
        filters,
        columnDefinitions,
        newColumnPolicy,
        controller.getState().defaultQuery,
      )
    },
    [columnDefinitions, controller, filters, newColumnPolicy],
  )

  const buildSystemDefaultSnapshot = useCallback(
    () =>
      normalizeSnapshotForCurrentSchema({
        query: {},
        columnPreferences: buildDefaultColumnPreferences(columnDefinitions),
        filterPreferences: buildDefaultFilterPreferences(filters),
      }),
    [columnDefinitions, filters, normalizeSnapshotForCurrentSchema],
  )

  const transientViewManagementAdapter = useMemo(
    () => {
      let adapter = transientAdapters.get(controller)
      if (!adapter) {
        adapter = createTransientViewManagementAdapter<ProTableViewSnapshot<Query>>()
        transientAdapters.set(controller, adapter)
      }
      return adapter as ProViewManagementAdapter<ProTableViewSnapshot<Query>>
    },
    [controller],
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

  const restoreSnapshot = useCallback(
    (snapshot: ProTableViewSnapshot<Query>, options?: { committed?: boolean }) => {
      const actions = viewStore.getState()
      const nextQuery = mergeSearchQuery(controller.getState().defaultQuery, snapshot.query)

      cancelProTableControllerRequests(controller, { invalidate: true })
      clearProTableQueryOverlay(controller)
      actions.setMergedColumnsPreferences(snapshot.columnPreferences)
      actions.setMergedFilterPreferences(snapshot.filterPreferences)
      controller.setViewState({
        query: nextQuery,
        sorter: snapshot.sorter ?? null,
        committed: options?.committed ?? false,
      })
      // 快照值相同也算一次恢复，让未写入列偏好的临时拖拽宽度失效。
      actions.markViewRestored()
    },
    [controller, viewStore],
  )

  const restoreActiveView = useCallback(() => {
    // viewStore 不保留 Query 泛型；会话已按 controller 和存储作用域隔离，在此恢复当前查询类型。
    const storage = viewStore.getState().viewStorage as
      ProViewManagementStorageState<ProTableViewSnapshot<Query>> | undefined
    const defaultSnapshot = buildSystemDefaultSnapshot()
    const activeView = resolveActiveView(
      storage?.activeViewId ?? null,
      [{ id: PRO_TABLE_DEFAULT_VIEW_ID, name: DEFAULT_VIEW_LABEL, scope: 'system', order: 0, snapshot: defaultSnapshot }],
      storage?.views ?? [],
    )
    restoreSnapshot(normalizeSnapshotForCurrentSchema(activeView?.snapshot ?? defaultSnapshot))
  }, [buildSystemDefaultSnapshot, normalizeSnapshotForCurrentSchema, restoreSnapshot, viewStore])

  const applySnapshotToTable = useCallback(
    async (snapshot: ProTableViewSnapshot<Query>, options?: { submit?: boolean }) => {
      restoreSnapshot(snapshot, { committed: true })
      if (options?.submit !== false) {
        try {
          await controller.submitQuery({ resetPage: true })
        } catch {
          // Keep the applied view snapshot; list identity is already restored.
        }
      }
    },
    [controller, restoreSnapshot],
  )

  const createCurrentSnapshot = useCallback(() => {
    const state = controller.getState()
    const storeState = viewStore.getState()

    return buildViewSnapshot(
      state.query,
      filters,
      columnDefinitions,
      storeState.mergedColumnsPreferences,
      state.sort.length > 0 ? state.sort : null,
      storeState.mergedFilterPreferences,
      state.defaultQuery,
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
    const draftQuery = pickSearchQuery(state.query, filters, state.defaultQuery)
    const committedQuery = pickSearchQuery(state.committedQuery, filters, state.defaultQuery)
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
        try {
          await controller.submitQuery({ resetPage: true })
        } catch {
          // Keep draft query; list identity is already restored.
        }
        return
      }
    }
  }, [controller, filters])

  return {
    normalizeSnapshotForCurrentSchema,
    buildSystemDefaultSnapshot,
    applySnapshotToTable,
    restoreSnapshot,
    restoreActiveView,
    createCurrentSnapshot,
    viewManagementAdapter,
    viewManagementInstanceId,
    handleApplyManagedView,
    handleResetManagedView,
    handleSaveManagedView,
  }
}

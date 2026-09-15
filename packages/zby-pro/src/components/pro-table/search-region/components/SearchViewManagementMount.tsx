import { memo, useMemo, useRef } from 'react'

import type {
  ProViewManagementAdapter,
  ProViewManagementStorageState,
  ProViewManagementView,
} from '../../../pro-view-management'
import { shallow, useControllerSelector, useViewStoreSelector } from '../../hooks'
import type { ProTableController, ProTableViewSnapshot } from '../../interface'
import type { ProTableViewStore } from '../../store'
import { isViewSnapshotEqual } from '../../utils'
import { ProTableViewManagement } from './ProTableViewManagement'

type SearchViewManagementMountProps<RecordType, Query extends Record<string, unknown>, Summary> = {
  buildSystemDefaultSnapshot: () => ProTableViewSnapshot<Query>
  controller: ProTableController<RecordType, Query, Summary>
  createCurrentSnapshot: () => ProTableViewSnapshot<Query>
  initialStorageState?: ProViewManagementStorageState<ProTableViewSnapshot<Query>>
  onApplyManagedView: (view: ProViewManagementView<ProTableViewSnapshot<Query>>) => Promise<void>
  onResetManagedView: (view: ProViewManagementView<ProTableViewSnapshot<Query>>) => Promise<void>
  onRetryViewManagementLoad?: () => void | Promise<void>
  prefixCls: string
  viewManagementAdapter?: ProViewManagementAdapter<ProTableViewSnapshot<Query>>
  viewManagementInstanceId: string
  viewManagementLoadError?: unknown
  viewManagementLoading?: boolean
  viewStore: ProTableViewStore
}

const SearchViewManagementMountInner = <
  RecordType,
  Query extends Record<string, unknown>,
  Summary,
>({
  buildSystemDefaultSnapshot,
  controller,
  createCurrentSnapshot,
  initialStorageState,
  onApplyManagedView,
  onResetManagedView,
  onRetryViewManagementLoad,
  prefixCls,
  viewManagementAdapter,
  viewManagementInstanceId,
  viewManagementLoadError,
  viewManagementLoading,
  viewStore,
}: SearchViewManagementMountProps<RecordType, Query, Summary>) => {
  const searchSnapshotState = useControllerSelector(
    controller,
    (state) => ({
      committedQuery: state.committedQuery,
      defaultQuery: state.defaultQuery,
    }),
    shallow,
  )
  const total = useControllerSelector(controller, (state) => state.total)
  const sorterState = useControllerSelector(
    controller,
    (state) => ({
      sortField: state.sortField,
      sortOrder: state.sortOrder,
    }),
    shallow,
  )
  const columnsPreferences = useViewStoreSelector(
    viewStore,
    (state) => state.mergedColumnsPreferences,
  )
  const nextSystemDefaultSnapshot = useMemo(
    () => buildSystemDefaultSnapshot(),
    [buildSystemDefaultSnapshot],
  )
  const systemDefaultSnapshotRef = useRef(nextSystemDefaultSnapshot)

  if (!isViewSnapshotEqual(systemDefaultSnapshotRef.current, nextSystemDefaultSnapshot)) {
    systemDefaultSnapshotRef.current = nextSystemDefaultSnapshot
  }

  const systemDefaultSnapshot = systemDefaultSnapshotRef.current
  const nextCurrentSnapshot = useMemo(
    () => createCurrentSnapshot(),
    [
      columnsPreferences,
      createCurrentSnapshot,
      searchSnapshotState.committedQuery,
      sorterState.sortField,
      sorterState.sortOrder,
    ],
  )
  const currentSnapshotRef = useRef(nextCurrentSnapshot)

  if (!isViewSnapshotEqual(currentSnapshotRef.current, nextCurrentSnapshot)) {
    currentSnapshotRef.current = nextCurrentSnapshot
  }

  const currentSnapshot = currentSnapshotRef.current

  return (
    <ProTableViewManagement
      adapter={viewManagementAdapter}
      currentSnapshot={currentSnapshot}
      initialStorageState={initialStorageState}
      loading={viewManagementLoading}
      loadError={viewManagementLoadError}
      onApplyView={onApplyManagedView}
      onRetryLoad={onRetryViewManagementLoad}
      onResetView={onResetManagedView}
      prefixCls={prefixCls}
      systemDefaultSnapshot={systemDefaultSnapshot}
      total={total}
      viewManagementInstanceId={viewManagementInstanceId}
    />
  )
}

const MemoSearchViewManagementMount = memo(
  SearchViewManagementMountInner,
) as typeof SearchViewManagementMountInner & {
  displayName?: string
}

MemoSearchViewManagementMount.displayName = 'ProTableSearchViewManagementMount'

export const SearchViewManagementMount = MemoSearchViewManagementMount

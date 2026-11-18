import { memo, useCallback, useMemo } from 'react'
import { useIntl } from '@zby/intl'

import ProViewManagement from '../../../pro-view-management'
import type {
  ProViewManagementAdapter,
  ProViewManagementStorageState,
  ProViewManagementView,
} from '../../../pro-view-management'
import type { ProTableFilter, ProTableQueryRecord, ProTableViewSnapshot } from '../../interface'
import { countModifiedSearchFields, isViewSnapshotEqual, PRO_TABLE_DEFAULT_VIEW_ID } from '../../utils'
import { DEFAULT_VIEW_LABEL } from '../constants'

type ProTableViewManagementProps<Query extends ProTableQueryRecord> = {
  adapter?: ProViewManagementAdapter<ProTableViewSnapshot<Query>>
  currentSnapshot: ProTableViewSnapshot<Query>
  defaultQuery: Query
  filters: ProTableFilter<Query>[]
  loading?: boolean
  loadError?: unknown
  normalizeSnapshotForCurrentSchema: (snapshot: ProTableViewSnapshot<Query>) => ProTableViewSnapshot<Query>
  onApplyView: (view: ProViewManagementView<ProTableViewSnapshot<Query>>) => void | Promise<void>
  onRetryLoad?: () => void | Promise<void>
  onResetView: (view: ProViewManagementView<ProTableViewSnapshot<Query>>) => void | Promise<void>
  onSaveView?: () => void | Promise<void>
  onStorageStateChange: (
    state: ProViewManagementStorageState<ProTableViewSnapshot<Query>>,
  ) => void
  storageState: ProViewManagementStorageState<ProTableViewSnapshot<Query>>
  prefixCls: string
  systemDefaultSnapshot: ProTableViewSnapshot<Query>
  viewManagementInstanceId: string
}

function countViewSearchFields<Query extends ProTableQueryRecord>(
  view: ProViewManagementView<ProTableViewSnapshot<Query>>,
  activeViewId: string,
  currentSnapshot: ProTableViewSnapshot<Query>,
  filters: ProTableFilter<Query>[],
  defaultQuery: Query,
) {
  const query = (
    view.id === activeViewId ? currentSnapshot.query : view.snapshot.query
  ) as Query
  const count = countModifiedSearchFields(filters, query, defaultQuery)
  return count > 0 ? count : null
}

function ProTableViewManagementInner<Query extends ProTableQueryRecord>({
  adapter,
  currentSnapshot,
  defaultQuery,
  filters,
  loading,
  loadError,
  normalizeSnapshotForCurrentSchema,
  onApplyView,
  onRetryLoad,
  onResetView,
  onSaveView,
  onStorageStateChange,
  prefixCls,
  storageState,
  systemDefaultSnapshot,
  viewManagementInstanceId,
}: ProTableViewManagementProps<Query>) {
  const intl = useIntl()
  const defaultViewName = intl.getMessage('zby.pro.table.defaultView', DEFAULT_VIEW_LABEL)
  const activeViewId = storageState.activeViewId ?? PRO_TABLE_DEFAULT_VIEW_ID
  const systemViews = useMemo(() => {
    return [
      {
        id: PRO_TABLE_DEFAULT_VIEW_ID,
        name: defaultViewName,
        scope: 'system' as const,
        order: 0,
        snapshot: systemDefaultSnapshot,
      },
    ] satisfies Array<ProViewManagementView<ProTableViewSnapshot<Query>>>
  }, [defaultViewName, systemDefaultSnapshot])
  const getViewCount = useCallback(
    (view: ProViewManagementView<ProTableViewSnapshot<Query>>) =>
      countViewSearchFields(view, activeViewId, currentSnapshot, filters, defaultQuery),
    [activeViewId, currentSnapshot, defaultQuery, filters],
  )
  const isSnapshotEqual = useCallback(
    (left: ProTableViewSnapshot<Query>, right: ProTableViewSnapshot<Query>) =>
      isViewSnapshotEqual(
        normalizeSnapshotForCurrentSchema(left),
        normalizeSnapshotForCurrentSchema(right),
      ),
    [normalizeSnapshotForCurrentSchema],
  )

  return (
    <ProViewManagement<ProTableViewSnapshot<Query>>
      adapter={adapter}
      className={`${prefixCls}-search-views`}
      currentSnapshot={currentSnapshot}
      defaultSnapshot={systemDefaultSnapshot}
      getViewCount={getViewCount}
      instanceId={viewManagementInstanceId}
      isSnapshotEqual={isSnapshotEqual}
      loading={loading}
      loadError={loadError}
      onApplyView={onApplyView}
      onRetryLoad={onRetryLoad}
      onResetView={onResetView}
      onSaveView={onSaveView}
      onStorageStateChange={onStorageStateChange}
      storageState={storageState}
      popupWidth={240}
      showCount
      systemViews={systemViews}
    />
  )
}

const MemoProTableViewManagement = memo(ProTableViewManagementInner) as typeof ProTableViewManagementInner & {
  displayName?: string
}

MemoProTableViewManagement.displayName = 'ProTableViewManagement'

export const ProTableViewManagement = MemoProTableViewManagement

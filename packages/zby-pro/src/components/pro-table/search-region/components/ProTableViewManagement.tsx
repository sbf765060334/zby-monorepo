import { memo, useMemo } from 'react'
import { useIntl } from '@zby/intl'

import ProViewManagement from '../../../pro-view-management'
import type {
  ProViewManagementAdapter,
  ProViewManagementStorageState,
  ProViewManagementView,
} from '../../../pro-view-management'
import type { ProTableViewSnapshot } from '../../interface'
import { isViewSnapshotEqual, PRO_TABLE_DEFAULT_VIEW_ID } from '../../utils'
import { DEFAULT_VIEW_LABEL } from '../constants'

type ProTableViewManagementProps<Query extends Record<string, unknown>> = {
  adapter?: ProViewManagementAdapter<ProTableViewSnapshot<Query>>
  currentSnapshot: ProTableViewSnapshot<Query>
  initialStorageState?: ProViewManagementStorageState<ProTableViewSnapshot<Query>>
  loading?: boolean
  loadError?: unknown
  onApplyView: (view: ProViewManagementView<ProTableViewSnapshot<Query>>) => void | Promise<void>
  onRetryLoad?: () => void | Promise<void>
  onResetView: (view: ProViewManagementView<ProTableViewSnapshot<Query>>) => void | Promise<void>
  prefixCls: string
  systemDefaultSnapshot: ProTableViewSnapshot<Query>
  total: number
  viewManagementInstanceId: string
}

function ProTableViewManagementInner<Query extends Record<string, unknown>>({
  adapter,
  currentSnapshot,
  initialStorageState,
  loading,
  loadError,
  onApplyView,
  onRetryLoad,
  onResetView,
  prefixCls,
  systemDefaultSnapshot,
  total,
  viewManagementInstanceId,
}: ProTableViewManagementProps<Query>) {
  const intl = useIntl()
  const defaultViewName = intl.getMessage('zby.pro.table.defaultView', DEFAULT_VIEW_LABEL)
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
  const viewCounts = useMemo(
    () => ({
      [PRO_TABLE_DEFAULT_VIEW_ID]: total,
    }),
    [total],
  )

  return (
    <ProViewManagement<ProTableViewSnapshot<Query>>
      adapter={adapter}
      className={`${prefixCls}-search-views`}
      currentSnapshot={currentSnapshot}
      defaultSnapshot={systemDefaultSnapshot}
      initialStorageState={initialStorageState}
      instanceId={viewManagementInstanceId}
      isSnapshotEqual={isViewSnapshotEqual}
      loading={loading}
      loadError={loadError}
      onApplyView={onApplyView}
      onRetryLoad={onRetryLoad}
      onResetView={onResetView}
      popupWidth={240}
      showCount
      systemViews={systemViews}
      viewCounts={viewCounts}
    />
  )
}

const MemoProTableViewManagement = memo(ProTableViewManagementInner) as typeof ProTableViewManagementInner & {
  displayName?: string
}

MemoProTableViewManagement.displayName = 'ProTableViewManagement'

export const ProTableViewManagement = MemoProTableViewManagement

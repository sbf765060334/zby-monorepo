import type * as React from 'react'

import type {
  ProViewManagementAdapter,
  ProViewManagementStorageState,
  ProViewManagementView,
} from '../../pro-view-management'
import type { ProTableViewStore } from '../store'
import type {
  ProTableController,
  ProTableProps,
  ProTableSearchField,
  ProTableViewSnapshot,
  ProTableViewsConfig,
} from '../interface'

export type SearchConfigValue<RecordType, Query extends Record<string, unknown>, Summary> = Exclude<
  ProTableProps<RecordType, Query, Summary>['search'],
  false | undefined
>

export type ViewsConfigValue<Query extends Record<string, unknown>> = ProTableViewsConfig<Query>

export type ModalScopeProps = {
  className?: string
  rootClassName?: string
  style?: React.CSSProperties
}

export type SearchRegionProps<RecordType, Query extends Record<string, unknown>, Summary> = {
  controller: ProTableController<RecordType, Query, Summary>
  className?: string
  fields?: ProTableSearchField<Query, RecordType, Summary>[]
  moreOpen?: boolean
  searchEnabled?: boolean
  showMore?: boolean
  style?: React.CSSProperties
  onResetSearch?: () => void
  onSearch?: () => void
  onToggleMore?: () => void
  views: false | ViewsConfigValue<Query>
  viewStore: ProTableViewStore
  prefixCls: string
  viewManagementAdapter?: ProViewManagementAdapter<ProTableViewSnapshot<Query>>
  viewManagementInstanceId: string
  viewManagementLoading?: boolean
  viewManagementLoadError?: unknown
  onRetryViewManagementLoad?: () => void | Promise<void>
  initialStorageState?: ProViewManagementStorageState<ProTableViewSnapshot<Query>>
  buildSystemDefaultSnapshot: () => ProTableViewSnapshot<Query>
  createCurrentSnapshot: () => ProTableViewSnapshot<Query>
  onApplyManagedView: (view: ProViewManagementView<ProTableViewSnapshot<Query>>) => Promise<void>
  onResetManagedView: (view: ProViewManagementView<ProTableViewSnapshot<Query>>) => Promise<void>
}

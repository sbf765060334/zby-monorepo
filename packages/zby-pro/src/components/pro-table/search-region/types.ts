import type * as React from 'react'

import type {
  ProViewManagementAdapter,
  ProViewManagementView,
} from '../../pro-view-management'
import type { ProTableViewStore } from '../store'
import type {
  ProTableController,
  ProTableFilter,
  ProTableViewSnapshot,
  ProTableViewsConfig,
} from '../interface'

export type ViewsConfigValue<Query extends Record<string, unknown>> = ProTableViewsConfig<Query>

export type ModalScopeProps = {
  className?: string
  rootClassName?: string
  style?: React.CSSProperties
}

export type SearchRegionProps<RecordType, Query extends Record<string, unknown>, Summary> = {
  controller: ProTableController<RecordType, Query, Summary>
  className?: string
  filters?: ProTableFilter<Query>[]
  moreOpen?: boolean
  searchEnabled?: boolean
  searchFilters?: ProTableFilter<Query>[]
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
  buildSystemDefaultSnapshot: () => ProTableViewSnapshot<Query>
  createCurrentSnapshot: () => ProTableViewSnapshot<Query>
  onApplyManagedView: (view: ProViewManagementView<ProTableViewSnapshot<Query>>) => Promise<void>
  onResetManagedView: (view: ProViewManagementView<ProTableViewSnapshot<Query>>) => Promise<void>
  onSaveManagedView: () => Promise<void>
}

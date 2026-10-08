import type * as React from 'react'

export type ProViewManagementScope = 'system' | 'custom'

export interface ProViewManagementView<TSnapshot = unknown> {
  id: string
  name: string
  scope: ProViewManagementScope
  order: number
  snapshot: TSnapshot
}

export interface ProViewManagementStorageState<TSnapshot = unknown> {
  views: ProViewManagementView<TSnapshot>[]
  activeViewId?: string
}

export type ViewCreateMode = 'create' | 'saveAs'

export interface ProViewManagementCreateValidationPayload<
  TSnapshot = unknown,
> {
  name: string
  mode: ViewCreateMode
  systemViews: ProViewManagementView<TSnapshot>[]
  customViews: ProViewManagementView<TSnapshot>[]
  maxCustomViews?: number
}

export interface ProViewManagementRenameValidationPayload<
  TSnapshot = unknown,
> {
  viewId: string
  name: string
  systemViews: ProViewManagementView<TSnapshot>[]
  customViews: ProViewManagementView<TSnapshot>[]
}

export interface ProViewManagementAdapter<TSnapshot = unknown> {
  load: (
    instanceId: string,
  ) => Promise<ProViewManagementStorageState<TSnapshot>>
  update: (
    instanceId: string,
    recipe: (
      current: ProViewManagementStorageState<TSnapshot>,
    ) => ProViewManagementStorageState<TSnapshot>,
  ) => Promise<void>
}

export interface ProViewManagementProps<TSnapshot = unknown> {
  instanceId: string
  systemViews: ProViewManagementView<TSnapshot>[]
  defaultSnapshot: TSnapshot
  currentSnapshot: TSnapshot
  /** Controlled storage. When set, the component does not load or keep a local copy. */
  storageState?: ProViewManagementStorageState<TSnapshot>
  adapter?: ProViewManagementAdapter<TSnapshot>
  loading?: boolean
  loadError?: unknown
  dirty?: boolean
  isSnapshotEqual?: (left: TSnapshot, right: TSnapshot) => boolean
  showCount?: boolean
  popupWidth?: number
  maxCustomViews?: number
  viewCounts?: Record<string, number | undefined | null>
  getViewCount?: (
    view: ProViewManagementView<TSnapshot>,
  ) =>
    | number
    | undefined
    | null
    | Promise<number | undefined | null>
  onApplyView?: (
    view: ProViewManagementView<TSnapshot>,
  ) => void | Promise<void>
  onSaveView?: (
    view: ProViewManagementView<TSnapshot>,
  ) => void | Promise<void>
  onResetView?: (
    view: ProViewManagementView<TSnapshot>,
  ) => void | Promise<void>
  onActiveViewChange?: (view: ProViewManagementView<TSnapshot>) => void
  onViewsChange?: (views: ProViewManagementView<TSnapshot>[]) => void
  onStorageStateChange?: (state: ProViewManagementStorageState<TSnapshot>) => void
  onRetryLoad?: () => void | Promise<void>
  onLoadError?: (
    error: unknown,
    info: {
      instanceId: string
      retry: () => void | Promise<void>
    },
  ) => void
  prefixCls?: string
  className?: string
  rootClassName?: string
  style?: React.CSSProperties
}

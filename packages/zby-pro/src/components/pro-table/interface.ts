import type {
  CSSProperties,
  Key,
  ReactElement,
  ReactNode,
  RefAttributes,
} from 'react'
import type {
  ColumnResizeInfo,
  TableColumnType,
  TablePaginationConfig,
  TableProps,
} from '@zby/ui'
import type { ButtonProps, DropdownProps, PopconfirmProps, SpinProps, TagProps, TooltipProps } from 'antd'

import type { ProViewManagementAdapter } from '../pro-view-management'

export interface ProTableActionInfo<RecordType = Record<string, unknown>> {
  record?: RecordType
  index?: number
  key: Key
}

export type ProTableActionTooltip = ReactNode | Omit<TooltipProps, 'children'>

export interface ProTableActionItem<RecordType = Record<string, unknown>>
  extends Omit<ButtonProps, 'children' | 'onClick'> {
  key: Key
  label: ReactNode
  hidden?: boolean
  tooltip?: ProTableActionTooltip
  popconfirm?: false | (Omit<PopconfirmProps, 'children' | 'onConfirm'> & {
    onConfirm?: (info: ProTableActionInfo<RecordType>) => void | Promise<void>
  })
  onClick?: (info: ProTableActionInfo<RecordType>) => void | Promise<void>
}

export interface ProTableActionsProps<RecordType = Record<string, unknown>> {
  actions: Array<ProTableActionItem<RecordType> | false | null | undefined>
  record?: RecordType
  index?: number
  visibleCount?: number
  moreText?: ReactNode
  moreButtonProps?: Omit<ButtonProps, 'children' | 'onClick'>
  dropdownProps?: Omit<DropdownProps, 'children' | 'menu'>
  className?: string
  style?: CSSProperties
  prefixCls?: string
}

export interface ProTableToolbarActionInfo<RecordType = Record<string, unknown>, Query = Record<string, unknown>, Summary = unknown> {
  key: Key
  controller?: ProTableController<RecordType, Query, Summary>
  loading?: boolean
  selectedRowKeys: Key[]
  selectedRows?: RecordType[]
}

export interface ProTableToolbarButtonActionItem<RecordType = Record<string, unknown>, Query = Record<string, unknown>, Summary = unknown> {
  key: Key
  label: ReactNode
  type?: 'primary' | 'default'
  hidden?: boolean
  overflow?: boolean
  disabled?: boolean | ((info: ProTableToolbarActionInfo<RecordType, Query, Summary>) => boolean)
  onClick?: (info: ProTableToolbarActionInfo<RecordType, Query, Summary>) => void | Promise<void>
  [key: string]: unknown
}

export interface ProTableToolbarBatchActionItem<RecordType = Record<string, unknown>> {
  key: Key
  label: ReactNode
  type: 'batch'
  actions: Array<ProTableActionItem<RecordType> | false | null | undefined>
  hidden?: boolean
}

export type ProTableToolbarActionItem<RecordType = Record<string, unknown>, Query = Record<string, unknown>, Summary = unknown> =
  | ProTableToolbarButtonActionItem<RecordType, Query, Summary>
  | ProTableToolbarBatchActionItem<RecordType>

type ResolvableSemantic<T> = T | ((info: { props: Record<string, unknown> }) => T)

export type ProTableColumnPin = 'left' | 'right' | null

export interface ProTableColumnCapabilities {
  visibility?: boolean
  pinning?: boolean
  resizing?: boolean
}

export interface ProTableColumnDefaultPreference {
  visible?: boolean
  order?: number
  pin?: ProTableColumnPin
  width?: number
}

export interface ProTableColumnPreference {
  key: string
  visible: boolean
  order: number
  pin?: ProTableColumnPin
  width?: number
}

export type ProTableColumnState = Partial<ProTableColumnPreference> & { show?: boolean }
export type ProTableColumnsState = Record<string, ProTableColumnState>

export interface ProTableColumnFieldConfig<Meta = Record<string, unknown>> {
  capabilities?: ProTableColumnCapabilities
  defaultPreference?: ProTableColumnDefaultPreference
  meta?: Meta
}

export type ProTableColumnValueType =
  | 'text'
  | 'money'
  | 'tag'
  | 'date'
  | 'dateTime'
  | 'week'
  | 'month'
  | 'year'
  | 'percent'
  | 'digit'
  | 'boolean'
  | 'index'
  | 'indexBorder'
  | 'progress'
  | 'code'
  | 'jsonCode'
  | 'textarea'

export type ProTableColumnValueTypeConfig = {
  type: ProTableColumnValueType
  currency?: string
  locale?: string
  precision?: number
  showSymbol?: boolean | ((value: unknown) => boolean)
  showColor?: boolean
  moneySymbol?: boolean
  status?: 'normal' | 'active' | 'success' | 'exception'
}

export type ProTableColumnFieldValueType =
  | ProTableColumnValueType
  | ProTableColumnValueTypeConfig

export type ProTableColumnValueEnumItem =
  | ReactNode
  | {
    text?: ReactNode
    color?: string
    status?: string
    disabled?: boolean
  }

export type ProTableColumnValueEnum =
  | Record<string, ProTableColumnValueEnumItem>
  | Map<unknown, ProTableColumnValueEnumItem>

export type ProTableColumnFieldProps<RecordType = Record<string, unknown>> =
  | (Record<string, unknown> & Partial<TagProps>)
  | ((
    value: unknown,
    record: RecordType,
    index: number,
  ) => Record<string, unknown> & Partial<TagProps>)

export type ProTableColumnType<
  RecordType = Record<string, unknown>,
  Meta = Record<string, unknown>,
> = Omit<TableColumnType<RecordType>, 'children'> & {
  label?: string
  fieldConfig?: false | ProTableColumnFieldConfig<Meta>
  children?: ProTableColumnType<RecordType, Meta>[]
  valueEnum?: ProTableColumnValueEnum
  emptyText?: ReactNode | false
  renderText?: (value: unknown, record: RecordType, index: number) => ReactNode
  valueType?: ProTableColumnFieldValueType
  /** @deprecated use valueType */
  dataRenderType?: ProTableColumnValueType
  fieldProps?: ProTableColumnFieldProps<RecordType>
}

export type ProTableColumnsType<
  RecordType = Record<string, unknown>,
  Meta = Record<string, unknown>,
> = ProTableColumnType<RecordType, Meta>[]

export type ProTableColumns<RecordType = Record<string, unknown>> =
  ProTableColumnsType<RecordType>

export interface ProTableActionColumnContext<
  RecordType = Record<string, unknown>,
  Query = Record<string, unknown>,
  Summary = unknown,
> {
  record: RecordType
  index: number
  controller: ProTableController<RecordType, Query, Summary>
}

export type ProTableActionColumnActions<
  RecordType = Record<string, unknown>,
  Query = Record<string, unknown>,
  Summary = unknown,
> =
  | Array<ProTableActionItem<RecordType> | false | null | undefined>
  | ((
    context: ProTableActionColumnContext<RecordType, Query, Summary>,
  ) => Array<ProTableActionItem<RecordType> | false | null | undefined>)

export type ProTableActionColumnConfig<
  RecordType = Record<string, unknown>,
  Query = Record<string, unknown>,
  Summary = unknown,
> = Omit<
  ProTableColumnType<RecordType>,
  'children' | 'fieldConfig' | 'render'
> & {
  actions?: ProTableActionColumnActions<RecordType, Query, Summary>
  actionsProps?: Omit<
    ProTableActionsProps<RecordType>,
    'actions' | 'record' | 'index'
  >
  render?: TableColumnType<RecordType>['render']
}

export type ProTableNewColumnPolicy = 'prepend' | 'append' | 'default-order'

export interface ProTableColumnsStateConfig {
  maxVisible?: number
  maxFixed?: number
  newColumnPolicy?: ProTableNewColumnPolicy
}

export type ProTableColumnResizeKey = string | number
export type ProTableColumnWidthMap = Record<ProTableColumnResizeKey, number>

export interface ProTableColumnResizeInfo<RecordType = Record<string, unknown>>
  extends Omit<ColumnResizeInfo<RecordType>, 'column' | 'widths'> {
  widths: ProTableColumnWidthMap
  column: ProTableColumnType<RecordType>
}

export interface ProTableColumnResizeConfig<RecordType = Record<string, unknown>> {
  defaultWidth?: number
  minWidth?: number
  maxWidth?: number
  widths?: ProTableColumnWidthMap
  defaultWidths?: ProTableColumnWidthMap
  persist?: boolean
  onWidthsChange?: (
    widths: ProTableColumnWidthMap,
    info: ProTableColumnResizeInfo<RecordType>,
  ) => void
  onResize?: (info: ProTableColumnResizeInfo<RecordType>) => void
  onResizeEnd?: (info: ProTableColumnResizeInfo<RecordType>) => void
}

export interface ProTableSearchFieldRenderContext<
  Query,
  RecordType,
  Summary,
> {
  value: unknown
  query: Query
  setValue: (value: unknown) => void
  submit: (options?: { resetPage?: boolean }) => Promise<void> | void
  controller: ProTableController<RecordType, Query, Summary>
  reset?: () => void
}

export interface ProTableSearchField<
  Query,
  RecordType = Record<string, unknown>,
  Summary = unknown,
> {
  key: Extract<keyof Query, string> | string
  label: ReactNode
  quick?: boolean
  hidden?: boolean
  placeholder?: string
  valueType?: string | Record<string, unknown>
  render?: (
    context: ProTableSearchFieldRenderContext<Query, RecordType, Summary>,
  ) => ReactNode
  group?: string
  dependencies?: Array<Extract<keyof Query, string> | string>
  getTagText?: (value: unknown, query: Query) => ReactNode
  shouldShowTag?: (value: unknown, query: Query) => boolean
  allowEmpty?: boolean
  resetValue?: unknown | ((query: Query) => unknown)
}

export interface ProTableSearchGroup {
  key: string
  label: ReactNode
  order?: number
  description?: ReactNode
  title?: ReactNode
  fields?: ProTableSearchField<any>[]
}

export type ProTableQuickFieldSubmitTrigger =
  | 'manual'
  | 'change'
  | {
    type: 'debounce'
    wait?: number
  }

export interface ProTableQuickFieldConfig<Query = Record<string, unknown>> {
  key: Extract<keyof Query, string> | string
  label?: boolean | ReactNode
  placeholder?: string
  width?: number | string
  submitTrigger?: ProTableQuickFieldSubmitTrigger
}

export interface ProTableSearchConfig<
  Query,
  RecordType = Record<string, unknown>,
  Summary = unknown,
> {
  variant?: 'mixed' | 'inline'
  fields?: ProTableSearchField<Query, RecordType, Summary>[]
  quickFields?: Array<
    Extract<keyof Query, string> | string | ProTableQuickFieldConfig<Query>
  >
  groups?: ProTableSearchGroup[]
  extra?: ReactNode
  showReset?: boolean
  resetButtonProps?: ButtonProps
  submitText?: ReactNode
  resetText?: ReactNode
  moreText?: ReactNode
  emptyText?: ReactNode
}

export interface ProTableViewSorter {
  field: string
  order: 'ascend' | 'descend'
}

export interface ProTableViewSnapshot<Query = Record<string, unknown>> {
  query: Partial<Query>
  columnPreferences: ProTableColumnPreference[]
  sorter?: ProTableViewSorter | null
}

export interface ProTableViewsConfig<Query = Record<string, unknown>> {
  adapter?: false | ProViewManagementAdapter<ProTableViewSnapshot<Query>>
  onLoadError?: (
    error: unknown,
    info: {
      instanceId: string
      retry: () => void | Promise<void>
    },
  ) => void
}

export interface ProTableToolbarContext<RecordType, Query, Summary> {
  controller: ProTableController<RecordType, Query, Summary>
  loading: boolean
  selectedRowKeys: Key[]
}

export interface ProTableToolbarConfig<
  RecordType = Record<string, unknown>,
  Query = Record<string, unknown>,
  Summary = unknown,
> {
  actionItems?:
    | Array<
        | ProTableToolbarActionItem<RecordType, Query, Summary>
        | false
        | null
        | undefined
    >
    | ((
      context: ProTableToolbarContext<RecordType, Query, Summary>,
    ) => Array<
        | ProTableToolbarActionItem<RecordType, Query, Summary>
        | false
        | null
        | undefined
    >)
  actions?: ReactNode | ((context: ProTableToolbarContext<RecordType, Query, Summary>) => ReactNode)
  extra?: ReactNode | ((context: ProTableToolbarContext<RecordType, Query, Summary>) => ReactNode)
  showRefresh?: boolean
  showColumnsState?: boolean
  showFullscreen?: boolean
}

export interface ProTablePaginationConfig
  extends Omit<TablePaginationConfig, 'current' | 'pageSize' | 'total'> {
  pageKey?: string
  pageSizeKey?: string
  defaultCurrent?: number
  defaultPageSize?: number
}

export interface ProTableSortConfig {
  sortByKey?: string
  sortOrderKey?: string
}

export interface ProTableRequestContext {
  signal: AbortSignal
}

export type ProTableQueryRequest<RecordType, Query> = (
  query: Query,
  context: ProTableRequestContext,
) => Promise<{ data: RecordType[]; total?: number }>

export type ProTableSummaryRequest<Query, Summary> = (
  query: Query,
  context: ProTableRequestContext,
) => Promise<Summary>

export interface ProTableControllerConfig<RecordType, Query, Summary> {
  defaultQuery?: Query
  rowKey?: TableProps<RecordType>['rowKey']
  queryRequest?: ProTableQueryRequest<RecordType, Query>
  summaryRequest?: ProTableSummaryRequest<Query, Summary>
  pagination?: ProTablePaginationConfig
  sort?: ProTableSortConfig
}

export interface ProTableControllerState<RecordType, Query, Summary> {
  query: Query
  committedQuery: Query
  defaultQuery: Query
  latestParams: Query | null
  dataSource: RecordType[]
  total: number
  currentPage: number
  pageSize: number
  loading: boolean
  requested?: boolean
  requestReady?: boolean
  inquired: boolean
  summary: Summary | undefined
  selectedRowKeys: Key[]
  expandedRowKeys: Key[]
  sortField?: string
  sortOrder?: 'ascend' | 'descend' | null
}

export interface ProTableController<RecordType, Query, Summary> {
  getState: () => ProTableControllerState<RecordType, Query, Summary>
  subscribe: (
    listener: (state: ProTableControllerState<RecordType, Query, Summary>) => void,
  ) => () => void
  configure: (config: Partial<ProTableControllerConfig<RecordType, Query, Summary>>) => void
  setViewState: (state: {
    query: Query
    sorter?: ProTableViewSorter | null
    committed?: boolean
  }) => void
  setQueryField: (key: Extract<keyof Query, string> | string, value: unknown) => void
  setQuery: (patch: Partial<Query>) => void
  resetQuery: (patch?: Partial<Query>) => void
  submitQuery: (options?: { resetPage?: boolean }) => Promise<void>
  reload: () => Promise<void>
  setPage: (page: number) => Promise<void>
  setPageSize: (pageSize: number) => Promise<void>
  setSort: (field?: string, order?: 'ascend' | 'descend' | null) => Promise<void>
  setDataSource: (rows: RecordType[], total?: number) => void
  patchRow: (
    uniqueKey: keyof RecordType,
    targetValue: RecordType[keyof RecordType],
    patch: Partial<RecordType>,
  ) => void
  setSelectedRowKeys: (keys: Key[], rows?: RecordType[]) => void
  getSelectedRows: () => RecordType[]
  setExpandedRowKeys: (keys: Key[]) => void
  expandAllRows: () => void
  collapseAllRows: () => void
}

export interface ProTableLayoutConfig {
  separated?: boolean
  tableAside?: ReactNode
  tableTop?: ReactNode
}

export interface ProTableEmptyStateConfig {
  beforeQueryText?: ReactNode
  afterQueryText?: ReactNode
}

export interface ProTableSemanticClassNames {
  root?: string
  search?: string
  content?: string
  toolbar?: string
  table?: string
  searchOverlay?: string
  columnsModal?: string
  fullscreen?: string
}

export interface ProTableSemanticStyles {
  root?: CSSProperties
  search?: CSSProperties
  content?: CSSProperties
  toolbar?: CSSProperties
  table?: CSSProperties
  searchOverlay?: CSSProperties
  columnsModal?: CSSProperties
  fullscreen?: CSSProperties
}

export type ProTableClassNamesType = ResolvableSemantic<
  Readonly<ProTableSemanticClassNames>
>

export type ProTableStylesType = ResolvableSemantic<
  Readonly<ProTableSemanticStyles>
>

export interface ProTableRef<RecordType, Query, Summary> {
  controller: ProTableController<RecordType, Query, Summary>
}

export interface ProTableProps<
  RecordType = Record<string, unknown>,
  Query extends Record<string, unknown> = Record<string, unknown>,
  Summary = unknown,
> extends Omit<
    TableProps<RecordType>,
    | 'classNames'
    | 'columns'
    | 'columnResize'
    | 'dataSource'
    | 'height'
    | 'loading'
    | 'onChange'
    | 'prefixCls'
    | 'rootClassName'
    | 'styles'
    | 'pagination'
    | 'rowSelection'
    | 'expandable'
  > {
  controller?: ProTableController<RecordType, Query, Summary>
  controllerConfig?: Partial<ProTableControllerConfig<RecordType, Query, Summary>>
  queryRequest?: ProTableQueryRequest<RecordType, Query>
  summaryRequest?: ProTableSummaryRequest<Query, Summary>
  autoRequest?: boolean
  defaultQuery?: Query
  onControllerReady?: (controller: ProTableController<RecordType, Query, Summary>) => void
  columns: ProTableColumnsType<RecordType>
  actionColumn?: false | ProTableActionColumnConfig<RecordType, Query, Summary>
  rowKey?: TableProps<RecordType>['rowKey']
  search?: false | ProTableSearchConfig<Query, RecordType, Summary>
  views?: false | ProTableViewsConfig<Query>
  toolbar?: false | ProTableToolbarConfig<RecordType, Query, Summary>
  columnsState?: false | ProTableColumnsStateConfig
  columnResize?: boolean | ProTableColumnResizeConfig<RecordType>
  persistenceKey?: string
  heightMode?: 'fill' | 'content'
  fullscreen?: boolean | { enabled?: boolean }
  layout?: ProTableLayoutConfig
  emptyState?: ProTableEmptyStateConfig
  columnEmptyText?: ReactNode | false
  onTableChange?: TableProps<RecordType>['onChange']
  pagination?: false | ProTablePaginationConfig
  rowSelection?: TableProps<RecordType>['rowSelection']
  expandable?: TableProps<RecordType>['expandable']
  loading?: boolean | SpinProps
  prefixCls?: string
  className?: string
  rootClassName?: string
  style?: CSSProperties
  classNames?: ProTableClassNamesType
  styles?: ProTableStylesType
}

export interface ProTableConfig<
  RecordType = Record<string, unknown>,
  Query extends Record<string, unknown> = Record<string, unknown>,
  Summary = unknown,
> {
  prefixCls?: string
  className?: string
  rootClassName?: string
  style?: CSSProperties
  classNames?: ProTableClassNamesType
  styles?: ProTableStylesType
  heightMode?: ProTableProps<RecordType, Query, Summary>['heightMode']
  autoRequest?: ProTableProps<RecordType, Query, Summary>['autoRequest']
  fullscreen?: ProTableProps<RecordType, Query, Summary>['fullscreen']
  layout?: Partial<ProTableLayoutConfig>
  emptyState?: Partial<ProTableEmptyStateConfig>
  search?: false | Partial<ProTableSearchConfig<Query, RecordType, Summary>>
  views?: false | Partial<ProTableViewsConfig<Query>>
  toolbar?: false | Partial<ProTableToolbarConfig<RecordType, Query, Summary>>
  columnsState?: false | Partial<ProTableColumnsStateConfig>
  columnResize?: ProTableProps<RecordType, Query, Summary>['columnResize']
  pagination?: ProTableProps<RecordType, Query, Summary>['pagination']
  scroll?: ProTableProps<RecordType, Query, Summary>['scroll']
  rowSelection?: ProTableProps<RecordType, Query, Summary>['rowSelection']
  expandable?: ProTableProps<RecordType, Query, Summary>['expandable']
}

export type ProTableComponent = (<
  RecordType extends object = Record<string, unknown>,
  Query extends Record<string, unknown> = Record<string, unknown>,
  Summary = unknown,
>(
  props: ProTableProps<RecordType, Query, Summary> &
    RefAttributes<ProTableRef<RecordType, Query, Summary>>,
) => ReactElement | null) & {
  displayName?: string
}

export type ProTableRowSelection<RecordType> = NonNullable<
  TableProps<RecordType>['rowSelection']
>
export type ProTableExpandable<RecordType> = NonNullable<
  TableProps<RecordType>['expandable']
>
export type ProTableTableChange<RecordType> = NonNullable<
  TableProps<RecordType>['onChange']
>

/** @deprecated use ProTableSearchConfig */
export type ProTableQueryConfig<
  Query,
  RecordType = Record<string, unknown>,
  Summary = unknown,
> = ProTableSearchConfig<Query, RecordType, Summary>

/** @deprecated use ProTableSearchFieldRenderContext */
export type ProTableQueryFieldRenderContext<
  Query,
  RecordType = Record<string, unknown>,
  Summary = unknown,
> = ProTableSearchFieldRenderContext<Query, RecordType, Summary>

/** @deprecated use ProTableSearchGroup */
export type ProTableQueryGroup<Query = Record<string, unknown>> =
  ProTableSearchGroup & {
    fields?: ProTableSearchField<Query>[]
  }

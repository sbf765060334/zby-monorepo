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
import type { ButtonProps, DropdownProps, PopconfirmProps, SpinProps, TooltipProps } from 'antd'

import type { ProViewManagementAdapter } from '../pro-view-management'

export interface ProTableActionInfo<RecordType = Record<string, unknown>> {
  record?: RecordType
  index?: number
  key: Key
}

export type ProTableActionTooltip = ReactNode | Omit<TooltipProps, 'children'>

export interface ProTableActionItem<RecordType = Record<string, unknown>>
  extends Omit<ButtonProps, 'children' | 'onClick' | 'hidden'> {
  key: Key
  label: ReactNode
  /** 省略或为 true 时展示；明确为 false 时隐藏。函数收到当前行信息。 */
  show?: boolean | ((info: ProTableActionInfo<RecordType>) => boolean)
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
  /** 全量展示。为 true 或对象时忽略 visibleCount。true 时横向排列。 */
  showAll?: boolean | { direction?: 'horizontal' | 'vertical' }
  moreText?: ReactNode
  moreButtonProps?: Omit<ButtonProps, 'children' | 'onClick'>
  dropdownProps?: Omit<DropdownProps, 'children' | 'menu'>
  className?: string
  style?: CSSProperties
  prefixCls?: string
}

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
  | 'date'
  | 'dateTime'
  | 'week'
  | 'month'
  | 'year'
  | 'percent'
  | 'digit'
  | 'boolean'
  | 'index'
  | 'textarea'

type LiteralUnion<T extends string> = T | (string & {})

/** ISO 4217 字母代码。常用币种可补全，其它合法代码仍可传入。 */
export type ProTableMoneyCurrency = LiteralUnion<
  | 'CNY'
  | 'USD'
  | 'EUR'
  | 'HKD'
  | 'JPY'
  | 'GBP'
  | 'AUD'
  | 'CAD'
  | 'SGD'
  | 'KRW'
  | 'TWD'
  | 'MOP'
  | 'THB'
  | 'VND'
  | 'MYR'
  | 'IDR'
  | 'PHP'
  | 'INR'
  | 'RUB'
  | 'CHF'
  | 'NZD'
  | 'AED'
  | 'AFN'
  | 'ALL'
  | 'AMD'
  | 'ANG'
  | 'AOA'
  | 'ARS'
  | 'AWG'
  | 'AZN'
  | 'BAM'
  | 'BBD'
  | 'BDT'
  | 'BGN'
  | 'BHD'
  | 'BIF'
  | 'BMD'
  | 'BND'
  | 'BOB'
  | 'BRL'
  | 'BSD'
  | 'BTN'
  | 'BWP'
  | 'BYN'
  | 'BZD'
  | 'CDF'
  | 'CLP'
  | 'COP'
  | 'CRC'
  | 'CUP'
  | 'CVE'
  | 'CZK'
  | 'DJF'
  | 'DKK'
  | 'DOP'
  | 'DZD'
  | 'EGP'
  | 'ERN'
  | 'ETB'
  | 'FJD'
  | 'FKP'
  | 'GEL'
  | 'GHS'
  | 'GIP'
  | 'GMD'
  | 'GNF'
  | 'GTQ'
  | 'GYD'
  | 'HNL'
  | 'HTG'
  | 'HUF'
  | 'ILS'
  | 'IQD'
  | 'IRR'
  | 'ISK'
  | 'JMD'
  | 'JOD'
  | 'KES'
  | 'KGS'
  | 'KHR'
  | 'KMF'
  | 'KPW'
  | 'KWD'
  | 'KYD'
  | 'KZT'
  | 'LAK'
  | 'LBP'
  | 'LKR'
  | 'LRD'
  | 'LSL'
  | 'LYD'
  | 'MAD'
  | 'MDL'
  | 'MGA'
  | 'MKD'
  | 'MMK'
  | 'MNT'
  | 'MRU'
  | 'MUR'
  | 'MVR'
  | 'MWK'
  | 'MXN'
  | 'MZN'
  | 'NAD'
  | 'NGN'
  | 'NIO'
  | 'NOK'
  | 'NPR'
  | 'OMR'
  | 'PAB'
  | 'PEN'
  | 'PGK'
  | 'PKR'
  | 'PLN'
  | 'PYG'
  | 'QAR'
  | 'RON'
  | 'RSD'
  | 'RWF'
  | 'SAR'
  | 'SBD'
  | 'SCR'
  | 'SDG'
  | 'SEK'
  | 'SHP'
  | 'SLE'
  | 'SOS'
  | 'SRD'
  | 'SSP'
  | 'STN'
  | 'SYP'
  | 'SZL'
  | 'TJS'
  | 'TMT'
  | 'TND'
  | 'TOP'
  | 'TRY'
  | 'TTD'
  | 'TZS'
  | 'UAH'
  | 'UGX'
  | 'UYU'
  | 'UZS'
  | 'VES'
  | 'VUV'
  | 'WST'
  | 'XAF'
  | 'XCD'
  | 'XCG'
  | 'XOF'
  | 'XPF'
  | 'YER'
  | 'ZAR'
  | 'ZMW'
  | 'ZWG'
>

export type ProTableColumnValueTypeConfig = {
  type: ProTableColumnValueType
  currency?: ProTableMoneyCurrency
  locale?: string
  precision?: number
  showSymbol?: boolean | ((value: unknown) => boolean)
  showColor?: boolean
  moneySymbol?: boolean
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
  | Record<string, unknown>
  | ((
    value: unknown,
    record: RecordType,
    index: number,
  ) => Record<string, unknown>)

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

export type ProTableNewColumnPolicy = 'prepend' | 'append' | 'default-order'

/** 列设置约束。`toolbar.setting.columns` 不传时无可见/固定上限。 */
export interface ProTableColumnsStateConfig {
  maxVisible?: number
  maxFixed?: number
  newColumnPolicy?: ProTableNewColumnPolicy
}

export type ProTableColumnSettingConfig = ProTableColumnsStateConfig

/** 表格设置。列约束放 `columns`；筛选侧暂无配置项。 */
export interface ProTableSettingConfig {
  columns?: ProTableColumnSettingConfig
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

/**
 * 查询对象。索引用 `any`，这样没有索引签名的 interface 也能作为 Query。
 * `Record<string, unknown>` 接不住这种类型。
 */
export type ProTableQueryRecord = Record<string, any>

export interface ProTableFilterRenderContext<
  Query extends ProTableQueryRecord,
  Key extends Extract<keyof Query, string> = Extract<keyof Query, string>,
> {
  value: Query[Key] | undefined
  query: Query
  setValue: (value: Query[Key] | undefined) => void
}

export type ProTableFilter<Query extends ProTableQueryRecord = Record<string, unknown>> = {
  [Key in Extract<keyof Query, string>]: {
    key: Key
    label: ReactNode
    /**
     * 默认收进「更多筛选」。用户可在筛选设置里改到筛选行；仍参与查询和视图快照。
     */
    hidden?: boolean
    /** 自定义 Tag 文案。不传时按原始值兜底：数组用 ` / ` 拼接，其余 `String(value)`。选项、路径、日期时间、布尔请用导出的 resolver。 */
    tagTextFormatter?: (
      value: Query[Key] | undefined,
      query: Query,
    ) => ReactNode
    /** 是否展示该字段的条件 Tag。不传时有文案就展示。 */
    tagVisible?: (value: Query[Key] | undefined, query: Query) => boolean
    /** 必须返回单一根元素，筛选行才能按 width / placeholder / 默认宽合入尺寸。 */
    render: (context: ProTableFilterRenderContext<Query, Key>) => ReactNode
  }
}[Extract<keyof Query, string>]

export interface ProTableViewSorter {
  field: string
  order: 'ascend' | 'descend'
}

export type ProTableFilterPlacement = 'row' | 'more'

export interface ProTableFilterPreference {
  key: string
  placement: ProTableFilterPlacement
  order: number
}

export interface ProTableViewSnapshot<Query extends ProTableQueryRecord = Record<string, unknown>> {
  /** 当前筛选条里相对默认值有改动的字段。空值和未出现的字段都不当作改动，恢复时回落到 defaultQuery。 */
  query: Partial<Query>
  columnPreferences: ProTableColumnPreference[]
  filterPreferences: ProTableFilterPreference[]
  sorter?: ProTableViewSorter[] | null
}

export interface ProTableViewsConfig<Query extends ProTableQueryRecord = Record<string, unknown>> {
  adapter?: false | ProViewManagementAdapter<ProTableViewSnapshot<Query>>
  onLoadError?: (
    error: unknown,
    info: {
      instanceId: string
      retry: () => void | Promise<void>
    },
  ) => void
}

export interface ProTableToolbarContext<
  RecordType,
  Query extends ProTableQueryRecord,
  Summary,
> {
  controller: ProTableController<RecordType, Query, Summary>
  loading: boolean
  selectedRowKeys: Key[]
}

export interface ProTableToolbarConfig<
  RecordType = Record<string, unknown>,
  Query extends ProTableQueryRecord = Record<string, unknown>,
  Summary = unknown,
> {
  actions?: ReactNode | ((context: ProTableToolbarContext<RecordType, Query, Summary>) => ReactNode)
  extra?: ReactNode | ((context: ProTableToolbarContext<RecordType, Query, Summary>) => ReactNode)
  /** 刷新。工具栏开启后默认显示；`false` 隐藏。 */
  refresh?: boolean
  /**
   * 表格设置。工具栏开启后默认显示齿轮；`false` 隐藏。
   * 对象时 `columns` 覆盖列约束。弹窗内列设置、筛选设置两个 tab 始终都在。
   */
  setting?: boolean | ProTableSettingConfig
  /** 全屏。工具栏开启后默认显示并启用能力；`false` 关闭。 */
  fullscreen?: boolean
}

export type ProTablePaginationConfig = Omit<
  TablePaginationConfig,
  'current' | 'pageSize' | 'total' | 'defaultCurrent' | 'defaultPageSize'
>

/** Assembled request payload: filters + page + pageSize + sort. */
export type ProTableRequestParams<Query extends ProTableQueryRecord = Record<string, unknown>> =
  Query & {
    page: number
    pageSize: number
    sort?: ProTableViewSorter[]
  }

export interface ProTableRequestContext {
  signal: AbortSignal
}

export type ProTableQueryRequest<RecordType, Query extends ProTableQueryRecord> = (
  params: ProTableRequestParams<Query>,
  context: ProTableRequestContext,
) => Promise<{ data: RecordType[]; total?: number }>

export type ProTableSummaryRequest<Query extends ProTableQueryRecord, Summary> = (
  params: ProTableRequestParams<Query>,
  context: ProTableRequestContext,
) => Promise<Summary>

export interface ProTableControllerPaginationConfig {
  defaultCurrent?: number
  defaultPageSize?: number
}

export interface ProTableControllerConfig<RecordType, Query extends ProTableQueryRecord, Summary> {
  /** Filter defaults only. Page and sort are not part of Query. */
  defaultQuery?: Query
  rowKey?: TableProps<RecordType>['rowKey']
  queryRequest?: ProTableQueryRequest<RecordType, Query>
  summaryRequest?: ProTableSummaryRequest<Query, Summary>
  /**
   * When true (default), `''` / `[]` / `null` written through `setQuery` /
   * `setQueryField` become `undefined`. Layout still uses `hasSearchValue`.
   */
  coerceEmptyQuery?: boolean
  localSortFields?: readonly string[]
  /**
   * Page defaults. Live `currentPage` / `pageSize` follow these only before the
   * first request, while they still match the previous defaults.
   */
  pagination?: ProTableControllerPaginationConfig
  /** Initial selected keys. Later selection lives on controller state. */
  defaultSelectedRowKeys?: Key[]
  /** Initial expanded keys. Ignored when `defaultExpandAllRows` is true. */
  defaultExpandedRowKeys?: Key[]
  /** Expand all current rows once the first non-empty dataSource arrives. */
  defaultExpandAllRows?: boolean
}

export interface ProTableControllerState<RecordType, Query extends ProTableQueryRecord, Summary> {
  query: Query
  committedQuery: Query
  defaultQuery: Query
  latestParams: ProTableRequestParams<Query> | null
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
  sort: ProTableViewSorter[]
  rowKey: NonNullable<TableProps<RecordType>['rowKey']>
}

export interface ProTableController<RecordType, Query extends ProTableQueryRecord, Summary> {
  getState: () => ProTableControllerState<RecordType, Query, Summary>
  subscribe: (
    listener: (state: ProTableControllerState<RecordType, Query, Summary>) => void,
  ) => () => void
  /**
   * Patch live config. Present keys replace; explicit `undefined` resets that
   * field to create-time defaults. Omitted keys stay.
   */
  configure: (config: Partial<ProTableControllerConfig<RecordType, Query, Summary>>) => void
  setViewState: (state: {
    query: Query
    sorter?: ProTableViewSorter[] | null
    committed?: boolean
  }) => void
  setQueryField: <Key extends Extract<keyof Query, string>>(
    key: Key,
    value: Query[Key] | undefined,
  ) => void
  setQuery: (patch: Partial<Query>) => void
  resetQuery: (patch?: Partial<Query>) => void
  submitQuery: (options?: { resetPage?: boolean }) => Promise<void>
  reload: () => Promise<void>
  setPage: (page: number) => Promise<void>
  setPageSize: (pageSize: number) => Promise<void>
  setSort: (sort: ProTableViewSorter[]) => Promise<void>
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
  /** Currently assembled request: committed filters + page + pageSize + sort. */
  getRequestParams: () => ProTableRequestParams<Query>
}

export interface ProTableLayoutConfig {
  separated?: boolean
  /** 筛选区上方的内容，全屏时留在表格内。 */
  header?: ReactNode
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

export interface ProTableRef<
  RecordType,
  Query extends ProTableQueryRecord,
  Summary,
> {
  controller: ProTableController<RecordType, Query, Summary>
}

type ProTableUiProps<
  RecordType = Record<string, unknown>,
  Query extends ProTableQueryRecord = Record<string, unknown>,
  Summary = unknown,
> = Omit<
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
  | 'rowKey'
> & {
  autoRequest?: boolean
  onControllerReady?: (controller: ProTableController<RecordType, Query, Summary>) => void
  columns: ProTableColumnsType<RecordType>
  filters?: ProTableFilter<Query>[]
  /** `true` 开默认视图；`false` / 缺省关闭；对象为配置。 */
  views?: boolean | ProTableViewsConfig<Query>
  /** `true` 出刷新 / 表格设置 / 全屏；`false` / 缺省关闭；对象为工具栏配置。 */
  toolbar?: boolean | ProTableToolbarConfig<RecordType, Query, Summary>
  columnResize?: boolean | ProTableColumnResizeConfig<RecordType>
  persistenceKey?: string
  heightMode?: 'fill' | 'content'
  layout?: ProTableLayoutConfig
  emptyState?: ProTableEmptyStateConfig
  columnEmptyText?: ReactNode | false
  onTableChange?: TableProps<RecordType>['onChange']
  pagination?: false | ProTablePaginationConfig
  rowSelection?: ProTableRowSelection<RecordType>
  expandable?: ProTableExpandable<RecordType>
  loading?: boolean | SpinProps
  prefixCls?: string
  className?: string
  rootClassName?: string
  style?: CSSProperties
  classNames?: ProTableClassNamesType
  styles?: ProTableStylesType
}

type ProTableControllerSource<
  RecordType,
  Query extends ProTableQueryRecord,
  Summary,
> =
  | {
    controller: ProTableController<RecordType, Query, Summary>
    controllerConfig?: never
  }
  | {
    controller?: never
    controllerConfig?: ProTableControllerConfig<RecordType, Query, Summary>
  }

export type ProTableProps<
  RecordType = Record<string, unknown>,
  Query extends ProTableQueryRecord = Record<string, unknown>,
  Summary = unknown,
> = ProTableUiProps<RecordType, Query, Summary> &
  ProTableControllerSource<RecordType, Query, Summary>

export interface ProTableConfig<
  RecordType = Record<string, unknown>,
  Query extends ProTableQueryRecord = Record<string, unknown>,
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
  layout?: Partial<ProTableLayoutConfig>
  emptyState?: Partial<ProTableEmptyStateConfig>
  filters?: ProTableFilter<Query>[]
  views?: boolean | Partial<ProTableViewsConfig<Query>>
  toolbar?: boolean | Partial<ProTableToolbarConfig<RecordType, Query, Summary>>
  columnResize?: ProTableProps<RecordType, Query, Summary>['columnResize']
  pagination?: ProTableProps<RecordType, Query, Summary>['pagination']
  scroll?: ProTableProps<RecordType, Query, Summary>['scroll']
  rowSelection?: ProTableProps<RecordType, Query, Summary>['rowSelection']
  expandable?: ProTableProps<RecordType, Query, Summary>['expandable']
}

export type ProTableComponent = (<
  RecordType extends object = Record<string, unknown>,
  Query extends ProTableQueryRecord = Record<string, unknown>,
  Summary = unknown,
>(
  props: ProTableProps<RecordType, Query, Summary> &
    RefAttributes<ProTableRef<RecordType, Query, Summary>>,
) => ReactElement | null) & {
  displayName?: string
}

export type ProTableRowSelection<RecordType> = Omit<
  NonNullable<TableProps<RecordType>['rowSelection']>,
  'selectedRowKeys' | 'defaultSelectedRowKeys'
>
export type ProTableExpandable<RecordType> = Omit<
  NonNullable<TableProps<RecordType>['expandable']>,
  'expandedRowKeys' | 'defaultExpandedRowKeys' | 'defaultExpandAllRows'
>
export type ProTableTableChange<RecordType> = NonNullable<
  TableProps<RecordType>['onChange']
>

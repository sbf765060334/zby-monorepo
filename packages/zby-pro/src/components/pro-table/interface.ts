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

export type ProTableActionsLayout = {
  direction?: 'horizontal' | 'vertical'
} & (
  | { visibleCount?: number | 'all'; rows?: never; columns?: never }
  | { rows: number; columns: number; visibleCount?: never }
)

export interface ProTableActionsProps<RecordType = Record<string, unknown>> {
  actions: Array<ProTableActionItem<RecordType> | false | null | undefined>
  record?: RecordType
  index?: number
  /** 数量模式默认全部收起；网格容量包含溢出时的更多入口。 */
  layout?: ProTableActionsLayout
  /** 整体宽度。数字为 px；优先于 style.width。 */
  width?: CSSProperties['width']
  /** 自定义更多入口文字。默认收起模式无文字，外露数量/网格模式显示本地化的“更多”。 */
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
  /** 是否允许在列设置中切换可见性，默认 `true`。 */
  visibility?: boolean
  /** 是否允许在列设置中固定到左右两侧，默认 `true`。 */
  pinning?: boolean
  /** 是否允许拖拽调整列宽，默认 `true`；列上的 `resizable` 可进一步覆盖。 */
  resizing?: boolean
}

export interface ProTableColumnDefaultPreference {
  /** 默认是否展示，默认 `true`；保存的视图偏好优先。 */
  visible?: boolean
  /** 默认排列顺序，未指定时使用列定义中的顺序。 */
  order?: number
  /** 默认固定位置，未指定时从列的 `fixed` 推导。 */
  pin?: ProTableColumnPin
  /** 默认列宽，单位 px。 */
  width?: number
}

export interface ProTableColumnPreference {
  /** 对应列定义的稳定 key。 */
  key: string
  /** 当前是否展示该列。 */
  visible: boolean
  /** 当前排列顺序。 */
  order: number
  /** 当前固定位置，null 表示不固定。 */
  pin?: ProTableColumnPin
  /** 当前列宽，单位 px。 */
  width?: number
}

export type ProTableColumnState = Partial<ProTableColumnPreference> & { show?: boolean }
export type ProTableColumnsState = Record<string, ProTableColumnState>

export interface ProTableColumnFieldConfig<Meta = Record<string, unknown>> {
  /** 列设置和列宽调整的能力约束。 */
  capabilities?: ProTableColumnCapabilities
  /** 默认视图与恢复默认配置时使用的列偏好。 */
  defaultPreference?: ProTableColumnDefaultPreference
  /** 附加到内部列定义的业务元数据，不作为单元格内容渲染。 */
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
  /** 内置的只读单元格格式化类型。 */
  type: ProTableColumnValueType
  /** 金额币种代码，金额类型默认 `CNY`。 */
  currency?: ProTableMoneyCurrency
  /** 数字、金额格式化使用的地区设置。 */
  locale?: string
  /** 数值显示的小数位数；金额和百分比默认保留两位。 */
  precision?: number
  /** 金额类型控制货币符号；百分比类型控制正负号，函数形式用于百分比。 */
  showSymbol?: boolean | ((value: unknown) => boolean)
  /** 百分比类型是否按正负值着色。 */
  showColor?: boolean
  /** 金额类型是否展示货币符号；`false` 与 `showSymbol: false` 均可隐藏符号。 */
  moneySymbol?: boolean
}

export type ProTableColumnFieldValueType =
  | ProTableColumnValueType
  | ProTableColumnValueTypeConfig

export type ProTableColumnValueEnumItem =
  | ReactNode
  | {
    /** 枚举值展示文本。 */
    text?: ReactNode
    /** 枚举状态徽标的颜色。 */
    color?: string
    /** 枚举状态，用于状态徽标展示。 */
    status?: string
    /** 兼容枚举数据中的禁用标记；当前只读展示不处理此值，也不会禁用行或筛选项。 */
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
  /** 列设置中展示的名称；未指定时取静态 `title`，无法获取时回退到列 key。 */
  label?: string
  /** 列能力和默认偏好；`false` 表示不参与列设置和视图列偏好管理。 */
  fieldConfig?: false | ProTableColumnFieldConfig<Meta>
  /** 分组表头下的子列。 */
  children?: ProTableColumnType<RecordType, Meta>[]
  /** 文本类型的值与展示内容映射，支持对象和 Map。 */
  valueEnum?: ProTableColumnValueEnum
  /** 自定义单元格文本渲染；提供后不再生成内置 valueType 格式化函数。 */
  renderText?: (value: unknown, record: RecordType, index: number) => ReactNode
  /** 内置只读格式化类型；自定义 `render` 或 `renderText` 优先。 */
  valueType?: ProTableColumnFieldValueType
  /** @deprecated 请使用 valueType。 */
  dataRenderType?: ProTableColumnValueType
  /** 内置格式化器的附加参数，可按单元格值、行记录和行号动态生成。 */
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
  /** 列设置允许的最大可见列数，未指定时不限制。 */
  maxVisible?: number
  /** 列设置允许的最大固定列数，未指定时不限制。 */
  maxFixed?: number
  /** 新增列的插入策略，默认 `default-order`；也可插入已有偏好之前或之后。 */
  newColumnPolicy?: ProTableNewColumnPolicy
}

export type ProTableColumnSettingConfig = ProTableColumnsStateConfig

/** 表格设置。列约束放 `columns`；筛选侧暂无配置项。 */
export interface ProTableSettingConfig {
  /** 列设置约束；未指定时不限制可见列数和固定列数。 */
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
  /** 列和视图均未指定宽度时的兜底列宽，单位 px，最终默认 160。 */
  defaultWidth?: number
  /** 拖拽允许的最小列宽，透传给 Table。 */
  minWidth?: number
  /** 拖拽允许的最大列宽，透传给 Table。 */
  maxWidth?: number
  /** 按列 key 指定受控宽度；传入后需通过 onWidthsChange 更新对应值。 */
  widths?: ProTableColumnWidthMap
  /** 按列 key 指定的初始宽度，已有视图列宽偏好优先。 */
  defaultWidths?: ProTableColumnWidthMap
  /** 拖拽结束后是否写入列偏好；默认在启用视图或列设置时写入，持久化仍由视图保存负责。 */
  persist?: boolean
  /** 列宽集合变化时通知，返回完整宽度映射及本次调整信息。 */
  onWidthsChange?: (
    widths: ProTableColumnWidthMap,
    info: ProTableColumnResizeInfo<RecordType>,
  ) => void
  /** 拖拽调整列宽过程中的通知。 */
  onResize?: (info: ProTableColumnResizeInfo<RecordType>) => void
  /** 拖拽结束时通知；启用 persist 时先更新列偏好，再调用本回调。 */
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
  /** 当前字段的草稿值；未设置时为 undefined。 */
  value: Query[Key] | undefined
  /** 全部查询草稿，可用于字段联动；不是上次已提交的查询条件。 */
  query: Query
  /** 更新当前字段草稿，不会主动发起查询。 */
  setValue: (value: Query[Key] | undefined) => void
}

export type ProTableFilter<Query extends ProTableQueryRecord = Record<string, unknown>> = {
  [Key in Extract<keyof Query, string>]: {
    /** 对应 Query 中的字段名，同时作为筛选偏好和视图快照的字段标识。 */
    key: Key
    /** 筛选胶囊的标题。 */
    label: ReactNode
    /** 禁用整个筛选项，保留当前值；优先于 render 返回控件的 disabled。 */
    disabled?: boolean
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
    /** 必须返回单一根元素，筛选行才能合入尺寸与 disabled；自定义控件需透传 disabled。 */
    render: (context: ProTableFilterRenderContext<Query, Key>) => ReactNode
  }
}[Extract<keyof Query, string>]

export interface ProTableViewSorter {
  field: string
  order: 'ascend' | 'descend'
}

export type ProTableFilterPlacement = 'row' | 'more'

export interface ProTableFilterPreference {
  /** 对应筛选字段的 key。 */
  key: string
  /** 展示在筛选行或更多筛选浮层。 */
  placement: ProTableFilterPlacement
  /** 当前排列顺序。 */
  order: number
}

export interface ProTableViewSnapshot<Query extends ProTableQueryRecord = Record<string, unknown>> {
  /** 当前筛选条里相对默认值有改动的字段。空值和未出现的字段都不当作改动，恢复时回落到 defaultQuery。 */
  query: Partial<Query>
  /** 保存的列可见性、顺序、固定位置和宽度。 */
  columnPreferences: ProTableColumnPreference[]
  /** 保存的筛选字段位置和顺序。 */
  filterPreferences: ProTableFilterPreference[]
  /** 保存的多列排序；null 或未指定表示无排序。 */
  sorter?: ProTableViewSorter[] | null
}

export interface ProTableViewsConfig<Query extends ProTableQueryRecord = Record<string, unknown>> {
  /** 视图存储适配器。默认有 persistenceKey 时使用 IndexedDB，否则使用内存；false 强制使用内存。 */
  adapter?: false | ProViewManagementAdapter<ProTableViewSnapshot<Query>>
  /** 视图初始化失败时通知；retry 重新加载，成功前不触发 onReady 或自动查询。 */
  onLoadError?: (
    error: unknown,
    info: {
      /** 当前视图存储作用域标识。 */
      instanceId: string
      /** 重试当前视图初始化，不需要重新创建 controller。 */
      retry: () => void | Promise<void>
    },
  ) => void
}

export interface ProTableToolbarContext<
  RecordType,
  Query extends ProTableQueryRecord,
  Summary,
> {
  /** 当前表格的 controller，可用于查询或读取状态。 */
  controller: ProTableController<RecordType, Query, Summary>
  /** controller 当前是否正在请求列表或合计。 */
  loading: boolean
  /** 当前勾选的行 key，来自 controller。 */
  selectedRowKeys: Key[]
}

export interface ProTableToolbarConfig<
  RecordType = Record<string, unknown>,
  Query extends ProTableQueryRecord = Record<string, unknown>,
  Summary = unknown,
> {
  /** 工具栏左侧操作区，可根据 controller、请求状态和勾选行动态渲染。 */
  actions?: ReactNode | ((context: ProTableToolbarContext<RecordType, Query, Summary>) => ReactNode)
  /** 工具栏右侧扩展内容，位于内置功能按钮之前，支持动态渲染。 */
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
  /** 请求取消信号；支持取消的请求库应透传此信号。 */
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
  /** 初始页码，默认 1；submitQuery() 默认会回到第一页。 */
  defaultCurrent?: number
  /** 初始每页条数，默认 10。 */
  defaultPageSize?: number
}

export interface ProTableControllerConfig<RecordType, Query extends ProTableQueryRecord, Summary> {
  /** 查询默认值，默认空对象；作为 resetQuery 和视图恢复的基准，不包含分页和排序。 */
  defaultQuery?: Query
  /** 行唯一标识，默认取记录的 key 字段，也可提供计算函数。 */
  rowKey?: TableProps<RecordType>['rowKey']
  /** 列表请求函数，接收完整查询参数和取消信号；未返回 total 时使用当前页数据条数。 */
  queryRequest?: ProTableQueryRequest<RecordType, Query>
  /** 合计请求函数；有列表请求时与列表并行执行，使用相同查询参数。 */
  summaryRequest?: ProTableSummaryRequest<Query, Summary>
  /**
   * 默认 true，将 setQuery/setQueryField 写入的空字符串、空数组、null 转为 undefined。
   * 只影响草稿值的归一化，不会自动查询。
   */
  coerceEmptyQuery?: boolean
  /** 本地排序字段，不发送给服务端；ProTable 会从带比较函数的列中收集并配置。 */
  localSortFields?: readonly string[]
  /**
   * 初始分页。首次请求前且当前值仍等于原默认值时，可随 configure 更新；之后由 controller 管理。
   */
  pagination?: ProTableControllerPaginationConfig
  /** 初始勾选的行 key；后续勾选状态由 controller 管理。 */
  defaultSelectedRowKeys?: Key[]
  /** 初始展开的行 key；defaultExpandAllRows 为 true 时忽略。 */
  defaultExpandedRowKeys?: Key[]
  /** 首次收到非空数据时展开所有具有子节点的行，仅执行一次，默认 false。 */
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

/**
 * 外部 store。不要放进 `makeAutoObservable`。
 * 页面 store 只保存引用，渲染用 `useControllerSelector`。
 */
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
  /** 筛选区与表格主体是否使用分离布局样式，默认 true。 */
  separated?: boolean
  /** 筛选区上方的内容，全屏时留在表格内。 */
  header?: ReactNode
  /** 表格左侧的自定义区域，与表格并排展示。 */
  tableAside?: ReactNode
  /** 工具栏下方、表格上方的内容；关闭工具栏时仍可单独展示。 */
  tableTop?: ReactNode
}

export interface ProTableEmptyStateConfig {
  /** 首次成功查询前的空表提示，默认显示本地化的“点击查询后展示查询结果”。 */
  beforeQueryText?: ReactNode
  /** 查询成功但没有数据时的提示，默认显示本地化的“查无数据”。 */
  afterQueryText?: ReactNode
}

export interface ProTableSemanticClassNames {
  /** 整体根容器。 */
  root?: string
  /** 视图选择器与筛选行区域。 */
  search?: string
  /** 包含筛选区和表格主体的内容区域。 */
  content?: string
  /** 内置功能与业务操作所在的工具栏。 */
  toolbar?: string
  /** Table 区域。 */
  table?: string
  /** 更多筛选浮层。 */
  searchOverlay?: string
  /** 列设置与筛选设置弹窗。 */
  columnsModal?: string
  /** 全屏模式的根容器。 */
  fullscreen?: string
}

export interface ProTableSemanticStyles {
  /** 根容器样式，与 style 合并。 */
  root?: CSSProperties
  /** 筛选行样式。 */
  search?: CSSProperties
  /** 整体内容区域样式。 */
  content?: CSSProperties
  /** 工具栏样式。 */
  toolbar?: CSSProperties
  /** Table 区域样式。 */
  table?: CSSProperties
  /** 更多筛选浮层样式。 */
  searchOverlay?: CSSProperties
  /** 表格设置弹窗样式。 */
  columnsModal?: CSSProperties
  /** 全屏模式根容器的附加样式。 */
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
  /** 表格实际使用的 controller，可主动查询、更新草稿和管理行状态。 */
  controller: ProTableController<RecordType, Query, Summary>
}

export interface ProTableReadyInfo<RecordType, Query extends ProTableQueryRecord, Summary> {
  /** 初始查询与视图配置已恢复的 controller；列表请求可能尚未开始。 */
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
  /**
   * 自动发起首次请求及视图初始化补查，默认 false；等待初始化成功和请求函数就绪。
   * 同一视图作用域复用已请求的 controller 不自动重查；不限制用户操作或业务主动查询。
   */
  autoRequest?: boolean
  /**
   * controller 可用时通知，此时视图可能尚未加载；controller 更换或真实重挂会再次通知。
   * 普通重渲染及回调引用变化不重复通知；开发环境 StrictMode 可能重放 effect。
   */
  onControllerReady?: (controller: ProTableController<RecordType, Query, Summary>) => void
  /**
   * 默认或视图状态提交后、自动查询前通知；不代表列表已返回，也不等待请求函数就绪。
   * 每轮成功初始化一次，包含缓存重挂及 controller/作用域/适配器更换；失败或取消不通知。
   * 普通重渲染、回调引用变化及用户切换当前视图不重复通知。
   * 不等待回调内的异步任务；同步发起的查询接管本轮自动查询，避免重复请求。
   */
  onReady?: (info: ProTableReadyInfo<RecordType, Query, Summary>) => void
  /** 列定义，支持分组、内置格式化和列偏好；建议为各列提供稳定且唯一的 key。 */
  columns: ProTableColumnsType<RecordType>
  /** 筛选字段定义，默认无筛选项；修改字段只更新查询草稿，主动查询时才提交。 */
  filters?: ProTableFilter<Query>[]
  /** 视图管理，默认关闭；true 使用默认配置，对象可指定存储适配器及加载失败回调。 */
  views?: boolean | ProTableViewsConfig<Query>
  /** 工具栏，默认关闭；true 显示刷新、设置和全屏，对象可配置业务操作与各功能开关。 */
  toolbar?: boolean | ProTableToolbarConfig<RecordType, Query, Summary>
  /** 列宽拖拽，默认开启；false 关闭，对象可配置宽度约束、受控宽度和事件。 */
  columnResize?: boolean | ProTableColumnResizeConfig<RecordType>
  /** 默认视图存储的持久化作用域标识；同 key 共用记录，不传时默认使用内存适配器。 */
  persistenceKey?: string
  /** 高度模式，默认 content；fill 填充父容器可用高度，父容器需具有确定高度。 */
  heightMode?: 'fill' | 'content'
  /** 分区布局，配置分离样式、顶部内容、表格上方及侧边区域。 */
  layout?: ProTableLayoutConfig
  /** 尚未查询与查询成功无数据时的空状态提示。 */
  emptyState?: ProTableEmptyStateConfig
  /** 单元格空值占位，默认 '-'；列上的 emptyText 优先，false 保留原始空值。 */
  columnEmptyText?: ReactNode | false
  /** Table 的分页、筛选、排序事件；内部先同步分页或排序到 controller，再通知业务。 */
  onTableChange?: TableProps<RecordType>['onChange']
  /** 分页器展示配置，默认开启；false 隐藏分页器，页码、每页条数和总数仍由 controller 管理。 */
  pagination?: false | ProTablePaginationConfig
  /** 行选择展示与回调配置，默认不展示；选中 key 由 controller 管理，初值放 controllerConfig。 */
  rowSelection?: ProTableRowSelection<RecordType>
  /** 展开行展示与回调配置；展开 key 及初始展开策略由 controller 管理。 */
  expandable?: ProTableExpandable<RecordType>
  /** 覆盖 Table 的 loading 展示，默认跟随 controller；不影响实际请求或工具栏请求状态。 */
  loading?: boolean | SpinProps
  /** ProTable 样式前缀，默认由 ConfigProvider 生成，通常为 ant-pro-table。 */
  prefixCls?: string
  /** 根容器的附加类名。 */
  className?: string
  /** 根级附加类名，应用于普通及全屏模式的根容器。 */
  rootClassName?: string
  /** 根容器内联样式；fill 模式需配合父容器布局。 */
  style?: CSSProperties
  /** 各语义区域的附加类名，支持对象或根据解析后的 props 动态生成。 */
  classNames?: ProTableClassNamesType
  /** 各语义区域的内联样式，支持对象或根据解析后的 props 动态生成。 */
  styles?: ProTableStylesType
}

type ProTableControllerSource<
  RecordType,
  Query extends ProTableQueryRecord,
  Summary,
> =
  | {
    /** 外部 controller，与 controllerConfig 互斥；卸载时不会由 ProTable 取消其请求。 */
    controller: ProTableController<RecordType, Query, Summary>
    /** 使用外部 controller 时不可传；运行中调整配置请调用 controller.configure。 */
    controllerConfig?: never
  }
  | {
    /** 省略时由组件根据 controllerConfig 创建并持有内部 controller。 */
    controller?: never
    /** 内部 controller 的创建及配置参数；组件卸载时取消其请求。 */
    controllerConfig?: ProTableControllerConfig<RecordType, Query, Summary>
  }

/**
 * ProTable 的展示、查询与视图配置。
 * 其余 Table props（如 scroll、bordered、summary）沿用 @zby/ui Table；数据和行标识等由 controller 托管。
 */
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
  /** 统一配置的样式前缀。 */
  prefixCls?: string
  /** 统一配置的根容器类名。 */
  className?: string
  /** 统一配置的根级附加类名。 */
  rootClassName?: string
  /** 统一配置的根容器样式。 */
  style?: CSSProperties
  /** 各语义区域的附加类名，可按解析后的 props 动态生成。 */
  classNames?: ProTableClassNamesType
  /** 各语义区域的内联样式，可按解析后的 props 动态生成。 */
  styles?: ProTableStylesType
  /** 默认高度模式：content 随内容布局，fill 填满父容器。 */
  heightMode?: ProTableProps<RecordType, Query, Summary>['heightMode']
  /** 默认是否自动查询；组件内置默认值为 false，不影响业务主动查询。 */
  autoRequest?: ProTableProps<RecordType, Query, Summary>['autoRequest']
  /** 分区布局配置。 */
  layout?: Partial<ProTableLayoutConfig>
  /** 查询前及查询成功无数据时的空状态配置。 */
  emptyState?: Partial<ProTableEmptyStateConfig>
  /** 筛选字段定义。 */
  filters?: ProTableFilter<Query>[]
  /** 视图管理开关或适配器配置。 */
  views?: boolean | Partial<ProTableViewsConfig<Query>>
  /** 工具栏开关或业务操作、内置按钮配置。 */
  toolbar?: boolean | Partial<ProTableToolbarConfig<RecordType, Query, Summary>>
  /** 列宽拖拽开关或宽度约束及事件配置。 */
  columnResize?: ProTableProps<RecordType, Query, Summary>['columnResize']
  /** 分页器展示配置；页码、每页条数与总数由 controller 管理。 */
  pagination?: ProTableProps<RecordType, Query, Summary>['pagination']
  /** 横向、纵向滚动配置，沿用 Table 的 scroll。 */
  scroll?: ProTableProps<RecordType, Query, Summary>['scroll']
  /** 行选择展示与回调配置，不接管 controller 内的选中 key。 */
  rowSelection?: ProTableProps<RecordType, Query, Summary>['rowSelection']
  /** 展开行展示与回调配置，不接管 controller 内的展开 key。 */
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

import * as React from 'react'
import { convertChildrenToColumns, INTERNAL_HOOKS } from './RcTableInner'
import type { Reference as RcReference, TableProps as RcTableProps } from './RcTableInner'
import { omit, pickAttrs } from '@rc-component/util'
import { clsx } from 'clsx'

import { useProxyImperativeHandle } from 'antd/es/_util/hooks'
import { useMergeSemantic, useSemanticRootStyle } from 'antd/es/_util/hooks/useMergeSemantic'
import type { GenerateSemantic } from 'antd/es/_util/hooks/useMergeSemantic/semanticType'
import { isFunction, isNumber, isPlainObject } from 'antd/es/_util/is'
import type { Breakpoint } from 'antd/es/_util/responsiveObserver'
import scrollTo from 'antd/es/_util/scrollTo'
import type { AnyObject } from 'antd/es/_util/type'
import { devUseWarning } from 'antd/es/_util/warning'
import ConfigProvider from 'antd/es/config-provider'
import type { ConfigConsumerProps } from 'antd/es/config-provider/context'
import { ConfigContext, useComponentConfig } from 'antd/es/config-provider/context'
import DefaultRenderEmpty from 'antd/es/config-provider/defaultRenderEmpty'
import useCSSVarCls from 'antd/es/config-provider/hooks/useCSSVarCls'
import useSize from 'antd/es/config-provider/hooks/useSize'
import type { SizeType } from 'antd/es/config-provider/SizeContext'
import useBreakpoint from 'antd/es/grid/hooks/useBreakpoint'
import { useLocale } from 'antd/es/locale'
import defaultLocale from 'antd/es/locale/en_US'
import Pagination from 'antd/es/pagination'
import type { PaginationSemanticType } from 'antd/es/pagination/Pagination'
import type { SpinProps } from 'antd/es/spin'
import Spin from 'antd/es/spin'
import { useToken } from 'antd/es/theme/internal'
import renderExpandIcon from './ExpandIcon'
import useColumnEnhance from './hooks/useColumnEnhance'
import useColumnTitleProps from './hooks/useColumnTitleProps'
import useContainerWidth from './hooks/useContainerWidth'
import useFilledColumns from './hooks/useFilledColumns'
import type { FilterConfig, FilterState } from './hooks/useFilter'
import useFilter, { getFilterData } from './hooks/useFilter'
import useLazyKVMap from './hooks/useLazyKVMap'
import usePagination, { DEFAULT_PAGE_SIZE, getPaginationParam } from './hooks/usePagination'
import useRowHighlight from './hooks/useRowHighlight'
import useTableFillLayout from './hooks/useTableFillLayout'
import useSelection from './hooks/useSelection'
import type { SortState } from './hooks/useSorter'
import useSorter, { getSortData } from './hooks/useSorter'
import useSpinProps from './hooks/useSpinProps'
import useTitleColumns from './hooks/useTitleColumns'
import type {
  ColumnsType,
  ColumnType,
  ExpandableConfig,
  ExpandType,
  FilterValue,
  GetPopupContainer,
  GetRowKey,
  RefInternalTable,
  SorterResult,
  SorterTooltipProps,
  SortOrder,
  TableAction,
  ColumnResizeConfig,
  TableCurrentDataSource,
  TableHeightMode,
  TableLocale,
  TablePaginationConfig,
  TableRowHighlight,
  TableRowSelection,
} from './interface'
import RcTable from './RcTable'
import ScrollArea from '../scroll-area'
import RcVirtualTable from './RcTable/VirtualTable'
import useStyle from './style'
import TableMeasureRowContext from './TableMeasureRowContext'
import { getPaginationSize, normalizePlacement } from './util'

export type { ColumnsType, TablePaginationConfig }

const EMPTY_LIST: AnyObject[] = []

type HeaderTableContextValue = {
  ariaProps?: React.AriaAttributes;
  component?: React.ElementType;
}

const HeaderTableContext = React.createContext<HeaderTableContextValue>({})

const HeaderTable: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = (props) => {
  const { ariaProps, component = 'table' } = React.useContext(HeaderTableContext)
  return React.createElement(component, {
    ...ariaProps,
    ...props,
  })
}

if (process.env.NODE_ENV !== 'production') {
  HeaderTable.displayName = 'HeaderTable'
}

type ComponentsSemanticClassNames = {
  wrapper?: string;
  cell?: string;
  row?: string;
}

type ComponentsSemanticStyles = {
  wrapper?: React.CSSProperties;
  cell?: React.CSSProperties;
  row?: React.CSSProperties;
}

export type TableSemanticType = {
  classNames?: {
    root?: string;
    section?: string;
    title?: string;
    footer?: string;
    body?: ComponentsSemanticClassNames;
    content?: string;
    header?: ComponentsSemanticClassNames;
    pagination?: PaginationSemanticType['classNames'];
  };
  styles?: {
    root?: React.CSSProperties;
    section?: React.CSSProperties;
    title?: React.CSSProperties;
    footer?: React.CSSProperties;
    body?: ComponentsSemanticStyles;
    content?: React.CSSProperties;
    header?: ComponentsSemanticStyles;
    pagination?: PaginationSemanticType['styles'];
  };
}

export type TableSemanticAllType<T = any> = GenerateSemantic<TableSemanticType, TableProps<T>>

interface ChangeEventInfo<RecordType = AnyObject> {
  pagination: {
    current?: number;
    pageSize?: number;
    total?: number;
  };
  filters: Record<string, FilterValue | null>;
  sorter: SorterResult<RecordType> | SorterResult<RecordType>[];

  filterStates: FilterState<RecordType>[];
  sorterStates: SortState<RecordType>[];

  resetPagination: (current?: number, pageSize?: number) => void;
}

export interface TableProps<RecordType = AnyObject> extends Omit<
  RcTableProps<RecordType>,
  | 'transformColumns'
  | 'internalHooks'
  | 'internalRefs'
  | 'data'
  | 'columns'
  | 'scroll'
  | 'emptyText'
  | 'classNames'
  | 'styles'
> {
  classNames?: TableSemanticAllType<RecordType>['classNamesAndFn'];
  styles?: TableSemanticAllType<RecordType>['stylesAndFn'];
  dropdownPrefixCls?: string;
  dataSource?: RcTableProps<RecordType>['data'];
  column?: Partial<ColumnType<RecordType>>;
  columns?: ColumnsType<RecordType>;
  pagination?: false | TablePaginationConfig;
  loading?: boolean | SpinProps;
  size?: SizeType;
  bordered?: boolean;
  locale?: TableLocale;
  rootClassName?: string;

  onChange?: (
    pagination: TablePaginationConfig,
    filters: Record<string, FilterValue | null>,
    sorter: SorterResult<RecordType> | SorterResult<RecordType>[],
    extra: TableCurrentDataSource<RecordType>,
  ) => void;
  rowSelection?: TableRowSelection<RecordType>;

  getPopupContainer?: GetPopupContainer;
  scroll?: RcTableProps<RecordType>['scroll'] & {
    scrollToFirstRowOnChange?: boolean;
  };
  sortDirections?: SortOrder[];
  showSorterTooltip?: boolean | SorterTooltipProps;
  virtual?: boolean;
  heightMode?: TableHeightMode;
  columnResize?: boolean | ColumnResizeConfig<RecordType>;
  rowHighlight?: TableRowHighlight<RecordType>;
}

/** Same as `TableProps` but we need record parent render times */
export interface InternalTableProps<RecordType = AnyObject> extends TableProps<RecordType> {
  _renderTimes: number;
}

const InternalTable = <RecordType extends AnyObject = AnyObject>(
  props: InternalTableProps<RecordType>,
  ref: React.Ref<HTMLDivElement>,
) => {
  const {
    prefixCls: customizePrefixCls,
    className,
    rootClassName,
    style,
    classNames,
    styles,
    size: customizeSize,
    bordered,
    dropdownPrefixCls: customizeDropdownPrefixCls,
    dataSource,
    pagination,
    rowSelection: customizeRowSelection,
    rowKey: customizeRowKey,
    rowClassName,
    column,
    columns,
    children,
    childrenColumnName: legacyChildrenColumnName,
    onChange,
    getPopupContainer,
    loading,
    expandIcon,
    expandable,
    expandedRowRender,
    expandIconColumnIndex,
    indentSize,
    scroll,
    sortDirections,
    locale,
    showSorterTooltip = { target: 'full-header' },
    virtual,
    heightMode = 'content',
    columnResize,
    rowHighlight,
    onRow,
  } = props

  const warning = devUseWarning('Table')

  const rawColumns = React.useMemo(
    () => columns || (convertChildrenToColumns(children) as ColumnsType<RecordType>),
    [columns, children],
  )
  const baseColumns = useFilledColumns(rawColumns, column)
  const needResponsive = React.useMemo(
    () => baseColumns.some((col: ColumnType<RecordType>) => col.responsive),
    [baseColumns],
  )

  const screens = useBreakpoint(needResponsive)

  const mergedColumns = React.useMemo(() => {
    const matched = new Set(Object.keys(screens).filter((m) => screens[m as Breakpoint]))

    return baseColumns.filter((c) => !c.responsive || c.responsive.some((r) => matched.has(r)))
  }, [baseColumns, screens])

  const tableProps: TableProps<RecordType> = omit(props, [
    'className',
    'style',
    'column',
    'columns',
    'heightMode',
    'columnResize',
    'rowHighlight',
    'onRow',
  ])

  const components = tableProps.components as RcTableProps<RecordType>['components']
  const ariaProps = pickAttrs(tableProps, { aria: true }) as React.AriaAttributes
  const hasAriaProps = Object.keys(ariaProps).length > 0
  const headerTableContext = React.useMemo<HeaderTableContextValue>(
    () => ({
      ariaProps,
      component: components?.header?.table as React.ElementType | undefined,
    }),
    [ariaProps, components?.header?.table],
  )
  const mergedComponents = React.useMemo<RcTableProps<RecordType>['components']>(() => {
    if (!hasAriaProps) {
      return components
    }

    return {
      ...components,
      header: {
        ...components?.header,
        table: HeaderTable,
      },
    }
  }, [components, hasAriaProps])

  const { locale: contextLocale = defaultLocale, table } =
    React.useContext<ConfigConsumerProps>(ConfigContext)

  const {
    getPrefixCls,
    direction,
    renderEmpty,
    getPopupContainer: getContextPopupContainer,
    className: contextClassName,
    style: contextStyle,
    classNames: contextClassNames,
    styles: contextStyles,
  } = useComponentConfig('table')

  const mergedSize = useSize((ctx) =>
    customizeSize === 'middle' ? 'medium' : (customizeSize ?? ctx),
  )

  // =========== Merged Props for Semantic ==========
  const mergedProps: TableProps<RecordType> = {
    ...props,
    heightMode,
    size: mergedSize,
    bordered,
  }

  const contextStyleRoot = useSemanticRootStyle(contextStyle)
  const styleRoot = useSemanticRootStyle(style)

  const [mergedClassNames, mergedStyles] = useMergeSemantic<
    TableSemanticAllType<RecordType>['classNames'],
    TableSemanticAllType<RecordType>['styles'],
    TableProps<RecordType>
  >(
    [
      contextClassNames as TableSemanticAllType<RecordType>['classNames'],
      classNames,
    ],
    [
      contextStyles as TableSemanticAllType<RecordType>['styles'],
      contextStyleRoot,
      styles,
      styleRoot,
    ],
    { props: mergedProps },
    {
      pagination: {
        _default: 'root',
      },
      header: {
        _default: 'wrapper',
      },
      body: {
        _default: 'wrapper',
      },
    },
  )

  const tableLocale: TableLocale = { ...contextLocale.Table, ...locale }
  const [globalLocale] = useLocale('global', defaultLocale.global)
  const rawData: readonly RecordType[] = dataSource || EMPTY_LIST

  const prefixCls = getPrefixCls('table', customizePrefixCls)
  const dropdownPrefixCls = getPrefixCls('dropdown', customizeDropdownPrefixCls)

  const [, token] = useToken()

  const mergedRowSelection = React.useMemo(() => {
    return isPlainObject(customizeRowSelection)
      ? { columnWidth: token.Table?.selectionColumnWidth, ...customizeRowSelection }
      : customizeRowSelection
  }, [customizeRowSelection, token.Table?.selectionColumnWidth])
  const rootCls = useCSSVarCls(prefixCls)
  const [hashId, cssVarCls] = useStyle(prefixCls, rootCls)
  const [transformEnhanceColumns] = useColumnEnhance<RecordType>(prefixCls)

  const mergedExpandable: ExpandableConfig<RecordType> = {
    childrenColumnName: legacyChildrenColumnName,
    expandIconColumnIndex,
    ...expandable,
    expandIcon: expandable?.expandIcon ?? table?.expandable?.expandIcon,
  }
  const { childrenColumnName = 'children' } = mergedExpandable

  const expandType = React.useMemo<ExpandType>(() => {
    if (rawData.some((item) => item?.[childrenColumnName])) {
      return 'nest'
    }

    if (expandedRowRender || expandable?.expandedRowRender) {
      return 'row'
    }

    return null
  }, [childrenColumnName, rawData])

  const internalRef: NonNullable<RcTableProps['internalRefs']> = {
    body: React.useRef<HTMLDivElement>(null),
  } as NonNullable<RcTableProps['internalRefs']>

  // ============================ Width =============================
  const getContainerWidth = useContainerWidth(prefixCls)
  const mergedScroll = scroll ?? table?.scroll
  const fillEnabled = heightMode === 'fill'
  const columnResizingEnabled = Boolean(columnResize)
  const mergedTableLayout = columnResizingEnabled
    ? 'fixed'
    : tableProps.tableLayout
  if (process.env.NODE_ENV !== 'production') {
    warning(
      !(columnResizingEnabled && tableProps.tableLayout === 'auto'),
      'usage',
      '`tableLayout="auto"` is ignored when `columnResize` is enabled. Column resizing requires `tableLayout="fixed"`.',
    )
    warning(
      !(fillEnabled && mergedScroll?.y !== undefined),
      'usage',
      '`scroll.y` will be ignored when `heightMode="fill"` is enabled.',
    )
  }

  // ============================= Refs =============================
  const rootRef = React.useRef<HTMLDivElement>(null)
  const tblRef = React.useRef<RcReference>(null)

  useProxyImperativeHandle(ref, () => ({
    ...tblRef.current!,
    nativeElement: rootRef.current!,
  }))

  // ============================ RowKey ============================
  const rowKey = customizeRowKey || table?.rowKey || 'key'

  // ============================ Scroll ============================
  if (process.env.NODE_ENV !== 'production') {
    warning(
      !(isFunction(rowKey) && rowKey.length > 1),
      'usage',
      '`index` parameter of `rowKey` function is deprecated. There is no guarantee that it will work as expected.',
    )
  }

  const getRowKey = React.useMemo<GetRowKey<RecordType>>(() => {
    if (isFunction(rowKey)) {
      return rowKey
    }

    return (record: RecordType) => record?.[rowKey as string]
  }, [rowKey])

  const {
    getHighlightClassName,
    onRow: mergedOnRow,
  } = useRowHighlight({
    config: rowHighlight,
    getRowKey,
    onRow,
    prefixCls,
  })

  const [getRecordByKey] = useLazyKVMap(rawData, childrenColumnName, getRowKey)

  // ============================ Events =============================
  const changeEventInfo: Partial<ChangeEventInfo<RecordType>> = {}

  const triggerOnChange = (
    info: Partial<ChangeEventInfo<RecordType>>,
    action: TableAction,
    reset = false,
  ) => {
    const changeInfo = {
      ...changeEventInfo,
      ...info,
    }

    if (reset) {
      changeEventInfo.resetPagination?.()

      // Reset event param
      if (changeInfo.pagination?.current) {
        changeInfo.pagination.current = 1
      }

      // Trigger pagination events
      if (pagination) {
        pagination.onChange?.(1, changeInfo.pagination?.pageSize!)
      }
    }

    if (scroll && scroll.scrollToFirstRowOnChange !== false && internalRef.body.current) {
      scrollTo(0, {
        getContainer: () => internalRef.body.current!,
      })
    }

    onChange?.(changeInfo.pagination!, changeInfo.filters!, changeInfo.sorter!, {
      currentDataSource: getFilterData(
        getSortData(rawData, changeInfo.sorterStates!, childrenColumnName),
        changeInfo.filterStates!,
        childrenColumnName,
      ),
      action,
    })
  }

  /**
   * Controlled state in `columns` is not a good idea that makes too many code (1000+ line?) to read
   * state out and then put it back to title render. Move these code into `hooks` but still too
   * complex. We should provides Table props like `sorter` & `filter` to handle control in next big
   * version.
   */

  // ============================ Sorter =============================
  const onSorterChange = (
    sorter: SorterResult<RecordType> | SorterResult<RecordType>[],
    sorterStates: SortState<RecordType>[],
  ) => {
    triggerOnChange(
      {
        sorter,
        sorterStates,
      },
      'sort',
      false,
    )
  }
  const [transformSorterColumns, sortStates, sorterTitleProps, getSorters] = useSorter<RecordType>({
    prefixCls,
    mergedColumns,
    // Pass `baseColumns` (pre-responsive) so `defaultSortOrder` and controlled
    // `sortOrder` on a `responsive` column are still honored when the column
    // is hidden at the current breakpoint.
    // See: https://github.com/ant-design/ant-design/issues/32847
    baseColumns,
    onSorterChange,
    sortDirections: sortDirections || ['ascend', 'descend'],
    tableLocale,
    showSorterTooltip,
    globalLocale,
  })

  const sortedData = React.useMemo(
    () => getSortData(rawData, sortStates, childrenColumnName),
    [childrenColumnName, rawData, sortStates],
  )

  changeEventInfo.sorter = getSorters()
  changeEventInfo.sorterStates = sortStates

  // ============================ Filter ============================
  const onFilterChange: FilterConfig<RecordType>['onFilterChange'] = (filters, filterStates) => {
    triggerOnChange({ filters, filterStates }, 'filter', true)
  }

  const [transformFilterColumns, filterStates, filters] = useFilter<RecordType>({
    prefixCls,
    locale: tableLocale,
    dropdownPrefixCls,
    mergedColumns,
    onFilterChange,
    getPopupContainer: getPopupContainer || getContextPopupContainer,
    rootClassName: clsx(rootClassName, rootCls),
  })
  const mergedData = getFilterData(sortedData, filterStates, childrenColumnName)

  changeEventInfo.filters = filters
  changeEventInfo.filterStates = filterStates

  // ============================ Column ============================
  const columnTitleProps = useColumnTitleProps(sorterTitleProps, filters)

  const [transformTitleColumns] = useTitleColumns(columnTitleProps)

  // ========================== Pagination ==========================
  const onPaginationChange = (current: number, pageSize: number) => {
    triggerOnChange(
      {
        pagination: { ...changeEventInfo.pagination, current, pageSize },
      },
      'paginate',
    )
  }

  const [mergedPagination, resetPagination] = usePagination(
    mergedData.length,
    onPaginationChange,
    pagination,
  )

  changeEventInfo.pagination =
    pagination === false ? {} : getPaginationParam(mergedPagination, pagination)

  changeEventInfo.resetPagination = resetPagination

  // ============================= Data =============================
  const pageData = React.useMemo<RecordType[]>(() => {
    if (pagination === false || !mergedPagination.pageSize) {
      return mergedData
    }

    const { current = 1, total, pageSize = DEFAULT_PAGE_SIZE } = mergedPagination
    warning(current > 0, 'usage', '`current` should be positive number.')

    // Dynamic table data
    if (mergedData.length < total!) {
      if (mergedData.length > pageSize) {
        warning(
          false,
          'usage',
          '`dataSource` length is less than `pagination.total` but large than `pagination.pageSize`. Please make sure your config correct data with async mode.',
        )
        return mergedData.slice((current - 1) * pageSize, current * pageSize)
      }
      return mergedData
    }

    return mergedData.slice((current - 1) * pageSize, current * pageSize)
  }, [
    !!pagination,
    mergedData,
    mergedPagination?.current,
    mergedPagination?.pageSize,
    mergedPagination?.total,
  ])

  // ========================== Selections ==========================
  const [transformSelectionColumns, selectedKeySet] = useSelection<RecordType>(
    {
      prefixCls,
      data: mergedData,
      pageData,
      getRowKey,
      getRecordByKey,
      expandType,
      childrenColumnName,
      locale: tableLocale,
      getPopupContainer: getPopupContainer || getContextPopupContainer,
    },
    mergedRowSelection,
  )

  const internalRowClassName = (record: RecordType, index: number, indent: number) => {
    return clsx(
      {
        [`${prefixCls}-row-selected`]: selectedKeySet.has(getRowKey(record, index)),
      },
      getHighlightClassName(record, index),
      isFunction(rowClassName) ? rowClassName(record, index, indent) : rowClassName,
    )
  };

  // ========================== Expandable ==========================

  // Pass origin render status into the local RcTable fork.
  (mergedExpandable as any).__PARENT_RENDER_ICON__ = mergedExpandable.expandIcon

  // Customize expandable icon
  mergedExpandable.expandIcon =
    mergedExpandable.expandIcon || expandIcon || renderExpandIcon(tableLocale)

  // Adjust expand icon index, no overwrite expandIconColumnIndex if set.
  if (expandType === 'nest' && mergedExpandable.expandIconColumnIndex === undefined) {
    mergedExpandable.expandIconColumnIndex = mergedRowSelection ? 1 : 0
  } else if (mergedExpandable.expandIconColumnIndex! > 0 && mergedRowSelection) {
    mergedExpandable.expandIconColumnIndex! -= 1
  }

  // Indent size
  if (!isNumber(mergedExpandable.indentSize)) {
    mergedExpandable.indentSize = isNumber(indentSize) ? indentSize : 15
  }

  // ============================ Render ============================
  const transformColumns = React.useCallback(
    (innerColumns: ColumnsType<RecordType>): ColumnsType<RecordType> =>
      transformTitleColumns(
        transformSelectionColumns(
          transformFilterColumns(transformSorterColumns(transformEnhanceColumns(innerColumns))),
        ),
      ),
    [
      transformEnhanceColumns,
      transformSorterColumns,
      transformFilterColumns,
      transformSelectionColumns,
    ],
  )

  let topPaginationNode: React.ReactNode
  let bottomPaginationNode: React.ReactNode
  if (pagination !== false && mergedPagination?.total) {
    const paginationSize = getPaginationSize(mergedPagination.size, mergedSize)

    const renderPagination = (placement: 'start' | 'end' | 'center' = 'end') => (
      <Pagination
        {...mergedPagination}
        classNames={mergedClassNames.pagination}
        styles={mergedStyles.pagination}
        className={clsx(
          `${prefixCls}-pagination`,
          `${prefixCls}-pagination-${placement}`,
          mergedPagination.className,
        )}
        size={paginationSize}
      />
    )

    const { placement, position } = mergedPagination
    const mergedPlacement = placement ?? position

    if (Array.isArray(mergedPlacement)) {
      const [topPos, bottomPos] = ['top', 'bottom'].map((dir) =>
        mergedPlacement.find((p) => p.includes(dir)),
      )
      const isDisable = mergedPlacement.every((p) => `${p}` === 'none')
      if (!topPos && !bottomPos && !isDisable) {
        bottomPaginationNode = renderPagination()
      }
      if (topPos) {
        topPaginationNode = renderPagination(normalizePlacement(topPos))
      }
      if (bottomPos) {
        bottomPaginationNode = renderPagination(normalizePlacement(bottomPos))
      }
    } else {
      bottomPaginationNode = renderPagination()
    }

    if (process.env.NODE_ENV !== 'production') {
      warning.deprecated(!position, 'pagination.position', 'pagination.placement')
    }
  }

  // >>>>>>>>> Spinning
  const spinProps = useSpinProps(loading)

  const wrappercls = clsx(
    cssVarCls,
    rootCls,
    `${prefixCls}-wrapper`,
    contextClassName,
    {
      [`${prefixCls}-wrapper-rtl`]: direction === 'rtl',
      [`${prefixCls}-wrapper-fill`]: fillEnabled,
    },
    className,
    rootClassName,
    mergedClassNames.root,
    hashId,
  )

  // ========== empty ==========
  const mergedEmptyNode = React.useMemo<RcTableProps['emptyText']>(() => {
    // When dataSource is null/undefined (detected by reference equality with EMPTY_LIST),
    // and the table is in a loading state, we only show the loading spinner without the empty placeholder.
    // For empty arrays (datasource={[]}), both loading and empty states would normally be shown.
    // discussion https://github.com/ant-design/ant-design/issues/54601#issuecomment-3158091383
    if (spinProps?.spinning && rawData === EMPTY_LIST) {
      return null
    }
    if (typeof locale?.emptyText !== 'undefined') {
      return locale.emptyText
    }
    return renderEmpty?.('Table') || <DefaultRenderEmpty componentName="Table" />
  }, [spinProps?.spinning, rawData, locale?.emptyText, renderEmpty])

  const listItemHeight = React.useMemo(() => {
    const { fontSize, lineHeight, lineWidth, padding, paddingXS, paddingSM } = token
    const fontHeight = Math.floor(fontSize * lineHeight)

    switch (mergedSize) {
      case 'medium':
        return paddingSM * 2 + fontHeight + lineWidth

      case 'small':
        return paddingXS * 2 + fontHeight + lineWidth

      default:
        return padding * 2 + fontHeight + lineWidth
    }
  }, [token, mergedSize])

  const virtualProps: { listItemHeight?: number } = {}
  if (virtual) {
    virtualProps.listItemHeight = listItemHeight
  }

  const { mergedScrollY } = useTableFillLayout({
    enabled: fillEnabled,
    metrics: {
      hasFooter: typeof tableProps.footer === 'function',
      hasSummary: typeof tableProps.summary === 'function',
      hasTitle: typeof tableProps.title === 'function',
      paginationEnabled: pagination !== false && Boolean(mergedPagination?.total),
      paginationPlacement: Array.isArray(mergedPagination?.placement)
        ? mergedPagination.placement.join(',')
        : undefined,
      virtual: Boolean(virtual),
    },
    prefixCls,
    rootRef,
    scroll: mergedScroll,
  })

  const columnResizeScroll = columnResize ? (mergedScroll ?? {}) : mergedScroll
  const effectiveScroll = fillEnabled
    ? { ...columnResizeScroll, y: mergedScrollY }
    : columnResizeScroll

  // ========================== Render ==========================
  const TableComponent = virtual ? RcVirtualTable : RcTable

  return (
    <div ref={rootRef} className={wrappercls} style={mergedStyles.root}>
      <Spin spinning={false} {...spinProps}>
        {topPaginationNode}
        <HeaderTableContext.Provider value={headerTableContext}>
          <TableComponent
            {...virtualProps}
            {...tableProps}
            tableLayout={mergedTableLayout}
            components={mergedComponents}
            columnResize={columnResize}
            scroll={effectiveScroll}
            scrollAreaComponent={
              ScrollArea as unknown as RcTableProps<RecordType>['scrollAreaComponent']
            }
            classNames={mergedClassNames as RcTableProps<RecordType>['classNames']}
            styles={mergedStyles as RcTableProps<RecordType>['styles']}
            ref={tblRef}
            columns={mergedColumns as RcTableProps<RecordType>['columns']}
            direction={direction}
            expandable={mergedExpandable}
            prefixCls={prefixCls}
            className={clsx(
              {
                [`${prefixCls}-medium`]: mergedSize === 'medium',
                [`${prefixCls}-small`]: mergedSize === 'small',
                [`${prefixCls}-bordered`]: bordered,
                [`${prefixCls}-empty`]: rawData.length === 0,
                [`${prefixCls}-fill`]: fillEnabled,
              },
              cssVarCls,
              rootCls,
              hashId,
            )}
            data={pageData}
            rowKey={getRowKey}
            onRow={mergedOnRow}
            rowClassName={internalRowClassName}
            emptyText={mergedEmptyNode}
            // Internal
            internalHooks={INTERNAL_HOOKS}
            internalRefs={internalRef}
            transformColumns={transformColumns as any}
            getContainerWidth={getContainerWidth}
            measureRowRender={(measureRow) => (
              <TableMeasureRowContext.Provider value>
                <ConfigProvider getPopupContainer={(node) => node as HTMLElement}>
                  {measureRow}
                </ConfigProvider>
              </TableMeasureRowContext.Provider>
            )}
          />
        </HeaderTableContext.Provider>
        {bottomPaginationNode}
      </Spin>
    </div>
  )
}

export default React.forwardRef(InternalTable) as RefInternalTable

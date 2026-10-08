import React, { memo, useCallback, useMemo } from 'react'
import { Empty, Spin } from 'antd'
import { Table } from '@zby/ui'
import type { TableColumnsType, TableColumnType, TableProps } from '@zby/ui'
import { useIntl } from '@zby/intl'
import { clsx } from 'clsx'

import type { ProTableColumnDefinition } from '../utils/columns'
import { ignoreProTableRequestError } from '../controller'
import type { ProTableController, ProTableProps, ProTableViewSorter } from '../interface'
import { shallow, useControllerSelector, useViewStoreSelector } from '../hooks'
import type { ProTableViewStore } from '../store'
import { applyColumnPreferences, extractColumnKey, normalizeTableColumns, sortCurrentPageRows, toDisplaySorter, toProTableSorters } from '../utils'
import { useProTableColumnResize } from './useProTableColumnResize'

type SortableTableColumn<RecordType> = TableColumnType<RecordType> & {
  children?: TableColumnsType<RecordType>
}

type TableRegionProps<RecordType, Query extends Record<string, unknown>, Summary> = {
  controller: ProTableController<RecordType, Query, Summary>
  columns: ProTableProps<RecordType, Query, Summary>['columns']
  columnDefinitions: ProTableColumnDefinition[]
  columnsStateEnabled: boolean
  columnResize?: ProTableProps<RecordType, Query, Summary>['columnResize']
  columnResizeDefaultPersist: boolean
  viewStore: ProTableViewStore
  emptyState?: ProTableProps<RecordType, Query, Summary>['emptyState']
  columnEmptyText?: ProTableProps<RecordType, Query, Summary>['columnEmptyText']
  heightMode: NonNullable<ProTableProps<RecordType, Query, Summary>['heightMode']>
  loadingOverride?: ProTableProps<RecordType, Query, Summary>['loading']
  onTableChange?: ProTableProps<RecordType, Query, Summary>['onTableChange']
  rowSelection?: ProTableProps<RecordType, Query, Summary>['rowSelection']
  expandable?: ProTableProps<RecordType, Query, Summary>['expandable']
  pagination?: ProTableProps<RecordType, Query, Summary>['pagination']
  scroll?: ProTableProps<RecordType, Query, Summary>['scroll']
  prefixCls: string
  className?: string
  style?: React.CSSProperties
  tableProps: Omit<
    ProTableProps<RecordType, Query, Summary>,
    | 'className'
    | 'classNames'
    | 'controller'
    | 'controllerConfig'
    | 'onControllerReady'
    | 'columns'
    | 'search'
    | 'views'
    | 'toolbar'
    | 'columnResize'
    | 'persistenceKey'
    | 'heightMode'
    | 'autoRequest'
    | 'layout'
    | 'emptyState'
    | 'columnEmptyText'
    | 'onTableChange'
    | 'loading'
    | 'prefixCls'
    | 'rootClassName'
    | 'style'
    | 'styles'
    | 'pagination'
    | 'rowSelection'
    | 'expandable'
    | 'scroll'
  >
}

function applyControlledSorter<RecordType>(
  columns: TableColumnsType<RecordType>,
  sort: ProTableViewSorter[],
): TableColumnsType<RecordType> {
  let changed = false
  const orderByField = new Map(sort.map((item) => [item.field, item.order]))
  const nextColumns = columns.map((column) => {
    const sortableColumn = column as SortableTableColumn<RecordType>
    const columnKey = extractColumnKey(column as any)
    const nextSortOrder = (columnKey ? orderByField.get(columnKey) : undefined) ?? null
    const currentSortOrder = column.sortOrder ?? null
    const nextSorter = toDisplaySorter(column.sorter)
    let nextChildren = sortableColumn.children

    if (Array.isArray(sortableColumn.children)) {
      nextChildren = applyControlledSorter(sortableColumn.children, sort)
    }

    if (
      currentSortOrder === nextSortOrder &&
      nextChildren === sortableColumn.children &&
      Object.is(nextSorter, column.sorter)
    ) {
      return column
    }

    changed = true
    return {
      ...column,
      sortOrder: nextSortOrder,
      ...(column.sorter === undefined ? {} : { sorter: nextSorter as typeof column.sorter }),
      ...(Array.isArray(nextChildren) ? { children: nextChildren } : {}),
    }
  })

  return changed ? nextColumns : columns
}

function toTableRowSelection<RecordType>(
  rowSelection: NonNullable<ProTableProps<RecordType, any, any>['rowSelection']>,
) {
  const {
    selectedRowKeys: _selectedRowKeys,
    defaultSelectedRowKeys: _defaultSelectedRowKeys,
    ...rest
  } = rowSelection as NonNullable<TableProps<RecordType>['rowSelection']>
  return rest
}

function toTableExpandable<RecordType>(
  expandable: NonNullable<ProTableProps<RecordType, any, any>['expandable']>,
) {
  const {
    expandedRowKeys: _expandedRowKeys,
    defaultExpandedRowKeys: _defaultExpandedRowKeys,
    defaultExpandAllRows: _defaultExpandAllRows,
    ...rest
  } = expandable as NonNullable<TableProps<RecordType>['expandable']>
  return rest
}

function TableRegionInner<RecordType, Query extends Record<string, unknown>, Summary>({
  controller,
  columns,
  columnDefinitions,
  columnsStateEnabled,
  columnResize,
  columnResizeDefaultPersist,
  viewStore,
  emptyState,
  columnEmptyText,
  heightMode,
  loadingOverride,
  onTableChange,
  rowSelection,
  expandable,
  pagination,
  scroll,
  prefixCls,
  className,
  style,
  tableProps,
}: TableRegionProps<RecordType, Query, Summary>) {
  const intl = useIntl()
  const dataState = useControllerSelector(
    controller,
    (state) => ({
      dataSource: state.dataSource,
      loading: state.loading,
      inquired: state.inquired,
    }),
    shallow,
  )
  const selectedRowKeys = useControllerSelector(controller, (state) => state.selectedRowKeys)
  const expandedRowKeys = useControllerSelector(controller, (state) => state.expandedRowKeys)
  const rowKey = useControllerSelector(controller, (state) => state.rowKey)
  const paginationState = useControllerSelector(
    controller,
    (state) => ({
      currentPage: state.currentPage,
      pageSize: state.pageSize,
      total: state.total,
    }),
    shallow,
  )
  const sorterState = useControllerSelector(controller, (state) => state.sort)
  const childrenColumnName = expandable?.childrenColumnName ?? 'children'
  const { mergedColumnsPreferences, columnsReady } = useViewStoreSelector(
    viewStore,
    (state) => ({
      mergedColumnsPreferences: state.mergedColumnsPreferences,
      columnsReady: state.columnsReady,
    }),
    shallow,
  )
  const columnValueLocale = intl.locale
  const columnValueMessages = useMemo(
    () => ({
      booleanTrue: intl.getMessage('zby.pro.table.booleanTrue', '是'),
      booleanFalse: intl.getMessage('zby.pro.table.booleanFalse', '否'),
    }),
    [columnValueLocale, intl],
  )
  const getIndexPage = useCallback(() => {
    const state = controller.getState()
    return {
      currentPage: state.currentPage,
      pageSize: state.pageSize,
      paginated: pagination !== false,
    }
  }, [controller, pagination])
  const visibleColumns = useMemo(
    () =>
      columnsStateEnabled
        ? applyColumnPreferences(
            columns,
            columnDefinitions,
            mergedColumnsPreferences,
            columnValueMessages,
            columnEmptyText,
            getIndexPage,
            columnValueLocale,
          )
        : normalizeTableColumns(
            columns,
            columnValueMessages,
            columnEmptyText,
            getIndexPage,
            columnValueLocale,
          ),
    [
      columnDefinitions,
      columnEmptyText,
      columnValueLocale,
      columnValueMessages,
      columns,
      columnsStateEnabled,
      getIndexPage,
      mergedColumnsPreferences,
    ],
  )
  const {
    columnResizeEnabled,
    columnResize: mergedColumnResize,
    columns: resizedVisibleColumns,
  } = useProTableColumnResize({
    columns,
    visibleColumns,
    columnDefinitions,
    columnResize,
    defaultPersist: columnResizeDefaultPersist,
    mergedColumnsPreferences,
    viewStore,
  })
  const sortedVisibleColumns = useMemo(
    () => applyControlledSorter(resizedVisibleColumns, sorterState),
    [resizedVisibleColumns, sorterState],
  )
  const displayDataSource = useMemo(
    () =>
      sortCurrentPageRows(
        dataState.dataSource,
        sorterState,
        columns,
        childrenColumnName,
      ),
    [childrenColumnName, columns, dataState.dataSource, sorterState],
  )

  const mergedRowSelection = useMemo(() => {
    if (!rowSelection) {
      return undefined
    }

    return {
      ...toTableRowSelection(rowSelection),
      selectedRowKeys,
      onChange: (
        keys: React.Key[],
        rows: RecordType[],
        info: Parameters<NonNullable<typeof rowSelection.onChange>>[2],
      ) => {
        controller.setSelectedRowKeys(keys, rows)
        rowSelection.onChange?.(keys, rows, info)
      },
    }
  }, [controller, rowSelection, selectedRowKeys])

  const mergedExpandable = useMemo(() => {
    if (!expandable) {
      return undefined
    }

    return {
      ...toTableExpandable(expandable),
      expandedRowKeys,
      onExpandedRowsChange: (keys: readonly React.Key[]) => {
        controller.setExpandedRowKeys(keys as React.Key[])
        expandable.onExpandedRowsChange?.(keys)
      },
    }
  }, [controller, expandable, expandedRowKeys])

  const defaultPaginationShowTotal = useCallback(
    (total: number, range: [number, number]) => {
      return intl.getMessage(
        'zby.pro.table.paginationTotal',
        '第 {{start}}-{{end}} 条/总共 {{total}} 条',
        { start: range[0], end: range[1], total },
      )
    },
    [intl],
  )

  const mergedPagination = useMemo(() => {
    return pagination === false
      ? false
      : {
          ...pagination,
          showTotal: pagination?.showTotal ?? defaultPaginationShowTotal,
          current: paginationState.currentPage,
          pageSize: paginationState.pageSize,
          total: paginationState.total,
        }
  }, [
    defaultPaginationShowTotal,
    pagination,
    paginationState.currentPage,
    paginationState.pageSize,
    paginationState.total,
  ])

  const mergedScroll = useMemo(
    () =>
      columnResizeEnabled
        ? {
            ...scroll,
          }
        : {
            ...scroll,
            x: scroll?.x ?? 'max-content',
          },
    [columnResizeEnabled, scroll],
  )
  const mergedLocale = useMemo(
    () => ({
      ...(tableProps.locale ?? {}),
      emptyText: (
        <div className={`${prefixCls}-empty`}>
          <Empty
            description={
              dataState.inquired
                ? (emptyState?.afterQueryText ??
                  intl.getMessage('zby.pro.table.afterQuery', '查无数据'))
                : (emptyState?.beforeQueryText ??
                  intl.getMessage('zby.pro.table.beforeQuery', '点击查询后展示查询结果'))
            }
          />
        </div>
      ),
    }),
    [dataState.inquired, emptyState, intl, prefixCls, tableProps.locale],
  )
  const handleTableChange = useCallback<
    NonNullable<ProTableProps<RecordType, Query, Summary>['onTableChange']>
  >(
    (nextPagination, filters, sorter, extra) => {
      if (extra.action === 'paginate') {
        const nextCurrent = nextPagination.current ?? paginationState.currentPage
        const nextPageSize = nextPagination.pageSize ?? paginationState.pageSize

        if (nextPageSize !== paginationState.pageSize) {
          ignoreProTableRequestError(controller.setPageSize(nextPageSize))
        } else if (nextCurrent !== paginationState.currentPage) {
          ignoreProTableRequestError(controller.setPage(nextCurrent))
        }
      }

      if (extra.action === 'sort') {
        ignoreProTableRequestError(controller.setSort(toProTableSorters(sorter)))
      }

      onTableChange?.(nextPagination, filters, sorter, extra)
    },
    [controller, onTableChange, paginationState.currentPage, paginationState.pageSize],
  )

  if (columnsStateEnabled && !columnsReady) {
    return (
      <div className={`${prefixCls}-table-loading`}>
        <Spin />
      </div>
    )
  }

  return (
    <div
      className={clsx(
        `${prefixCls}-table-region`,
        heightMode === 'fill' && `${prefixCls}-table-region-fill`,
        className,
      )}
      style={style}
    >
      <Table<RecordType>
        {...(tableProps as TableProps<RecordType>)}
        className={`${prefixCls}-table`}
        columns={sortedVisibleColumns}
        columnResize={mergedColumnResize}
        dataSource={displayDataSource}
        loading={loadingOverride ?? dataState.loading}
        pagination={mergedPagination}
        rowKey={rowKey}
        rowSelection={mergedRowSelection}
        expandable={mergedExpandable}
        height={heightMode === 'fill' ? '100%' : undefined}
        scroll={mergedScroll}
        locale={mergedLocale}
        onChange={handleTableChange}
      />
    </div>
  )
}

const MemoTableRegion = memo(TableRegionInner) as typeof TableRegionInner & {
  displayName?: string
}

MemoTableRegion.displayName = 'ProTableTableRegion'

export const TableRegion = MemoTableRegion
export default TableRegion

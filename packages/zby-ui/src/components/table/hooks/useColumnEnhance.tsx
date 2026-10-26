import { get as getValue } from '@rc-component/util'
import { clsx } from 'clsx'
import * as React from 'react'

import type { AnyObject } from 'antd/es/_util/type'
import Tooltip from 'antd/es/tooltip'
import type { TooltipProps } from 'antd/es/tooltip'
import { EXPAND_COLUMN } from '../RcTableInner'
import { TABLE_SKIP_BODY_ELLIPSIS } from '../RcTableInner/interface'
import { SELECTION_COLUMN } from './useSelection'
import TableCellCopy, { TABLE_CELL_WITH_COPY_CLASS_NAME } from '../TableCellCopy'
import type { ActionTextCopyConfig } from '../../action-text'
import type {
  ColumnGroupType,
  ColumnsType,
  ColumnTitleProps,
  ColumnType,
  TableColumnCopyable,
  TableColumnTooltip,
  TransformColumns,
} from '../interface'
import { renderColumnTitle } from '../util'

function isColumnGroup<RecordType extends AnyObject>(
  column: ColumnType<RecordType> | ColumnGroupType<RecordType>,
): column is ColumnGroupType<RecordType> {
  return Array.isArray((column as ColumnGroupType<RecordType>).children)
}

function isTooltipProps(tooltip: TableColumnTooltip): tooltip is Omit<TooltipProps, 'children'> {
  return (
    typeof tooltip === 'object' &&
    tooltip !== null &&
    !Array.isArray(tooltip) &&
    !React.isValidElement(tooltip)
  )
}

function resolveTooltipProps(tooltip: TableColumnTooltip) {
  return isTooltipProps(tooltip) ? tooltip : { title: tooltip }
}

function wrapTitleTooltip<RecordType extends AnyObject>(
  title: ColumnType<RecordType>['title'],
  tooltip: TableColumnTooltip | undefined,
  prefixCls: string,
): ColumnType<RecordType>['title'] {
  if (tooltip === undefined || tooltip === null || tooltip === false) return title

  return (props: ColumnTitleProps<RecordType>) => {
    const titleNode = renderColumnTitle(title, props)
    return (
      <Tooltip {...resolveTooltipProps(tooltip)}>
        <span className={`${prefixCls}-column-title-tooltip`}>{titleNode}</span>
      </Tooltip>
    )
  }
}

function toCopyText(value: unknown) {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : undefined
}

function resolveCopyable<RecordType extends AnyObject>(
  copyable: TableColumnCopyable<RecordType> | undefined,
  rawValue: unknown,
  record: RecordType,
  index: number,
  displayText: React.ReactNode,
): true | ActionTextCopyConfig | undefined {
  if (!copyable) return undefined

  const defaultText = toCopyText(displayText)
  if (copyable === true) return defaultText ? { text: defaultText } : true

  const { text, ...restCopyable } = copyable
  const resolvedText =
    typeof text === 'function' ? text(rawValue, record, index) : (text ?? defaultText)

  return {
    ...restCopyable,
    ...(resolvedText === undefined || resolvedText === null ? {} : { text: String(resolvedText) }),
  }
}

const DEFAULT_COLUMN_EMPTY_TEXT = '-'

function isEmptyCellValue(value: unknown) {
  return value === undefined || value === null || value === ''
}

function resolveColumnEmptyText(
  columnEmptyText: React.ReactNode | false | undefined,
  tableColumnEmptyText: React.ReactNode | false | undefined,
): React.ReactNode | false {
  if (columnEmptyText !== undefined) return columnEmptyText
  if (tableColumnEmptyText !== undefined) return tableColumnEmptyText
  return DEFAULT_COLUMN_EMPTY_TEXT
}

function withColumnEmptyText(value: unknown, emptyText: React.ReactNode | false): React.ReactNode {
  if (emptyText !== false && isEmptyCellValue(value)) return emptyText
  return value as React.ReactNode
}

function getPath(dataIndex: ColumnType<any>['dataIndex']) {
  if (dataIndex === null || dataIndex === undefined || dataIndex === '') return []
  return Array.isArray(dataIndex) ? dataIndex : [dataIndex]
}

function enhanceColumn<RecordType extends AnyObject>(
  column: ColumnType<RecordType>,
  prefixCls: string,
  tableColumnEmptyText: React.ReactNode | false | undefined,
): ColumnType<RecordType> {
  const {
    copyable,
    dataIndex,
    ellipsis,
    emptyText,
    onCell,
    render,
    renderText,
    tooltip,
    title,
    ...restColumn
  } = column
  const resolvedEmptyText = resolveColumnEmptyText(emptyText, tableColumnEmptyText)
  const nextTitle = wrapTitleTooltip(title, tooltip, prefixCls)

  if (render) {
    return {
      ...restColumn,
      copyable,
      dataIndex,
      ellipsis,
      onCell,
      render,
      renderText,
      title: nextTitle,
      tooltip,
      [TABLE_SKIP_BODY_ELLIPSIS]: true,
    }
  }

  const needCopy = Boolean(copyable)
  const needEmptyText = !renderText && resolvedEmptyText !== false
  const needRender = Boolean(renderText) || needCopy || needEmptyText

  if (!needRender) {
    return {
      ...restColumn,
      copyable,
      dataIndex,
      ellipsis,
      onCell,
      renderText,
      title: nextTitle,
      tooltip,
    }
  }

  return {
    ...restColumn,
    copyable,
    dataIndex,
    ellipsis,
    onCell: needCopy
      ? (record: RecordType, index?: number) => {
          const cellProps = onCell?.(record, index)
          return {
            ...cellProps,
            className: clsx(cellProps?.className, `${prefixCls}-${TABLE_CELL_WITH_COPY_CLASS_NAME}`),
          }
        }
      : onCell,
    renderText,
    title: nextTitle,
    tooltip,
    render: (value: unknown, record: RecordType, index: number) => {
      const rawValue =
        value !== undefined ? value : getValue(record, getPath(dataIndex) as (string | number)[])
      const displayText: React.ReactNode = renderText
        ? renderText(rawValue, record, index)
        : withColumnEmptyText(rawValue, resolvedEmptyText)
      const resolvedCopyable = resolveCopyable(copyable, rawValue, record, index, displayText)

      if (!resolvedCopyable) return displayText

      return (
        <TableCellCopy prefixCls={prefixCls} copyable={resolvedCopyable} ellipsis={ellipsis}>
          {displayText}
        </TableCellCopy>
      )
    },
  }
}

const useColumnEnhance = <RecordType extends AnyObject = AnyObject>(
  prefixCls: string,
  columnEmptyText?: React.ReactNode | false,
) => {
  const transformColumns = React.useCallback<TransformColumns<RecordType>>(
    (columns) => {
      const visit = (items: ColumnsType<RecordType>): ColumnsType<RecordType> =>
        items.map((column) => {
          if (column === SELECTION_COLUMN || column === EXPAND_COLUMN) return column
          if (isColumnGroup(column)) {
            const { children, tooltip, title, ...restColumn } = column
            return {
              ...restColumn,
              children: visit(children),
              title: wrapTitleTooltip(title, tooltip, prefixCls),
              tooltip,
            } as ColumnGroupType<RecordType>
          }

          return enhanceColumn(column, prefixCls, columnEmptyText)
        })

      return visit(columns)
    },
    [columnEmptyText, prefixCls],
  )

  return [transformColumns] as const
}

export default useColumnEnhance

import { get as getValue } from '@rc-component/util'
import { clsx } from 'clsx'
import * as React from 'react'

import type { AnyObject } from 'antd/es/_util/type'
import Tooltip from 'antd/es/tooltip'
import type { TooltipProps } from 'antd/es/tooltip'
import ActionText from '../../action-text'
import type { ActionTextProps } from '../../action-text'
import type {
  ColumnGroupType,
  ColumnsType,
  ColumnTitleProps,
  ColumnType,
  TableColumnCopyable,
  TableColumnEllipsisConfig,
  TableColumnTooltip,
  TransformColumns,
} from '../interface'
import { renderColumnTitle } from '../util'

export const TABLE_CELL_ACTION_TEXT_CLASS_NAME = 'cell-action-text'
export const TABLE_CELL_WITH_ACTION_TEXT_CLASS_NAME = 'cell-with-action-text'

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

function isEllipsisConfig(
  ellipsis: ColumnType<any>['ellipsis'],
): ellipsis is TableColumnEllipsisConfig {
  return typeof ellipsis === 'object' && ellipsis !== null
}

function shouldUseActionTextEllipsis(ellipsis: ColumnType<any>['ellipsis']) {
  return isEllipsisConfig(ellipsis) && (ellipsis.rows !== undefined || ellipsis.tooltip !== undefined)
}

function normalizeCellEllipsis(ellipsis: ColumnType<any>['ellipsis']) {
  if (!ellipsis) return ellipsis
  if (ellipsis === true) return { showTitle: false }

  return {
    ...ellipsis,
    showTitle: false,
  }
}

function resolveActionTextEllipsis(
  ellipsis: ColumnType<any>['ellipsis'],
): ActionTextProps['ellipsis'] {
  if (!ellipsis) return false
  if (ellipsis === true) return true

  const { rows, showTitle, tooltip } = ellipsis
  return {
    rows,
    tooltip: tooltip ?? (showTitle === false ? false : undefined),
  }
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
): ActionTextProps['copyable'] {
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

function getPath(dataIndex: ColumnType<any>['dataIndex']) {
  if (dataIndex === null || dataIndex === undefined || dataIndex === '') return []
  return Array.isArray(dataIndex) ? dataIndex : [dataIndex]
}

function enhanceColumn<RecordType extends AnyObject>(
  column: ColumnType<RecordType>,
  prefixCls: string,
): ColumnType<RecordType> {
  const { copyable, dataIndex, ellipsis, onCell, render, renderText, tooltip, title, ...restColumn } =
    column
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
    }
  }

  const needActionText = Boolean(copyable) || shouldUseActionTextEllipsis(ellipsis)
  const needRender = Boolean(renderText) || needActionText

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
    ellipsis: needActionText ? normalizeCellEllipsis(ellipsis) : ellipsis,
    onCell: needActionText
      ? (record: RecordType, index?: number) => {
          const cellProps = onCell?.(record, index)
          return {
            ...cellProps,
            className: clsx(
              cellProps?.className,
              `${prefixCls}-${TABLE_CELL_WITH_ACTION_TEXT_CLASS_NAME}`,
            ),
          }
        }
      : onCell,
    renderText,
    title: nextTitle,
    tooltip,
    render: (value: unknown, record: RecordType, index: number) => {
      const rawValue =
        value !== undefined ? value : getValue(record, getPath(dataIndex) as (string | number)[])
      const displayText = renderText ? renderText(rawValue, record, index) : rawValue

      if (!needActionText) return displayText

      return (
        <ActionText
          actionsVisibleOn="table-row-hover"
          className={`${prefixCls}-${TABLE_CELL_ACTION_TEXT_CLASS_NAME}`}
          copyable={resolveCopyable(copyable, rawValue, record, index, displayText)}
          ellipsis={resolveActionTextEllipsis(ellipsis)}
        >
          {displayText}
        </ActionText>
      )
    },
  }
}

const useColumnEnhance = <RecordType extends AnyObject = AnyObject>(prefixCls: string) => {
  const transformColumns = React.useCallback<TransformColumns<RecordType>>(
    (columns) => {
      const visit = (items: ColumnsType<RecordType>): ColumnsType<RecordType> =>
        items.map((column) => {
          if (isColumnGroup(column)) {
            const { children, tooltip, title, ...restColumn } = column
            return {
              ...restColumn,
              children: visit(children),
              title: wrapTitleTooltip(title, tooltip, prefixCls),
              tooltip,
            } as ColumnGroupType<RecordType>
          }

          return enhanceColumn(column, prefixCls)
        })

      return visit(columns)
    },
    [prefixCls],
  )

  return [transformColumns] as const
}

export default useColumnEnhance

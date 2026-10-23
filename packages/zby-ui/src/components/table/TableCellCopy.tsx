import {
  CheckOutlined,
  CopyOutlined,
  LoadingOutlined,
} from '@ant-design/icons'
import { useIntl } from '@zby/intl'
import { clsx } from 'clsx'
import * as React from 'react'

import { getTableCellHoverClassNames } from '../_util/tableCellHover'
import ActionIcon from '../action-icon'
import useCopyAction from '../action-text/useCopyAction'
import type { ActionTextCopyConfig } from '../action-text'
import { resolveEllipsisRows, TABLE_CELL_ROWS_VAR } from './ellipsisRows'
import type { ColumnType } from './interface'

export const TABLE_CELL_COPY_CLASS_NAME = 'cell-copy'
export const TABLE_CELL_COPY_TEXT_CLASS_NAME = 'cell-copy-text'
export const TABLE_CELL_COPY_ACTION_CLASS_NAME = 'cell-copy-action'
export const TABLE_CELL_WITH_COPY_CLASS_NAME = 'cell-with-copy'

const toCopyConfigList = <T,>(value: T | readonly T[] | undefined) => {
  if (value === false) return [false, false] as const
  return (Array.isArray(value) ? value : [value]) as readonly T[]
}

const getNode = (node: React.ReactNode, defaultNode: React.ReactNode) => {
  if (node === true || node === undefined) return defaultNode
  return node || defaultNode
}

export interface TableCellCopyProps {
  prefixCls: string
  copyable: true | ActionTextCopyConfig
  ellipsis?: ColumnType<any>['ellipsis']
  children?: React.ReactNode
}

const TableCellCopy: React.FC<TableCellCopyProps> = ({
  prefixCls,
  copyable,
  ellipsis,
  children,
}) => {
  const intl = useIntl()
  const copyConfig = copyable === true ? {} : copyable
  const { copied, copyLoading, onClick } = useCopyAction(copyConfig, children)
  const iconNodes = toCopyConfigList(copyConfig.icon)
  const copyText = intl.getMessage('zby.ui.actionText.copy', '复制')
  const copiedText = intl.getMessage('zby.ui.actionText.copied', '已复制')
  const systemStr = copied ? copiedText : copyText
  const tooltips = copyConfig.tooltips
  const copyTitle =
    tooltips === false
      ? undefined
      : (Array.isArray(tooltips) ? tooltips : [tooltips])[copied ? 1 : 0] ?? systemStr
  const ellipsisRows = resolveEllipsisRows(ellipsis)
  const multiLineEllipsis = ellipsisRows > 1
  const singleLineEllipsis = Boolean(ellipsis) && !multiLineEllipsis
  const showTitle = ellipsis === true || (typeof ellipsis === 'object' && ellipsis.showTitle !== false)
  const textTitle =
    showTitle && (typeof children === 'string' || typeof children === 'number')
      ? String(children)
      : undefined

  return (
    <span className={`${prefixCls}-${TABLE_CELL_COPY_CLASS_NAME}`}>
      <span
        className={clsx(`${prefixCls}-${TABLE_CELL_COPY_TEXT_CLASS_NAME}`, {
          [`${prefixCls}-${TABLE_CELL_COPY_TEXT_CLASS_NAME}-ellipsis`]: singleLineEllipsis,
          [`${prefixCls}-${TABLE_CELL_COPY_TEXT_CLASS_NAME}-ellipsis-multiple`]: multiLineEllipsis,
        })}
        style={
          multiLineEllipsis
            ? ({ [TABLE_CELL_ROWS_VAR]: ellipsisRows } as React.CSSProperties)
            : undefined
        }
        title={textTitle}
      >
        {children}
      </span>
      <span
        className={clsx(
          `${prefixCls}-${TABLE_CELL_COPY_ACTION_CLASS_NAME}`,
          getTableCellHoverClassNames(prefixCls).hoverToDisplayInlineFlex,
        )}
      >
        <ActionIcon
          size="small"
          icon={
            copied
              ? getNode(iconNodes[1], <CheckOutlined />)
              : getNode(iconNodes[0], copyLoading ? <LoadingOutlined /> : <CopyOutlined />)
          }
          onClick={onClick}
          aria-label={copyTitle ?? systemStr}
          title={copyTitle}
          tabIndex={copyConfig.tabIndex}
          data-action-text-copy
          data-action-text-copy-success={copied || undefined}
        />
      </span>
    </span>
  )
}

export default TableCellCopy

import { getTableScrollX } from './getTableScrollX'
import type { TablePaginationConfig, TableProps } from './InternalTable'
import Table from './Table'
import { getTableCellHoverClassNames, getTableRowHoverRevealClassName } from './util'

export type { ColumnProps } from './Column'
export type {
  ColumnGroupType,
  ColumnResizeConfig,
  ColumnResizeInfo,
  ColumnResizeWidths,
  ColumnsType,
  ColumnType,
  TableColumnCopyable,
  TableColumnCopyText,
  TableColumnGroupType,
  TableColumnsType,
  TableColumnType,
  TableRowHighlight,
} from './interface'
export { getTableScrollX }
export { getTableCellHoverClassNames, getTableRowHoverRevealClassName }
export type { TableCellHoverClassNames } from './util'
export type { Reference as TableRef } from './RcTableInner'
export type { TablePaginationConfig, TableProps }

export default Table

import type { TablePaginationConfig, TableProps } from './InternalTable'
import Table from './Table'
import { TABLE_ROW_HOVER_REVEAL_CLASS_NAME, TableCellHoverRelatedClassNames } from './util'

export type { ColumnProps } from './Column'
export type {
  ColumnGroupType,
  ColumnResizeConfig,
  ColumnResizeInfo,
  ColumnResizeWidths,
  ColumnsType,
  ColumnType,
  TableColumnGroupType,
  TableColumnsType,
  TableColumnType,
  TableHeightMode,
  TableRowHighlight,
} from './interface'
export { TABLE_ROW_HOVER_REVEAL_CLASS_NAME, TableCellHoverRelatedClassNames }
export type { Reference as TableRef } from './RcTableInner'
export type { TablePaginationConfig, TableProps }

export default Table

import type * as React from 'react'
import type {
  TableColumnGroupType as AntdColumnGroupType,
  TableColumnType as AntdColumnType,
  TableColumnsType as AntdColumnsType,
  TableProps as AntdTableProps,
  Table as AntdTable,
} from 'antd'
import type { TableRef } from 'antd/es/table'

export type TableHeightMode = 'auto' | 'fill'

export interface TableRowHighlight<RecordType> {
  /** Controlled key of the row currently highlighted. */
  currentRowKey?: React.Key | null
  /** Initial highlighted row key in uncontrolled mode. */
  defaultCurrentRowKey?: React.Key | null
  /** Called after a row is highlighted or the current highlight is cleared. */
  onChange?: (
    currentRowKey: React.Key | null,
    currentRow: RecordType | null,
  ) => void
}

export interface TableColumnResizeOptions {
  /** Base column width in pixels. */
  width?: number
  /** Minimum committed width in pixels. */
  minWidth?: number
  /** Remaining horizontal space weight, following mainstream Data Grid semantics. */
  flex?: number
  /** Whether the leaf column can be resized when column resizing is enabled. */
  resizable?: boolean
  /** Maximum committed width in pixels. */
  maxWidth?: number
}

export type TableColumnType<RecordType> = Omit<
  AntdColumnType<RecordType>,
  'children' | 'minWidth' | 'width'
> &
  TableColumnResizeOptions

export type TableColumnGroupType<RecordType> = Omit<
  AntdColumnGroupType<RecordType>,
  'children' | 'minWidth' | 'width'
> &
  TableColumnResizeOptions & {
    children: TableColumnsType<RecordType>
  }

export type TableColumnsType<RecordType> = readonly (
  | TableColumnGroupType<RecordType>
  | TableColumnType<RecordType>
)[]

export interface TableColumnWidthChangeInfo<RecordType> {
  columnKey: React.Key
  width: number
  column: TableColumnGroupType<RecordType> | TableColumnType<RecordType>
}

export interface TableProps<RecordType extends object = Record<string, unknown>>
  extends Omit<AntdTableProps<RecordType>, 'columns'> {
  columns?: TableColumnsType<RecordType>
  /** Makes the table and its body consume the height supplied by the parent. */
  heightMode?: TableHeightMode
  /** Enables leaf-column resize handles. Width is committed only on pointer release. */
  enableColumnResizing?: boolean
  /** Fires once after a pointer or keyboard resize has committed. */
  onColumnWidthChange?: (
    info: TableColumnWidthChangeInfo<RecordType>,
  ) => void
  /** Presence of this object enables click-to-toggle current-row highlighting. */
  rowHighlight?: TableRowHighlight<RecordType>
}

export type TableComponent = (<
  RecordType extends object = Record<string, unknown>,
>(
  props: React.PropsWithChildren<TableProps<RecordType>> &
    React.RefAttributes<TableRef>,
) => React.ReactElement) & {
  Column: typeof AntdTable.Column
  ColumnGroup: typeof AntdTable.ColumnGroup
  Summary: typeof AntdTable.Summary
  SELECTION_ALL: typeof AntdTable.SELECTION_ALL
  SELECTION_INVERT: typeof AntdTable.SELECTION_INVERT
  SELECTION_NONE: typeof AntdTable.SELECTION_NONE
  EXPAND_COLUMN: typeof AntdTable.EXPAND_COLUMN
}

export type AntdCompatibleColumnsType<RecordType> = AntdColumnsType<RecordType>

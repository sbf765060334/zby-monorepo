/** 表体多行省略的行数变量。RcTableInner 里的同名常量必须保持一致。 */
export const TABLE_CELL_ROWS_VAR = '--table-cell-ellipsis-rows'

/** 解析省略行数。非法值和非正数回退为单行。 */
export function resolveEllipsisRows(ellipsis: { rows?: number } | boolean | undefined) {
  if (!ellipsis || ellipsis === true || ellipsis.rows == null) return 1

  const rows = ellipsis.rows
  if (!Number.isFinite(rows) || rows <= 1) return 1

  return Math.floor(rows)
}

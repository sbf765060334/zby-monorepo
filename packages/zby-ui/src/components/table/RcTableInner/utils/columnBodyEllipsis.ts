import { TABLE_SKIP_BODY_ELLIPSIS } from '../interface';
import type { CellEllipsisType } from '../interface';

/** 与 table/ellipsisRows.ts 中的变量名保持一致。 */
export const TABLE_CELL_ROWS_VAR = '--table-cell-ellipsis-rows';

/** 解析省略行数。非法值和非正数回退为单行。 */
export function resolveEllipsisRows(ellipsis: CellEllipsisType | undefined) {
  if (!ellipsis || ellipsis === true || ellipsis.rows == null) return 1;

  const rows = ellipsis.rows;
  if (!Number.isFinite(rows) || rows <= 1) return 1;

  return Math.floor(rows);
}

export function shouldSkipBodyEllipsis(column: object) {
  return Boolean((column as Record<string, unknown>)[TABLE_SKIP_BODY_ELLIPSIS]);
}

export function toBodyCellEllipsis(
  ellipsis: CellEllipsisType | undefined,
): CellEllipsisType | undefined {
  if (!ellipsis) return undefined;
  if (ellipsis === true) return true;
  if (typeof ellipsis !== 'object') return undefined;

  const rows = resolveEllipsisRows(ellipsis);

  return {
    showTitle: ellipsis.showTitle !== false,
    ...(rows > 1 ? { rows } : {}),
  };
}

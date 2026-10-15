import { TABLE_SKIP_BODY_ELLIPSIS } from '../interface';
import type { CellEllipsisType } from '../interface';

export function shouldSkipBodyEllipsis(column: object) {
  return Boolean((column as Record<string, unknown>)[TABLE_SKIP_BODY_ELLIPSIS]);
}

export function toBodyCellEllipsis(
  ellipsis: CellEllipsisType | undefined,
): CellEllipsisType | undefined {
  if (!ellipsis) return undefined;
  if (ellipsis === true) return true;
  if (typeof ellipsis !== 'object') return undefined;
  return { showTitle: ellipsis.showTitle !== false };
}

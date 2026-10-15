import type { ColumnType } from './interface'

/** 有自定义 render 时表体不走 CSS 省略，表头仍读列上的 ellipsis。 */
export const TABLE_SKIP_BODY_ELLIPSIS = 'RC_TABLE_SKIP_BODY_ELLIPSIS'

export function shouldSkipBodyEllipsis(column: object) {
  return Boolean((column as Record<string, unknown>)[TABLE_SKIP_BODY_ELLIPSIS])
}

export function toBodyCellEllipsis(
  ellipsis: ColumnType<any>['ellipsis'] | boolean | { showTitle?: boolean } | undefined,
): boolean | { showTitle?: boolean } | undefined {
  if (!ellipsis) return undefined
  if (ellipsis === true) return true
  if (typeof ellipsis !== 'object') return undefined
  return { showTitle: ellipsis.showTitle !== false }
}

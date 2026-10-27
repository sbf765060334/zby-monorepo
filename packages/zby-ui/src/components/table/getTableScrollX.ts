import { warning } from '@rc-component/util'

import { EXPAND_COLUMN } from './RcTableInner/constant'
import { SELECTION_COLUMN } from './hooks/useSelection'
import type { ColumnsType } from './interface'

type ScrollColumn = {
  width?: unknown
  hidden?: boolean
  colSpan?: number
  children?: readonly unknown[]
}

/**
 * 给普通列表计算 `scroll.x`。
 *
 * 只根据传入列累加像素宽度，不读 DOM，也不读取列宽拖拽状态。
 * 这不是给开启 `columnResize` 的表格用的。那种表格会自行按拖拽列宽、最小宽度和 filler 计算横向宽度。
 *
 * 分组列只累加叶子列，自身 `width` 不计入。`hidden` 和 `colSpan === 0` 的列跳过。
 * `Table.SELECTION_COLUMN` 与 `Table.EXPAND_COLUMN` 是占位，宽度来自选择列、展开列配置，这里跳过，由调用方另加。
 * 未写宽度，或宽度不是有限非负数字、`px` 字符串时，使用 `defaultWidth`。
 */
export function getTableScrollX<RecordType = unknown>(
  columns: readonly ColumnsType<RecordType>[number][] | undefined,
  defaultWidth: number,
): number {
  const fallbackWidth = resolveDefaultWidth(defaultWidth)
  let total = 0

  const visit = (items: readonly unknown[]) => {
    items.forEach((item) => {
      if (!isScrollColumn(item) || isPlaceholderColumn(item)) return
      if (item.hidden || item.colSpan === 0) return

      if (Array.isArray(item.children) && item.children.length > 0) {
        visit(item.children)
        return
      }

      total += resolveColumnWidth(item.width, fallbackWidth)
    })
  }

  visit(columns ?? [])
  return Math.round(total)
}

function resolveDefaultWidth(defaultWidth: number) {
  if (typeof defaultWidth === 'number' && Number.isFinite(defaultWidth) && defaultWidth >= 0) {
    return defaultWidth
  }

  if (process.env.NODE_ENV !== 'production') {
    warning(false, '`getTableScrollX` defaultWidth must be a finite number greater than or equal to 0.')
  }

  return 0
}

function resolveColumnWidth(width: unknown, fallbackWidth: number) {
  if (typeof width === 'number') {
    return Number.isFinite(width) && width >= 0 ? width : fallbackWidth
  }

  if (typeof width === 'string') {
    const matched = width.trim().match(/^(\d+(?:\.\d+)?)px$/)
    if (matched) return Number(matched[1])
  }

  return fallbackWidth
}

function isScrollColumn(value: unknown): value is ScrollColumn {
  return typeof value === 'object' && value !== null
}

function isPlaceholderColumn(column: object) {
  return column === SELECTION_COLUMN || column === EXPAND_COLUMN
}

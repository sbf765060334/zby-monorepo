/** 短按钮按需占用，长按钮公平共享剩余空间；不改变原有顺序。 */
export function distributeActionWidths(widths: number[], available: number): number[] {
  let remaining = Math.max(0, available)
  // 仅排序宽度副本来求统一上限，不改变业务操作的显示顺序。
  const sorted = [...widths].sort((a, b) => a - b)
  let limit = 0
  for (let i = 0; i < sorted.length; i++) {
    limit = remaining / (sorted.length - i)
    // 当前最短项也放不下时，后续所有长项都使用这个上限。
    if (sorted[i] > limit) break
    // 短项只消耗自然宽度，释放的空间会进入下一轮均分。
    remaining -= sorted[i]
  }
  // 空间充足时所有项均返回自然宽度；不足时只有长项被截断。
  return widths.map((width) => Math.min(width, limit))
}

export function normalizeActionCount(value: number | undefined, fallback = 0) {
  // 防止负数、小数、NaN 或 Infinity 进入数组切分及网格定位计算。
  return value !== undefined && Number.isFinite(value) ? Math.max(fallback, Math.floor(value)) : fallback
}

export interface ActionSize {
  natural: number
  minimum: number
}

interface ActionLayoutInput {
  actionCount: number
  limit: number
  grid?: { maxRows: number; maxColumns: number }
  available?: number
  sizes: ActionSize[]
  more: number
  gap: number
}

/** 从原始上限开始求解，保证容器变宽、文案变短后能恢复外露操作。 */
export function resolveActionLayout({ actionCount, limit, grid, available, sizes, more, gap }: ActionLayoutInput) {
  if (available === undefined) return { visibleCount: limit, columns: grid?.maxColumns ?? 1, widths: undefined, moreWidth: undefined }
  const space = Math.max(0, available)
  for (let count = limit; count > 0; count--) {
    const hasMore = count < actionCount
    const slotCount = count + Number(hasMore)
    // 保持初始排列；开始收纳后允许减少列数，重新按行填充且不超过行数上限。
    const columns = grid ? (count === limit ? grid.maxColumns : Math.min(grid.maxColumns, Math.ceil(slotCount / grid.maxRows))) : slotCount
    const cellWidth = Math.max(0, (space - (columns - 1) * gap) / columns)
    const widths = grid
      ? sizes.slice(0, count).map(() => cellWidth)
      : distributeActionWidths(sizes.slice(0, count).map((size) => size.natural), space - (hasMore ? more : 0) - (slotCount - 1) * gap)
    // 更多优先完整展示；只剩入口时才省略或裁剪，不对它套用业务文案阈值。
    const gapsFit = space >= (columns - 1) * gap
    const moreFits = gapsFit && (!hasMore || (grid ? cellWidth >= more : space >= more + (slotCount - 1) * gap))
    if (moreFits && widths.every((value, index) => value >= sizes[index].minimum)) {
      return { visibleCount: count, columns, widths, moreWidth: hasMore ? (grid ? Math.min(more, cellWidth) : more) : undefined }
    }
  }
  return { visibleCount: 0, columns: 1, widths: [], moreWidth: Math.min(more, space) }
}

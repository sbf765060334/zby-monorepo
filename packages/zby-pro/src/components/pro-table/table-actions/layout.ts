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

import type * as React from 'react'

import type {
  ColumnGroupType,
  ColumnsType,
  ColumnType,
} from '../interface'

export const DEFAULT_MIN_COLUMN_WIDTH = 50
export const COLUMN_WIDTH_ROUNDING_TOLERANCE = 1

export interface ColumnSizingLeaf<RecordType> {
  key: React.Key
  column: ColumnGroupType<RecordType> | ColumnType<RecordType>
  baseWidth?: number
  minWidth: number
  maxWidth: number
  flex: number
  fixed: boolean
}

export interface ColumnWidthResolution {
  widths: Map<React.Key, number>
  totalWidth: number
  unresolvedWidth: number
  complete: boolean
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function clampColumnWidth(
  width: number,
  minWidth = DEFAULT_MIN_COLUMN_WIDTH,
  maxWidth = Number.POSITIVE_INFINITY,
) {
  const normalizedMin = Math.max(0, minWidth)
  const normalizedMax = Math.max(normalizedMin, maxWidth)
  return Math.min(Math.max(width, normalizedMin), normalizedMax)
}

export function getColumnKey<RecordType>(
  column: ColumnGroupType<RecordType> | ColumnType<RecordType>,
  path: readonly number[],
): React.Key {
  if (column.key !== undefined && column.key !== null) return column.key

  const dataIndex = 'dataIndex' in column ? column.dataIndex : undefined
  if (Array.isArray(dataIndex)) return dataIndex.join('.')
  if (dataIndex !== undefined && dataIndex !== null) return String(dataIndex)

  return `zby-column-${path.join('-')}`
}

export function collectColumnSizingLeaves<RecordType>(
  columns: ColumnsType<RecordType>,
  userWidths: ReadonlyMap<React.Key, number>,
  measuredWidths: ReadonlyMap<React.Key, number> = new Map(),
  path: readonly number[] = [],
): ColumnSizingLeaf<RecordType>[] {
  const leaves: ColumnSizingLeaf<RecordType>[] = []

  columns.forEach((column, index) => {
    if (column.hidden) return

    const currentPath = [...path, index]
    if ('children' in column && column.children?.length) {
      leaves.push(
        ...collectColumnSizingLeaves(
          column.children,
          userWidths,
          measuredWidths,
          currentPath,
        ),
      )
      return
    }

    const key = getColumnKey(column, currentPath)
    const minWidth = isFiniteNumber(column.minWidth)
      ? Math.max(0, column.minWidth)
      : DEFAULT_MIN_COLUMN_WIDTH
    const maxWidth = isFiniteNumber(column.maxWidth)
      ? Math.max(minWidth, column.maxWidth)
      : Number.POSITIVE_INFINITY
    const configuredWidth = userWidths.get(key) ??
      (isFiniteNumber(column.width) ? column.width : measuredWidths.get(key))
    const baseWidth = isFiniteNumber(configuredWidth)
      ? clampColumnWidth(configuredWidth, minWidth, maxWidth)
      : undefined

    leaves.push({
      key,
      column,
      baseWidth,
      minWidth,
      maxWidth,
      flex:
        isFiniteNumber(column.flex) && column.flex > 0 ? column.flex : 0,
      fixed: Boolean(column.fixed),
    })
  })

  return leaves
}

/**
 * Resolve displayed leaf widths using the same fixed-plus-flex model used by
 * mainstream Data Grids. It never creates a synthetic filler column.
 */
export function resolveColumnWidths<RecordType>(
  leaves: readonly ColumnSizingLeaf<RecordType>[],
  targetWidth: number,
  manuallyResizedKeys: ReadonlySet<React.Key> = new Set(),
): ColumnWidthResolution {
  const widths = new Map<React.Key, number>()
  leaves.forEach((leaf) => {
    if (leaf.baseWidth !== undefined) widths.set(leaf.key, leaf.baseWidth)
  })

  const complete = leaves.every((leaf) => leaf.baseWidth !== undefined)
  const resolvedLeaves = leaves.filter(
    (leaf): leaf is ColumnSizingLeaf<RecordType> & { baseWidth: number } =>
      leaf.baseWidth !== undefined,
  )

  if (!complete) {
    const totalWidth = resolvedLeaves.reduce(
      (total, leaf) => total + leaf.baseWidth,
      0,
    )

    return {
      widths,
      totalWidth,
      unresolvedWidth: Math.max(0, targetWidth - totalWidth),
      complete: false,
    }
  }

  let baseTotal = resolvedLeaves.reduce(
    (total, leaf) => total + leaf.baseWidth,
    0,
  )

  // DOM geometry can retain half pixels while clientWidth is integer based.
  // Normalize only this rounding-sized mismatch so a table that exactly fits
  // does not create a useless 1px horizontal scroll range.
  let roundingOverflow = baseTotal - targetWidth
  if (
    targetWidth > 0 &&
    roundingOverflow > 0 &&
    roundingOverflow <= COLUMN_WIDTH_ROUNDING_TOLERANCE
  ) {
    const shrinkCandidates = [...resolvedLeaves].reverse().filter(
      (leaf) => !leaf.fixed && leaf.baseWidth > leaf.minWidth,
    )

    for (const leaf of shrinkCandidates) {
      if (roundingOverflow <= 0.01) break

      const currentWidth = widths.get(leaf.key) ?? leaf.baseWidth
      const reduction = Math.min(
        roundingOverflow,
        currentWidth - leaf.minWidth,
      )
      widths.set(leaf.key, currentWidth - reduction)
      roundingOverflow -= reduction
      baseTotal -= reduction
    }
  }

  let remaining = Math.max(0, targetWidth - baseTotal)

  let candidates = resolvedLeaves.filter(
    (leaf) =>
      !leaf.fixed &&
      leaf.flex > 0 &&
      !manuallyResizedKeys.has(leaf.key) &&
      leaf.maxWidth > leaf.baseWidth,
  )

  while (remaining > 0.01 && candidates.length) {
    const weightTotal = candidates.reduce(
      (total, leaf) => total + (leaf.flex || 1),
      0,
    )
    let consumed = 0

    candidates.forEach((leaf) => {
      const currentWidth = widths.get(leaf.key) ?? leaf.baseWidth
      const share = remaining * ((leaf.flex || 1) / weightTotal)
      const addition = Math.min(share, leaf.maxWidth - currentWidth)
      widths.set(leaf.key, currentWidth + addition)
      consumed += addition
    })

    if (consumed <= 0.01) break
    remaining -= consumed
    candidates = candidates.filter((leaf) => {
      const width = widths.get(leaf.key) ?? leaf.baseWidth
      return width < leaf.maxWidth - 0.01
    })
  }

  // Explicit flex columns have priority. If they all reach maxWidth, keep
  // walking backwards through ordinary business columns so unused container
  // width never becomes a synthetic filler or leaks into an injected column.
  const implicitCandidates = [...resolvedLeaves].reverse().filter(
    (leaf) =>
      !leaf.fixed &&
      !manuallyResizedKeys.has(leaf.key) &&
      (widths.get(leaf.key) ?? leaf.baseWidth) < leaf.maxWidth - 0.01,
  )

  for (const leaf of implicitCandidates) {
    if (remaining <= 0.01) break

    const currentWidth = widths.get(leaf.key) ?? leaf.baseWidth
    const addition = Math.min(remaining, leaf.maxWidth - currentWidth)
    widths.set(leaf.key, currentWidth + addition)
    remaining -= addition
  }

  const totalWidth = [...widths.values()].reduce(
    (total, width) => total + width,
    0,
  )

  return {
    widths,
    totalWidth,
    unresolvedWidth: Math.max(0, targetWidth - totalWidth),
    complete: true,
  }
}

import type * as React from 'react'

import type {
  ColumnGroupType,
  ColumnsType,
  ColumnType,
} from '../interface'
import { INTERNAL_COL_DEFINE } from '../utils/legacyUtil'

export const DEFAULT_MIN_COLUMN_WIDTH = 50
export const DEFAULT_COLUMN_WIDTH = 160
export const DEFAULT_INTERNAL_COLUMN_WIDTH = 48
export const COLUMN_WIDTH_ROUNDING_TOLERANCE = 1

export type ColumnLayoutMode = 'fill' | 'fit' | 'overflow'

export interface ColumnLayoutState {
  mode: ColumnLayoutMode
  fillerWidth: number
  scrollX: number
  hasHorizontalOverflow: boolean
}

export function resolveColumnLayout(
  totalWidth: number,
  viewportWidth: number,
): ColumnLayoutState {
  const normalizedTotalWidth = Math.max(0, Math.round(totalWidth))
  const normalizedViewportWidth = Math.max(0, Math.round(viewportWidth))

  if (normalizedViewportWidth === 0) {
    return {
      mode: 'fit',
      fillerWidth: 0,
      scrollX: Math.max(1, normalizedTotalWidth),
      hasHorizontalOverflow: false,
    }
  }

  const delta = normalizedTotalWidth - normalizedViewportWidth

  if (delta < -COLUMN_WIDTH_ROUNDING_TOLERANCE) {
    return {
      mode: 'fill',
      fillerWidth: normalizedViewportWidth - normalizedTotalWidth,
      scrollX: normalizedViewportWidth,
      hasHorizontalOverflow: false,
    }
  }

  if (delta > COLUMN_WIDTH_ROUNDING_TOLERANCE) {
    return {
      mode: 'overflow',
      fillerWidth: 0,
      scrollX: Math.max(1, normalizedTotalWidth),
      hasHorizontalOverflow: true,
    }
  }

  return {
    mode: 'fit',
    fillerWidth: 0,
    scrollX: Math.max(1, normalizedTotalWidth, normalizedViewportWidth),
    hasHorizontalOverflow: false,
  }
}

export interface ColumnSizingLeaf<RecordType> {
  key: React.Key
  column: ColumnGroupType<RecordType> | ColumnType<RecordType>
  baseWidth?: number
  minWidth: number
  maxWidth: number
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
  return Math.round(Math.min(Math.max(width, normalizedMin), normalizedMax))
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
  constrainWidths = true,
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
          constrainWidths,
        ),
      )
      return
    }

    const leafColumn = column as ColumnType<RecordType>
    const key = getColumnKey(leafColumn, currentPath)
    const isInternalColumn = Boolean(
      (leafColumn as ColumnType<RecordType> & Record<string, unknown>)[INTERNAL_COL_DEFINE],
    )
    const shouldConstrainWidth = constrainWidths && !isInternalColumn
    const minWidth = shouldConstrainWidth && isFiniteNumber(leafColumn.minWidth)
      ? Math.max(0, leafColumn.minWidth)
      : shouldConstrainWidth
        ? DEFAULT_MIN_COLUMN_WIDTH
        : 0
    const maxWidth = shouldConstrainWidth && isFiniteNumber(leafColumn.maxWidth)
      ? Math.max(minWidth, leafColumn.maxWidth)
      : Number.POSITIVE_INFINITY
    const userWidth = userWidths.get(key)
    const fallbackWidth = constrainWidths
      ? isInternalColumn
        ? DEFAULT_INTERNAL_COLUMN_WIDTH
        : DEFAULT_COLUMN_WIDTH
      : undefined
    const configuredWidth = userWidth ??
      (isFiniteNumber(leafColumn.width)
        ? leafColumn.width
        : measuredWidths.get(key) ?? fallbackWidth)
    const baseWidth = isFiniteNumber(configuredWidth)
      ? constrainWidths
        ? clampColumnWidth(configuredWidth, minWidth, maxWidth)
        : configuredWidth
      : undefined

    leaves.push({
      key,
      column: leafColumn,
      baseWidth,
      minWidth,
      maxWidth,
    })
  })

  return leaves
}

/** Resolve fixed business-column widths and report unused viewport space. */
export function resolveColumnWidths<RecordType>(
  leaves: readonly ColumnSizingLeaf<RecordType>[],
  targetWidth: number,
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

  const totalWidth = resolvedLeaves.reduce(
    (total, leaf) => total + leaf.baseWidth,
    0,
  )

  return {
    widths,
    totalWidth,
    unresolvedWidth: Math.max(0, targetWidth - totalWidth),
    complete: true,
  }
}

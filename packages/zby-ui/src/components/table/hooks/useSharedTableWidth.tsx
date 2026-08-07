import type {
  ColumnsType as RcColumnsType,
  ColumnType as RcColumnType,
  TableProps as RcTableProps,
} from '../RcTableInner'
import type { ColumnGroupType as RcColumnGroupType } from '../RcTableInner/interface'
import {
  COLUMN_WIDTH_ROUNDING_TOLERANCE,
  collectColumnSizingLeaves,
  getColumnKey,
  resolveColumnWidths,
} from '../RcTableInner/hooks/useColumnSizing'
import * as React from 'react'

import type {
  ColumnsType,
  ColumnType,
} from '../interface'

interface UseSharedTableWidthOptions<RecordType extends object> {
  columns: ColumnsType<RecordType>
  rootRef: React.RefObject<HTMLDivElement | null>
  prefixCls: string
  enabled: boolean
  selectionWidth: number
  scrollX?: RcTableProps<RecordType>['scroll'] extends infer Scroll
    ? Scroll extends { x?: infer X }
      ? X
      : never
    : never
}

interface UseSharedTableWidthResult<RecordType extends object> {
  columns: ColumnsType<RecordType>
  tableWidth?: number
  widthsReady: boolean
  hasHorizontalOverflow: boolean
}

function applyMeasuredWidths<RecordType extends object>(
  columns: ColumnsType<RecordType>,
  widths: ReadonlyMap<React.Key, number>,
  path: readonly number[] = [],
): ColumnsType<RecordType> {
  return columns.map((column, index) => {
    const currentPath = [...path, index]
    const key = getColumnKey(
      column as RcColumnGroupType<RecordType> | RcColumnType<RecordType>,
      currentPath,
    )

    if ('children' in column && column.children?.length) {
      return {
        ...column,
        key,
        children: applyMeasuredWidths(column.children, widths, currentPath),
      }
    }

    const width = widths.get(key)
    const userOnHeaderCell = column.onHeaderCell

    return {
      ...column,
      key,
      width,
      onHeaderCell: (resolvedColumn: ColumnType<RecordType>) => {
        const userProps =
          (userOnHeaderCell as
            | ((column: unknown) => React.HTMLAttributes<HTMLElement>)
            | undefined)?.(resolvedColumn) ?? {}

        return {
          ...userProps,
          style: {
            ...userProps.style,
            ...(width !== undefined ? { width } : {}),
          },
          'data-zby-column-key': String(key),
        } as React.ThHTMLAttributes<HTMLTableCellElement>
      },
    }
  }) as ColumnsType<RecordType>
}

export default function useSharedTableWidth<RecordType extends object>(
  options: UseSharedTableWidthOptions<RecordType>,
): UseSharedTableWidthResult<RecordType> {
  const {
    columns,
    rootRef,
    prefixCls,
    enabled,
    selectionWidth,
    scrollX,
  } = options
  const [containerWidth, setContainerWidth] = React.useState(0)
  const [measuredWidths, setMeasuredWidths] = React.useState(
    () => new Map<React.Key, number>(),
  )

  React.useLayoutEffect(() => {
    if (!enabled) return undefined

    const root = rootRef.current
    if (!root) return undefined

    const updateWidth = () => {
      const scrollAreaPrefixCls = prefixCls.replace('-table', '-scroll-area')
      const viewport = root.querySelector<HTMLElement>(
        `.${scrollAreaPrefixCls}-viewport`,
      )
      const container = root.querySelector<HTMLElement>(
        `.${prefixCls}-container`,
      )
      const width = viewport?.clientWidth ||
        container?.clientWidth ||
        root.clientWidth ||
        root.getBoundingClientRect().width

      setContainerWidth((previous) => (previous === width ? previous : width))
    }

    updateWidth()
    if (typeof ResizeObserver === 'undefined') return undefined

    const observer = new ResizeObserver(updateWidth)
    observer.observe(root)
    const viewport = root.querySelector<HTMLElement>(
      `.${prefixCls.replace('-table', '-scroll-area')}-viewport`,
    )
    const container = root.querySelector<HTMLElement>(
      `.${prefixCls}-container`,
    )
    if (container) observer.observe(container)
    if (viewport) observer.observe(viewport)
    return () => observer.disconnect()
  }, [enabled, prefixCls, rootRef])

  const leaves = React.useMemo(
    () => enabled
      ? collectColumnSizingLeaves(
          columns as unknown as RcColumnsType<RecordType>,
          new Map(),
          measuredWidths,
          [],
          false,
        )
      : [],
    [columns, enabled, measuredWidths],
  )
  const widthResolution = React.useMemo(
    () => resolveColumnWidths(
      leaves,
      Math.max(0, containerWidth - selectionWidth),
    ),
    [containerWidth, leaves, selectionWidth],
  )

  React.useLayoutEffect(() => {
    if (!enabled || widthResolution.complete) return

    const root = rootRef.current
    if (!root) return

    const unresolvedKeys = new Map(
      leaves
        .filter((leaf) => leaf.baseWidth === undefined)
        .map((leaf) => [String(leaf.key), leaf.key]),
    )
    const nextMeasuredWidths = new Map(measuredWidths)
    let changed = false

    root.querySelectorAll<HTMLElement>('[data-zby-column-key]').forEach((cell) => {
      const domKey = cell.dataset.zbyColumnKey
      const key = domKey === undefined ? undefined : unresolvedKeys.get(domKey)
      if (key === undefined) return

      const width = cell.getBoundingClientRect().width || cell.offsetWidth
      if (width <= 0 || nextMeasuredWidths.get(key) === width) return

      nextMeasuredWidths.set(key, width)
      changed = true
    })

    if (changed) setMeasuredWidths(nextMeasuredWidths)
  }, [enabled, leaves, measuredWidths, rootRef, widthResolution.complete])

  const resolvedColumns = React.useMemo(
    () => enabled
      ? applyMeasuredWidths(columns, widthResolution.widths)
      : columns,
    [columns, enabled, widthResolution.widths],
  )
  const tableWidth = enabled && widthResolution.complete && containerWidth > 0
    ? Math.max(
        1,
        containerWidth,
        typeof scrollX === 'number' ? scrollX : 0,
        widthResolution.totalWidth + selectionWidth,
      )
    : undefined
  const hasHorizontalOverflow = Boolean(
    tableWidth !== undefined &&
    containerWidth > 0 &&
    tableWidth - containerWidth > COLUMN_WIDTH_ROUNDING_TOLERANCE,
  )

  return {
    columns: resolvedColumns,
    tableWidth,
    widthsReady: !enabled || widthResolution.complete,
    hasHorizontalOverflow,
  }
}

import type { TableProps as RcTableProps } from '@rc-component/table'
import * as React from 'react'

import type {
  ColumnGroupType,
  ColumnsType,
  ColumnType,
  TableColumnWidthChangeInfo,
} from '../interface'
import {
  COLUMN_WIDTH_ROUNDING_TOLERANCE,
  clampColumnWidth,
  collectColumnSizingLeaves,
  getColumnKey,
  resolveColumnWidths,
} from './useColumnSizing'

interface ResizeHeaderCellProps
  extends React.ThHTMLAttributes<HTMLTableCellElement> {
  __zbyColumnKey?: React.Key
  __zbyColumnWidth?: number
  __zbyColumnMinWidth?: number
  __zbyColumnMaxWidth?: number
  __zbyResizable?: boolean
}

interface ResizeStartInfo<RecordType> {
  key: React.Key
  width: number
  minWidth: number
  maxWidth: number
  column: ColumnGroupType<RecordType> | ColumnType<RecordType>
  startClientX: number
}

interface UseResizableColumnsOptions<RecordType extends object> {
  columns: ColumnsType<RecordType>
  components?: RcTableProps<RecordType>['components']
  rootRef: React.RefObject<HTMLDivElement | null>
  prefixCls: string
  direction?: 'ltr' | 'rtl'
  enabled: boolean
  useSharedScrollArea: boolean
  selectionWidth: number
  scrollX?: RcTableProps<RecordType>['scroll'] extends infer Scroll
    ? Scroll extends { x?: infer X }
      ? X
      : never
    : never
  onColumnWidthChange?: (
    info: TableColumnWidthChangeInfo<RecordType>,
  ) => void
}

interface UseResizableColumnsResult<RecordType extends object> {
  columns: ColumnsType<RecordType>
  components: RcTableProps<RecordType>['components']
  tableWidth?: number
  widthsReady: boolean
  hasHorizontalOverflow: boolean
}

const COLUMN_RESIZE_EPSILON = 0.01
// rc-table treats numeric zero as an unspecified width when scroll.x is set
// and expands that column to at least 1px. A sub-layout-pixel sentinel keeps
// the stable filler mounted without producing visible end space.
const COLLAPSED_FILLER_WIDTH = 0.001

function getNumericWidth(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function getFillerColumnKey(
  leaves: readonly { key: React.Key }[],
  prefixCls: string,
) {
  const existingKeys = new Set(leaves.map((leaf) => String(leaf.key)))
  const baseKey = `${prefixCls}-zby-filler`
  let key = baseKey
  let index = 0

  while (existingKeys.has(key)) {
    index += 1
    key = `${baseKey}-${index}`
  }

  return key
}

function containsFixedEndLeaf<RecordType extends object>(
  column: ColumnGroupType<RecordType> | ColumnType<RecordType>,
  inheritedFixed?: ColumnType<RecordType>['fixed'],
): boolean {
  if (column.hidden) return false

  const fixed = column.fixed ?? inheritedFixed
  if ('children' in column && column.children?.length) {
    return column.children.some((child) =>
      containsFixedEndLeaf(child, fixed),
    )
  }

  return fixed === 'end' || fixed === 'right'
}

function insertFillerColumn<RecordType extends object>(
  columns: ColumnsType<RecordType>,
  width: number,
  key: React.Key,
  prefixCls: string,
): ColumnsType<RecordType> {
  const className = `${prefixCls}-zby-filler-cell`
  const collapsed = width <= COLUMN_RESIZE_EPSILON
  const resolvedWidth = collapsed
    ? COLLAPSED_FILLER_WIDTH
    : Math.max(0, width)
  const mergedClassName = collapsed
    ? `${className} ${className}-collapsed`
    : className
  const fillerColumn: ColumnType<RecordType> = {
    key,
    title: null,
    width: resolvedWidth,
    resizable: false,
    className: mergedClassName,
    render: () => null,
    onHeaderCell: () => ({
      'aria-hidden': true,
      style: { width: resolvedWidth },
    }),
    onCell: () => ({
      'aria-hidden': true,
    }),
  }

  const fixedEndIndex = columns.findIndex((column) =>
    containsFixedEndLeaf(column),
  )
  if (fixedEndIndex < 0) return [...columns, fillerColumn]

  return [
    ...columns.slice(0, fixedEndIndex),
    fillerColumn,
    ...columns.slice(fixedEndIndex),
  ]
}

function applyResolvedColumns<RecordType extends object>(
  columns: ColumnsType<RecordType>,
  widths: ReadonlyMap<React.Key, number>,
  enableColumnResizing: boolean,
  path: readonly number[] = [],
): ColumnsType<RecordType> {
  return columns.map((column, index) => {
    const currentPath = [...path, index]
    const key = getColumnKey(column, currentPath)

    if ('children' in column && column.children?.length) {
      return {
        ...column,
        key,
        children: applyResolvedColumns(
          column.children,
          widths,
          enableColumnResizing,
          currentPath,
        ),
      }
    }

    const width = widths.get(key)
    const userOnHeaderCell = column.onHeaderCell
    const minWidth = getNumericWidth(column.minWidth, 50)
    const maxWidth = getNumericWidth(
      column.maxWidth,
      Number.POSITIVE_INFINITY,
    )

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
          ...(enableColumnResizing
            ? {
                __zbyColumnKey: key,
                __zbyColumnWidth: width,
                __zbyColumnMinWidth: minWidth,
                __zbyColumnMaxWidth: maxWidth,
                __zbyResizable: column.resizable !== false,
              }
            : {}),
        } as React.ThHTMLAttributes<HTMLTableCellElement>
      },
    }
  }) as ColumnsType<RecordType>
}

export default function useResizableColumns<RecordType extends object>(
  options: UseResizableColumnsOptions<RecordType>,
): UseResizableColumnsResult<RecordType> {
  const {
    columns,
    components,
    rootRef,
    prefixCls,
    direction = 'ltr',
    enabled,
    useSharedScrollArea,
    selectionWidth,
    scrollX,
    onColumnWidthChange,
  } = options
  const [containerWidth, setContainerWidth] = React.useState(0)
  const [userWidths, setUserWidths] = React.useState(
    () => new Map<React.Key, number>(),
  )
  const userWidthsRef = React.useRef(userWidths)
  const [measuredWidths, setMeasuredWidths] = React.useState(
    () => new Map<React.Key, number>(),
  )
  const shouldObserveWidth = enabled || useSharedScrollArea

  React.useLayoutEffect(() => {
    if (!shouldObserveWidth) return undefined

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
  }, [measuredWidths, prefixCls, rootRef, shouldObserveWidth])

  const leaves = React.useMemo(
    () => enabled
      ? collectColumnSizingLeaves(columns, userWidths, measuredWidths)
      : useSharedScrollArea
        ? collectColumnSizingLeaves(
            columns,
            new Map(),
            measuredWidths,
            [],
            false,
          )
        : [],
    [columns, enabled, measuredWidths, useSharedScrollArea, userWidths],
  )
  const widthTarget = Math.max(0, containerWidth - selectionWidth)
  const widthResolution = React.useMemo(
    () => resolveColumnWidths(leaves, widthTarget),
    [leaves, widthTarget],
  )

  React.useLayoutEffect(() => {
    if (!shouldObserveWidth || widthResolution.complete) return

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
  }, [
    leaves,
    measuredWidths,
    rootRef,
    shouldObserveWidth,
    widthResolution.complete,
  ])

  const fillerColumnKey = React.useMemo(
    () => getFillerColumnKey(leaves, prefixCls),
    [leaves, prefixCls],
  )
  const resolvedColumns = React.useMemo(
    () => {
      if (!enabled && !useSharedScrollArea) return columns

      const businessColumns = applyResolvedColumns(
        columns,
        widthResolution.widths,
        enabled,
      )
      if (!enabled) return businessColumns

      return widthResolution.complete
        ? insertFillerColumn(
            businessColumns,
            widthResolution.unresolvedWidth,
            fillerColumnKey,
            prefixCls,
          )
        : businessColumns
    },
    [
      columns,
      enabled,
      fillerColumnKey,
      prefixCls,
      useSharedScrollArea,
      widthResolution.complete,
      widthResolution.unresolvedWidth,
      widthResolution.widths,
    ],
  )
  const resizingTableWidth = widthResolution.complete
    ? Math.max(
        1,
        widthResolution.totalWidth +
        widthResolution.unresolvedWidth +
        selectionWidth,
      )
    : undefined
  const nativeTableWidth = useSharedScrollArea &&
    widthResolution.complete &&
    containerWidth > 0
    ? Math.max(
        1,
        containerWidth,
        typeof scrollX === 'number' ? scrollX : 0,
        widthResolution.totalWidth + selectionWidth,
      )
    : undefined
  const tableWidth = enabled ? resizingTableWidth : nativeTableWidth
  const hasHorizontalOverflow = Boolean(
    tableWidth !== undefined &&
    containerWidth > 0 &&
    tableWidth - containerWidth > COLUMN_WIDTH_ROUNDING_TOLERANCE,
  )
  const originalColumnMap = React.useMemo(
    () => new Map(leaves.map((leaf) => [leaf.key, leaf.column])),
    [leaves],
  )
  const originalColumnMapRef = React.useRef(originalColumnMap)
  originalColumnMapRef.current = originalColumnMap
  const onColumnWidthChangeRef = React.useRef(onColumnWidthChange)
  onColumnWidthChangeRef.current = onColumnWidthChange

  const commitColumnWidth = React.useCallback(
    (
      key: React.Key,
      width: number,
      column: ColumnGroupType<RecordType> | ColumnType<RecordType>,
    ) => {
      const next = new Map(userWidthsRef.current)
      next.set(key, width)
      userWidthsRef.current = next
      setUserWidths(next)
      onColumnWidthChangeRef.current?.({ columnKey: key, width, column })
    },
    [],
  )

  const cleanupResizeRef = React.useRef<(() => void) | null>(null)
  React.useEffect(() => () => cleanupResizeRef.current?.(), [])

  const startResize = React.useCallback(
    (
      event: React.PointerEvent<HTMLElement>,
      cellProps: ResizeHeaderCellProps,
    ) => {
      const key = cellProps.__zbyColumnKey
      if (key === undefined || !cellProps.__zbyResizable) return

      const headerCell = event.currentTarget.closest('th')
      const column = originalColumnMapRef.current.get(key)
      if (!headerCell || !column) return
      const resizeHandle = event.currentTarget
      const pointerId = event.pointerId

      cleanupResizeRef.current?.()
      event.preventDefault()
      event.stopPropagation()
      resizeHandle.setPointerCapture?.(pointerId)

      const cellRect = headerCell.getBoundingClientRect()
      const startInfo: ResizeStartInfo<RecordType> = {
        key,
        width: cellProps.__zbyColumnWidth ?? cellRect.width,
        minWidth: cellProps.__zbyColumnMinWidth ?? 50,
        maxWidth:
          cellProps.__zbyColumnMaxWidth ?? Number.POSITIVE_INFINITY,
        column,
        startClientX: event.clientX,
      }
      let candidateWidth = startInfo.width
      let lastCommittedWidth = startInfo.width
      let pendingWidth: number | null = null
      let resizeFrame: number | null = null

      const applyPendingWidth = () => {
        resizeFrame = null
        if (pendingWidth === null) return

        const width = pendingWidth
        pendingWidth = null
        if (
          Math.abs(width - lastCommittedWidth) <= COLUMN_RESIZE_EPSILON
        ) {
          return
        }

        lastCommittedWidth = width
        commitColumnWidth(startInfo.key, width, startInfo.column)
      }

      const scheduleWidth = () => {
        pendingWidth = candidateWidth
        if (
          Math.abs(candidateWidth - lastCommittedWidth) <=
          COLUMN_RESIZE_EPSILON
        ) {
          pendingWidth = null
          return
        }
        if (resizeFrame !== null) return

        if (typeof window.requestAnimationFrame === 'function') {
          resizeFrame = window.requestAnimationFrame(applyPendingWidth)
        } else {
          applyPendingWidth()
        }
      }

      const updateWidth = (clientX: number) => {
        const rawDelta =
          direction === 'rtl'
            ? startInfo.startClientX - clientX
            : clientX - startInfo.startClientX
        candidateWidth = clampColumnWidth(
          startInfo.width + rawDelta,
          startInfo.minWidth,
          startInfo.maxWidth,
        )
        scheduleWidth()
      }

      const cancelPendingWidth = () => {
        pendingWidth = null
        if (
          resizeFrame !== null &&
          typeof window.cancelAnimationFrame === 'function'
        ) {
          window.cancelAnimationFrame(resizeFrame)
        }
        resizeFrame = null
      }

      const flushPendingWidth = () => {
        if (
          resizeFrame !== null &&
          typeof window.cancelAnimationFrame === 'function'
        ) {
          window.cancelAnimationFrame(resizeFrame)
        }
        resizeFrame = null
        applyPendingWidth()
      }

      function cleanup() {
        cancelPendingWidth()
        if (resizeHandle.hasPointerCapture?.(pointerId)) {
          resizeHandle.releasePointerCapture(pointerId)
        }
        document.removeEventListener('pointermove', onPointerMove)
        document.removeEventListener('pointerup', onPointerUp)
        document.removeEventListener('pointercancel', onPointerCancel)
        document.removeEventListener('keydown', onKeyDown)
        cleanupResizeRef.current = null
      }

      function onPointerMove(pointerEvent: PointerEvent) {
        updateWidth(pointerEvent.clientX)
      }

      function onPointerUp(pointerEvent: PointerEvent) {
        updateWidth(pointerEvent.clientX)
        flushPendingWidth()
        cleanup()
      }

      function onPointerCancel() {
        cleanup()
        if (
          Math.abs(lastCommittedWidth - startInfo.width) >
          COLUMN_RESIZE_EPSILON
        ) {
          commitColumnWidth(startInfo.key, startInfo.width, startInfo.column)
        }
      }

      function onKeyDown(keyboardEvent: KeyboardEvent) {
        if (keyboardEvent.key !== 'Escape') return
        keyboardEvent.preventDefault()
        cleanup()
        if (
          Math.abs(lastCommittedWidth - startInfo.width) >
          COLUMN_RESIZE_EPSILON
        ) {
          commitColumnWidth(startInfo.key, startInfo.width, startInfo.column)
        }
      }

      cleanupResizeRef.current = cleanup
      document.addEventListener('pointermove', onPointerMove)
      document.addEventListener('pointerup', onPointerUp)
      document.addEventListener('pointercancel', onPointerCancel)
      document.addEventListener('keydown', onKeyDown)
    },
    [commitColumnWidth, direction],
  )

  const resizeByKeyboard = React.useCallback(
    (
      event: React.KeyboardEvent<HTMLElement>,
      cellProps: ResizeHeaderCellProps,
    ) => {
      const key = cellProps.__zbyColumnKey
      if (
        key === undefined ||
        !cellProps.__zbyResizable ||
        (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')
      ) {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      const column = originalColumnMapRef.current.get(key)
      if (!column) return

      const physicalDirection = event.key === 'ArrowRight' ? 1 : -1
      const logicalDirection =
        direction === 'rtl' ? -physicalDirection : physicalDirection
      const step = event.shiftKey ? 1 : 10
      const headerCellWidth = event.currentTarget
        .closest('th')
        ?.getBoundingClientRect()
        .width
      const currentWidth = cellProps.__zbyColumnWidth ?? headerCellWidth ?? 0
      const width = clampColumnWidth(
        currentWidth +
        logicalDirection * step,
        cellProps.__zbyColumnMinWidth,
        cellProps.__zbyColumnMaxWidth,
      )
      if (Math.abs(width - currentWidth) > COLUMN_RESIZE_EPSILON) {
        commitColumnWidth(key, width, column)
      }
    },
    [commitColumnWidth, direction],
  )

  const userHeaderCell =
    typeof components?.header === 'object'
      ? components.header.cell
      : undefined
  const ResizeHeaderCell = React.useMemo(
    () =>
      React.forwardRef<HTMLElement, ResizeHeaderCellProps>(
        (headerCellProps, headerCellRef) => {
          const {
            __zbyColumnKey,
            __zbyColumnWidth,
            __zbyColumnMinWidth,
            __zbyColumnMaxWidth,
            __zbyResizable,
            children,
            ...restHeaderCellProps
          } = headerCellProps
          const resizeProps = {
            __zbyColumnKey,
            __zbyColumnWidth,
            __zbyColumnMinWidth,
            __zbyColumnMaxWidth,
            __zbyResizable,
          }
          const CellComponent = userHeaderCell ?? 'th'

          return React.createElement(
            CellComponent,
            {
              ...restHeaderCellProps,
              ref: headerCellRef,
            },
            children,
            __zbyResizable
              ? React.createElement('span', {
                  role: 'separator',
                  'aria-label': 'Resize column',
                  'aria-orientation': 'vertical',
                  'aria-valuenow': __zbyColumnWidth === undefined
                    ? undefined
                    : Math.round(__zbyColumnWidth),
                  tabIndex: 0,
                  className: `${prefixCls}-zby-resize-handle`,
                  onPointerDown: (event: React.PointerEvent<HTMLElement>) =>
                    startResize(event, resizeProps),
                  onKeyDown: (event: React.KeyboardEvent<HTMLElement>) =>
                    resizeByKeyboard(event, resizeProps),
                })
              : null,
          )
        },
      ),
    [prefixCls, resizeByKeyboard, startResize, userHeaderCell],
  )

  const mergedComponents = React.useMemo(
    () => enabled
      ? {
          ...components,
          header: {
            ...(typeof components?.header === 'object' ? components.header : {}),
            cell: ResizeHeaderCell,
          },
        }
      : components,
    [ResizeHeaderCell, components, enabled],
  )

  return {
    columns: resolvedColumns,
    components: mergedComponents,
    tableWidth,
    widthsReady: enabled
      ? widthResolution.complete
      : !useSharedScrollArea || widthResolution.complete,
    hasHorizontalOverflow,
  }
}

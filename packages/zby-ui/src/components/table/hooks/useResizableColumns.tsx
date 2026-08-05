import type { TableProps as RcTableProps } from '@rc-component/table'
import * as React from 'react'

import type {
  ColumnGroupType,
  ColumnsType,
  ColumnType,
  TableColumnWidthChangeInfo,
} from '../interface'
import {
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
  startBoundaryClientX: number
  rootRect: DOMRect
}

interface UseResizableColumnsOptions<RecordType extends object> {
  columns: ColumnsType<RecordType>
  components?: RcTableProps<RecordType>['components']
  rootRef: React.RefObject<HTMLDivElement | null>
  prefixCls: string
  direction?: 'ltr' | 'rtl'
  enabled: boolean
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
  tableWidth: number
  resizeGuide: React.ReactNode
}

function getNumericWidth(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
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
            width,
          },
          __zbyColumnKey: key,
          __zbyColumnWidth: width,
          __zbyColumnMinWidth: minWidth,
          __zbyColumnMaxWidth: maxWidth,
          __zbyResizable:
            enableColumnResizing && column.resizable !== false,
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
    selectionWidth,
    scrollX,
    onColumnWidthChange,
  } = options
  const guideRef = React.useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = React.useState(0)
  const [userWidths, setUserWidths] = React.useState(
    () => new Map<React.Key, number>(),
  )
  const [manuallyResizedKeys, setManuallyResizedKeys] = React.useState(
    () => new Set<React.Key>(),
  )

  React.useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return undefined

    const updateWidth = () => {
      const width = root.getBoundingClientRect().width || root.clientWidth
      setContainerWidth((previous) => (previous === width ? previous : width))
    }

    updateWidth()
    if (typeof ResizeObserver === 'undefined') return undefined

    const observer = new ResizeObserver(updateWidth)
    observer.observe(root)
    return () => observer.disconnect()
  }, [rootRef])

  const leaves = React.useMemo(
    () => collectColumnSizingLeaves(columns, userWidths),
    [columns, userWidths],
  )
  const requestedScrollWidth =
    typeof scrollX === 'number' ? Math.max(0, scrollX - selectionWidth) : 0
  const widthTarget = Math.max(
    0,
    containerWidth - selectionWidth,
    requestedScrollWidth,
  )
  const widthResolution = React.useMemo(
    () => resolveColumnWidths(leaves, widthTarget, manuallyResizedKeys),
    [leaves, manuallyResizedKeys, widthTarget],
  )
  const resolvedColumns = React.useMemo(
    () => applyResolvedColumns(columns, widthResolution.widths, enabled),
    [columns, enabled, widthResolution.widths],
  )
  const tableWidth = Math.max(
    1,
    widthResolution.totalWidth + selectionWidth,
  )
  const originalColumnMap = React.useMemo(
    () => new Map(leaves.map((leaf) => [leaf.key, leaf.column])),
    [leaves],
  )

  const commitColumnWidth = React.useCallback(
    (
      key: React.Key,
      width: number,
      column: ColumnGroupType<RecordType> | ColumnType<RecordType>,
    ) => {
      setUserWidths((previous) => {
        const next = new Map(previous)
        next.set(key, width)
        return next
      })
      setManuallyResizedKeys((previous) => {
        const next = new Set(previous)
        next.add(key)
        return next
      })
      onColumnWidthChange?.({ columnKey: key, width, column })
    },
    [onColumnWidthChange],
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

      const root = rootRef.current
      const guide = guideRef.current
      const headerCell = event.currentTarget.closest('th')
      const column = originalColumnMap.get(key)
      if (!root || !guide || !headerCell || !column) return
      const activeGuide = guide

      cleanupResizeRef.current?.()
      event.preventDefault()
      event.stopPropagation()

      const rootRect = root.getBoundingClientRect()
      const cellRect = headerCell.getBoundingClientRect()
      const containerRect =
        root.querySelector(`.${prefixCls}-container`)?.getBoundingClientRect() ??
        rootRect
      const startInfo: ResizeStartInfo<RecordType> = {
        key,
        width: cellProps.__zbyColumnWidth ?? cellRect.width,
        minWidth: cellProps.__zbyColumnMinWidth ?? 50,
        maxWidth:
          cellProps.__zbyColumnMaxWidth ?? Number.POSITIVE_INFINITY,
        column,
        startClientX: event.clientX,
        startBoundaryClientX:
          direction === 'rtl' ? cellRect.left : cellRect.right,
        rootRect,
      }
      let candidateWidth = startInfo.width

      activeGuide.style.display = 'block'
      activeGuide.style.top = `${containerRect.top - rootRect.top}px`
      activeGuide.style.height = `${containerRect.height}px`

      const updateGuide = (clientX: number) => {
        const rawDelta =
          direction === 'rtl'
            ? startInfo.startClientX - clientX
            : clientX - startInfo.startClientX
        candidateWidth = clampColumnWidth(
          startInfo.width + rawDelta,
          startInfo.minWidth,
          startInfo.maxWidth,
        )
        const physicalDelta =
          direction === 'rtl'
            ? -(candidateWidth - startInfo.width)
            : candidateWidth - startInfo.width
        const guideX =
          startInfo.startBoundaryClientX + physicalDelta - rootRect.left
        activeGuide.style.transform = `translateX(${guideX}px)`
      }

      updateGuide(event.clientX)

      function cleanup() {
        activeGuide.style.display = 'none'
        document.removeEventListener('pointermove', onPointerMove)
        document.removeEventListener('pointerup', onPointerUp)
        document.removeEventListener('pointercancel', onPointerCancel)
        document.removeEventListener('keydown', onKeyDown)
        cleanupResizeRef.current = null
      }

      function onPointerMove(pointerEvent: PointerEvent) {
        updateGuide(pointerEvent.clientX)
      }

      function onPointerUp() {
        cleanup()
        commitColumnWidth(startInfo.key, candidateWidth, startInfo.column)
      }

      function onPointerCancel() {
        cleanup()
      }

      function onKeyDown(keyboardEvent: KeyboardEvent) {
        if (keyboardEvent.key !== 'Escape') return
        keyboardEvent.preventDefault()
        cleanup()
      }

      cleanupResizeRef.current = cleanup
      document.addEventListener('pointermove', onPointerMove)
      document.addEventListener('pointerup', onPointerUp)
      document.addEventListener('pointercancel', onPointerCancel)
      document.addEventListener('keydown', onKeyDown)
    },
    [commitColumnWidth, direction, originalColumnMap, prefixCls, rootRef],
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
      const column = originalColumnMap.get(key)
      if (!column) return

      const physicalDirection = event.key === 'ArrowRight' ? 1 : -1
      const logicalDirection =
        direction === 'rtl' ? -physicalDirection : physicalDirection
      const step = event.shiftKey ? 1 : 10
      const width = clampColumnWidth(
        (cellProps.__zbyColumnWidth ?? 0) + logicalDirection * step,
        cellProps.__zbyColumnMinWidth,
        cellProps.__zbyColumnMaxWidth,
      )
      commitColumnWidth(key, width, column)
    },
    [commitColumnWidth, direction, originalColumnMap],
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
                  'aria-valuenow': Math.round(__zbyColumnWidth ?? 0),
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
    () => ({
      ...components,
      header: {
        ...(typeof components?.header === 'object' ? components.header : {}),
        cell: ResizeHeaderCell,
      },
    }),
    [ResizeHeaderCell, components],
  )

  return {
    columns: resolvedColumns,
    components: mergedComponents,
    tableWidth,
    resizeGuide: (
      <div
        ref={guideRef}
        className={`${prefixCls}-zby-resize-guide`}
        aria-hidden="true"
      />
    ),
  }
}

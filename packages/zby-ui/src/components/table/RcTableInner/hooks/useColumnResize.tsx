import * as React from 'react'

import type {
  ColumnResizeConfig,
  ColumnGroupType,
  ColumnsType,
  ColumnType,
  Direction,
  TableComponents,
} from '../interface'
import type { TableProps } from '../Table'
import { INTERNAL_COL_DEFINE } from '../utils/legacyUtil'
import { flatColumns } from './useColumns'
import {
  clampColumnWidth,
  collectColumnSizingLeaves,
  getColumnKey,
  resolveColumnLayout,
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

interface UseColumnResizeOptions<RecordType extends object> {
  columns: ColumnsType<RecordType>
  sourceColumns?: ColumnsType<RecordType>
  components?: TableComponents<RecordType>
  prefixCls: string
  direction?: Direction
  enabled: boolean
  viewportWidth: number
  config?: ColumnResizeConfig<RecordType>
}

export interface UseColumnResizeResult<RecordType extends object> {
  columns: ColumnsType<RecordType>
  flattenColumns: readonly ColumnType<RecordType>[]
  components: TableProps<RecordType>['components']
  scrollX?: number
  colWidths?: number[]
  fillerWidth: number
  widthsReady: boolean
  hasHorizontalOverflow: boolean
}

const COLUMN_RESIZE_EPSILON = 0.01

function getNumericWidth(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function isInternalColumn<RecordType extends object>(
  column: ColumnGroupType<RecordType> | ColumnType<RecordType>,
) {
  return Boolean(
    (column as ColumnType<RecordType> & Record<string, unknown>)[INTERNAL_COL_DEFINE],
  )
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
  const fillerColumn: ColumnType<RecordType> = {
    key,
    title: null,
    width,
    resizable: false,
    className,
    render: () => null,
    onHeaderCell: () => ({
      'aria-hidden': true,
      style: { width },
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

    const leafColumn = column as ColumnType<RecordType>
    const width = widths.get(key)
    const userOnHeaderCell = leafColumn.onHeaderCell
    const internalColumn = isInternalColumn(leafColumn)
    const minWidth = internalColumn ? 0 : getNumericWidth(leafColumn.minWidth, 50)
    const maxWidth = internalColumn
      ? Number.POSITIVE_INFINITY
      : getNumericWidth(leafColumn.maxWidth, Number.POSITIVE_INFINITY)

    return {
      ...leafColumn,
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
          ...(internalColumn
            ? { 'data-zby-internal-column-key': String(key) }
            : { 'data-zby-column-key': String(key) }),
          ...(enableColumnResizing
            ? {
                __zbyColumnKey: key,
                __zbyColumnWidth: width,
                __zbyColumnMinWidth: minWidth,
                __zbyColumnMaxWidth: maxWidth,
                __zbyResizable: !internalColumn && leafColumn.resizable !== false,
              }
            : {}),
        } as React.ThHTMLAttributes<HTMLTableCellElement>
      },
    }
  }) as ColumnsType<RecordType>
}

export default function useColumnResize<RecordType extends object>(
  options: UseColumnResizeOptions<RecordType>,
): UseColumnResizeResult<RecordType> {
  const {
    columns,
    sourceColumns,
    components,
    prefixCls,
    direction = 'ltr',
    enabled,
    viewportWidth,
    config,
  } = options
  const [userWidths, setUserWidths] = React.useState(
    () => new Map<React.Key, number>(),
  )
  const userWidthsRef = React.useRef(userWidths)
  const leaves = React.useMemo(
    () => enabled
      ? collectColumnSizingLeaves(columns, userWidths)
      : [],
    [columns, enabled, userWidths],
  )
  const widthTarget = Math.max(0, viewportWidth)
  const widthResolution = React.useMemo(
    () => resolveColumnWidths(leaves, widthTarget),
    [leaves, widthTarget],
  )

  const fillerColumnKey = React.useMemo(
    () => getFillerColumnKey(leaves, prefixCls),
    [leaves, prefixCls],
  )
  const layoutState = React.useMemo(
    () => resolveColumnLayout(widthResolution.totalWidth, widthTarget),
    [widthResolution.totalWidth, widthTarget],
  )
  const fillerWidth = widthResolution.complete
    ? layoutState.fillerWidth
    : 0
  const resolvedColumns = React.useMemo(
    () => {
      if (!enabled) return columns

      const businessColumns = applyResolvedColumns(
        columns,
        widthResolution.widths,
        enabled,
      )
      return widthResolution.complete && fillerWidth > 0
        ? insertFillerColumn(
            businessColumns,
            fillerWidth,
            fillerColumnKey,
            prefixCls,
          )
        : businessColumns
    },
    [
      columns,
      enabled,
      fillerWidth,
      fillerColumnKey,
      prefixCls,
      widthResolution.complete,
      widthResolution.widths,
    ],
  )
  const scrollX = widthResolution.complete
    ? layoutState.scrollX
    : undefined
  const hasHorizontalOverflow = Boolean(
    widthResolution.complete && layoutState.hasHorizontalOverflow,
  )
  const resolvedFlattenColumns = React.useMemo(
    () => flatColumns(resolvedColumns),
    [resolvedColumns],
  )
  const resolvedColWidths = React.useMemo(
    () => widthResolution.complete
      ? resolvedFlattenColumns.map((column) => column.width as number)
      : undefined,
    [resolvedFlattenColumns, widthResolution.complete],
  )
  const originalColumnMap = React.useMemo(
    () => {
      const map = new Map<
        React.Key,
        ColumnGroupType<RecordType> | ColumnType<RecordType>
      >()
      if (sourceColumns) {
        collectColumnSizingLeaves(sourceColumns, new Map()).forEach((leaf) => {
          map.set(leaf.key, leaf.column)
        })
      }
      leaves.forEach((leaf) => {
        if (!map.has(leaf.key)) map.set(leaf.key, leaf.column)
      })
      return map
    },
    [leaves, sourceColumns],
  )
  const originalColumnMapRef = React.useRef(originalColumnMap)
  originalColumnMapRef.current = originalColumnMap
  const onColumnWidthChangeRef = React.useRef(config?.onColumnWidthChange)
  onColumnWidthChangeRef.current = config?.onColumnWidthChange

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
    flattenColumns: resolvedFlattenColumns,
    components: mergedComponents,
    scrollX,
    colWidths: resolvedColWidths,
    fillerWidth,
    widthsReady: !enabled || widthResolution.complete,
    hasHorizontalOverflow,
  }
}

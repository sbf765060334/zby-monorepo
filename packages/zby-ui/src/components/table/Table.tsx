import { clsx } from 'clsx'
import { ConfigProvider, Table as AntdTable, theme as antdTheme } from 'antd'
import type {
  TableColumnType as AntdColumnType,
  TableProps as AntdTableProps,
} from 'antd'
import type { TableRef } from 'antd/es/table'
import * as React from 'react'

import useControllableValue from '../_util/hooks/useControllableValue'
import {
  clampColumnWidth,
  collectColumnSizingLeaves,
  getColumnKey,
  resolveColumnWidths,
} from './columnSizing'
import TableScrollBody from './TableBody'
import useStyle from './style'
import type {
  AntdCompatibleColumnsType,
  TableColumnGroupType,
  TableColumnType,
  TableColumnsType,
  TableComponent,
  TableProps,
} from './types'

interface ResizeHeaderCellProps
  extends React.ThHTMLAttributes<HTMLTableCellElement> {
  __zbyColumnKey?: React.Key
  __zbyColumnWidth?: number
  __zbyColumnMinWidth?: number
  __zbyColumnMaxWidth?: number
  __zbyResizable?: boolean
}

interface ResizeStartInfo {
  key: React.Key
  width: number
  minWidth: number
  maxWidth: number
  column: TableColumnGroupType<object> | TableColumnType<object>
  startClientX: number
  startBoundaryClientX: number
  rootRect: DOMRect
}

function getRecordKey<RecordType extends object>(
  record: RecordType,
  index: number | undefined,
  rowKey: AntdTableProps<RecordType>['rowKey'],
) {
  if (typeof rowKey === 'function') return rowKey(record, index)
  return (record as Record<PropertyKey, unknown>)[
    (rowKey ?? 'key') as PropertyKey
  ] as React.Key
}

function getNumericWidth(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function applyResolvedColumns<RecordType extends object>(
  columns: TableColumnsType<RecordType>,
  widths: ReadonlyMap<React.Key, number>,
  enableColumnResizing: boolean,
  path: readonly number[] = [],
): AntdCompatibleColumnsType<RecordType> {
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
      onHeaderCell: (antdColumn: AntdColumnType<RecordType>) => {
        const userProps =
          (userOnHeaderCell as
            | ((column: unknown) => React.HTMLAttributes<HTMLElement>)
            | undefined)?.(antdColumn) ?? {}
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
  }) as AntdCompatibleColumnsType<RecordType>
}

function InternalTable<RecordType extends object>(
  props: TableProps<RecordType>,
  ref: React.ForwardedRef<TableRef>,
) {
  const {
    columns = [],
    components,
    dataSource,
    enableColumnResizing = false,
    heightMode = 'auto',
    onColumnWidthChange,
    onRow,
    onScroll,
    prefixCls: customizePrefixCls,
    rowSelection,
    rowClassName,
    rowHighlight,
    rowKey,
    scroll,
    size,
    virtual = false,
    ...restProps
  } = props
  const { getPrefixCls, direction: contextDirection } = React.useContext(
    ConfigProvider.ConfigContext,
  )
  const prefixCls = getPrefixCls('table', customizePrefixCls)
  const direction = contextDirection ?? 'ltr'
  const hashId = useStyle(prefixCls)
  const { token } = antdTheme.useToken()
  const rootRef = React.useRef<HTMLDivElement>(null)
  const guideRef = React.useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = React.useState(0)
  const [userWidths, setUserWidths] = React.useState(
    () => new Map<React.Key, number>(),
  )
  const [manuallyResizedKeys, setManuallyResizedKeys] = React.useState(
    () => new Set<React.Key>(),
  )

  const highlightProps = rowHighlight ?? {}
  const [currentRowKey, setCurrentRowKey] = useControllableValue<
    React.Key | null
  >(highlightProps, {
    defaultValue: null,
    valuePropName: 'currentRowKey',
    defaultValuePropName: 'defaultCurrentRowKey',
    trigger: 'onChange',
  })

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
  }, [])

  const leaves = React.useMemo(
    () => collectColumnSizingLeaves(columns, userWidths),
    [columns, userWidths],
  )
  const selectionWidth = rowSelection
    ? getNumericWidth(
        rowSelection.columnWidth,
        getNumericWidth(token.Table?.selectionColumnWidth, token.controlHeight),
      )
    : 0
  const mergedRowSelection = React.useMemo(
    () =>
      rowSelection
        ? {
            ...rowSelection,
            columnWidth: selectionWidth,
          }
        : undefined,
    [rowSelection, selectionWidth],
  )
  const requestedScrollWidth =
    typeof scroll?.x === 'number' ? Math.max(0, scroll.x - selectionWidth) : 0
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
    () =>
      applyResolvedColumns(
        columns,
        widthResolution.widths,
        enableColumnResizing,
      ),
    [columns, enableColumnResizing, widthResolution.widths],
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
      column: TableColumnGroupType<any> | TableColumnType<any>,
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
      onColumnWidthChange?.({
        columnKey: key,
        width,
        column,
      })
    },
    [onColumnWidthChange],
  )

  const cleanupResizeRef = React.useRef<(() => void) | null>(null)
  React.useEffect(() => () => cleanupResizeRef.current?.(), [])

  const startResize = React.useCallback(
    (event: React.PointerEvent<HTMLElement>, cellProps: ResizeHeaderCellProps) => {
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
      const startInfo: ResizeStartInfo = {
        key,
        width: cellProps.__zbyColumnWidth ?? cellRect.width,
        minWidth: cellProps.__zbyColumnMinWidth ?? 50,
        maxWidth:
          cellProps.__zbyColumnMaxWidth ?? Number.POSITIVE_INFINITY,
        column: column as TableColumnGroupType<object> | TableColumnType<object>,
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
    [commitColumnWidth, direction, originalColumnMap, prefixCls],
  )

  const resizeByKeyboard = React.useCallback(
    (event: React.KeyboardEvent<HTMLElement>, cellProps: ResizeHeaderCellProps) => {
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
    typeof components?.header === 'object' ? components.header.cell : undefined
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

  const lineWidth = getNumericWidth(token.lineWidth, 1)
  const fontHeight = Math.floor(token.fontSize * token.lineHeight)
  const itemHeight =
    size === 'small'
      ? token.paddingXS * 2 + fontHeight + lineWidth
      : size === 'middle'
        ? token.paddingSM * 2 + fontHeight + lineWidth
        : token.padding * 2 + fontHeight + lineWidth

  const userBodyComponents =
    components?.body && typeof components.body === 'object'
      ? components.body
      : undefined
  const bodyRenderer = React.useMemo(() => {
    const renderer = (
      bodyData: readonly RecordType[],
      info: Parameters<typeof TableScrollBody<RecordType>>[0]['info'],
    ) => (
      <TableScrollBody
        data={bodyData}
        info={info}
        virtual={virtual}
        fill={heightMode === 'fill'}
        scrollY={scroll?.y}
        itemHeight={itemHeight}
        tableWidth={tableWidth}
        onTableScroll={onScroll}
      />
    )

    return Object.assign(renderer, userBodyComponents)
  }, [
    heightMode,
    itemHeight,
    onScroll,
    scroll?.y,
    tableWidth,
    userBodyComponents,
    virtual,
  ])

  const mergedComponents = React.useMemo(
    () => ({
      ...components,
      header: {
        ...(typeof components?.header === 'object' ? components.header : {}),
        cell: ResizeHeaderCell,
      },
      body: bodyRenderer,
    }),
    [ResizeHeaderCell, bodyRenderer, components],
  )

  const mergedRowClassName = React.useCallback(
    (record: RecordType, index: number, indent: number) => {
      const userClassName =
        typeof rowClassName === 'function'
          ? rowClassName(record, index, indent)
          : rowClassName
      if (!rowHighlight) return userClassName ?? ''

      const recordKey = getRecordKey(record, index, rowKey)
      return clsx(userClassName, {
        [`${prefixCls}-row-current`]: recordKey === currentRowKey,
      })
    },
    [currentRowKey, prefixCls, rowClassName, rowHighlight, rowKey],
  )

  const mergedOnRow = React.useCallback(
    (record: RecordType, index?: number) => {
      const userRowProps = onRow?.(record, index) ?? {}
      if (!rowHighlight) return userRowProps

      const recordKey = getRecordKey(record, index, rowKey)
      const isCurrent = recordKey === currentRowKey
      return {
        ...userRowProps,
        'aria-current': isCurrent ? ('true' as const) : undefined,
        onClick: (event: React.MouseEvent<HTMLElement>) => {
          userRowProps.onClick?.(event)
          if (event.defaultPrevented) return

          if (isCurrent) setCurrentRowKey(null, null)
          else setCurrentRowKey(recordKey, record)
        },
      }
    },
    [currentRowKey, onRow, rowHighlight, rowKey, setCurrentRowKey],
  )

  const mergedScroll = {
    ...scroll,
    x: tableWidth,
    // A truthy y delegates body rendering to our forked scroll body. The body
    // itself applies the original height instead of this internal sentinel.
    y: scroll?.y ?? (virtual ? 500 : 1),
  }

  return (
    <div
      ref={rootRef}
      className={clsx(
        `${prefixCls}-zby`,
        {
          [`${prefixCls}-zby-fill`]: heightMode === 'fill',
          [`${prefixCls}-zby-virtual`]: virtual,
        },
        hashId,
      )}
    >
      <AntdTable<RecordType>
        {...restProps}
        ref={ref}
        prefixCls={prefixCls}
        columns={resolvedColumns}
        components={mergedComponents as AntdTableProps<RecordType>['components']}
        dataSource={dataSource}
        onRow={mergedOnRow}
        rowClassName={mergedRowClassName}
        rowKey={rowKey}
        rowSelection={mergedRowSelection}
        scroll={mergedScroll}
        size={size}
        tailor
        virtual={false}
      />
      <div
        ref={guideRef}
        className={`${prefixCls}-zby-resize-guide`}
        aria-hidden="true"
      />
    </div>
  )
}

const ForwardTable = React.forwardRef(InternalTable) as unknown as TableComponent

Object.assign(ForwardTable, {
  Column: AntdTable.Column,
  ColumnGroup: AntdTable.ColumnGroup,
  Summary: AntdTable.Summary,
  SELECTION_ALL: AntdTable.SELECTION_ALL,
  SELECTION_INVERT: AntdTable.SELECTION_INVERT,
  SELECTION_NONE: AntdTable.SELECTION_NONE,
  EXPAND_COLUMN: AntdTable.EXPAND_COLUMN,
})

;(ForwardTable as unknown as { displayName?: string }).displayName = 'Table'

export default ForwardTable

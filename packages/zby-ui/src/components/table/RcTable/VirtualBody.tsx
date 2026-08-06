import { useContext } from '@rc-component/context'
import Body from '@rc-component/table/es/Body'
import ColGroup from '@rc-component/table/es/ColGroup'
import TableContext from '@rc-component/table/es/context/TableContext'
import useFlattenRecords from '@rc-component/table/es/hooks/useFlattenRecords'
import BodyLine from '@rc-component/table/es/VirtualTable/BodyLine'
import {
  GridContext,
  StaticContext,
} from '@rc-component/table/es/VirtualTable/context'
import * as React from 'react'
import type { GetComponent, GetRowKey } from '@rc-component/table/es/interface'

import ScrollArea from '../../scroll-area'
import type { TableScrollAreaProps } from '../interface'

const EMPTY_COLUMNS: never[] = []
const EMPTY_KEYS = new Set<React.Key>()

function defaultGetRowKey<RecordType extends object>(record: RecordType) {
  return (record as Record<PropertyKey, unknown>).key as React.Key
}

const defaultGetComponent = (
  _path: readonly (string | number)[],
  defaultComponent?: React.ElementType,
) => defaultComponent

interface RcScrollBodyInfo {
  scrollbarSize: number
  ref: React.Ref<unknown>
  onScroll: (info: {
    currentTarget: HTMLElement | null
    scrollLeft?: number
  }) => void
}

export interface TableScrollBodyProps<RecordType extends object> {
  data: readonly RecordType[]
  info: RcScrollBodyInfo
  virtual: boolean
  fill: boolean
  scrollAreaProps?: TableScrollAreaProps
  scrollY?: number | string
  itemHeight: number
  tableWidth: number
  horizontal: boolean
  onTableScroll?: React.UIEventHandler<HTMLDivElement>
}

interface ScrollToConfig {
  index?: number
  key?: React.Key
  top?: number
  left?: number
  offset?: number
  align?: 'top' | 'bottom' | 'nearest'
}

interface ScrollBodyReference {
  nativeElement: HTMLDivElement | null
  scrollTo: (config: ScrollToConfig | number) => void
  scrollLeft: number
  scrollTop: number
}

function findStartIndex(offsets: readonly number[], scrollTop: number) {
  let low = 0
  let high = Math.max(0, offsets.length - 2)

  while (low < high) {
    const middle = Math.floor((low + high) / 2)
    if (offsets[middle + 1] < scrollTop) low = middle + 1
    else high = middle
  }

  return low
}

function findEndIndex(
  offsets: readonly number[],
  bottom: number,
  itemCount: number,
) {
  let low = 0
  let high = Math.max(0, itemCount - 1)

  while (low < high) {
    const middle = Math.ceil((low + high) / 2)
    if (offsets[middle] <= bottom) low = middle
    else high = middle - 1
  }

  return low
}

interface MeasuredBodyLineProps {
  children: React.ReactElement
  itemKey: React.Key
  onHeightChange: (key: React.Key, height: number) => void
}

function MeasuredBodyLine({
  children,
  itemKey,
  onHeightChange,
}: MeasuredBodyLineProps) {
  const rowRef = React.useRef<HTMLElement | null>(null)

  React.useLayoutEffect(() => {
    const row = rowRef.current
    if (!row) return undefined

    const measure = () => {
      const height = row.getBoundingClientRect().height || row.offsetHeight
      if (height > 0) onHeightChange(itemKey, height)
    }

    measure()
    if (typeof ResizeObserver === 'undefined') return undefined

    const observer = new ResizeObserver(measure)
    observer.observe(row)
    return () => observer.disconnect()
  }, [itemKey, onHeightChange])

  return React.cloneElement(children, {
    ref: rowRef,
  } as React.HTMLAttributes<HTMLElement>)
}

function TableScrollBody<RecordType extends object>(
  props: TableScrollBodyProps<RecordType>,
) {
  const {
    data,
    info,
    virtual,
    fill,
    scrollAreaProps,
    scrollY,
    itemHeight,
    tableWidth,
    horizontal,
    onTableScroll,
  } = props
  const tableContext = useContext(TableContext) ?? {}
  const prefixCls = tableContext.prefixCls ?? 'ant-table'
  const flattenColumns = tableContext.flattenColumns ?? EMPTY_COLUMNS
  const getRowKey: GetRowKey<RecordType> =
    tableContext.getRowKey ?? defaultGetRowKey
  const expandedKeys = tableContext.expandedKeys ?? EMPTY_KEYS
  const childrenColumnName = tableContext.childrenColumnName ?? 'children'
  const getComponent: GetComponent =
    tableContext.getComponent ?? (defaultGetComponent as GetComponent)
  const tableLayout = tableContext.tableLayout ?? 'fixed'
  const onColumnResize = tableContext.onColumnResize
  const viewportRef = React.useRef<HTMLDivElement | null>(null)
  const [heightMap, setHeightMap] = React.useState(
    () => new Map<React.Key, number>(),
  )
  const [scrollTop, setScrollTop] = React.useState(0)
  const [viewportHeight, setViewportHeight] = React.useState(() =>
    typeof scrollY === 'number' ? scrollY : 0,
  )

  const flattenData = useFlattenRecords(
    data,
    childrenColumnName,
    expandedKeys,
    getRowKey,
  )

  const rowKeys = React.useMemo(
    () =>
      flattenData.map((item, index) => getRowKey(item.record, index)),
    [flattenData, getRowKey],
  )

  const offsets = React.useMemo(() => {
    const nextOffsets = [0]
    rowKeys.forEach((key) => {
      nextOffsets.push(
        nextOffsets[nextOffsets.length - 1] +
          (heightMap.get(key) ?? itemHeight),
      )
    })
    return nextOffsets
  }, [heightMap, itemHeight, rowKeys])

  const totalHeight = offsets[offsets.length - 1] ?? 0
  const overscan = 2
  const startIndex = virtual
    ? Math.max(0, findStartIndex(offsets, scrollTop) - overscan)
    : 0
  const visibleBottom = scrollTop + Math.max(viewportHeight, itemHeight)
  const endIndex = virtual
    ? Math.min(
        flattenData.length - 1,
        findEndIndex(offsets, visibleBottom, flattenData.length) + overscan,
      )
    : flattenData.length - 1

  const columnsOffset = React.useMemo(() => {
    const nextOffsets: number[] = []
    flattenColumns.forEach((column) => {
      const width = Math.max(
        typeof column.width === 'number' ? column.width : 0,
        typeof column.minWidth === 'number' ? column.minWidth : 0,
      )
      const previousOffset = nextOffsets[nextOffsets.length - 1] ?? 0
      nextOffsets.push(previousOffset + width)
    })
    return nextOffsets
  }, [flattenColumns])

  React.useEffect(() => {
    flattenColumns.forEach((column) => {
      if (column.key === undefined || typeof column.width !== 'number') return
      onColumnResize?.(column.key, column.width)
    })
  }, [flattenColumns, onColumnResize])

  React.useLayoutEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return undefined

    const updateHeight = () => setViewportHeight(viewport.clientHeight)
    updateHeight()
    if (typeof ResizeObserver === 'undefined') return undefined

    const observer = new ResizeObserver(updateHeight)
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [])

  const onHeightChange = React.useCallback(
    (key: React.Key, height: number) => {
      setHeightMap((previous) => {
        if (previous.get(key) === height) return previous

        const next = new Map(previous)
        next.set(key, height)
        return next
      })
    },
    [],
  )

  React.useImperativeHandle(
    info.ref,
    (): ScrollBodyReference => {
      const scrollTo = (config: ScrollToConfig | number) => {
        const viewport = viewportRef.current
        if (!viewport) return

        if (typeof config === 'number') {
          viewport.scrollTo({ top: config })
          return
        }

        if (typeof config.left === 'number') viewport.scrollLeft = config.left
        if (typeof config.top === 'number') {
          viewport.scrollTo({ top: config.top })
          return
        }

        let index = config.index
        if (config.key !== undefined) {
          index = rowKeys.findIndex((key) => key === config.key)
        }
        if (index === undefined || index < 0 || index >= rowKeys.length) return

        const rowTop = offsets[index]
        const rowBottom = offsets[index + 1]
        let nextTop = rowTop

        if (config.align === 'bottom') {
          nextTop = rowBottom - viewport.clientHeight
        } else if (config.align === 'nearest') {
          if (
            rowTop >= viewport.scrollTop &&
            rowBottom <= viewport.scrollTop + viewport.clientHeight
          ) {
            return
          }
          nextTop =
            rowTop < viewport.scrollTop
              ? rowTop
              : rowBottom - viewport.clientHeight
        }

        viewport.scrollTo({ top: nextTop + (config.offset ?? 0) })
      }

      return {
        nativeElement: viewportRef.current,
        scrollTo,
        get scrollLeft() {
          return viewportRef.current?.scrollLeft ?? 0
        },
        set scrollLeft(value: number) {
          if (viewportRef.current) viewportRef.current.scrollLeft = value
        },
        get scrollTop() {
          return viewportRef.current?.scrollTop ?? 0
        },
        set scrollTop(value: number) {
          if (viewportRef.current) viewportRef.current.scrollTop = value
        },
      }
    },
    [offsets, rowKeys],
  )

  const handleScroll: React.UIEventHandler<HTMLDivElement> = (event) => {
    setScrollTop(event.currentTarget.scrollTop)
    info.onScroll({
      currentTarget: event.currentTarget,
      scrollLeft: event.currentTarget.scrollLeft,
    })
    onTableScroll?.(event)
  }

  const staticContext = React.useMemo(
    () => ({
      sticky: false,
      scrollY: viewportHeight,
      listItemHeight: itemHeight,
      getComponent,
      onScroll: onTableScroll,
    }),
    [getComponent, itemHeight, onTableScroll, viewportHeight],
  )
  const gridContext = React.useMemo(
    () => ({ columnsOffset }),
    [columnsOffset],
  )
  // AntD fixed cells add per-column z-offsets above their base layer.
  // Keep both overlay tracks above the maximum possible fixed-cell layer.
  const scrollTrackZIndex = flattenColumns.length * 2 + 4

  const bodyHeightStyle: React.CSSProperties = fill
    ? {}
    : scrollY !== undefined
      ? { height: scrollY }
      : virtual
        ? { height: 500 }
        : {}

  let bodyNode: React.ReactNode
  if (!virtual || !flattenData.length) {
    bodyNode = (
      <table
        style={{
          width: tableWidth,
          tableLayout,
        }}
      >
        <ColGroup
          colWidths={flattenColumns.map((column) => column.width ?? 0)}
          columns={flattenColumns}
        />
        <Body data={data} measureColumnWidth />
      </table>
    )
  } else {
    const visibleRows = flattenData
      .slice(startIndex, endIndex + 1)
      .map((item, visibleIndex) => {
        const index = startIndex + visibleIndex
        const rowKey = getRowKey(item.record, index)
        return (
          <MeasuredBodyLine
            key={rowKey}
            itemKey={rowKey}
            onHeightChange={onHeightChange}
          >
            <BodyLine
              data={item}
              rowKey={rowKey}
              index={index}
              style={{ minHeight: itemHeight }}
            />
          </MeasuredBodyLine>
        )
      })

    bodyNode = (
      <StaticContext.Provider value={staticContext}>
        <GridContext.Provider value={gridContext}>
          <div
            className={`${prefixCls}-tbody-virtual-holder`}
            style={{
              position: 'relative',
              width: tableWidth,
              height: totalHeight,
            }}
          >
            <div
              className={`${prefixCls}-tbody-virtual-holder-inner`}
              style={{
                position: 'absolute',
                insetInline: 0,
                top: 0,
                width: tableWidth,
                transform: `translateY(${offsets[startIndex] ?? 0}px)`,
              }}
            >
              {visibleRows}
            </div>
          </div>
        </GridContext.Provider>
      </StaticContext.Provider>
    )
  }

  return (
    <ScrollArea
      className={`${prefixCls}-body ${prefixCls}-zby-scroll-body ${
        virtual ? `${prefixCls}-tbody-virtual` : ''
      }`}
      direction={horizontal ? 'both' : 'vertical'}
      scrollbar={scrollAreaProps?.scrollbar ?? 'hover'}
      scrollHideDelay={scrollAreaProps?.scrollHideDelay}
      viewportRef={viewportRef}
      viewportProps={{ onScroll: handleScroll }}
      styles={{
        root: bodyHeightStyle,
        content: {
          width: tableWidth,
          minWidth: 0,
          minHeight: '100%',
        },
        horizontalTrack: { zIndex: scrollTrackZIndex },
        verticalTrack: { zIndex: scrollTrackZIndex },
      }}
    >
      {bodyNode}
    </ScrollArea>
  )
}

export default TableScrollBody

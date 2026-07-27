const LAYOUT_EPSILON = 0.5

export interface NativeScrollbarSize {
  width: number
  height: number
}

export interface MenuDrawerLayoutInput {
  itemHeights: readonly number[]
  drawerBodyHeight: number
  availableWidth: number
  columnWidth: number
  frameInlineSize: number
  scrollbarSize: NativeScrollbarSize
}

export interface MenuDrawerLayout {
  columnStartIndexes: number[]
  columnCount: number
  columnHeight: number
  maxColumns: number
  drawerWidth: number
  shouldScrollX: boolean
  shouldScrollY: boolean
}

export function createMenuDrawerLayout(input: MenuDrawerLayoutInput): MenuDrawerLayout {
  const {
    availableWidth,
    columnWidth,
    drawerBodyHeight,
    frameInlineSize,
    itemHeights,
    scrollbarSize,
  } = input
  const heights = itemHeights.map((height) =>
    Number.isFinite(height) ? Math.max(0, height) : 0)
  const maxItemHeight = heights.reduce((max, height) => Math.max(max, height), 0)
  let reservesHorizontalScrollbar = false
  let layout = calculateLayout(reservesHorizontalScrollbar)

  for (let iteration = 0; iteration < 3; iteration += 1) {
    if (layout.shouldScrollX === reservesHorizontalScrollbar)
      return layout

    reservesHorizontalScrollbar = layout.shouldScrollX
    layout = calculateLayout(reservesHorizontalScrollbar)
  }

  return layout

  function calculateLayout(reserveHorizontalScrollbar: boolean): MenuDrawerLayout {
    const availableColumnHeight = Math.max(
      0,
      drawerBodyHeight - (reserveHorizontalScrollbar ? scrollbarSize.height : 0),
    )
    const columnHeight = Math.max(availableColumnHeight, maxItemHeight)
    const shouldScrollY = maxItemHeight > availableColumnHeight + LAYOUT_EPSILON
    const verticalScrollbarWidth = shouldScrollY ? scrollbarSize.width : 0
    const availableContentWidth = Math.max(
      0,
      availableWidth - frameInlineSize - verticalScrollbarWidth,
    )
    const maxColumns = Math.max(
      1,
      Math.floor(availableContentWidth / columnWidth),
    )
    const { columnCount, columnStartIndexes } = packMenuColumns(heights, columnHeight)
    const visibleColumnCount = Math.min(columnCount, maxColumns)
    const naturalDrawerWidth = visibleColumnCount * columnWidth +
      verticalScrollbarWidth + frameInlineSize
    const shouldScrollX = columnCount > maxColumns ||
      naturalDrawerWidth > availableWidth + LAYOUT_EPSILON

    return {
      columnStartIndexes,
      columnCount,
      columnHeight,
      maxColumns,
      drawerWidth: Math.min(naturalDrawerWidth, availableWidth),
      shouldScrollX,
      shouldScrollY,
    }
  }
}

function packMenuColumns(itemHeights: readonly number[], columnHeight: number) {
  if (!itemHeights.length)
    return { columnCount: 1, columnStartIndexes: [] }

  const columnStartIndexes = [0]
  let currentHeight = 0
  let currentItemCount = 0

  itemHeights.forEach((height, index) => {
    if (
      currentItemCount > 0 &&
      currentHeight + height > columnHeight
    ) {
      columnStartIndexes.push(index)
      currentHeight = 0
      currentItemCount = 0
    }

    currentHeight += height
    currentItemCount += 1
  })

  return {
    columnCount: columnStartIndexes.length,
    columnStartIndexes,
  }
}

// DOM 测量和原生 scrollWidth/scrollHeight 会在不同阶段进行像素取整。
// 仅滚动判定允许 0.5px 误差；真正装列必须严格比较，避免 CSS 额外自动换列。
const LAYOUT_EPSILON = 0.5

export interface NativeScrollbarSize {
  /** 纵向滚动条占用的内容宽度。覆盖式滚动条为 0。 */
  width: number
  /** 横向滚动条占用的内容高度。覆盖式滚动条为 0。 */
  height: number
}

export interface MenuDrawerLayoutInput {
  /** 按菜单顺序排列的完整 section 自然高度。 */
  itemHeights: readonly number[]
  /** 扣除 Drawer body 上下 padding 后的可用内容高度。 */
  drawerBodyHeight: number
  /** 从侧栏右侧到视口安全间距之间的 Drawer 外框最大宽度。 */
  availableWidth: number
  /** 每一菜单列的固定内容宽度。 */
  columnWidth: number
  /** Drawer 外框在 inline 方向占用的宽度，目前是右边框。 */
  frameInlineSize: number
  /** 当前平台原生横向、纵向滚动条尺寸。 */
  scrollbarSize: NativeScrollbarSize
}

export interface MenuDrawerLayout {
  /** 每一列第一个 section 在原数组中的下标；第一列固定从 0 开始。 */
  columnStartIndexes: number[]
  /** 所有菜单实际需要的总列数，可能大于当前视口可见列数。 */
  columnCount: number
  /** CSS 分栏容器使用的统一列高。 */
  columnHeight: number
  /** 扣除外框和纵向滚动条后，视口同时容纳的最大列数。 */
  maxColumns: number
  /** Drawer 外框最终宽度，不包含视口外的隐藏列。 */
  drawerWidth: number
  /** 总列数超过可见列数时启用横向滚动。 */
  shouldScrollX: boolean
  /** 最高 section 超过可用列高时启用整个 Drawer 的纵向滚动。 */
  shouldScrollY: boolean
}

/**
 * 计算菜单 Drawer 的完整布局。
 *
 * 算法遵循以下约束：
 * 1. 每个 item 是不可拆分的完整菜单组。
 * 2. 列高至少等于最高菜单组，超出视口的部分交给 Drawer 整体纵向滚动。
 * 3. 菜单按原顺序使用 next-fit 依次装列，不回填前面列的空洞。
 * 4. 横向滚动条会减少可用高度，可能进一步触发纵向滚动条；纵向滚动条又会减少可用宽度。
 *
 * 返回值只描述布局，不读取 DOM，便于针对边界条件独立测试。
 */
export function createMenuDrawerLayout(input: MenuDrawerLayoutInput): MenuDrawerLayout {
  const {
    availableWidth,
    columnWidth,
    drawerBodyHeight,
    frameInlineSize,
    itemHeights,
    scrollbarSize,
  } = input

  // 外部测量异常不能污染布局：非有限值按 0 处理，负高度也收敛到 0。
  const heights = itemHeights.map((height) =>
    Number.isFinite(height) ? Math.max(0, height) : 0)
  const maxItemHeight = heights.reduce((max, height) => Math.max(max, height), 0)

  // 第一轮先假设没有横向滚动条；若计算结果需要 X 滚动，再把它占用的高度反馈给下一轮。
  let reservesHorizontalScrollbar = false
  let layout = calculateLayout(reservesHorizontalScrollbar)

  // 横向滚动只有“占用/不占用”两个状态。三轮足以完成初算、反馈和稳定性确认，
  // 同时给未来滚动条尺寸或边框规则调整留出一次防御性收敛机会。
  for (let iteration = 0; iteration < 3; iteration += 1) {
    if (layout.shouldScrollX === reservesHorizontalScrollbar)
      return layout

    reservesHorizontalScrollbar = layout.shouldScrollX
    layout = calculateLayout(reservesHorizontalScrollbar)
  }

  return layout

  function calculateLayout(reserveHorizontalScrollbar: boolean): MenuDrawerLayout {
    // X 滚动条位于 Drawer body 底部，它会直接吃掉每一列可用于菜单的高度。
    const availableColumnHeight = Math.max(
      0,
      drawerBodyHeight - (reserveHorizontalScrollbar ? scrollbarSize.height : 0),
    )

    // 统一列高取“视口可用高度”和“最高完整菜单组”中的较大值。
    // 因而最高组永远不会被拆分；当它更高时，容器自然超过视口并开启 Y 滚动。
    const columnHeight = Math.max(availableColumnHeight, maxItemHeight)
    const shouldScrollY = maxItemHeight > availableColumnHeight + LAYOUT_EPSILON

    // 只有确实需要 Y 滚动时，才从可用宽度中预留纵向滚动条。
    const verticalScrollbarWidth = shouldScrollY ? scrollbarSize.width : 0
    const availableContentWidth = Math.max(
      0,
      availableWidth - frameInlineSize - verticalScrollbarWidth,
    )

    // 至少保留一列，即使极窄视口不足一列，后续也由 Drawer 自身裁切/滚动而不是返回 0 列。
    const maxColumns = Math.max(
      1,
      Math.floor(availableContentWidth / columnWidth),
    )

    // 使用确定后的统一列高按原顺序装列，得到真实列数和每列起点。
    const { columnCount, columnStartIndexes } = packMenuColumns(heights, columnHeight)
    const visibleColumnCount = Math.min(columnCount, maxColumns)

    // Drawer 只扩展到当前能显示的列数；不可见的剩余列保留在内部宽容器中，通过 X 滚动访问。
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

/**
 * 按输入顺序执行 next-fit 装列。
 *
 * 当前列放不下完整 item 时，item 整体成为下一列的第一项。这里不做“最佳适配”回填，
 * 因为菜单的阅读顺序必须与路由顺序一致，且响应式重排需要保持结果稳定、可预测。
 */
function packMenuColumns(itemHeights: readonly number[], columnHeight: number) {
  // 空菜单仍返回一个空列，使 Drawer 尺寸和渲染结构保持有效。
  if (!itemHeights.length)
    return { columnCount: 1, columnStartIndexes: [] }

  // 第一项天然是第一列起点；后续只记录发生换列的 item 下标。
  const columnStartIndexes = [0]
  let currentHeight = 0
  let currentItemCount = 0

  itemHeights.forEach((height, index) => {
    // 严格比较真实高度，不使用滚动判定的 0.5px 容差。
    // 否则算法认为能放下、CSS 却因小数像素溢出而自动换列，会再次造成列数不一致。
    if (
      currentItemCount > 0 &&
      currentHeight + height > columnHeight
    ) {
      columnStartIndexes.push(index)
      currentHeight = 0
      currentItemCount = 0
    }

    // 新列或当前列都从这里累计；单个 item 即使高于列高也不会被拆开。
    currentHeight += height
    currentItemCount += 1
  })

  return {
    columnCount: columnStartIndexes.length,
    columnStartIndexes,
  }
}

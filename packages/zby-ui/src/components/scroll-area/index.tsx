import * as React from 'react'
import { ConfigProvider } from 'antd'
import { clsx } from 'clsx'

import useStyle from './style'
import { clampScrollOffset, composeRef, getThumbOffset, getThumbSize, raf } from './utils'

export type ScrollAreaDirection = 'vertical' | 'horizontal' | 'both'
export type ScrollAreaScrollbarTrigger = 'hover' | 'scrolling' | 'always'
export type ScrollAreaScrollbar =
  boolean | ScrollAreaScrollbarTrigger | ScrollAreaScrollbarTrigger[]
export type ScrollAreaWheelBehavior = 'native' | 'axis-mapping'

export type ScrollAreaSemanticName = keyof ScrollAreaSemanticClassNames &
  keyof ScrollAreaSemanticStyles

export type ScrollAreaSemanticClassNames = {
  root?: string
  viewport?: string
  content?: string
  horizontalTrack?: string
  horizontalThumb?: string
  verticalTrack?: string
  verticalThumb?: string
}

export type ScrollAreaSemanticStyles = {
  root?: React.CSSProperties
  viewport?: React.CSSProperties
  content?: React.CSSProperties
  horizontalTrack?: React.CSSProperties
  horizontalThumb?: React.CSSProperties
  verticalTrack?: React.CSSProperties
  verticalThumb?: React.CSSProperties
}

type ScrollAreaSemanticValue<T> = T | ((info: { props: ScrollAreaProps }) => T)

export type ScrollAreaClassNamesType = ScrollAreaSemanticValue<
  Readonly<ScrollAreaSemanticClassNames>
>

export type ScrollAreaStylesType = ScrollAreaSemanticValue<Readonly<ScrollAreaSemanticStyles>>

/**
 * 透传给内部 viewport 节点的原生 div 属性。
 *
 * viewport 是真正持有 scrollTop、scrollLeft 并触发原生滚动的元素。
 * className、style、ref、onScroll 和 onWheel 会与 ScrollArea 内部逻辑合并，
 * 因此业务方可以监听或操作真实滚动容器，而不需要依赖组件内部 DOM 层级。
 */
export type ScrollAreaViewportProps = React.HTMLAttributes<HTMLDivElement> & {
  /** 获取内部真实滚动节点；与 ScrollAreaProps.viewportRef 指向同一个元素。 */
  ref?: React.Ref<HTMLDivElement>
}

/**
 * ScrollArea 对外公开属性。
 *
 * 组件使用三层 DOM：最外层 root 负责布局和状态 class，viewport 承担浏览器原生滚动，
 * content 包裹实际内容。除 children 外继承的 HTMLDivElement 属性默认应用到 root；
 * forwardRef 同样指向 root。onWheel 是一个例外，它会在 viewport 的原生 wheel 监听流程中调用，
 * 以便在 axis-mapping 模式决定是否需要阻止默认纵向滚动前，让业务方先处理事件。
 */
export interface ScrollAreaProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /**
   * 自定义组件 CSS 类名前缀。
   *
   * 未传入时使用 ConfigProvider.getPrefixCls('scroll-area')，默认通常为 ant-scroll-area。
   * root、viewport、content、track 和 thumb 的内部类名都会基于该前缀生成。
   */
  prefixCls?: string

  /**
   * 附加到最外层 root 的稳定类名。
   *
   * 与继承的 className、semantic classNames.root 同时生效，主要用于页面级样式定位；
   * 不会传递给真正发生滚动的 viewport。
   */
  rootClassName?: string

  /**
   * 允许滚动并计算自定义滚动条的方向。
   *
   * - vertical：仅允许纵向滚动；
   * - horizontal：仅允许横向滚动；
   * - both：横向和纵向都允许滚动。
   *
   * 只有指定方向实际发生内容溢出时，组件才会渲染对应的自定义轨道。
   *
   * @default 'vertical'
   */
  direction?: ScrollAreaDirection

  /**
   * 自定义滚动条的展示策略。
   *
   * - true：等价于 'always'，轨道始终可见；
   * - false：不渲染自定义轨道，但 viewport 仍可通过滚轮、触摸或代码正常滚动；
   * - 'hover'：鼠标悬浮 root 时显示；
   * - 'scrolling'：滚动或拖拽时显示，停止滚动 1200ms 后隐藏；
   * - 'always'：始终显示；
   * - 数组：组合多种触发方式，例如 ['hover', 'scrolling']。
   *
   * @default 'hover'
   */
  scrollbar?: ScrollAreaScrollbar

  /**
   * 滚轮事件的轴处理方式。
   *
   * - native：完全保留浏览器原生 wheel 行为；
   * - axis-mapping：在 horizontal 模式下，当内容只有横向溢出且内部没有可继续滚动的
   *   纵向容器时，把主要的 deltaY 映射为 scrollLeft。
   *
   * axis-mapping 会避开嵌套 ScrollArea，并尊重业务回调已经调用的 preventDefault。
   *
   * @default 'axis-mapping'
   */
  wheelBehavior?: ScrollAreaWheelBehavior

  /**
   * 是否使用浏览器原生滚动条。
   *
   * 为 false 时隐藏 viewport 的原生滚动条，并根据 scrollbar 配置渲染自定义轨道；
   * 为 true 时保留浏览器原生滚动条且不渲染自定义 track/thumb。
   * 该属性只改变滚动条外观，不改变 direction 对 overflow 方向的约束。
   *
   * @default false
   */
  nativeScrollbar?: boolean

  /**
   * 获取内部真实滚动 viewport 的 ref。
   *
   * 可用于读取 scrollTop/scrollLeft、调用 scrollTo 或接入需要原生滚动节点的第三方逻辑。
   * 如果 viewportProps.ref 也存在，两个 ref 会被同时写入。
   */
  viewportRef?: React.Ref<HTMLDivElement>

  /**
   * 透传给内部 viewport 的原生 div 属性。
   *
   * className 会与内部 viewport 类名及 semantic classNames.viewport 合并；
   * style 在 semantic styles.viewport 之后合并，因此同名声明以 viewportProps.style 为准；
   * onScroll 和 onWheel 会在保留 ScrollArea 指标更新及 wheel 映射逻辑的同时被调用。
   */
  viewportProps?: ScrollAreaViewportProps

  /**
   * 为各语义 DOM 节点追加类名。
   *
   * 可以直接传对象，也可以传回调。回调收到的 props 已包含归一化后的 direction、
   * scrollbar、wheelBehavior 和 nativeScrollbar，适合根据最终配置动态生成类名。
   * 支持 root、viewport、content、horizontalTrack、horizontalThumb、
   * verticalTrack 和 verticalThumb。
   */
  classNames?: ScrollAreaClassNamesType

  /**
   * 为各语义 DOM 节点追加内联样式，节点范围与 classNames 相同。
   *
   * 可以直接传对象，也可以传基于最终 props 的回调。root 样式先于继承的 style 合并，
   * viewport 样式先于 viewportProps.style 合并；track/thumb 样式最后合并，
   * 因此可以按需覆盖组件计算出的轨道位置、滑块尺寸或 transform。
   */
  styles?: ScrollAreaStylesType

  /**
   * 需要滚动的内容。
   *
   * 内容会被放入 viewport 下的 content 节点。content 默认至少占满 viewport，
   * 并由 ResizeObserver 监听尺寸变化，以便重新计算溢出状态和滑块位置。
   */
  children?: React.ReactNode
}

/**
 * viewport 的原生滚动指标快照。
 *
 * 自定义轨道并不替代浏览器滚动机制：真正发生滚动的仍然是 viewport。
 * 组件只把这些原生指标转换为“是否溢出、是否显示轨道、滑块多大、滑块位于哪里”。
 */
type ScrollMetrics = {
  scrollLeft: number
  scrollTop: number
  clientWidth: number
  clientHeight: number
  scrollWidth: number
  scrollHeight: number
}

const DEFAULT_METRICS: ScrollMetrics = {
  scrollLeft: 0,
  scrollTop: 0,
  clientWidth: 0,
  clientHeight: 0,
  scrollWidth: 0,
  scrollHeight: 0,
}

/** scrolling 模式停止滚动后继续显示滚动条的时间。 */
const SCROLLBAR_VISIBLE_DURATION = 1200

/**
 * 将外部较宽松的 scrollbar 配置统一为内部可直接判断的触发器数组。
 * 数组配置会去重，避免重复 className；true 等价于 always，false 表示完全关闭自定义轨道。
 */
function normalizeScrollbar(
  scrollbar: ScrollAreaScrollbar | undefined,
): false | ScrollAreaScrollbarTrigger[] {
  if (scrollbar === true) return ['always']
  if (scrollbar === false) return false
  if (Array.isArray(scrollbar)) return Array.from(new Set(scrollbar))
  return [scrollbar ?? 'hover']
}

function canScrollHorizontal(direction: ScrollAreaDirection) {
  return direction === 'horizontal' || direction === 'both'
}

function canScrollVertical(direction: ScrollAreaDirection) {
  return direction === 'vertical' || direction === 'both'
}

/**
 * semantic classNames/styles 同时支持对象和回调。
 * 回调接收归一化后的 props，因此业务方看到的是组件最终采用的方向、滚动条和 wheel 配置。
 */
function resolveSemanticValue<T>(
  value: ScrollAreaSemanticValue<T> | undefined,
  props: ScrollAreaProps,
): T {
  if (typeof value === 'function') {
    return (value as (info: { props: ScrollAreaProps }) => T)({ props })
  }
  return (value ?? {}) as T
}

const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>((props, ref) => {
  const {
    prefixCls: customizePrefixCls,
    className,
    rootClassName,
    style,
    direction: customizeDirection,
    scrollbar: customizeScrollbar,
    wheelBehavior: customizeWheelBehavior,
    nativeScrollbar: customizeNativeScrollbar,
    viewportRef,
    viewportProps,
    classNames,
    styles,
    children,
    onWheel,
    ...restProps
  } = props
  const { getPrefixCls, direction: contextDirection } = React.useContext(
    ConfigProvider.ConfigContext,
  )

  const prefixCls = getPrefixCls('scroll-area', customizePrefixCls)
  const [hashId, cssVarCls] = useStyle(prefixCls)
  const mergedDirection = customizeDirection ?? 'vertical'
  const scrollbar = React.useMemo(
    () => normalizeScrollbar(customizeScrollbar),
    [customizeScrollbar],
  )
  const hasScrollbarTrigger = React.useCallback(
    (trigger: ScrollAreaScrollbarTrigger) => scrollbar !== false && scrollbar.includes(trigger),
    [scrollbar],
  )
  const wheelBehavior = customizeWheelBehavior ?? 'axis-mapping'
  const nativeScrollbar = customizeNativeScrollbar ?? false
  const isRtl = contextDirection === 'rtl'

  /**
   * 三层 DOM 各司其职：
   * - root：承载方向、展示状态和语义样式；
   * - viewport：浏览器实际滚动的元素；
   * - content：被测量的内容层，内容尺寸变化时触发指标更新。
   */
  const rootRef = React.useRef<HTMLDivElement>(null)
  const internalViewportRef = React.useRef<HTMLDivElement>(null)
  const contentRef = React.useRef<HTMLDivElement>(null)

  // metrics 驱动轨道是否渲染以及滑块的尺寸、位置；scrolling/dragging 驱动可见状态。
  const [metrics, setMetrics] = React.useState<ScrollMetrics>(DEFAULT_METRICS)
  const [scrolling, setScrolling] = React.useState(false)
  const [dragging, setDragging] = React.useState<'horizontal' | 'vertical' | null>(null)

  // 定时器和 RAF 句柄都保存在 ref 中，避免高频滚动过程中触发额外渲染。
  const scrollEndTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef = React.useRef<number | null>(null)

  /**
   * 开始拖拽时冻结一份起点快照。后续 mousemove/touchmove 只需要计算指针位移，
   * 不必每帧重新推导拖拽起点，避免滑块在连续更新后产生累计误差。
   */
  const dragStateRef = React.useRef({
    pageOffset: 0,
    scrollOffset: 0,
    clientSize: 0,
    scrollSize: 0,
  })

  /**
   * wheel 监听器直接绑定在原生 DOM 上，以便使用 passive: false 调用 preventDefault。
   * 最新 props 放在 ref 中，使监听器无需因每次 render 反复解绑和绑定。
   */
  const wheelStateRef = React.useRef({
    onWheel,
    viewportOnWheel: viewportProps?.onWheel,
    direction: mergedDirection,
    wheelBehavior,
    isRtl,
  })
  wheelStateRef.current = {
    onWheel,
    viewportOnWheel: viewportProps?.onWheel,
    direction: mergedDirection,
    wheelBehavior,
    isRtl,
  }

  // semantic 回调接收归一化后的最终配置，而不是调用方可能省略字段的原始 props。
  const mergedProps: ScrollAreaProps = {
    ...props,
    direction: mergedDirection,
    scrollbar,
    wheelBehavior,
    nativeScrollbar,
  }
  const mergedClassNames = resolveSemanticValue(classNames, mergedProps)
  const mergedStyles = resolveSemanticValue(styles, mergedProps)

  /**
   * 从浏览器实际滚动元素读取完整指标。
   * React 状态只保存快照，不反向控制 viewport，因此不会破坏原生滚动和惯性滚动。
   */
  const updateMetrics = React.useCallback(() => {
    const viewport = internalViewportRef.current
    if (!viewport) return

    setMetrics({
      scrollLeft: viewport.scrollLeft,
      scrollTop: viewport.scrollTop,
      clientWidth: viewport.clientWidth,
      clientHeight: viewport.clientHeight,
      scrollWidth: viewport.scrollWidth,
      scrollHeight: viewport.scrollHeight,
    })
  }, [])

  /**
   * scroll、wheel、拖拽都可能在一帧内连续触发多次更新。
   * 始终取消上一帧任务并只保留最新一次，将布局读取合并到下一动画帧。
   */
  const queueUpdateMetrics = React.useCallback(() => {
    if (rafRef.current !== null) {
      raf.cancel(rafRef.current)
    }

    rafRef.current = raf(() => {
      rafRef.current = null
      updateMetrics()
    })
  }, [updateMetrics])

  /**
   * scrolling 展示模式下，任何滚动行为都会刷新隐藏计时器。
   * 用户停止操作 1200ms 后才移除状态，避免滚动条在连续滚动时闪烁。
   */
  const showScrollingState = React.useCallback(() => {
    if (!hasScrollbarTrigger('scrolling')) return

    setScrolling(true)
    if (scrollEndTimerRef.current) {
      clearTimeout(scrollEndTimerRef.current)
    }
    scrollEndTimerRef.current = setTimeout(() => {
      setScrolling(false)
      scrollEndTimerRef.current = null
    }, SCROLLBAR_VISIBLE_DURATION)
  }, [hasScrollbarTrigger])

  // 先透传 viewportProps.onScroll，再同步内部指标和展示状态。
  const onViewportScroll: React.UIEventHandler<HTMLDivElement> = (event) => {
    viewportProps?.onScroll?.(event)
    queueUpdateMetrics()
    showScrollingState()
  }

  const startDrag = (
    axis: 'horizontal' | 'vertical',
    event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
  ) => {
    const viewport = internalViewportRef.current
    if (!viewport) return

    /**
     * 拖拽换算使用同一套比例：
     * 指针移动距离 / 滑块可移动距离 = 内容滚动距离 / 内容可滚动距离。
     * 此处只记录起点，真正的比例换算在全局 move 监听器中完成。
     */
    const horizontal = axis === 'horizontal'
    dragStateRef.current = {
      pageOffset: getPageOffset(event, horizontal),
      scrollOffset: horizontal ? viewport.scrollLeft : viewport.scrollTop,
      clientSize: horizontal ? viewport.clientWidth : viewport.clientHeight,
      scrollSize: horizontal ? viewport.scrollWidth : viewport.scrollHeight,
    }
    setDragging(axis)
    setScrolling(hasScrollbarTrigger('scrolling'))
    event.preventDefault()
    event.stopPropagation()
  }

  /**
   * 拖拽开始后把 move/end 监听器挂到 window，而不是轨道节点。
   * 这样即使指针移出滚动条区域也能继续拖拽，并能在任意位置正常结束操作。
   */
  React.useEffect(() => {
    if (!dragging) return

    const horizontal = dragging === 'horizontal'
    let moveRaf: number | null = null
    const onMove = (event: MouseEvent | TouchEvent) => {
      if (event.cancelable) {
        event.preventDefault()
      }

      const { pageOffset, scrollOffset, clientSize, scrollSize } = dragStateRef.current
      const thumbSize = getThumbSize(clientSize, scrollSize)
      const offsetRange = clientSize - thumbSize
      const scrollRange = scrollSize - clientSize

      // 没有可移动轨道或没有内容溢出时，不应更新滚动距离。
      if (!offsetRange || !scrollRange) return

      const pageDelta = getPageOffset(event, horizontal) - pageOffset
      const scrollDelta = (pageDelta / offsetRange) * scrollRange

      // RTL 横向滚动的视觉方向与 LTR 相反，因此需要反转拖拽增量。
      const nextScrollOffset =
        horizontal && isRtl ? scrollOffset - scrollDelta : scrollOffset + scrollDelta
      const clampedScrollOffset = clampScrollOffset(nextScrollOffset, clientSize, scrollSize)

      if (moveRaf !== null) {
        raf.cancel(moveRaf)
      }
      moveRaf = raf(() => {
        const viewport = internalViewportRef.current
        if (!viewport) return

        if (horizontal) {
          viewport.scrollLeft = clampedScrollOffset
        } else {
          viewport.scrollTop = clampedScrollOffset
        }

        updateMetrics()
      })
    }
    const onEnd = () => {
      setDragging(null)
      if (hasScrollbarTrigger('scrolling')) {
        showScrollingState()
      } else {
        setScrolling(false)
      }
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('mouseup', onEnd)
    window.addEventListener('touchend', onEnd)

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('mouseup', onEnd)
      window.removeEventListener('touchend', onEnd)
      if (moveRaf !== null) {
        raf.cancel(moveRaf)
      }
    }
  }, [dragging, hasScrollbarTrigger, isRtl, showScrollingState, updateMetrics])

  /**
   * 同时观察 viewport 和 content：
   * - viewport 变化代表容器可视尺寸变化；
   * - content 变化代表内容总尺寸变化。
   * 不支持 ResizeObserver 的环境退化为 window.resize，并保留首次 RAF 测量。
   */
  React.useEffect(() => {
    const initialRaf = raf(updateMetrics)

    const viewport = internalViewportRef.current
    const content = contentRef.current
    if (typeof ResizeObserver === 'undefined' || (!viewport && !content)) {
      window.addEventListener('resize', updateMetrics)
      return () => {
        raf.cancel(initialRaf)
        window.removeEventListener('resize', updateMetrics)
      }
    }

    const observer = new ResizeObserver(updateMetrics)
    if (viewport) observer.observe(viewport)
    if (content) observer.observe(content)

    return () => {
      raf.cancel(initialRaf)
      observer.disconnect()
    }
  }, [updateMetrics])

  /**
   * 横向模式默认支持把纵向滚轮映射为 scrollLeft。
   * 仅当内容确实横向溢出、没有纵向溢出、内部纵向容器也无法继续消费滚轮时才接管事件，
   * 从而保留嵌套列表、弹层内容等真实纵向滚动区域的原生行为。
   */
  React.useEffect(() => {
    const viewport = internalViewportRef.current
    if (!viewport) return undefined

    const onNativeWheel = (event: WheelEvent) => {
      const {
        onWheel: latestOnWheel,
        viewportOnWheel,
        direction: latestDirection,
        wheelBehavior: latestWheelBehavior,
        isRtl: latestIsRtl,
      } = wheelStateRef.current

      latestOnWheel?.(event as unknown as React.WheelEvent<HTMLDivElement>)
      viewportOnWheel?.(event as unknown as React.WheelEvent<HTMLDivElement>)
      if (
        event.defaultPrevented ||
        latestDirection !== 'horizontal' ||
        latestWheelBehavior !== 'axis-mapping'
      ) {
        return
      }

      // 嵌套 ScrollArea 自己负责其 viewport，外层不得重复映射同一次 wheel。
      if (hasNestedScrollAreaViewport(event.target, viewport, `${prefixCls}-viewport`)) return

      const hasHorizontalOverflow = viewport.scrollWidth > viewport.clientWidth
      const hasVerticalOverflow = viewport.scrollHeight > viewport.clientHeight
      const shouldMapVerticalWheel =
        hasHorizontalOverflow &&
        !hasVerticalOverflow &&
        !hasScrollableVerticalAncestor(event.target, viewport, event.deltaY) &&
        Math.abs(event.deltaY) > Math.abs(event.deltaX)

      if (!shouldMapVerticalWheel) return

      // RTL 下正向 deltaY 应映射为相反的 scrollLeft 增量。
      viewport.scrollLeft += latestIsRtl ? -event.deltaY : event.deltaY
      event.preventDefault()
      queueUpdateMetrics()
      showScrollingState()
    }

    viewport.addEventListener('wheel', onNativeWheel, { passive: false })
    return () => viewport.removeEventListener('wheel', onNativeWheel)
  }, [prefixCls, queueUpdateMetrics, showScrollingState])

  // 组件卸载时统一清理仍在等待的计时器和动画帧，防止卸载后继续 setState。
  React.useEffect(
    () => () => {
      if (scrollEndTimerRef.current) {
        clearTimeout(scrollEndTimerRef.current)
      }
      if (rafRef.current !== null) {
        raf.cancel(rafRef.current)
      }
    },
    [],
  )

  /**
   * 只有指定方向确实发生内容溢出时才渲染对应轨道。
   * nativeScrollbar=true 时浏览器负责展示滚动条，自定义 track 不参与渲染。
   */
  const horizontalScrollable =
    canScrollHorizontal(mergedDirection) && metrics.scrollWidth > metrics.clientWidth
  const verticalScrollable =
    canScrollVertical(mergedDirection) && metrics.scrollHeight > metrics.clientHeight
  const shouldRenderHorizontalTrack =
    !nativeScrollbar && scrollbar !== false && horizontalScrollable
  const shouldRenderVerticalTrack = !nativeScrollbar && scrollbar !== false && verticalScrollable
  const scrollbarClassNames =
    scrollbar === false
      ? `${prefixCls}-scrollbar-none`
      : scrollbar.map((trigger) => `${prefixCls}-scrollbar-${trigger}`)

  return (
    <div
      {...restProps}
      ref={composeRef(ref, rootRef)}
      className={clsx(
        prefixCls,
        `${prefixCls}-${mergedDirection}`,
        scrollbarClassNames,
        hashId,
        cssVarCls,
        {
          [`${prefixCls}-native`]: nativeScrollbar,
          [`${prefixCls}-scrolling`]: scrolling,
          [`${prefixCls}-dragging`]: dragging,
        },
        className,
        rootClassName,
        mergedClassNames.root,
      )}
      style={{
        ...mergedStyles.root,
        ...style,
      }}
    >
      <div
        {...viewportProps}
        ref={composeRef(internalViewportRef, viewportRef || null, viewportProps?.ref || null)}
        className={clsx(
          `${prefixCls}-viewport`,
          mergedClassNames.viewport,
          viewportProps?.className,
        )}
        style={{
          ...mergedStyles.viewport,
          ...viewportProps?.style,
        }}
        onScroll={onViewportScroll}
        onWheel={undefined}
      >
        <div
          ref={contentRef}
          className={clsx(`${prefixCls}-content`, mergedClassNames.content)}
          style={mergedStyles.content}
        >
          {children}
        </div>
      </div>
      {shouldRenderHorizontalTrack ? (
        <div
          className={clsx(
            `${prefixCls}-track`,
            `${prefixCls}-track-horizontal`,
            mergedClassNames.horizontalTrack,
          )}
          style={mergedStyles.horizontalTrack}
        >
          <div
            aria-hidden="true"
            className={clsx(`${prefixCls}-thumb`, mergedClassNames.horizontalThumb)}
            style={{
              width: getThumbSize(metrics.clientWidth, metrics.scrollWidth),
              transform: `translate3d(${getThumbOffset(
                metrics.scrollLeft,
                metrics.clientWidth,
                metrics.scrollWidth,
              )}px, 0, 0)`,
              ...mergedStyles.horizontalThumb,
            }}
            onMouseDown={(event) => startDrag('horizontal', event)}
            onTouchStart={(event) => startDrag('horizontal', event)}
          />
        </div>
      ) : null}
      {shouldRenderVerticalTrack ? (
        <div
          className={clsx(
            `${prefixCls}-track`,
            `${prefixCls}-track-vertical`,
            mergedClassNames.verticalTrack,
          )}
          style={mergedStyles.verticalTrack}
        >
          <div
            aria-hidden="true"
            className={clsx(`${prefixCls}-thumb`, mergedClassNames.verticalThumb)}
            style={{
              height: getThumbSize(metrics.clientHeight, metrics.scrollHeight),
              transform: `translate3d(0, ${getThumbOffset(
                metrics.scrollTop,
                metrics.clientHeight,
                metrics.scrollHeight,
              )}px, 0)`,
              ...mergedStyles.verticalThumb,
            }}
            onMouseDown={(event) => startDrag('vertical', event)}
            onTouchStart={(event) => startDrag('vertical', event)}
          />
        </div>
      ) : null}
    </div>
  )
})

function getPageOffset(
  event: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent,
  x: boolean,
) {
  /**
   * startDrag 接收 React 合成事件，window move 监听器接收原生事件。
   * 这里统一解包 nativeEvent，并优先读取触摸点，使鼠标和触摸拖拽共用同一套计算。
   */
  const nativeEvent = 'nativeEvent' in event ? event.nativeEvent : event
  const touchEvent = nativeEvent as TouchEvent
  const touch = touchEvent.touches?.[0] || touchEvent.changedTouches?.[0]

  if (touch) {
    return x ? touch.pageX : touch.pageY
  }

  const mouseEvent = nativeEvent as MouseEvent
  return x ? mouseEvent.pageX || mouseEvent.clientX : mouseEvent.pageY || mouseEvent.clientY
}

function hasScrollableVerticalAncestor(
  target: EventTarget | null,
  boundary: HTMLElement,
  deltaY: number,
) {
  if (!(target instanceof HTMLElement)) return false

  /**
   * 从事件目标向 viewport 边界逐层查找真正可滚动的纵向祖先。
   * 不仅要求 overflowY 允许滚动，还要求该祖先在当前 deltaY 方向上尚未到达边界。
   * 只有祖先无法继续滚动时，外层横向 ScrollArea 才能接管滚轮。
   */
  let node: HTMLElement | null = target

  while (node && node !== boundary) {
    const { overflowY } = getComputedStyle(node)
    const canScrollY =
      (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
      node.scrollHeight > node.clientHeight

    if (canScrollY) {
      const maxScrollTop = node.scrollHeight - node.clientHeight
      if ((deltaY < 0 && node.scrollTop > 0) || (deltaY > 0 && node.scrollTop < maxScrollTop)) {
        return true
      }
    }

    node = node.parentElement
  }

  return false
}

function hasNestedScrollAreaViewport(
  target: EventTarget | null,
  boundary: HTMLElement,
  viewportCls: string,
) {
  if (!(target instanceof HTMLElement)) return false

  /**
   * 使用 viewport class 而不是 root class 判断嵌套关系。
   * wheel 可能从嵌套组件的任意后代发出，只要在到达外层 boundary 前遇到另一个 viewport，
   * 就说明该事件属于内层 ScrollArea，外层必须保持不处理。
   */
  let node: HTMLElement | null = target

  while (node && node !== boundary) {
    if (node.classList.contains(viewportCls)) {
      return true
    }

    node = node.parentElement
  }

  return false
}

ScrollArea.displayName = 'ScrollArea'

export default ScrollArea

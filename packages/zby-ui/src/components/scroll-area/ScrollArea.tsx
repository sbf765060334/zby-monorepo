import * as React from 'react'
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area'
import { ConfigProvider } from 'antd'
import { clsx } from 'clsx'

import useStyle from './style'
import { composeRef } from './utils'

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
 * 组件使用三层语义 DOM：最外层 root 负责布局和状态 class，viewport 承担浏览器原生滚动，
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
   * 只有指定方向实际发生内容溢出时，对应轨道中才会出现可操作的 thumb。
   *
   * @default 'vertical'
   */
  direction?: ScrollAreaDirection

  /**
   * 自定义滚动条的展示策略。
   *
   * - true：等价于 'always'，轨道始终可见；
   * - false：不展示自定义轨道，但 viewport 仍可通过滚轮、触摸或代码正常滚动；
   * - 'hover'：鼠标或指针进入 root 时显示；
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
   * 为 false 时隐藏 viewport 的原生滚动条，并根据 scrollbar 配置展示自定义轨道；
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
   * onScroll 和 onWheel 会在保留 ScrollArea 内部滚动逻辑的同时被调用。
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
   * viewport 样式先于 viewportProps.style 合并；track/thumb 样式最后交给底层 primitive，
   * 可用于定制轨道位置、尺寸和颜色。
   */
  styles?: ScrollAreaStylesType

  /**
   * 需要滚动的内容。
   *
   * 内容会被放入 viewport 下的 content 语义节点。底层 primitive 负责监听尺寸变化、
   * 计算是否溢出以及以 DOM transform 同步滑块位置。
   */
  children?: React.ReactNode
}

type NormalizedScrollbar = false | ScrollAreaScrollbarTrigger[]

const SCROLLBAR_VISIBLE_DURATION = 1200

function normalizeScrollbar(scrollbar: ScrollAreaScrollbar | undefined): NormalizedScrollbar {
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
    dir: customizeDirectionMode,
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
  const {
    ref: viewportPropsRef,
    className: viewportPropsClassName,
    style: viewportPropsStyle,
    onWheel: viewportPropsOnWheel,
    ...restViewportProps
  } = viewportProps ?? {}

  const prefixCls = getPrefixCls('scroll-area', customizePrefixCls)
  const [hashId, componentCSSVariables] = useStyle(prefixCls)
  const mergedDirection = customizeDirection ?? 'vertical'
  const scrollbar = React.useMemo(
    () => normalizeScrollbar(customizeScrollbar),
    [customizeScrollbar],
  )
  const wheelBehavior = customizeWheelBehavior ?? 'axis-mapping'
  const nativeScrollbar = customizeNativeScrollbar ?? false
  const directionMode =
    customizeDirectionMode === 'rtl' || customizeDirectionMode === 'ltr'
      ? customizeDirectionMode
      : (contextDirection ?? 'ltr')
  const rootRef = React.useRef<HTMLDivElement>(null)
  const internalViewportRef = React.useRef<HTMLDivElement>(null)
  const scrollEndTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  /**
   * wheel 监听器必须使用 passive: false 才能在横向映射时阻止浏览器默认纵向滚动。
   * 最新回调和配置保存在 ref 中，避免 props 更新时反复解绑原生监听器。
   */
  const wheelStateRef = React.useRef({
    onWheel,
    viewportOnWheel: viewportPropsOnWheel,
    direction: mergedDirection,
    wheelBehavior,
    isRtl: directionMode === 'rtl',
  })
  wheelStateRef.current = {
    onWheel,
    viewportOnWheel: viewportPropsOnWheel,
    direction: mergedDirection,
    wheelBehavior,
    isRtl: directionMode === 'rtl',
  }

  const mergedProps: ScrollAreaProps = {
    ...props,
    dir: directionMode,
    direction: mergedDirection,
    scrollbar,
    wheelBehavior,
    nativeScrollbar,
  }
  const mergedClassNames = resolveSemanticValue(classNames, mergedProps)
  const mergedStyles = resolveSemanticValue(styles, mergedProps)

  React.useEffect(() => {
    const viewport = internalViewportRef.current
    const root = rootRef.current
    if (!viewport) return undefined

    const showScrollingState = () => {
      if (scrollbar === false || !scrollbar.includes('scrolling')) return

      root?.classList.add(`${prefixCls}-scrolling`)
      if (scrollEndTimerRef.current) {
        clearTimeout(scrollEndTimerRef.current)
      }
      scrollEndTimerRef.current = setTimeout(() => {
        root?.classList.remove(`${prefixCls}-scrolling`)
        scrollEndTimerRef.current = null
      }, SCROLLBAR_VISIBLE_DURATION)
    }
    const onNativeWheel = (event: WheelEvent) => {
      const {
        onWheel: latestOnWheel,
        viewportOnWheel,
        direction: latestDirection,
        wheelBehavior: latestWheelBehavior,
        isRtl,
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
      if (hasNestedScrollAreaViewport(event.target, viewport)) return

      const hasHorizontalOverflow = viewport.scrollWidth > viewport.clientWidth
      const hasVerticalOverflow = viewport.scrollHeight > viewport.clientHeight
      const shouldMapVerticalWheel =
        hasHorizontalOverflow &&
        !hasVerticalOverflow &&
        !hasScrollableVerticalAncestor(event.target, viewport, event.deltaY) &&
        Math.abs(event.deltaY) > Math.abs(event.deltaX)

      if (!shouldMapVerticalWheel) return

      /**
       * 大多数触摸板和 Chromium 鼠标滚轮使用像素增量，但 Firefox 等环境也可能按行或按页上报。
       * 先统一为像素距离，避免同一次滚轮操作在不同浏览器中的横向移动速度差异过大。
       */
      const mappedDelta = normalizeWheelDelta(event, viewport.clientWidth)
      const previousScrollLeft = viewport.scrollLeft
      viewport.scrollLeft += isRtl ? -mappedDelta : mappedDelta

      /**
       * 只有 viewport 确实移动时才拦截默认行为。到达横向边界后继续滚动应交还给页面或外层容器，
       * 否则鼠标停在 ScrollArea 上时会形成滚动陷阱，用户无法继续纵向浏览页面。
       */
      if (viewport.scrollLeft !== previousScrollLeft) {
        event.preventDefault()
      }
    }

    viewport.addEventListener('scroll', showScrollingState, { passive: true })
    viewport.addEventListener('wheel', onNativeWheel, { passive: false })
    return () => {
      viewport.removeEventListener('scroll', showScrollingState)
      viewport.removeEventListener('wheel', onNativeWheel)
      root?.classList.remove(`${prefixCls}-scrolling`)
      if (scrollEndTimerRef.current) {
        clearTimeout(scrollEndTimerRef.current)
        scrollEndTimerRef.current = null
      }
    }
  }, [nativeScrollbar, prefixCls, scrollbar])

  const setDraggingState = (dragging: boolean) => {
    rootRef.current?.classList.toggle(`${prefixCls}-dragging`, dragging)
  }

  const scrollbarClassNames =
    scrollbar === false
      ? `${prefixCls}-scrollbar-none`
      : scrollbar.map((trigger) => `${prefixCls}-scrollbar-${trigger}`)

  const contentNode = (
    <div
      className={clsx(`${prefixCls}-content`, mergedClassNames.content)}
      style={mergedStyles.content}
    >
      {children}
    </div>
  )
  const composedViewportRef = composeRef(
    internalViewportRef,
    viewportRef ?? null,
    viewportPropsRef ?? null,
  )
  const viewportClassName = clsx(
    `${prefixCls}-viewport`,
    mergedClassNames.viewport,
    viewportPropsClassName,
  )
  const viewportStyle = {
    ...mergedStyles.viewport,
    ...viewportPropsStyle,
  }

  return (
    <ScrollAreaPrimitive.Root
      {...restProps}
      ref={composeRef(ref, rootRef)}
      type="always"
      dir={directionMode}
      scrollHideDelay={SCROLLBAR_VISIBLE_DURATION}
      className={clsx(
        prefixCls,
        `${prefixCls}-${mergedDirection}`,
        scrollbarClassNames,
        hashId,
        { [`${prefixCls}-native`]: nativeScrollbar },
        className,
        rootClassName,
        mergedClassNames.root,
      )}
      style={{
        ...componentCSSVariables,
        ...mergedStyles.root,
        ...style,
      }}
    >
      {nativeScrollbar ? (
        <div
          {...restViewportProps}
          ref={composedViewportRef}
          data-zby-scroll-area-viewport=""
          className={viewportClassName}
          style={viewportStyle}
          onWheel={undefined}
        >
          {contentNode}
        </div>
      ) : (
        <ScrollAreaPrimitive.Viewport
          {...restViewportProps}
          ref={composedViewportRef}
          data-zby-scroll-area-viewport=""
          className={viewportClassName}
          style={viewportStyle}
          onWheel={undefined}
        >
          {contentNode}
        </ScrollAreaPrimitive.Viewport>
      )}

      {!nativeScrollbar && canScrollHorizontal(mergedDirection) ? (
        <ScrollAreaPrimitive.Scrollbar
          forceMount
          orientation="horizontal"
          className={clsx(
            `${prefixCls}-track`,
            `${prefixCls}-track-horizontal`,
            mergedClassNames.horizontalTrack,
          )}
          style={mergedStyles.horizontalTrack}
          onPointerDownCapture={() => setDraggingState(true)}
          onPointerUpCapture={() => setDraggingState(false)}
          onPointerCancel={() => setDraggingState(false)}
          onLostPointerCapture={() => setDraggingState(false)}
        >
          <ScrollAreaPrimitive.Thumb
            aria-hidden="true"
            className={clsx(`${prefixCls}-thumb`, mergedClassNames.horizontalThumb)}
            style={mergedStyles.horizontalThumb}
          />
        </ScrollAreaPrimitive.Scrollbar>
      ) : null}

      {!nativeScrollbar && canScrollVertical(mergedDirection) ? (
        <ScrollAreaPrimitive.Scrollbar
          forceMount
          orientation="vertical"
          className={clsx(
            `${prefixCls}-track`,
            `${prefixCls}-track-vertical`,
            mergedClassNames.verticalTrack,
          )}
          style={mergedStyles.verticalTrack}
          onPointerDownCapture={() => setDraggingState(true)}
          onPointerUpCapture={() => setDraggingState(false)}
          onPointerCancel={() => setDraggingState(false)}
          onLostPointerCapture={() => setDraggingState(false)}
        >
          <ScrollAreaPrimitive.Thumb
            aria-hidden="true"
            className={clsx(`${prefixCls}-thumb`, mergedClassNames.verticalThumb)}
            style={mergedStyles.verticalThumb}
          />
        </ScrollAreaPrimitive.Scrollbar>
      ) : null}

      {!nativeScrollbar && mergedDirection === 'both' ? (
        <ScrollAreaPrimitive.Corner className={`${prefixCls}-corner`} />
      ) : null}
    </ScrollAreaPrimitive.Root>
  )
})

function hasScrollableVerticalAncestor(
  target: EventTarget | null,
  boundary: HTMLElement,
  deltaY: number,
) {
  if (!(target instanceof HTMLElement)) return false

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

/**
 * 将 WheelEvent 的行、页增量换算成像素。16px 对应浏览器常见的默认行高；
 * 页模式使用当前 viewport 宽度，因为换算后的距离最终用于横向滚动。
 */
function normalizeWheelDelta(event: WheelEvent, pageSize: number) {
  if (event.deltaMode === 1) return event.deltaY * 16
  if (event.deltaMode === 2) return event.deltaY * pageSize
  return event.deltaY
}

function hasNestedScrollAreaViewport(target: EventTarget | null, boundary: HTMLElement) {
  if (!(target instanceof HTMLElement)) return false

  let node: HTMLElement | null = target

  while (node && node !== boundary) {
    if (node.hasAttribute('data-zby-scroll-area-viewport')) {
      return true
    }
    node = node.parentElement
  }

  return false
}

ScrollArea.displayName = 'ScrollArea'

export type { ScrollAreaComponentToken } from './style'
export default ScrollArea

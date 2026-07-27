import { ToolOutlined } from '@ant-design/icons'
import { preloadRoute } from '@zby/router-core'
import { useRouterCore } from '@zby/router-core/react'
import { useRouterCoreCreateHref } from '@zby/router-core/react-router'
import { useIntl } from '@zby/intl'
import { Drawer, message, Tag, theme as antdTheme, Tooltip } from 'antd'
import { clsx } from 'clsx'
import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react'

import {
  isFavoriteMenuRoute,
  useFavoriteMenusSelector,
  useToggleFavoriteMenu,
} from '../favorites/FavoriteMenusProvider'
import type { CSSProperties } from 'react'
import type { ProLayoutRoute } from '../types'
import MenuFavoriteButton from '../components/MenuFavoriteButton'
import { createMenuDrawerLayout } from './menuLayout'
import type { NativeScrollbarSize } from './menuLayout'

export interface MenuDrawerProps {
  prefixCls: string
  hashId: string
  left: number
  open: boolean
  onClose: () => void
  className?: string
  style?: CSSProperties
  displayRoutes: ProLayoutRoute[]
  selectedPath: readonly string[]
}

/**
 * 多列菜单 Drawer。
 *
 * 每个顶层业务组保持完整；先测量菜单组的自然高度，再以最高菜单组确定统一列高。
 * 超过视口高度时由整个 Drawer 纵向滚动，菜单组按真实高度依次装列。
 */
function MenuDrawer(props: MenuDrawerProps) {
  const {
    className,
    displayRoutes,
    hashId,
    left,
    onClose,
    open,
    prefixCls,
    selectedPath,
    style,
  } = props
  const router = useRouterCore<ProLayoutRoute>()
  const createHref = useRouterCoreCreateHref()
  const intl = useIntl()
  const { token } = antdTheme.useToken()
  const [messageApi, messageContextHolder] = message.useMessage()
  const favoritePaths = useFavoriteMenusSelector((state) => state.favoritePaths)
  const toggleFavorite = useToggleFavoriteMenu()
  const favoritePathSet = useMemo(() => new Set(favoritePaths), [favoritePaths])

  // 布局尺寸统一拆成“Drawer 外框”和“Drawer body 内容区”两种口径。
  // availableWidth 包含右侧边框；drawerBodyHeight 已扣除 body 上下 padding，供分列算法直接使用。
  const viewport = useViewportSize(open)
  const columnWidth = token.controlHeightLG * 5 + token.sizeXL
  const viewportGap = token.paddingLG
  const frameInlineSize = token.lineWidth
  const availableWidth = Math.max(
    columnWidth + frameInlineSize,
    viewport.width - left - viewportGap,
  )
  const drawerBodyHeight = Math.max(0, viewport.height - viewportGap * 2)
  const menuRowHeight = token.controlHeight + token.paddingXXS * 2
  const menuTitleHeight = Math.ceil(token.fontSizeSM * token.lineHeight) +
    token.paddingXS * 2 + token.marginSM + token.lineWidth
  const menuSections = useMemo(
    () => createMenuSections(displayRoutes),
    [displayRoutes],
  )

  // 隐藏测量层在首次提交 DOM 前还没有真实高度，因此先按设计 token 估算首帧布局。
  // 真实 DOM 高度就绪后会替换这些估算值；估算只负责避免首次打开时出现零高或一列闪烁。
  const fallbackSectionHeights = useMemo(
    () => menuSections.map((section) => {
      if (section.directEntry)
        return menuRowHeight

      return estimateMenuRouteHeight(
        section.route,
        { menuRowHeight, menuTitleHeight },
      ) + token.paddingSM * 2
    }),
    [menuRowHeight, menuSections, menuTitleHeight, token.paddingSM],
  )

  // key 将测量结果绑定到当前菜单集合。切换一级菜单时，即使旧测量状态仍在，
  // 也不会把上一套菜单的高度误用于新菜单。
  const measurementKey = menuSections.map((section) => section.key).join('\u0000')
  const measureRef = useRef<HTMLDivElement | null>(null)
  const [measurements, setMeasurements] = useState<MenuSectionMeasurements | null>(null)
  const scrollbarSize = useNativeScrollbarSize()

  // 同一菜单优先使用真实测量值；某个节点尚未完成布局或返回 0 时，仅回退该节点的估算值。
  const sectionHeights = useMemo(() => {
    if (measurements?.key !== measurementKey)
      return fallbackSectionHeights

    return measurements.heights.map((height, index) =>
      height > 0 ? height : (fallbackSectionHeights[index] ?? 0))
  }, [fallbackSectionHeights, measurementKey, measurements])

  // 纯函数负责高度装列、Drawer 宽度以及 X/Y 滚动状态，组件只消费最终布局结果。
  const menuLayout = useMemo(
    () => createMenuDrawerLayout({
      itemHeights: sectionHeights,
      drawerBodyHeight,
      availableWidth,
      columnWidth,
      frameInlineSize,
      scrollbarSize,
    }),
    [availableWidth, columnWidth, drawerBodyHeight, frameInlineSize, scrollbarSize, sectionHeights],
  )

  // CSS 分栏仍保留扁平的 section DOM；这里只标记算法决定的新列起点，
  // 避免响应式重排时因为把 section 移入不同列容器而卸载、重建菜单节点。
  const columnStartIndexSet = useMemo(
    () => new Set(menuLayout.columnStartIndexes),
    [menuLayout.columnStartIndexes],
  )
  const drawerClassName = clsx(`${prefixCls}-menu-drawer`, hashId, className)

  useLayoutEffect(() => {
    // Drawer 关闭时不渲染测量层，也不需要保留观察器。
    if (!open)
      return undefined

    const element = measureRef.current
    if (!element)
      return undefined

    let frame = 0
    const measureSections = () => {
      frame = 0

      // getBoundingClientRect 保留小数像素，能反映字体、Tag、缩进和多级标题产生的真实高度。
      // offsetHeight 会取整，不适合作为精确分列的输入。
      const heights = Array.from(element.children).map((child, index) => {
        if (!(child instanceof HTMLElement))
          return fallbackSectionHeights[index] ?? 0

        return child.getBoundingClientRect().height || fallbackSectionHeights[index] || 0
      })
      setMeasurements((previous) =>
        previous?.key === measurementKey && areNumberArraysEqual(previous.heights, heights)
          ? previous
          : { key: measurementKey, heights })
    }

    // ResizeObserver 可能在一次排版中连续触发，用一帧只安排一次测量，避免重复读布局。
    const scheduleMeasurement = () => {
      if (frame)
        return

      frame = window.requestAnimationFrame(measureSections)
    }

    // 先同步测量以尽量在首次绘制前得到结果，再补一次下一帧测量，覆盖字体和 Portal 样式落地后的尺寸。
    measureSections()
    scheduleMeasurement()

    // 菜单标题、Tag 或字体加载都可能改变高度；观察每个顶层 section 后自动重新布局。
    const observer = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(scheduleMeasurement)
    Array.from(element.children).forEach((child) => observer?.observe(child))
    return () => {
      observer?.disconnect()
      window.cancelAnimationFrame(frame)
    }
  }, [columnWidth, fallbackSectionHeights, measurementKey, open])

  const handleSelect = (route: ProLayoutRoute) => {
    if (route.prompt) {
      void messageApi.info(
        typeof route.prompt === 'string'
          ? route.prompt
          : intl.getMessage('zby.pro.layout.menu.unavailable', '功能暂未开放'),
      )
      onClose()
      return
    }

    // 外链由原生 a 标签完成打开；这里仅同步关闭 Drawer。
    if (route._blank) {
      onClose()
      return
    }

    if (!selectedPath.includes(route.path))
      router.jumpTo(route.path)

    onClose()
  }

  // 测量层和可见层复用完全相同的 section 结构；差别只在于测量层禁用 CSS 换列。
  const renderSection = (section: MenuSection, index: number, measuring = false) => (
    <section
      key={section.key}
      className={section.directEntry ? `${prefixCls}-menu-entry` : `${prefixCls}-menu-group`}
      style={!measuring && index > 0 && columnStartIndexSet.has(index)
        ? { breakBefore: 'column' }
        : undefined}
    >
      <div className={`${prefixCls}-menu-group-inner`}>
        <MenuRouteTree
          prefixCls={prefixCls}
          route={section.route}
          level={1}
          selectedPath={selectedPath}
          createHref={createHref}
          favoritePaths={favoritePathSet}
          isFavoriteRoute={(item) => isFavoriteMenuRoute(router, item)}
          onToggleFavorite={toggleFavorite}
          onPreload={(item) => preloadVisibleRoute(router, item)}
          onSelect={handleSelect}
        />
      </div>
    </section>
  )

  // 容器宽度表示所有真实列的总宽度，而 Drawer 自身只显示视口能容纳的部分；
  // 当两者不同时，原生 overflow-x 提供横向访问能力。
  const renderColumns = () => (
    <div
      className={`${prefixCls}-menu-columns`}
      style={{
        width: menuLayout.columnCount * columnWidth,
        height: menuLayout.columnHeight,
      }}
    >
      {menuSections.map((section, index) => renderSection(section, index))}
    </div>
  )

  return (
    <>
      {messageContextHolder}
      {open ? (
        // 该层只用于获得每个 section 在单列自然流中的高度，不参与显示、交互或可访问性树。
        <div
          aria-hidden
          className={drawerClassName}
          style={{
            position: 'fixed',
            insetBlockStart: 0,
            insetInlineStart: -columnWidth,
            width: columnWidth,
            height: 0,
            overflow: 'hidden',
            visibility: 'hidden',
            pointerEvents: 'none',
            fontFamily: token.fontFamily,
            fontSize: token.fontSize,
            lineHeight: token.lineHeight,
          }}
        >
          <div
            ref={measureRef}
            className={`${prefixCls}-menu-columns ${prefixCls}-menu-measure`}
            style={{
              // 强制单列、自然高度，确保每个 section 的矩形就是未分列前的完整高度。
              display: 'block',
              width: columnWidth,
              height: 'auto',
              columnWidth: 'auto',
              columnCount: 1,
            }}
          >
            {menuSections.map((section, index) => renderSection(section, index, true))}
          </div>
        </div>
      ) : null}
      <Drawer
        placement="left"
        open={open}
        focusable={{ trap: false }}
        size={menuLayout.drawerWidth}
        zIndex={999}
        rootClassName={drawerClassName}
        rootStyle={{
          left,
          overflow: 'hidden',
          // Drawer 通过 Portal 挂到 document.body，必须显式复制测量层的排版上下文，
          // 否则应用容器与 body 的字体或行高不同会导致“测得高度”和“显示高度”不一致。
          fontFamily: token.fontFamily,
          fontSize: token.fontSize,
          lineHeight: token.lineHeight,
        }}
        styles={{
          header: { display: 'none' },
          body: {
            height: viewport.height || '100vh',
            boxSizing: 'border-box',
            // 滚动统一归属 Drawer body：菜单组内部永远不创建独立滚动区域。
            overflowX: menuLayout.shouldScrollX ? 'auto' : 'hidden',
            overflowY: menuLayout.shouldScrollY ? 'auto' : 'hidden',
            paddingBlock: viewportGap,
            paddingInline: 0,
            ...style,
          },
        }}
        onClose={onClose}
      >
        {renderColumns()}
      </Drawer>
    </>
  )
}

interface MenuRouteTreeProps {
  prefixCls: string
  route: ProLayoutRoute
  level: number
  selectedPath: readonly string[]
  createHref: (path: string) => string
  favoritePaths: ReadonlySet<string>
  isFavoriteRoute: (route: ProLayoutRoute) => boolean
  onToggleFavorite: (path: string) => void
  onPreload: (route: ProLayoutRoute) => void
  onSelect: (route: ProLayoutRoute) => void
}

function MenuRouteTree(props: MenuRouteTreeProps) {
  const {
    createHref,
    favoritePaths,
    isFavoriteRoute,
    level,
    onPreload,
    onSelect,
    onToggleFavorite,
    prefixCls,
    route,
    selectedPath,
  } = props
  const { token } = antdTheme.useToken()
  const indent = level <= 1 ? 0 : token.sizeMD * (level - 1)
  const directMenu = level === 1
  const pageRoute = Boolean(route.element)
  const children = route.routes?.filter(isVisibleRoute) || []

  if (pageRoute || route._blank || route.prompt) {
    const favorite = favoritePaths.has(route.path)
    return (
      <div
        className={clsx(`${prefixCls}-menu`, {
          [`${prefixCls}-menu-direct`]: directMenu,
          [`${prefixCls}-menu-active`]: selectedPath.includes(route.path),
        })}
        style={{ paddingInlineStart: indent }}
      >
        <div className={`${prefixCls}-menu-row`}>
          <div className={`${prefixCls}-menu-main`}>
            <MenuRouteControl
              prefixCls={prefixCls}
              route={route}
              createHref={createHref}
              onPreload={onPreload}
              onSelect={() => onSelect(route)}
            />
          </div>
          {isFavoriteRoute(route) ? (
            <MenuFavoriteButton
              prefixCls={prefixCls}
              title={route.title}
              favorite={favorite}
              onToggle={() => onToggleFavorite(route.path)}
            />
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div style={{ paddingInlineStart: indent }}>
      <div className={`${prefixCls}-menu-title`} title={route.title}>
        {route.title}
      </div>
      {children.map((child) => (
        <MenuRouteTree
          key={child.path}
          {...props}
          route={child}
          level={level + 1}
        />
      ))}
    </div>
  )
}

function MenuRouteControl(props: {
  prefixCls: string
  route: ProLayoutRoute
  createHref: (path: string) => string
  onPreload: (route: ProLayoutRoute) => void
  onSelect: () => void
}) {
  const { createHref, onPreload, onSelect, prefixCls, route } = props
  const tag = typeof route.tag === 'string' ? { text: route.tag } : route.tag
  const content = (
    <>
      <span className={`${prefixCls}-menu-button-title`}>{route.title}</span>
      {route.prompt ? <ToolOutlined /> : null}
      {tag ? <Tag className={`${prefixCls}-menu-tag`} color={tag.color}>{tag.text}</Tag> : null}
    </>
  )
  const control = route._blank && !route.prompt
    ? (
        <a
          href={createHref(route.path)}
          target={route.target || '_blank'}
          rel={(route.target || '_blank') === '_blank' ? 'noopener noreferrer' : undefined}
          className={`${prefixCls}-menu-button`}
          title={route.title}
          onClick={onSelect}
          onFocus={() => onPreload(route)}
          onMouseEnter={() => onPreload(route)}
        >
          {content}
        </a>
      )
    : (
        <button
          type="button"
          className={`${prefixCls}-menu-button`}
          title={route.title}
          onClick={onSelect}
          onFocus={() => onPreload(route)}
          onMouseEnter={() => onPreload(route)}
        >
          {content}
        </button>
      )

  return route.tooltipProps
    ? <Tooltip placement="topLeft" {...route.tooltipProps}>{control}</Tooltip>
    : control
}

function useViewportSize(active: boolean) {
  const [size, setSize] = useState(getViewportSize)

  useLayoutEffect(() => {
    // Drawer 关闭期间布局结果不可见，停止监听可避免窗口缩放造成无意义渲染。
    if (!active)
      return undefined

    let frame = 0
    const updateSize = () => {
      const next = getViewportSize()

      // 尺寸未变化时复用旧对象，避免依赖 viewport 的布局 memo 失效。
      setSize((previous) =>
        previous.width === next.width && previous.height === next.height ? previous : next)
    }
    const handleResize = () => {
      // 浏览器拖拽缩放会高频派发 resize；每一动画帧最多读取一次视口。
      if (frame)
        return

      frame = window.requestAnimationFrame(() => {
        frame = 0
        updateSize()
      })
    }

    updateSize()
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      window.cancelAnimationFrame(frame)
    }
  }, [active])

  return size
}

/**
 * 返回页面布局实际可用的视口尺寸。
 *
 * documentElement.clientWidth/clientHeight 不包含页面原生滚动条，比 innerWidth/innerHeight
 * 更接近 Drawer 能使用的 CSS 布局空间；SSR 或测试环境下再逐级回退。
 */
function getViewportSize() {
  if (typeof document !== 'undefined') {
    const width = document.documentElement.clientWidth
    const height = document.documentElement.clientHeight
    if (width > 0 || height > 0)
      return { width, height }
  }

  if (typeof window !== 'undefined')
    return { width: window.innerWidth, height: window.innerHeight }

  return { width: 0, height: 0 }
}

/**
 * 测量当前平台原生滚动条占用的物理空间。
 *
 * Windows 常见滚动条会占据内容宽高，macOS 覆盖式滚动条通常返回 0；不能写死常量。
 * X/Y 滚动条会互相压缩可用空间，因此布局函数需要同时知道宽度和高度。
 */
function useNativeScrollbarSize() {
  const [size, setSize] = useState<NativeScrollbarSize>({ width: 0, height: 0 })

  useLayoutEffect(() => {
    if (typeof document === 'undefined' || !document.body)
      return undefined

    const element = document.createElement('div')
    element.style.position = 'fixed'
    element.style.insetInlineStart = '-9999px'
    element.style.width = '100px'
    element.style.height = '100px'
    element.style.overflow = 'scroll'
    element.style.visibility = 'hidden'
    document.body.appendChild(element)

    // offset 尺寸包含滚动条，client 尺寸不包含；两者之差就是当前浏览器的原生占用。
    const nextSize = {
      width: element.offsetWidth - element.clientWidth,
      height: element.offsetHeight - element.clientHeight,
    }
    element.remove()
    let active = true

    // 微任务既避开 effect 主体内的同步状态更新，又会在浏览器下一次绘制前提交，
    // 防止先按 0px 滚动条绘制一帧后再跳变。
    queueMicrotask(() => {
      if (!active)
        return

      setSize((previous) =>
        previous.width === nextSize.width && previous.height === nextSize.height
          ? previous
          : nextSize)
    })
    return () => {
      active = false
    }
  }, [])

  return size
}

interface MenuLayoutMetrics {
  menuRowHeight: number
  menuTitleHeight: number
}

interface MenuSection {
  key: string
  route: ProLayoutRoute
  directEntry: boolean
}

interface MenuSectionMeasurements {
  key: string
  heights: number[]
}

/**
 * 将一级菜单转换成布局算法使用的不可拆分 section。
 *
 * 可直接点击的路由是单行 entry；只有子菜单的路由是完整 group。没有页面能力且没有
 * 可见后代的空路由不会占据列空间，这与实际可导航菜单的语义保持一致。
 */
function createMenuSections(routes: ProLayoutRoute[]): MenuSection[] {
  return routes.filter(isVisibleRoute).flatMap<MenuSection>((route) => {
    const directEntry = isMenuControlRoute(route)
    if (!directEntry && !route.routes?.some(isVisibleRoute))
      return []

    return [{ key: route.path, route, directEntry }]
  })
}

/**
 * 在真实 DOM 尚不可测量时，根据设计 token 递归估算一个路由树的高度。
 * 该值只用于首帧兜底，最终分列始终以隐藏测量层返回的真实高度为准。
 */
function estimateMenuRouteHeight(route: ProLayoutRoute, metrics: MenuLayoutMetrics): number {
  if (isMenuControlRoute(route))
    return metrics.menuRowHeight

  return metrics.menuTitleHeight +
    (route.routes?.filter(isVisibleRoute) || []).reduce(
      (height, child) => height + estimateMenuRouteHeight(child, metrics),
      0,
    )
}

function isMenuControlRoute(route: ProLayoutRoute) {
  return Boolean(route.element || route._blank || route.prompt)
}

/** 仅忽略浮点计算噪声；容差不能过大，否则多个 section 的误差会在同一列累计。 */
function areNumberArraysEqual(left: readonly number[], right: readonly number[]) {
  return left.length === right.length &&
    left.every((value, index) => Math.abs(value - (right[index] ?? 0)) <= 0.01)
}

function preloadVisibleRoute(
  router: ReturnType<typeof useRouterCore<ProLayoutRoute>>,
  route: ProLayoutRoute,
) {
  if (router.registry.isPageRoute(route))
    preloadRoute(route)
}

/** 只有自身可操作或至少存在一个可见后代的路由，才属于可见菜单树。 */
function isVisibleRoute(route: ProLayoutRoute): boolean {
  return !route.ignore && Boolean(
    route.element || route.prompt || route._blank || route.routes?.some(isVisibleRoute),
  )
}

export default memo(MenuDrawer, (prev, next) =>
  !prev.open && !next.open
    ? true
    : prev.open === next.open &&
      prev.className === next.className &&
      prev.prefixCls === next.prefixCls &&
      prev.hashId === next.hashId &&
      prev.left === next.left &&
      prev.displayRoutes === next.displayRoutes &&
      prev.selectedPath === next.selectedPath &&
      prev.style === next.style)

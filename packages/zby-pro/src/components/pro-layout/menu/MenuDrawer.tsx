import { ToolOutlined } from '@ant-design/icons'
import { preloadRoute } from '@zby/router-core'
import { useRouterCore } from '@zby/router-core/react'
import { useRouterCoreCreateHref } from '@zby/router-core/react-router'
import { useIntl } from '@zby/intl'
import { ScrollArea } from '@zby/ui'
import { Drawer, message, Tag, theme as antdTheme, Tooltip } from 'antd'
import { clsx } from 'clsx'
import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react'

import {
  isFavoriteMenuRoute,
  useFavoriteMenusSelector,
  useToggleFavoriteMenu,
} from '../favorites/FavoriteMenusProvider'
import type { CSSProperties, Ref } from 'react'
import type { ProLayoutRoute } from '../types'
import MenuFavoriteButton from '../components/MenuFavoriteButton'

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
 * 菜单优先按无页面的中间路由形成业务子组，子组放不下时整体换列；只有单个子组本身
 * 超过一列时才按菜单项生成续列。最终仍由 CSS 分栏，并测量真实列数决定 Drawer 宽度。
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
  const viewport = useViewportSize(open)
  const columnWidth = token.controlHeightLG * 5 + token.sizeXL
  const viewportGap = token.paddingLG
  const availableWidth = Math.max(columnWidth, viewport.width - left - viewportGap)
  const drawerBodyHeight = Math.max(0, viewport.height - viewportGap * 2)
  const maxColumns = Math.max(1, Math.floor(availableWidth / columnWidth))
  const menuRowHeight = token.controlHeight + token.paddingXXS * 2
  const menuTitleHeight = Math.ceil(token.fontSizeSM * token.lineHeight) +
    token.paddingXS * 2 + token.marginSM + token.lineWidth
  const maxGroupInnerHeight = Math.max(
    menuTitleHeight + menuRowHeight,
    drawerBodyHeight - token.paddingSM * 2,
  )
  const menuSections = useMemo(
    () => createMenuSections(
      displayRoutes,
      maxGroupInnerHeight,
      { menuRowHeight, menuTitleHeight },
      (title) => intl.getMessage(
        'zby.pro.layout.menu.continued',
        '{{title}} · 续',
        { title },
      ),
    ),
    [displayRoutes, intl, maxGroupInnerHeight, menuRowHeight, menuTitleHeight],
  )
  const fallbackColumnCount = Math.max(
    1,
    Math.min(maxColumns, menuSections.length),
  )
  const measureRef = useRef<HTMLDivElement | null>(null)
  const [measuredColumnCount, setMeasuredColumnCount] = useState<number | null>(null)
  const columnCount = measuredColumnCount ?? fallbackColumnCount
  const drawerWidth = Math.min(Math.max(1, Math.min(maxColumns, columnCount)) * columnWidth, availableWidth)
  const shouldScrollX = measuredColumnCount !== null && measuredColumnCount > maxColumns
  const drawerClassName = clsx(`${prefixCls}-menu-drawer`, hashId, className)

  useLayoutEffect(() => {
    if (!open)
      return undefined

    const element = measureRef.current
    if (!element)
      return undefined

    const measureColumnCount = () => {
      const groups = Array.from(element.children).filter(
        (group): group is HTMLElement => group instanceof HTMLElement,
      )
      const maxColumnIndex = groups.reduce((max, group) => {
        const columnIndex = Math.max(0, Math.round(group.offsetLeft / columnWidth))
        return Math.max(max, columnIndex)
      }, 0)
      const nextCount = groups.length > 0 ? maxColumnIndex + 1 : 1
      setMeasuredColumnCount((previous) => previous === nextCount ? previous : nextCount)
    }

    measureColumnCount()
    const frame = window.requestAnimationFrame(measureColumnCount)
    return () => window.cancelAnimationFrame(frame)
  }, [availableWidth, columnWidth, drawerBodyHeight, menuSections, open])

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

  const renderColumns = (ref?: Ref<HTMLDivElement>, columnStyle?: CSSProperties) => (
    <div ref={ref} className={`${prefixCls}-menu-columns`} style={columnStyle}>
      {menuSections.map(({ directEntry, key, route }) => {
        return (
          <section
            key={key}
            className={directEntry ? `${prefixCls}-menu-entry` : `${prefixCls}-menu-group`}
          >
            <div className={`${prefixCls}-menu-group-inner`}>
              <MenuRouteTree
                prefixCls={prefixCls}
                route={route}
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
      })}
    </div>
  )

  return (
    <>
      {messageContextHolder}
      {open ? (
        <div
          aria-hidden
          className={drawerClassName}
          style={{
            position: 'fixed',
            insetBlockStart: 0,
            insetInlineStart: -availableWidth,
            width: availableWidth,
            height: drawerBodyHeight,
            overflow: 'hidden',
            visibility: 'hidden',
            pointerEvents: 'none',
          }}
        >
          {renderColumns(measureRef, { width: availableWidth, height: '100%' })}
        </div>
      ) : null}
      <Drawer
        placement="left"
        open={open}
        focusable={{ trap: false }}
        size={drawerWidth}
        zIndex={999}
        rootClassName={drawerClassName}
        rootStyle={{ left, overflow: 'hidden' }}
        styles={{
          header: { display: 'none' },
          body: {
            height: viewport.height || '100vh',
            boxSizing: 'border-box',
            overflowX: 'hidden',
            overflowY: 'hidden',
            paddingBlock: viewportGap,
            paddingInline: 0,
            ...style,
          },
        }}
        onClose={onClose}
      >
        <ScrollArea
          className={`${prefixCls}-menu-scroll`}
          direction="horizontal"
          scrollbar={shouldScrollX ? 'hover' : false}
          wheelBehavior="axis-mapping"
          style={{ height: '100%' }}
        >
          {renderColumns(undefined, { height: drawerBodyHeight })}
        </ScrollArea>
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
    if (!active)
      return undefined

    let frame = 0
    const updateSize = () => {
      const next = getViewportSize()
      setSize((previous) =>
        previous.width === next.width && previous.height === next.height ? previous : next)
    }
    const handleResize = () => {
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

interface MenuLayoutMetrics {
  menuRowHeight: number
  menuTitleHeight: number
}

interface MenuSection {
  key: string
  route: ProLayoutRoute
  directEntry: boolean
}

function createMenuSections(
  routes: ProLayoutRoute[],
  maxGroupInnerHeight: number,
  metrics: MenuLayoutMetrics,
  getContinuedTitle: (title: string) => string,
): MenuSection[] {
  return routes.filter(isVisibleRoute).flatMap<MenuSection>((route) => {
    if (isMenuControlRoute(route)) {
      return [{ key: route.path, route, directEntry: true }]
    }

    return splitMenuGroupRoute(
      route,
      maxGroupInnerHeight,
      metrics,
      getContinuedTitle,
    ).map((fragment, index) => ({
      key: `${route.path}:${index}`,
      route: fragment,
      directEntry: false,
    }))
  })
}

function splitMenuGroupRoute(
  route: ProLayoutRoute,
  maxHeight: number,
  metrics: MenuLayoutMetrics,
  getContinuedTitle: (title: string) => string,
): ProLayoutRoute[] {
  const children = route.routes?.filter(isVisibleRoute) || []
  if (!children.length)
    return []

  const contentCapacity = Math.max(
    metrics.menuRowHeight,
    maxHeight - metrics.menuTitleHeight,
  )
  let pages: ProLayoutRoute[][]

  if (children.every(isMenuControlRoute)) {
    const maxItemsPerPage = Math.max(
      1,
      Math.floor(contentCapacity / metrics.menuRowHeight),
    )
    pages = chunkRoutes(children, maxItemsPerPage)
  } else {
    const blocks = children.flatMap((child) => {
      if (
        isMenuControlRoute(child) ||
        estimateMenuRouteHeight(child, metrics) <= contentCapacity
      ) {
        return [child]
      }

      return splitMenuGroupRoute(child, contentCapacity, metrics, getContinuedTitle)
    })
    pages = packMenuBlocks(blocks, contentCapacity, metrics)
  }

  return pages.map((pageRoutes, index) => ({
    ...route,
    title: index === 0 ? route.title : getContinuedTitle(route.title),
    routes: pageRoutes,
  }))
}

function chunkRoutes(routes: ProLayoutRoute[], chunkSize: number) {
  const chunks: ProLayoutRoute[][] = []
  for (let index = 0; index < routes.length; index += chunkSize)
    chunks.push(routes.slice(index, index + chunkSize))

  return chunks
}

function packMenuBlocks(
  blocks: ProLayoutRoute[],
  capacity: number,
  metrics: MenuLayoutMetrics,
) {
  const pages: ProLayoutRoute[][] = []
  let currentPage: ProLayoutRoute[] = []
  let currentHeight = 0

  blocks.forEach((block) => {
    const blockHeight = estimateMenuRouteHeight(block, metrics)
    if (currentPage.length && currentHeight + blockHeight > capacity) {
      pages.push(currentPage)
      currentPage = []
      currentHeight = 0
    }

    currentPage.push(block)
    currentHeight += blockHeight
  })

  if (currentPage.length)
    pages.push(currentPage)

  return pages
}

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

function preloadVisibleRoute(
  router: ReturnType<typeof useRouterCore<ProLayoutRoute>>,
  route: ProLayoutRoute,
) {
  if (router.registry.isPageRoute(route))
    preloadRoute(route)
}

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

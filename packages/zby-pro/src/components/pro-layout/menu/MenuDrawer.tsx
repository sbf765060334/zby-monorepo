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
 * 菜单先按可用高度进行 CSS 分栏，再测量真实列数决定 Drawer 宽度；这样短菜单不会留下
 * 大片空白，长菜单也能在视口范围内横向滚动，行为与 Shuzhi 保持一致。
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
  const fallbackColumnCount = Math.max(
    1,
    Math.min(maxColumns, displayRoutes.filter(isVisibleRoute).length),
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
  }, [availableWidth, columnWidth, displayRoutes, drawerBodyHeight, open])

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
      {displayRoutes.map((route) => {
        if (!isVisibleRoute(route))
          return null

        const directEntry = isDirectEntryRoute(router, route)
        return (
          <section
            key={route.path}
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

function isDirectEntryRoute(
  router: ReturnType<typeof useRouterCore<ProLayoutRoute>>,
  route: ProLayoutRoute,
) {
  return router.registry.isPageRoute(route) || Boolean(route._blank || route.prompt)
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

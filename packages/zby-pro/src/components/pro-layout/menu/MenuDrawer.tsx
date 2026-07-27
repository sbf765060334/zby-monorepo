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
  const measurementKey = menuSections.map((section) => section.key).join('\u0000')
  const measureRef = useRef<HTMLDivElement | null>(null)
  const [measurements, setMeasurements] = useState<MenuSectionMeasurements | null>(null)
  const scrollbarSize = useNativeScrollbarSize()
  const sectionHeights = useMemo(() => {
    if (measurements?.key !== measurementKey)
      return fallbackSectionHeights

    return measurements.heights.map((height, index) =>
      height > 0 ? height : (fallbackSectionHeights[index] ?? 0))
  }, [fallbackSectionHeights, measurementKey, measurements])
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
  const columnStartIndexSet = useMemo(
    () => new Set(menuLayout.columnStartIndexes),
    [menuLayout.columnStartIndexes],
  )
  const drawerClassName = clsx(`${prefixCls}-menu-drawer`, hashId, className)

  useLayoutEffect(() => {
    if (!open)
      return undefined

    const element = measureRef.current
    if (!element)
      return undefined

    let frame = 0
    const measureSections = () => {
      frame = 0
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
    const scheduleMeasurement = () => {
      if (frame)
        return

      frame = window.requestAnimationFrame(measureSections)
    }

    measureSections()
    scheduleMeasurement()
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
          fontFamily: token.fontFamily,
          fontSize: token.fontSize,
          lineHeight: token.lineHeight,
        }}
        styles={{
          header: { display: 'none' },
          body: {
            height: viewport.height || '100vh',
            boxSizing: 'border-box',
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
    const nextSize = {
      width: element.offsetWidth - element.clientWidth,
      height: element.offsetHeight - element.clientHeight,
    }
    element.remove()
    let active = true
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

function createMenuSections(routes: ProLayoutRoute[]): MenuSection[] {
  return routes.filter(isVisibleRoute).flatMap<MenuSection>((route) => {
    const directEntry = isMenuControlRoute(route)
    if (!directEntry && !route.routes?.some(isVisibleRoute))
      return []

    return [{ key: route.path, route, directEntry }]
  })
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

function areNumberArraysEqual(left: readonly number[], right: readonly number[]) {
  return left.length === right.length &&
    left.every((value, index) => Math.abs(value - (right[index] ?? 0)) <= 0.5)
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

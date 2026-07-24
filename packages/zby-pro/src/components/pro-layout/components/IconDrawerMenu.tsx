import { preloadRoute } from '@zby/router-core'
import { useRouterCore, useRouterCoreSelector } from '@zby/router-core/react'
import { useRouterCoreCreateHref } from '@zby/router-core/react-router'
import { AppstoreOutlined, SwapOutlined } from '@ant-design/icons'
import { useIntl } from '@zby/intl'
import {
  Button,
  Drawer,
  Layout,
  message,
  Popover,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import { clsx } from 'clsx'
import { memo, useMemo, useState } from 'react'

import {
  isFavoriteMenuRoute,
  useFavoriteMenusSelector,
  useToggleFavoriteMenu,
} from '../favorites/FavoriteMenusProvider'
import type { RouterCoreState } from '@zby/router-core'
import type { ReactNode } from 'react'
import type {
  ProLayoutClassNames,
  ProLayoutRoute,
  ProLayoutStyles,
  ProLayoutSystemItem,
} from '../types'
import MenuFavoriteButton from './MenuFavoriteButton'

export interface IconDrawerMenuProps {
  prefixCls: string
  hashId: string
  logo?: ReactNode | (() => ReactNode)
  systemList?: ProLayoutSystemItem[]
  classNames?: ProLayoutClassNames
  styles?: ProLayoutStyles
}

/** ZBY 唯一保留的“一级图标栏 + 多列 Drawer”导航。 */
function IconDrawerMenu(props: IconDrawerMenuProps) {
  const { classNames, hashId, logo, prefixCls, styles, systemList = [] } = props
  const intl = useIntl()
  const router = useRouterCore<ProLayoutRoute>()
  const createHref = useRouterCoreCreateHref()
  const [messageApi, messageContextHolder] = message.useMessage()
  const selectedPath = useRouterCoreSelector(
    (state: RouterCoreState<ProLayoutRoute>) => state.currentSelectedPath,
  )
  const favoritePaths = useFavoriteMenusSelector((state) => state.favoritePaths)
  const toggleFavorite = useToggleFavoriteMenu()
  const favoritePathSet = useMemo(() => new Set(favoritePaths), [favoritePaths])
  const routes = router.registry.permissionRoutes.filter((route) => isVisibleRoute(route))
  const [drawerRoute, setDrawerRoute] = useState<ProLayoutRoute | null>(null)
  const drawerColumns = drawerRoute?.routes?.filter((route) => isVisibleRoute(route)) || []
  const drawerWidth = Math.min(Math.max(drawerColumns.length, 1), 4) * 240

  const handleRoute = (route: ProLayoutRoute, anchor?: string) => {
    if (route.prompt) {
      void messageApi.info(
        typeof route.prompt === 'string'
          ? route.prompt
          : intl.getMessage('zby.pro.layout.menu.unavailable', '功能暂未开放'),
      )
      return
    }

    if (route._blank) {
      // 正常菜单项会渲染为原生链接；这里只兜底处理锚点等非主菜单点击入口。
      window.open(createHref(route.path), route.target || '_blank', 'noopener,noreferrer')
      return
    }

    if (anchor) {
      router.smartNavigate({ pathname: route.path, hash: normalizeHash(anchor) })
      setDrawerRoute(null)
      return
    }

    if (route.routes?.some((item) => isVisibleRoute(item)) && !router.registry.isPageRoute(route)) {
      setDrawerRoute(route)
      return
    }

    if (router.registry.isPageRoute(route)) {
      router.jumpTo(route.path)
      setDrawerRoute(null)
    }
  }

  return (
    <>
      {messageContextHolder}
      <Layout.Sider
        width={60}
        className={clsx(`${prefixCls}-sider`, classNames?.sider)}
        style={{ minHeight: '100vh', ...styles?.sider }}
      >
        <div
          className={clsx(`${prefixCls}-sider-logo`, classNames?.siderLogo)}
          style={styles?.siderLogo}
        >
          {typeof logo === 'function' ? logo() : logo}
        </div>
        <nav
          className={clsx(`${prefixCls}-sider-menu`, classNames?.siderMenu)}
          style={styles?.siderMenu}
        >
          {routes.map((route) => {
            const Icon = route.icon || AppstoreOutlined
            const active = selectedPath.includes(route.path)
            const className = clsx(`${prefixCls}-sider-item`, {
              [`${prefixCls}-sider-item-active`]: active,
            })
            const content = (
              <>
                <Icon className={`${prefixCls}-sider-item-icon`} />
                <span className={`${prefixCls}-sider-item-title`}>{route.title}</span>
              </>
            )
            return (
              <Tooltip key={route.path} placement="right" {...route.tooltipProps}>
                {route._blank && !route.prompt
                  ? (
                      <a
                        href={createHref(route.path)}
                        target={route.target || '_blank'}
                        rel={(route.target || '_blank') === '_blank' ? 'noopener noreferrer' : undefined}
                        className={className}
                        onFocus={() => preloadVisibleRoute(route, router)}
                        onMouseEnter={() => preloadVisibleRoute(route, router)}
                      >
                        {content}
                      </a>
                    )
                  : (
                      <button
                        type="button"
                        className={className}
                        onClick={() => handleRoute(route)}
                        onFocus={() => preloadVisibleRoute(route, router)}
                        onMouseEnter={() => preloadVisibleRoute(route, router)}
                      >
                        {content}
                      </button>
                    )}
              </Tooltip>
            )
          })}
        </nav>
        {systemList.length ? (
          <SystemSwitcher
            prefixCls={prefixCls}
            systemList={systemList}
          />
        ) : null}
      </Layout.Sider>
      <Drawer
        open={Boolean(drawerRoute)}
        title={drawerRoute?.title}
        placement="left"
        size={drawerWidth}
        mask={false}
        rootClassName={clsx(`${prefixCls}-menu-drawer`, hashId, classNames?.menuDrawer)}
        rootStyle={{ left: 60 }}
        styles={{ body: { padding: 12, ...styles?.menuDrawer } }}
        onClose={() => setDrawerRoute(null)}
      >
        <div className={`${prefixCls}-menu-columns`}>
          {drawerColumns.map((route) => (
            <MenuColumn
              key={route.path}
              prefixCls={prefixCls}
              route={route}
              selectedPath={selectedPath}
              createHref={createHref}
              onSelect={handleRoute}
              onPreload={(route) => preloadVisibleRoute(route, router)}
              favoritePaths={favoritePathSet}
              onToggleFavorite={toggleFavorite}
              isFavoriteRoute={(route) => isFavoriteMenuRoute(router, route)}
            />
          ))}
        </div>
      </Drawer>
    </>
  )
}

function MenuColumn(props: {
  prefixCls: string
  route: ProLayoutRoute
  selectedPath: readonly string[]
  createHref: (path: string) => string
  onSelect: (route: ProLayoutRoute, anchor?: string) => void
  onPreload: (route: ProLayoutRoute) => void
  favoritePaths: ReadonlySet<string>
  onToggleFavorite: (path: string) => void
  isFavoriteRoute: (route: ProLayoutRoute) => boolean
}) {
  const {
    createHref,
    favoritePaths,
    isFavoriteRoute,
    onPreload,
    onSelect,
    onToggleFavorite,
    prefixCls,
    route,
    selectedPath,
  } = props
  return (
    <section className={`${prefixCls}-menu-column`}>
      <MenuRoute
        prefixCls={prefixCls}
        route={route}
        selectedPath={selectedPath}
        createHref={createHref}
        onSelect={onSelect}
        onPreload={onPreload}
        favoritePaths={favoritePaths}
        onToggleFavorite={onToggleFavorite}
        isFavoriteRoute={isFavoriteRoute}
        level={0}
      />
    </section>
  )
}

function MenuRoute(props: {
  prefixCls: string
  route: ProLayoutRoute
  selectedPath: readonly string[]
  createHref: (path: string) => string
  onSelect: (route: ProLayoutRoute, anchor?: string) => void
  onPreload: (route: ProLayoutRoute) => void
  favoritePaths: ReadonlySet<string>
  onToggleFavorite: (path: string) => void
  isFavoriteRoute: (route: ProLayoutRoute) => boolean
  level: number
}) {
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
  const children = route.routes?.filter((item) => isVisibleRoute(item)) || []
  const tag = typeof route.tag === 'string' ? { text: route.tag } : route.tag
  const className = clsx(`${prefixCls}-menu-route`, {
    [`${prefixCls}-menu-route-active`]: selectedPath.includes(route.path),
    [`${prefixCls}-menu-route-group-title`]: children.length > 0,
  })
  const content = (
    <>
      <Typography.Text ellipsis>{route.title}</Typography.Text>
      {tag ? <Tag color={tag.color}>{tag.text}</Tag> : null}
    </>
  )
  return (
    <div className={`${prefixCls}-menu-group`}>
      <div className={`${prefixCls}-menu-route-row`}>
        {route._blank && !route.prompt
          ? (
              <a
                href={createHref(route.path)}
                target={route.target || '_blank'}
                rel={(route.target || '_blank') === '_blank' ? 'noopener noreferrer' : undefined}
                className={className}
                style={{ paddingInlineStart: level * 12 + 8 }}
                onFocus={() => onPreload(route)}
                onMouseEnter={() => onPreload(route)}
              >
                {content}
              </a>
            )
          : (
              <button
                type="button"
                className={className}
                style={{ paddingInlineStart: level * 12 + 8 }}
                onClick={() => onSelect(route)}
                onFocus={() => onPreload(route)}
                onMouseEnter={() => onPreload(route)}
              >
                {content}
              </button>
            )}
        {isFavoriteRoute(route) ? (
          <MenuFavoriteButton
            prefixCls={prefixCls}
            title={route.title}
            favorite={favoritePaths.has(route.path)}
            onToggle={() => onToggleFavorite(route.path)}
          />
        ) : null}
      </div>
      {route.anchorPoints?.map((anchor) => (
        <button
          key={anchor.anchor}
          type="button"
          className={`${prefixCls}-menu-anchor`}
          style={{ paddingInlineStart: level * 12 + 20 }}
          onClick={() => onSelect(route, anchor.anchor)}
        >
          {anchor.title}
        </button>
      ))}
      {children.map((child) => (
        <MenuRoute
          key={child.path}
          {...props}
          route={child}
          level={level + 1}
        />
      ))}
    </div>
  )
}

function SystemSwitcher(props: { prefixCls: string, systemList: ProLayoutSystemItem[] }) {
  const intl = useIntl()
  const activeSystem = props.systemList.find((item) => item.active)
  const triggerLabel = activeSystem?.description ||
    activeSystem?.name ||
    intl.getMessage('zby.pro.layout.menu.switchSystem', '切换系统')
  const content = useMemo(() => (
    <Space direction="vertical" size={4} className={`${props.prefixCls}-system-list`}>
      {props.systemList.map((system) => (
        <Button
          key={system.systemName}
          type={system.active ? 'primary' : 'text'}
          block
          onClick={() => {
            if (typeof window !== 'undefined')
              window.location.assign(system.url)
          }}
        >
          {system.name}
        </Button>
      ))}
    </Space>
  ), [props.prefixCls, props.systemList])

  return (
    <Popover content={content} placement="rightBottom" trigger="click">
      <button
        type="button"
        className={`${props.prefixCls}-system-trigger`}
        aria-label={triggerLabel}
        title={triggerLabel}
      >
        {activeSystem?.logo ? <img src={activeSystem.logo} alt="" /> : <SwapOutlined />}
      </button>
    </Popover>
  )
}

function preloadVisibleRoute(
  route: ProLayoutRoute,
  router: ReturnType<typeof useRouterCore<ProLayoutRoute>>,
) {
  if (router.registry.isPageRoute(route))
    preloadRoute(route)
}

function isVisibleRoute(route: ProLayoutRoute): boolean {
  return !route.ignore && Boolean(
    route.element || route.prompt || route._blank || route.routes?.some((item) => isVisibleRoute(item)),
  )
}

function normalizeHash(hash: string) {
  return hash.startsWith('#') ? hash : `#${hash}`
}

export default memo(IconDrawerMenu)

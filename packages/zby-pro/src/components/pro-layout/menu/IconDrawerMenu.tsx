import { preloadRoute } from '@zby/router-core'
import { useRouterCore, useRouterCoreSelector } from '@zby/router-core/react'
import { useRouterCoreCreateHref } from '@zby/router-core/react-router'
import { useIntl } from '@zby/intl'
import { Layout, message, Tooltip } from 'antd'
import { clsx } from 'clsx'
import { memo, useEffect, useMemo, useRef, useState } from 'react'

import type { RouterCoreState } from '@zby/router-core'
import type { ReactNode } from 'react'
import type {
  ProLayoutClassNames,
  ProLayoutRoute,
  ProLayoutStyles,
  ProLayoutSystemItem,
} from '../types'
import MenuDrawer from './MenuDrawer'
import SystemSwitcher from '../components/SystemSwitcher'

const SIDER_WIDTH = 60
const MENU_HOVER_DELAY = 200

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
  const routes = useMemo(() => router.registry.permissionRoutes.filter(isVisibleRoute), [router])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [hoverFirstPath, setHoverFirstPath] = useState<string | null>(null)
  const hoverTimerRef = useRef<number | null>(null)
  const selectedFirstPath = selectedPath[0] || null
  const firstDisplayPath = hoverFirstPath || selectedFirstPath
  const displayRoutes = useMemo(() => {
    if (!firstDisplayPath) return []

    return (
      routes.find((route) => route.path === firstDisplayPath)?.routes?.filter(isVisibleRoute) || []
    )
  }, [firstDisplayPath, routes])

  const cancelHoverIntent = () => {
    if (hoverTimerRef.current === null)
      return

    window.clearTimeout(hoverTimerRef.current)
    hoverTimerRef.current = null
  }

  useEffect(() => () => {
    if (hoverTimerRef.current !== null)
      window.clearTimeout(hoverTimerRef.current)
  }, [])

  const closeDrawer = () => {
    cancelHoverIntent()
    setDrawerOpen(false)
  }

  const handleRoute = (route: ProLayoutRoute) => {
    // 点击和键盘操作代表明确意图，应取消 hover 延迟并立即响应。
    cancelHoverIntent()

    if (route.prompt) {
      void messageApi.info(
        typeof route.prompt === 'string'
          ? route.prompt
          : intl.getMessage('zby.pro.layout.menu.unavailable', '功能暂未开放'),
      )
      closeDrawer()
      return
    }

    if (router.registry.isPageRoute(route)) {
      router.jumpTo(route.path)
      closeDrawer()
      return
    }

    if (hasVisibleChildren(route)) {
      if (drawerOpen) {
        closeDrawer()
        return
      }

      setHoverFirstPath(route.path)
      setDrawerOpen(true)
    }
  }

  return (
    <>
      {messageContextHolder}
      <Layout.Sider
        width={SIDER_WIDTH}
        collapsed
        collapsedWidth={SIDER_WIDTH}
        className={clsx(`${prefixCls}-sider`, classNames?.sider)}
        style={styles?.sider}
      >
        <div className={`${prefixCls}-sider-inner`}>
          <div
            className={clsx(`${prefixCls}-sider-logo`, classNames?.siderLogo)}
            style={styles?.siderLogo}
          >
            {typeof logo === 'function' ? logo() : logo}
          </div>
          <div
            className={clsx(`${prefixCls}-sider-menu-container`, classNames?.siderMenu)}
            style={styles?.siderMenu}
          >
            {/* 一级菜单使用独立原生滚动容器；外层 container 继续负责裁切和挂载 Drawer。 */}
            <div className={`${prefixCls}-sider-menu-scroll`}>
              <nav className={`${prefixCls}-sider-menu`}>
                {routes.map((route) => {
                  const Icon = route.icon
                  const active = selectedPath.includes(route.path)
                  const hovered = drawerOpen && firstDisplayPath === route.path
                  const className = clsx(`${prefixCls}-sider-item`, {
                    [`${prefixCls}-sider-item-active`]: active,
                    [`${prefixCls}-sider-item-hover`]: hovered,
                  })
                  const content = (
                    <dl>
                      <dt>{Icon ? <Icon /> : null}</dt>
                      <dd>
                        <span className={`${prefixCls}-sider-item-title`}>{route.title}</span>
                      </dd>
                    </dl>
                  )
                  const handlePreloadAndHover = () => {
                    preloadVisibleRoute(route, router)
                    cancelHoverIntent()

                    if (!hasVisibleChildren(route) || route.path === firstDisplayPath)
                      return

                    // 只有指针在同一一级菜单上持续停留，才认为用户确实想切换 Drawer。
                    hoverTimerRef.current = window.setTimeout(() => {
                      hoverTimerRef.current = null
                      setHoverFirstPath(route.path)
                    }, MENU_HOVER_DELAY)
                  }

                  return (
                    <Tooltip key={route.path} placement="right" {...route.tooltipProps}>
                      {route._blank && !route.prompt ? (
                        <a
                          href={createHref(route.path)}
                          target={route.target || '_blank'}
                          rel={
                            (route.target || '_blank') === '_blank'
                              ? 'noopener noreferrer'
                              : undefined
                          }
                          className={className}
                          title={route.title}
                          onFocus={() => preloadVisibleRoute(route, router)}
                          onMouseEnter={handlePreloadAndHover}
                          onMouseLeave={cancelHoverIntent}
                        >
                          {content}
                        </a>
                      ) : (
                        <div
                          role="button"
                          tabIndex={0}
                          className={className}
                          title={route.title}
                          onClick={() => handleRoute(route)}
                          onFocus={() => preloadVisibleRoute(route, router)}
                          onMouseEnter={handlePreloadAndHover}
                          onMouseLeave={cancelHoverIntent}
                          onKeyDown={(event) => {
                            if (event.key !== 'Enter' && event.key !== ' ') return

                            event.preventDefault()
                            handleRoute(route)
                          }}
                        >
                          {content}
                        </div>
                      )}
                    </Tooltip>
                  )
                })}
              </nav>
            </div>
            <MenuDrawer
              prefixCls={prefixCls}
              hashId={hashId}
              left={SIDER_WIDTH}
              open={drawerOpen}
              onClose={closeDrawer}
              displayRoutes={displayRoutes}
              selectedPath={selectedPath}
              className={classNames?.menuDrawer}
              style={styles?.menuDrawer}
            />
          </div>
          {systemList.length ? (
            <SystemSwitcher prefixCls={prefixCls} hashId={hashId} systemList={systemList} />
          ) : null}
        </div>
      </Layout.Sider>
    </>
  )
}

function preloadVisibleRoute(
  route: ProLayoutRoute,
  router: ReturnType<typeof useRouterCore<ProLayoutRoute>>,
) {
  if (router.registry.isPageRoute(route)) preloadRoute(route)
}

function hasVisibleChildren(route: ProLayoutRoute) {
  return Boolean(route.routes?.some(isVisibleRoute))
}

function isVisibleRoute(route: ProLayoutRoute): boolean {
  return (
    !route.ignore &&
    Boolean(route.element || route.prompt || route._blank || route.routes?.some(isVisibleRoute))
  )
}

export default memo(IconDrawerMenu)

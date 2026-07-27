import { preloadRoute } from '@zby/router-core'
import { useRouterCore, useRouterCoreSelector } from '@zby/router-core/react'
import { useRouterCoreCreateHref } from '@zby/router-core/react-router'
import { useIntl } from '@zby/intl'
import { ScrollArea } from '@zby/ui'
import { Layout, message, Tooltip } from 'antd'
import { clsx } from 'clsx'
import { memo, useMemo, useState } from 'react'

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
  const selectedFirstPath = selectedPath[0] || null
  const firstDisplayPath = hoverFirstPath || selectedFirstPath
  const displayRoutes = useMemo(() => {
    if (!firstDisplayPath) return []

    return (
      routes.find((route) => route.path === firstDisplayPath)?.routes?.filter(isVisibleRoute) || []
    )
  }, [firstDisplayPath, routes])

  const closeDrawer = () => {
    setDrawerOpen(false)
  }

  const handleRoute = (route: ProLayoutRoute) => {
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
            <ScrollArea
              className={`${prefixCls}-sider-menu-scroll`}
              direction="vertical"
              scrollbar={false}
              wheelBehavior="native"
            >
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
                    if (hasVisibleChildren(route)) setHoverFirstPath(route.path)
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
            </ScrollArea>
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

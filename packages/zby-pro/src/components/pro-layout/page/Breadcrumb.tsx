import { useRouterCore, useRouterCoreSelector } from '@zby/router-core/react'
import { useRouterCoreCreateHref } from '@zby/router-core/react-router'
import { useIntl } from '@zby/intl'
import { Breadcrumb, Space } from 'antd'
import { clsx } from 'clsx'
import { forwardRef, memo, useMemo } from 'react'

import type { BreadcrumbProps } from 'antd'
import type { CSSProperties, MouseEvent } from 'react'
import type { RouterCoreState } from '@zby/router-core'
import type { ProLayoutRoute } from '../types'

export interface LayoutBreadcrumbProps {
  prefixCls: string
  className?: string
  style?: CSSProperties
}

/**
 * ProLayout 页面壳中的全局面包屑。
 *
 * UI 沿用 Shuzhi 的“当前位置：+ 路由图标 + antd Breadcrumb”结构，但数据只读取
 * router-core 快照。上级页面同时提供 React Router 生成的原生 href：普通左键仍由
 * jumpTo 统一处理，Ctrl/Command/中键及右键菜单交还浏览器原生链接行为。
 */
const BreadcrumbView = forwardRef<HTMLDivElement, LayoutBreadcrumbProps>((props, ref) => {
  const { className, prefixCls, style } = props
  const intl = useIntl()
  const router = useRouterCore<ProLayoutRoute>()
  const createHref = useRouterCoreCreateHref()
  const currentPathname = useRouterCoreSelector(
    (state: RouterCoreState<ProLayoutRoute>) => state.currentPathname,
  )
  const currentRoutes = useRouterCoreSelector(
    (state: RouterCoreState<ProLayoutRoute>) => state.currentRoutes,
  )
  const pathnameDescriptionMap = useRouterCoreSelector(
    (state: RouterCoreState<ProLayoutRoute>) => state.pathnameDescriptionMap,
  )
  const items = useMemo<NonNullable<BreadcrumbProps['items']>>(
    () => currentRoutes.map((item, index) => {
      const Icon = item.route.icon
      const isCurrent = index === currentRoutes.length - 1 || item.realPath === currentPathname
      const clickable = !isCurrent && router.registry.isPageRoute(item.route)
      const title = pathnameDescriptionMap[item.realPath] || item.route.title

      return {
        key: `${item.route.path}-${index}`,
        title: (
          <span className={`${prefixCls}-breadcrumb-item-title`}>
            {Icon ? <Icon className={`${prefixCls}-breadcrumb-icon`} /> : null}
            {title}
          </span>
        ),
        href: clickable ? createHref(item.realPath) : undefined,
        onClick: clickable
          ? (event: MouseEvent<HTMLElement>) => {
              if (shouldKeepNativeBehavior(event))
                return

              event.preventDefault()
              router.jumpTo(item.realPath)
            }
          : undefined,
        className: clickable ? `${prefixCls}-breadcrumb-item-clickable` : undefined,
      }
    }),
    [createHref, currentPathname, currentRoutes, pathnameDescriptionMap, prefixCls, router],
  )

  if (!items.length)
    return null

  return (
    <Space
      ref={ref}
      size={0}
      className={clsx(`${prefixCls}-breadcrumb`, className)}
      style={style}
    >
      <span className={`${prefixCls}-breadcrumb-label`}>
        {intl.getMessage('zby.pro.layout.breadcrumb.currentLocation', '当前位置：')}
      </span>
      <Breadcrumb items={items} />
    </Space>
  )
})

BreadcrumbView.displayName = 'Breadcrumb'

function shouldKeepNativeBehavior(event: MouseEvent<HTMLElement>) {
  return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
}

export default memo(BreadcrumbView)

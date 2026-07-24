import { useRouterCore, useRouterCoreSelector } from '@zby/router-core/react'
import { Breadcrumb, Space } from 'antd'
import { memo, useMemo } from 'react'

import type { BreadcrumbProps } from 'antd'
import type { MouseEvent } from 'react'
import type { RouterCoreState } from '@zby/router-core'
import type { ProLayoutRoute } from '../types'

export interface LayoutBreadcrumbProps {
  prefixCls: string
}

/**
 * ProLayout 全局面包屑。
 *
 * UI 沿用 Shuzhi 的“当前位置：+ 路由图标 + antd Breadcrumb”结构，但数据只读取
 * router-core 快照。由于 core 暂未公开 createHref，上级项当前只实现普通左键 jumpTo；
 * Ctrl/Command/中键新窗口行为已记录在缺失功能文档中。
 */
function BreadcrumbView(props: LayoutBreadcrumbProps) {
  const { prefixCls } = props
  const router = useRouterCore<ProLayoutRoute>()
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
        onClick: clickable
          ? (event: MouseEvent<HTMLSpanElement>) => {
              if (shouldKeepNativeBehavior(event))
                return

              event.preventDefault()
              router.jumpTo(item.realPath)
            }
          : undefined,
        className: clickable ? `${prefixCls}-breadcrumb-item-clickable` : undefined,
      }
    }),
    [currentPathname, currentRoutes, pathnameDescriptionMap, prefixCls, router],
  )

  if (!items.length)
    return null

  return (
    <Space size={0} className={`${prefixCls}-breadcrumb`}>
      <span className={`${prefixCls}-breadcrumb-label`}>当前位置：</span>
      <Breadcrumb items={items} />
    </Space>
  )
}

function shouldKeepNativeBehavior(event: MouseEvent<HTMLElement>) {
  return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
}

export default memo(BreadcrumbView)

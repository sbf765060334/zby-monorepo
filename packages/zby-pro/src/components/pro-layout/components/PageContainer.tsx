import { RouterPageProvider } from '@zby/router-core/react'
import { Spin } from 'antd'
import {
  isValidElement,
  memo,
  Suspense,
  useMemo,
} from 'react'

import type { RouterPage } from '@zby/router-core'
import type { CSSProperties, ElementType } from 'react'
import type { ProLayoutRoute, ProLayoutRouteComponent } from '../types'
import PageErrorBoundary from './PageErrorBoundary'

export interface PageContainerProps {
  prefixCls: string
  page: RouterPage<ProLayoutRoute>
  active: boolean
  className?: string
  style?: CSSProperties
}

/** 将 Route element 兼容为已创建节点或无 props 组件。 */
function RouteElement(props: { element?: ProLayoutRouteComponent }) {
  const { element } = props
  if (!element)
    return null
  if (isValidElement(element))
    return element

  const Component = element as ElementType<Record<string, never>>
  return <Component />
}

const StableRouteElement = memo(
  RouteElement,
  (previous, next) => previous.element === next.element,
)

/**
 * 单个 KeepAlive 页面实例的 React 边界。
 *
 * 页面是否保留完全取决于 core 的 pages；非活动页面只隐藏，pages 删除后才真正卸载。
 * RouterPageProvider 负责在绘制前同步真实 pathname、active 和完整 location。
 */
function PageContainer(props: PageContainerProps) {
  const { active, className, page, prefixCls, style } = props
  const resetKeys = useMemo(() => [page.pathname, page.route.element] as const, [page])

  return (
    <RouterPageProvider page={page} active={active}>
      <div
        className={className}
        style={{
          width: '100%',
          height: '100%',
          minWidth: 0,
          minHeight: 0,
          overflow: 'auto',
          ...style,
          display: active ? (style?.display ?? 'block') : 'none',
        }}
      >
        <PageErrorBoundary resetKeys={resetKeys}>
          <Suspense fallback={<PageLoading prefixCls={prefixCls} />}>
            <StableRouteElement element={page.route.element} />
          </Suspense>
        </PageErrorBoundary>
      </div>
    </RouterPageProvider>
  )
}

function PageLoading(props: { prefixCls: string }) {
  return (
    <div
      className={`${props.prefixCls}-page-loading`}
      style={{
        display: 'flex',
        width: '100%',
        minHeight: 160,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Spin delay={300} />
    </div>
  )
}

export default memo(PageContainer)

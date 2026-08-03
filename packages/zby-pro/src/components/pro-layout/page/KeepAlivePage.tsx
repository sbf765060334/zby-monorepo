import { RouterPageProvider } from '@zby/router-core/react'
import { Spin } from 'antd'
import {
  isValidElement,
  memo,
  Suspense,
  useEffect,
  useMemo,
  useRef,
} from 'react'

import type { RouterPage } from '@zby/router-core'
import type { CSSProperties, ElementType } from 'react'
import type {
  ProLayoutPageErrorHandler,
  ProLayoutRoute,
  ProLayoutRouteComponent,
} from '../types'
import PageErrorBoundary from './PageErrorBoundary'

/** 单个 KeepAlive 页面容器的组合属性。 */
export interface KeepAlivePageProps {
  prefixCls: string
  page: RouterPage<ProLayoutRoute>
  active: boolean
  onPageError?: ProLayoutPageErrorHandler
  onScrollStateChange?: (scrolled: boolean) => void
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
function KeepAlivePage(props: KeepAlivePageProps) {
  const {
    active,
    className,
    onPageError,
    onScrollStateChange,
    page,
    prefixCls,
    style,
  } = props
  const scrolledElementsRef = useRef(new Set<HTMLElement>())
  const lastReportedScrolledRef = useRef(false)
  const resetKeys = useMemo(() => [page.pathname, page.route.element], [page])

  useEffect(() => {
    if (!active)
      return

    for (const element of scrolledElementsRef.current) {
      if (!element.isConnected || element.scrollTop <= 0)
        scrolledElementsRef.current.delete(element)
    }
    const scrolled = scrolledElementsRef.current.size > 0
    lastReportedScrolledRef.current = scrolled
    onScrollStateChange?.(scrolled)
  }, [active, onScrollStateChange])

  return (
    <RouterPageProvider page={page} active={active}>
      <div
        className={className}
        onScrollCapture={active && onScrollStateChange
          ? (event) => {
              const element = event.target
              if (!(element instanceof HTMLElement))
                return

              if (element.scrollTop > 0)
                scrolledElementsRef.current.add(element)
              else
                scrolledElementsRef.current.delete(element)

              const scrolled = scrolledElementsRef.current.size > 0
              if (lastReportedScrolledRef.current === scrolled)
                return

              lastReportedScrolledRef.current = scrolled
              onScrollStateChange(scrolled)
            }
          : undefined}
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
        <PageErrorBoundary
          prefixCls={prefixCls}
          resetKeys={resetKeys}
          onError={onPageError
            ? (error, info) => onPageError(error, info, { pathname: page.pathname })
            : undefined}
        >
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

export default memo(KeepAlivePage)

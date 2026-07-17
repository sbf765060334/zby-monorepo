import { Alert, Layout, Spin } from 'antd'
import {
  isValidElement,
  memo,
  Suspense,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react'
import { shallow } from 'zustand/shallow'
import { createStore } from 'zustand/vanilla'

import type { ComponentType, CSSProperties, ElementType, PropsWithChildren } from 'react'
import { ProLayoutPageContext, useProLayoutContext, useProLayoutStoreSelector } from '../context'
import type { ProLayoutContextValue, ProLayoutPageContextValue } from '../context'
import { createProLayoutEmitter } from '../context/emitter'
import type {
  ProLayoutLocationEventPayload,
  ProLayoutPage,
  ProLayoutRouteComponent,
} from '../interface'
import ExceptionPage from './ExceptionPage'

const { Content } = Layout
// antd 6 的 ErrorBoundary 声明使用了与本仓库 React 18 不同代的 ReactNode 类型；
// 运行时仍是标准 class component，在此收窄为本地 children 契约，避免类型差异向外扩散。
const PageErrorBoundary = Alert.ErrorBoundary as unknown as ComponentType<PropsWithChildren>

type StablePageLayoutContext = Omit<ProLayoutContextValue, 'currentPathname' | 'currentRoutes'>

/** 页面实例共享公共动作，但用自己的 pathname 和路由层级覆盖宿主当前页面。 */
const stablePageLayoutContextSelector = (
  state: ProLayoutContextValue,
): StablePageLayoutContext => ({
  pathnameDescriptionMap: state.pathnameDescriptionMap,
  jumpTo: state.jumpTo,
  smartNavigate: state.smartNavigate,
  closeThisTabOpenNewOne: state.closeThisTabOpenNewOne,
  closeTab: state.closeTab,
  setPathnameDescription: state.setPathnameDescription,
  setTabLabel: state.setTabLabel,
  addBeforeCloseHook: state.addBeforeCloseHook,
  clearBeforeCloseHook: state.clearBeforeCloseHook,
  resolveLeafRoute: state.resolveLeafRoute,
  getCurrentRoutes: state.getCurrentRoutes,
  noBar: state.noBar,
  showBreadcrumb: state.showBreadcrumb,
  headerHeight: state.headerHeight,
  breadcrumbHeight: state.breadcrumbHeight,
})

export interface PageContainerProps {
  prefixCls: string
  data: ProLayoutPage
  active: boolean
  headerHeight: number
  noBar: boolean
  className?: string
  bodyStyle?: CSSProperties
}

/** 兼容路由直接提供 React Element 或无 props 组件类型的两种形式。 */
function StableElement(props: { node: ProLayoutRouteComponent | null | undefined }) {
  const { node } = props
  if (!node)
    return null
  if (isValidElement(node))
    return node

  const Component = node as ElementType<Record<string, never>>
  return <Component />
}

const MemoStableElement = memo(StableElement, (previous, next) => previous.node === next.node)

/**
 * 持有单个 KeepAlive 页面实例及其独立 Page Context Store。
 *
 * 非活动页面仅隐藏 Content，不卸载业务组件；Store 从 pages 删除该描述时，React key
 * 随之消失并完成真正卸载。Registry 更新会重新解析 element 和权限，不能依赖稳定的
 * resolveLeafRoute 动作引用缓存旧结果。
 */
function PageContainer(props: PageContainerProps) {
  const {
    prefixCls,
    data,
    active,
    headerHeight,
    noBar,
    className,
    bodyStyle,
  } = props
  const layoutContext = useProLayoutContext(stablePageLayoutContextSelector, shallow)
  const intl = useProLayoutStoreSelector((state) => state.intl)
  const registry = useProLayoutStoreSelector((state) => state.registry)
  const registerPageLocationEmitter = useProLayoutStoreSelector(
    (state) => state.registerPageLocationEmitter,
  )
  const [lifecycle$] = useState(() => createProLayoutEmitter<boolean>())
  const [location$] = useState(
    () => createProLayoutEmitter<ProLayoutLocationEventPayload>(),
  )
  const [pageStore] = useState(() =>
    createStore<ProLayoutPageContextValue>(() => ({
      ...layoutContext,
      currentPathname: data.pathname,
      currentRoutes: registry.getCurrentRoutes(data.pathname),
      pathname: data.pathname,
      tabKey: data.key,
      lifecycle$,
      location$,
    })),
  )

  useLayoutEffect(
    () => registerPageLocationEmitter(data.key, location$),
    [data.key, location$, registerPageLocationEmitter],
  )

  useLayoutEffect(() => {
    // 共享动态页签切换真实 pathname，或 Registry 提交新元数据快照时，在绘制前同步
    // Page Context，业务组件不会观察到宿主已更新而页面上下文仍停留在旧值的一帧。
    pageStore.setState({
      ...layoutContext,
      currentPathname: data.pathname,
      currentRoutes: registry.getCurrentRoutes(data.pathname),
      pathname: data.pathname,
      tabKey: data.key,
    })
  }, [data.key, data.pathname, layoutContext, pageStore, registry])

  useLayoutEffect(() => {
    lifecycle$.emit(active)
  }, [active, lifecycle$])

  const elementNode = useMemo<ProLayoutRouteComponent | null>(() => {
    const leaf = registry.resolveLeafRoute(data.pathname, { withinAuth: true })
    if (!leaf || !registry.isPageRoute(leaf.route)) {
      return (
        <ExceptionPage
          prefixCls={prefixCls}
          status="403"
          description={intl.getMessage(
            'proLayout.pageNoPermission',
            '暂无权限查看当前页面，若需当前页面权限，请联系管理员。',
          )}
        />
      )
    }

    return leaf.route.element || null
  }, [data.pathname, intl, prefixCls, registry])

  const contentHeight = useMemo(
    () => noBar ? '100vh' : `calc(100vh - ${headerHeight}px)`,
    [headerHeight, noBar],
  )

  return (
    <ProLayoutPageContext.Provider value={pageStore}>
      <Content className={className} style={{ display: active ? 'block' : 'none' }}>
        <PageErrorBoundary>
          <div
            className={`${prefixCls}-page-body`}
            style={{
              position: 'relative',
              height: contentHeight,
              overflow: 'auto',
              ...bodyStyle,
            }}
          >
            <Suspense fallback={<PageLoading prefixCls={prefixCls} />}>
              <MemoStableElement node={elementNode} />
            </Suspense>
          </div>
        </PageErrorBoundary>
      </Content>
    </ProLayoutPageContext.Provider>
  )
}

function PageLoading(props: { prefixCls: string }) {
  return (
    <div
      className={`${props.prefixCls}-page-loading`}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100%',
      }}
    >
      <Spin delay={300} />
    </div>
  )
}

function arePagePropsEqual(previous: PageContainerProps, next: PageContainerProps) {
  return (
    previous.prefixCls === next.prefixCls &&
    previous.active === next.active &&
    previous.data.key === next.data.key &&
    previous.data.pathname === next.data.pathname &&
    previous.data.route === next.data.route &&
    previous.headerHeight === next.headerHeight &&
    previous.noBar === next.noBar &&
    previous.className === next.className &&
    previous.bodyStyle === next.bodyStyle
  )
}

export default memo(PageContainer, arePagePropsEqual)

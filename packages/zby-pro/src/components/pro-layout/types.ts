import type { RouterCore, RouterRoute, RouterRuntimeOptions } from '@zby/router-core'
import type { TagProps, TooltipProps } from 'antd'
import type {
  ComponentType,
  CSSProperties,
  ElementType,
  ReactElement,
  ReactNode,
} from 'react'

/** 菜单、面包屑中使用的路由图标最小属性。 */
export interface ProLayoutRouteIconProps {
  className?: string
  style?: CSSProperties
}

/** 菜单路由旁的状态标签。 */
export interface ProLayoutRouteTagConfig {
  text: string
  color?: TagProps['color']
}

/** 从菜单直接进入页面锚点的配置。 */
export interface ProLayoutRouteAnchorPoint {
  anchor: string
  title: string
}

/** 支持静态 preload 的页面组件，或者调用方已经创建好的 React Element。 */
export type ProLayoutRouteComponent =
  | (ElementType<Record<string, never>> & {
    preload?: () => void | Promise<void>
  })
  | ReactElement

/**
 * router-core 路由节点的 ProLayout UI 扩展。
 *
 * path、title、routes、auth 和 supportMultipleTabs 由 core 消费，其余字段只由
 * ProLayout UI 解释。core 创建时会保留这些扩展元数据的快照。
 */
export interface ProLayoutRoute extends RouterRoute {
  routes?: ProLayoutRoute[]
  element?: ProLayoutRouteComponent
  icon?: ComponentType<ProLayoutRouteIconProps>
  tooltipProps?: TooltipProps
  _blank?: boolean
  target?: '_blank' | '_self' | string
  ignore?: boolean
  prompt?: true | string
  tag?: string | ProLayoutRouteTagConfig
  anchorPoints?: ProLayoutRouteAnchorPoint[]
}

/** 图标栏底部的外部系统入口。 */
export interface ProLayoutSystemItem {
  systemName: string
  name: string
  description: string
  logo: string
  url: string
  active?: boolean
}

/** Drawer 图标栏顶部 Logo；函数形式沿用旧 API，但 ZBY 不再传递折叠状态。 */
export type ProLayoutHeaderLogo = ReactNode | (() => ReactNode)

export interface ProLayoutHeaderConfig {
  logo?: ProLayoutHeaderLogo
  extra?: ReactNode
}

export type ProLayoutThemeMode = 'light' | 'dark' | 'auto'
export type ProLayoutThemeAppearance = Exclude<ProLayoutThemeMode, 'auto'>

/** 仅保留跟随系统、亮色和暗色三种主题模式。 */
export interface ProLayoutThemeConfig {
  enabled?: boolean
  defaultMode?: ProLayoutThemeMode
  mode?: ProLayoutThemeMode
  onModeChange?: (mode: ProLayoutThemeMode) => void
  storageKey?: string
}

export type ProLayoutSemanticName =
  | 'root'
  | 'sider'
  | 'siderLogo'
  | 'siderMenu'
  | 'menuDrawer'
  | 'header'
  | 'tabs'
  | 'headerExtra'
  | 'breadcrumb'
  | 'content'
  | 'page'

export type ProLayoutClassNames = Partial<Record<ProLayoutSemanticName, string>>
export type ProLayoutStyles = Partial<Record<ProLayoutSemanticName, CSSProperties>>

/** 不包含任何 router-core 固定配置的纯 UI 属性。 */
export interface ProLayoutProps {
  title: string
  header?: ProLayoutHeaderConfig
  theme?: ProLayoutThemeConfig
  showBreadcrumb?: boolean
  setPage?: (pageName: string) => void
  beforeUnload?: boolean | (() => boolean)
  minimumContentWidth?: number | string
  noBar?: boolean
  systemList?: ProLayoutSystemItem[]
  prefixCls?: string
  className?: string
  rootClassName?: string
  style?: CSSProperties
  classNames?: ProLayoutClassNames
  styles?: ProLayoutStyles
}

/** React Router 入口只补充一个稳定 core 实例和允许变化的运行时回调。 */
export interface ReactRouterProLayoutProps extends ProLayoutProps, RouterRuntimeOptions {
  router: RouterCore<ProLayoutRoute>
}

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
 *
 * 作为 ProLayout 一级菜单使用时，页面与目录必须互斥：配置 element 表示点击后
 * 直接进入页面，不得再配置 routes；配置 routes 表示点击后打开 Drawer，不得再
 * 配置 element。该约束只属于 ProLayout 的一级菜单语义，不限制 router-core 的
 * 通用路由模型。
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
  /** 应用标题；当前页面存在标题时，浏览器标题显示为“页面标题 - 应用标题”。 */
  title: string
  /** 顶部 Logo 与页签栏右侧扩展内容。 */
  header?: ProLayoutHeaderConfig
  /** 跟随系统、亮色和暗色主题的开关、受控状态与本地持久化配置。 */
  theme?: ProLayoutThemeConfig
  /** 是否在页签栏下方显示全局路由面包屑；默认为 true。 */
  showBreadcrumb?: boolean
  /** 当前页面标题变化后的通知回调；无匹配页面时传入空字符串。 */
  setPage?: (pageName: string) => void
  /** 离开或刷新页面前是否提示；函数返回 true 时阻止直接离开。 */
  beforeUnload?: boolean | (() => boolean)
  /** 布局根容器的最小宽度；数字按像素处理，用于避免内容区域被过度压缩。 */
  minimumContentWidth?: number | string
  /** 是否隐藏左侧图标栏和顶部页签栏；默认为 false。 */
  noBar?: boolean
  /** 左侧图标栏底部的系统切换入口；空数组或省略时不显示。 */
  systemList?: ProLayoutSystemItem[]
  /** ProLayout 生成 CSS 类名时使用的前缀；默认为 zby-pro-layout。 */
  prefixCls?: string
  /** 追加到布局根节点的 className。 */
  className?: string
  /** 追加到布局根节点的稳定 className，语义与 antd rootClassName 保持一致。 */
  rootClassName?: string
  /** 布局根节点的内联样式；优先级高于 styles.root。 */
  style?: CSSProperties
  /** 按语义节点追加 className，不依赖内部生成的 CSS 类名。 */
  classNames?: ProLayoutClassNames
  /** 按语义节点覆盖内联样式。 */
  styles?: ProLayoutStyles
}

/** React Router 入口只补充一个稳定 core 实例和允许变化的运行时回调。 */
export interface ReactRouterProLayoutProps extends ProLayoutProps, RouterRuntimeOptions {
  router: RouterCore<ProLayoutRoute>
}

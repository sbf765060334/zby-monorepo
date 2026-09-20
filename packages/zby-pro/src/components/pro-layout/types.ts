import type { RouterCore, RouterRoute, RouterRuntimeOptions } from '@zby/router-core'
import type { FormatValues } from '@zby/intl'
import type { SpinProps, TagProps } from 'antd'
import type {
  ComponentType,
  CSSProperties,
  ElementType,
  ErrorInfo,
  ReactElement,
  ReactNode,
} from 'react'

/** 菜单、面包屑中使用的路由图标最小属性。 */
export interface ProLayoutRouteIconProps {
  className?: string
  style?: CSSProperties
}

/** 标题描述符的对象形式，用于需要兜底文案或插值参数的场景。 */
export interface ProLayoutTitleDescriptor {
  /** 语言包中的文案 key，例如 `app.menu.dashboard`。 */
  key: string
  /** 语言包缺失该 key 时显示的文案；省略时回退为 key 本身。 */
  defaultMessage?: string
  /** 插值参数，对应语言包模板中的 `{{name}}` 占位符。 */
  values?: FormatValues
}

/**
 * ProLayout 的路由标题。
 *
 * 两种写法：直接给一个语言包 key 字符串，或者给一个带 `defaultMessage`、`values`
 * 的描述符对象。两者都在渲染时才被翻译，因此切换语言不需要重建 RouterCore，已经
 * 打开的页签也会跟着更新。
 *
 * 存进来的必须是「怎么得到文案」，不能是已经翻译好的成品文案。
 */
export type ProLayoutTitle = string | ProLayoutTitleDescriptor

/** 菜单路由旁的状态标签。 */
export interface ProLayoutRouteTagConfig {
  /** 标签文案描述符；与 `title` 一样在渲染时才翻译。 */
  text: ProLayoutTitle
  color?: TagProps['color']
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
  title: ProLayoutTitle
  routes?: ProLayoutRoute[]
  element?: ProLayoutRouteComponent
  icon?: ComponentType<ProLayoutRouteIconProps>
  _blank?: boolean
  target?: '_blank' | '_self' | string
  ignore?: boolean
  /** 该路由没有页面，点击只弹提示；`true` 使用内置文案，其余按标题描述符解释。 */
  prompt?: true | ProLayoutTitle
  tag?: string | ProLayoutRouteTagConfig
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

type ProLayoutHeaderLayoutStyleName =
  | 'boxSizing'
  | 'height'
  | 'insetBlockStart'
  | 'insetInlineStart'
  | 'maxHeight'
  | 'maxWidth'
  | 'minHeight'
  | 'minWidth'
  | 'position'
  | 'width'
  | 'paddingInlineStart'

/** Header 的定位、尺寸和侧栏占位由 ProLayout 统一管理，semantic style 只负责非结构样式。 */
export type ProLayoutHeaderStyle = Omit<CSSProperties, ProLayoutHeaderLayoutStyleName>

export type ProLayoutStyles = Partial<
  Omit<Record<ProLayoutSemanticName, CSSProperties>, 'header'> & {
    header: ProLayoutHeaderStyle
  }
>

/** 页面渲染错误上报时提供给宿主的稳定页面上下文。 */
export interface ProLayoutPageErrorContext {
  pathname: string
}

/** 页面错误只通过回调交给宿主，上报工具由应用自行选择。 */
export type ProLayoutPageErrorHandler = (
  error: unknown,
  info: ErrorInfo,
  context: ProLayoutPageErrorContext,
) => void

/** 路由页面进入 Suspense 时使用的加载占位配置。 */
export interface ProLayoutPageLoading {
  /** 延迟显示默认 Spin 的毫秒数；默认为 300。 */
  delay?: number
  /** 默认 Spin 的说明内容。 */
  description?: SpinProps['description']
  /** 默认 Spin 的自定义加载指示符。 */
  indicator?: SpinProps['indicator']
  /** 完全替换默认加载占位；接收当前页面的真实 pathname。 */
  render?: (info: { pathname: string }) => ReactNode
}

/** 不包含任何 router-core 固定配置的纯 UI 属性。 */
export interface ProLayoutProps {
  /** 应用标题；当前页面存在标题时，浏览器标题显示为“页面标题 - 应用标题”。 */
  title: string
  /** 顶部 Logo 与页签栏右侧扩展内容。 */
  header?: ProLayoutHeaderConfig
  /** 是否在页签栏下方显示全局路由面包屑；默认为 true。 */
  showBreadcrumb?: boolean
  /** 当前页面标题变化后的通知回调；无匹配页面时传入空字符串。 */
  setPage?: (pageName: string) => void
  /** 页面渲染异常后的通知回调；原始异常只交给宿主，不显示给最终用户。 */
  onPageError?: ProLayoutPageErrorHandler
  /** 页面懒加载占位配置；false 只关闭中央占位，不关闭顶部页面加载进度。 */
  pageLoading?: false | ProLayoutPageLoading
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
  /** 按语义节点覆盖非结构性内联样式；Header 的定位、尺寸和侧栏占位由布局统一管理。 */
  styles?: ProLayoutStyles
}

/** React Router 入口只补充一个稳定 core 实例和允许变化的运行时回调。 */
export interface ReactRouterProLayoutProps extends ProLayoutProps, RouterRuntimeOptions {
  router: RouterCore<ProLayoutRoute>
}

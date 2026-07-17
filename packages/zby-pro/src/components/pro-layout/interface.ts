import type { TagProps, TooltipProps } from 'antd'
import type {
  ComponentType,
  CSSProperties,
  ElementType,
  ReactElement,
  ReactNode,
} from 'react'
import type {
  ProLayoutStorageAdapter,
  ProLayoutStorageErrorInfo,
  ProLayoutStorageState,
} from './store'

interface ProLayoutRouteIconProps {
  /** 图标元素接收的自定义类名。 */
  className?: string
  /** 图标元素接收的内联样式。 */
  style?: CSSProperties
}

interface ProLayoutRouteTagConfig {
  /** 标签展示的文本。 */
  text: string
  /** 标签颜色，语义与 antd Tag 的 color 属性一致。 */
  color?: TagProps['color']
}

interface ProLayoutRouteAnchorPoint {
  /** 页面锚点，可以包含或省略 `#` 前缀。 */
  anchor: string
  /** 锚点在菜单中展示的标题。 */
  title: string
}

/** 支持可选 preload 能力的页面组件，或者已经创建的 React Element。 */
export type ProLayoutRouteComponent =
  | (ElementType<Record<string, never>> & {
    /** 在真正导航到页面前预加载页面资源。 */
    preload?: () => void | Promise<void>
  })
  | ReactElement

/** ProLayout 的路由树节点。 */
export interface ProLayoutRoute {
  /** 路由注册、解析和导航使用的路径。 */
  path: string
  /** 菜单、页签、面包屑和页面标题使用的名称。 */
  title: string
  /** 当前节点的子路由。 */
  routes?: ProLayoutRoute[]
  /** 将没有 element 的节点标记为可展示菜单入口；客户端页面渲染仍需要 element。 */
  page?: boolean
  /** 当前路由对应的页面组件或 React Element。 */
  element?: ProLayoutRouteComponent
  /** 菜单项展示的图标组件。 */
  icon?: ComponentType<ProLayoutRouteIconProps>
  /** 菜单标题 Tooltip 的属性。 */
  tooltipProps?: TooltipProps
  /** 是否使用原生链接或新窗口方式打开，而不是交给 ProLayout 内部导航。 */
  _blank?: boolean
  /** 原生链接打开位置，例如 `_blank` 或 `_self`。 */
  target?: '_blank' | '_self' | string
  /** 交给 hasAuth 判断的页面权限码。 */
  auth?: string
  /** 是否从菜单等可见导航结构中忽略当前路由。 */
  ignore?: boolean
  /** 参数路由的不同真实 pathname 是否分别创建独立页签。 */
  supportMultipleTabs?: boolean
  /** 页面尚不可用时的提示开关或自定义提示文本。 */
  prompt?: true | string
  /** 菜单项旁展示的标签文本或标签配置。 */
  tag?: string | ProLayoutRouteTagConfig
  /** 当前页面可从菜单直接跳转的锚点列表。 */
  anchorPoints?: ProLayoutRouteAnchorPoint[]
}

/** 系统切换入口展示的数据。 */
export interface ProLayoutSystemItem {
  /** 系统的稳定唯一标识。 */
  systemName: string
  /** 系统名称。 */
  name: string
  /** 系统入口优先展示的描述文本。 */
  description: string
  /** 系统 Logo 的图片地址。 */
  logo: string
  /** 点击系统入口后打开的地址。 */
  url: string
  /** 是否为当前正在使用的系统。 */
  active?: boolean
}

/** KeepAlive 页面筛选和缓存数量配置。 */
export interface ProLayoutKeepAliveConfig {
  /** 最多保留的页面实例数量；未设置时不限制数量。 */
  maxCachedPages?: number
  /** 允许保留的页签 key 列表，或根据路由判断是否保留的函数。 */
  include?: string[] | ((route: ProLayoutRoute) => boolean)
  /** 禁止保留的页签 key 列表，或根据路由判断是否排除的函数。 */
  exclude?: string[] | ((route: ProLayoutRoute) => boolean)
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
  | 'content'
  | 'page'
  | 'collection'

export type ProLayoutClassNames = Partial<Record<ProLayoutSemanticName, string>>
export type ProLayoutStyles = Partial<Record<ProLayoutSemanticName, CSSProperties>>

export type ProLayoutHeaderLogo = ReactNode | ((collapsed: boolean) => ReactNode)
export type ProLayoutLogoRenderer = (collapsed: boolean) => ReactNode

export interface ProLayoutHeaderConfig {
  /** 侧边栏顶部 Logo，函数形式可以根据折叠状态返回不同内容。 */
  logo?: ProLayoutHeaderLogo
  /** 页签栏右侧渲染的自定义内容。 */
  extra?: ReactNode
}

/** `auto` 表示跟随操作系统，另外两种模式固定使用对应外观。 */
export type ProLayoutThemeMode = 'light' | 'dark' | 'auto'
export type ProLayoutThemeAppearance = Exclude<ProLayoutThemeMode, 'auto'>

/** 仅保留跟随系统、浅色和暗黑三种主题模式。 */
export interface ProLayoutThemeConfig {
  /** 是否在 Header 中启用 ProLayout 内置主题切换入口。 */
  enabled?: boolean
  /** 非受控模式下首次使用的主题模式。 */
  defaultMode?: ProLayoutThemeMode
  /** 受控模式下当前生效的主题模式。 */
  mode?: ProLayoutThemeMode
  /** 请求切换主题模式时的回调。 */
  onModeChange?: (mode: ProLayoutThemeMode) => void
  /** 主题模式持久化使用的 storage key。 */
  storageKey?: string
}

export interface ProLayoutAfterTabCloseInfo {
  /** 被关闭页签最后对应的真实 pathname。 */
  pathname: string
}

/** React Router 版本 ProLayout 的公共属性。 */
export interface ProLayoutProps {
  /** 应用标题，同时作为浏览器页面标题的基础文本。 */
  title: string
  /** 驱动菜单、权限、页签、面包屑和页面渲染的不可变路由快照。 */
  routes: ProLayoutRoute[]
  /** Header 的 Logo 和右侧扩展内容配置。 */
  header?: ProLayoutHeaderConfig
  /** 跟随系统、浅色和暗黑主题配置。 */
  theme?: ProLayoutThemeConfig
  /** 是否展示页面面包屑区域。 */
  showBreadcrumb?: boolean
  /**
   * 根据权限码判断当前用户是否有权限。
   *
   * 注意：ProLayout 会固定使用首次挂载时传入的函数，后续替换引用或改变其判断结果
   * 都不会刷新权限路由。用户、租户或权限上下文变化时必须重新挂载 ProLayout。
   */
  hasAuth?: (code: string) => boolean
  /** 当前页面变化时，将页面名称同步给外部系统。 */
  setPage?: (pageName: string) => void
  /** 页签完成关闭和状态清理后的回调。 */
  afterTabClose?: (tabKey: string, info?: ProLayoutAfterTabCloseInfo) => void
  /** 是否注册浏览器离开确认，也可以通过函数动态判断。 */
  beforeUnload?: boolean | (() => boolean)
  /** 内容区域允许收缩到的最小宽度。 */
  minimumContentWidth?: number | string
  /** 是否隐藏侧边菜单和顶部页签栏。 */
  noBar?: boolean
  /** 访问根路径或不可直接展示的目录时优先跳转的路径。 */
  defaultRedirectPath?: string
  /** 同时允许固定的最大页签数量。 */
  maxFixedTabCount?: 4 | 6 | 8 | number
  /** 侧边栏底部可切换的系统入口列表。 */
  systemList?: ProLayoutSystemItem[]
  /** 自定义 ProLayout CSS 类名前缀。 */
  prefixCls?: string
  /** 追加到 ProLayout 根节点的类名。 */
  className?: string
  /** 追加到 ProLayout 最外层根节点的类名。 */
  rootClassName?: string
  /** ProLayout 根节点的内联样式。 */
  style?: CSSProperties
  /** 按语义区域追加的类名。 */
  classNames?: ProLayoutClassNames
  /** 按语义区域追加的内联样式。 */
  styles?: ProLayoutStyles
  /** 收藏、固定页签和参数路径持久化使用的命名空间。 */
  storageKey?: string
  /** 自定义持久化适配器；传入 false 时只保留当前挂载期间的内存状态。 */
  storageAdapter?: false | ProLayoutStorageAdapter
  /** 首次创建 Store 时使用的预加载持久化状态。 */
  initialStorageState?: ProLayoutStorageState
  /** 持久化加载或保存失败时的回调。 */
  onStorageLoadError?: (error: unknown, info: ProLayoutStorageErrorInfo) => void
  /** 是否启用页面实例缓存，或提供详细的 KeepAlive 配置。 */
  keepAlive?: boolean | ProLayoutKeepAliveConfig
}

export type ProLayoutRouteMapping = Record<string, ProLayoutRoute>

export interface ProLayoutCurrentRoute {
  /** 当前层级匹配到的路由配置。 */
  route: ProLayoutRoute
  /** 已将参数占位符替换为真实参数的路径。 */
  realPath: string
}

export interface ProLayoutPage {
  /** 页面实例和页签共用的稳定 key。 */
  key: string
  /** 页面实例当前对应的真实 pathname。 */
  pathname: string
  /** 页面实例使用的路由配置。 */
  route: ProLayoutRoute
  /** 页面最近一次被访问的时间，用于 KeepAlive 淘汰排序。 */
  touchedAt: number
}

export type ProLayoutBeforeCloseHook = () => boolean | Promise<boolean>

export interface ProLayoutCloseOptions {
  /** 是否跳过当前页签注册的所有关闭前 Hook。 */
  skipBeforeClose?: boolean
}

export interface ProLayoutLocationEventPayload {
  /** 页面收到 location 事件时的 pathname。 */
  pathname: string
  /** 页面收到 location 事件时包含 `?` 前缀的 search。 */
  search: string
  /** 页面收到 location 事件时包含 `#` 前缀的 hash。 */
  hash: string
}

export interface ProLayoutEmitter<T> {
  /** 向当前 emitter 的订阅者发布数据。 */
  emit: (payload: T) => void
  /** 在 React 组件中订阅 emitter 数据。 */
  useSubscription: (callback: (payload: T) => void) => void
}

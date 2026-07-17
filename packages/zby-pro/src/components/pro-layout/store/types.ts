import type { StoreApi } from 'zustand/vanilla'

import type {
  ProLayoutBeforeCloseHook,
  ProLayoutCloseOptions,
  ProLayoutCurrentRoute,
  ProLayoutKeepAliveConfig,
  ProLayoutLocationEventPayload,
  ProLayoutLogoRenderer,
  ProLayoutPage,
  ProLayoutProps,
  ProLayoutRoute,
  ProLayoutSystemItem,
} from '../interface'
import type { ProLayoutRouteRegistry } from '../route'
import type { ProLayoutNavigate } from '../router'
import type { ProLayoutCache } from './cache'
import type { ProLayoutStorageAdapter, ProLayoutStorageState } from './interface'

/**
 * Store 内部使用的页签领域模型。
 *
 * Store 只需要稳定 key 和文本标题，不直接依赖 antd TabsProps。后续 UI 层可以把
 * 该数组转换为 antd Tabs items，并在转换时补充图标、Tooltip 和关闭按钮等视图属性。
 */
export interface ProLayoutTab {
  /** 页签身份；普通路由是注册 path，多页签参数路由是实际 pathname。 */
  key: string
  /** 页签当前展示的文本标题。 */
  label: string
  /** 是否由业务通过 setTabLabel 覆盖；false 时跟随最新 route.title。 */
  labelCustomized: boolean
}

/** Store 触发成功或信息提示时依赖的最小消息能力。 */
export interface ProLayoutMessageApi {
  /** 展示一次成功反馈。 */
  success?: (content: string) => unknown
  /** 展示带类型的消息；当前 Store 只使用 info 类型。 */
  open?: (config: { type: 'info', content: string }) => unknown
}

/**
 * Store 实际使用的最小国际化能力。
 *
 * 这里采用结构化接口而不导入 @zby/intl 源码，真实 IntlShape 仍然可以直接赋值；
 * 同时避免 monorepo paths 把相邻包源码拉进 @zby/pro 的 rootDir。
 */
export interface ProLayoutIntl {
  /** 获取国际化文案，并支持固定数量提示所需的简单插值。 */
  getMessage: (
    id: string,
    defaultMessage?: string,
    values?: Record<string, string | number | boolean | Date | null | undefined>,
  ) => string
}

/** ProLayout Store 的完整运行时状态与动作。 */
export interface ProLayoutStoreState {
  /** 宿主路由提供的导航函数；Core 挂载后通过 syncExternalDeps 注入。 */
  navigate: ProLayoutNavigate | null
  /** UI 消息能力；Store 只依赖 ProLayoutMessageApi 的最小结构。 */
  messageApi: ProLayoutMessageApi | null
  /** 当前国际化对象；locale 变化时必须同步新引用。 */
  intl: ProLayoutIntl
  /** 当前路由查询注册表。 */
  registry: ProLayoutRouteRegistry
  /** 当前持久化命名空间。 */
  storageKey: string
  /** 首次挂载时保存的页面权限判断函数。 */
  hasAuth: ProLayoutProps['hasAuth']
  /** 最大固定页签数量。 */
  maxFixedTabCount: number
  /** KeepAlive 开关或详细配置。 */
  keepAlive: boolean | ProLayoutKeepAliveConfig
  /** 页面展示变化时通知外部系统的回调。 */
  onPageDisplay: ProLayoutProps['setPage'] | null
  /** 页签完成关闭和资源清理后的回调。 */
  afterTabClose: ProLayoutProps['afterTabClose'] | null
  /** Logo 渲染函数。 */
  renderLogo: ProLayoutLogoRenderer | null
  /** 系统切换入口列表。 */
  systemList: ProLayoutSystemItem[]
  /** 是否隐藏菜单和页签栏。 */
  noBar: boolean
  /** 是否展示面包屑。 */
  showBreadcrumb: boolean
  /** Header 高度。 */
  headerHeight: number
  /** 面包屑区域高度。 */
  breadcrumbHeight: number
  /** 实际 pathname 到动态页面描述文本的映射。 */
  pathnameDescriptionMap: Record<string, string>
  /** 当前 pathname 对应的完整路由层级。 */
  currentRoutes: ProLayoutCurrentRoute[]
  /** 当前菜单选中路径。 */
  currentSelectedPath: string[]
  /** 宿主路由的当前 pathname。 */
  currentPathname: string
  /** 当前激活的页签 key。 */
  activeTabKey: string | null
  /** 已打开页签。 */
  tabs: ProLayoutTab[]
  /** 当前仍保留实例的页面集合。 */
  pages: ProLayoutPage[]
  /** 当前激活的页面实例 key。 */
  activePage: string | null
  /** 已收藏路由 path。 */
  collectionSet: string[]
  /** 已固定页签 key。 */
  fixedSet: string[]
  /** 页签级 pathname、search 和 hash 缓存。 */
  cache: ProLayoutCache
  /** 当前持久化适配器；false 表示纯内存模式。 */
  storageAdapter: false | ProLayoutStorageAdapter
  /** 当前持久化来源是否已经完成初始化。 */
  storageHydrated: boolean
  /** 是否正在加载持久化状态。 */
  storageLoading: boolean
  /** 最近一次持久化加载错误。 */
  storageLoadError: unknown
  /** 持久化加载或保存失败回调。 */
  onStorageLoadError: ProLayoutProps['onStorageLoadError'] | null

  /** 从当前持久化来源加载状态；并发本地修改按字段完成冲突合并。 */
  hydrateStorage: () => Promise<void>
  /** 注册或注销页签的 location 事件发射器。 */
  registerPageLocationEmitter: (
    tabKey: string,
    emitter: { emit: (payload: ProLayoutLocationEventPayload) => void } | null,
  ) => () => void
  /** 向指定页签发布 location 变化事件。 */
  emitPageLocationEvent: (tabKey: string, payload: ProLayoutLocationEventPayload) => void
  /** 同步 React/Core 在 Store 创建后发生变化的外部依赖。 */
  syncExternalDeps: (data: ProLayoutExternalDeps) => void
  /** 根据首个 pathname 处理根路径和目录重定向。 */
  bootstrapByPathname: (data: { pathname: string, defaultRoute?: string | null }) => void
  /** 根据宿主 pathname 创建或激活对应页签和页面。 */
  syncByPathname: (pathname: string) => void
  /** 合并实际 pathname 对应的动态描述。 */
  setPathnameDescription: (map: Record<string, string>) => void
  /** 修改指定页签标题。 */
  setTabLabel: (key: string, label: string) => void
  /** 替换页签顺序，并同步固定页签的组内顺序。 */
  setTabs: (tabs: ProLayoutTab[]) => void
  /** 运行关闭前 Hook，关闭页签并完成关联资源清理。 */
  closeTab: (key: string, options?: ProLayoutCloseOptions) => Promise<boolean>
  /** 关闭旧页签成功后打开新地址。 */
  closeThisTabOpenNewOne: (
    data: { oldPath: string, newPath: string },
    options?: ProLayoutCloseOptions,
  ) => Promise<boolean>
  /** 为 pathname 对应页签增加关闭前 Hook。 */
  addBeforeCloseHook: (handler: ProLayoutBeforeCloseHook, pathname: string) => void
  /** 清理 pathname 对应的指定 Hook 或全部 Hook。 */
  clearBeforeCloseHook: (pathname: string, handler?: ProLayoutBeforeCloseHook) => void
  /** 计算 pathname 对应的页签 key。 */
  getTabKey: (pathname: string) => string | null
  /** 打开完整 URL；undefined 恢复缓存，null/空字符串显式清空 search/hash。 */
  jumpTo: (
    url:
      | string
      | { pathname: string, searchParams?: string | null, hash?: string | null },
  ) => void
  /** 在当前页签内替换地址，或在 pathname 变化时转交 jumpTo。 */
  smartNavigate: (data: {
    pathname?: string
    searchParams?: string | null
    hash?: string | null
  }) => void
  /** 解析完整或权限路由索引中的叶子路由。 */
  resolveLeafRoute: (
    pathname: string,
    withinAuth?: boolean,
  ) => { routeKey: string, route: ProLayoutRoute } | null
  /** 获取 pathname 对应的完整路由层级。 */
  getCurrentRoutes: (pathname: string) => ProLayoutCurrentRoute[]
  /** 收藏或取消收藏路由。 */
  toggleCollection: (path: string) => void
  /** 固定或取消固定页签。 */
  toggleFixed: (path: string) => void
}

/** Store 创建后允许由 Core 动态同步的依赖。 */
export type ProLayoutExternalDeps = Partial<{
  navigate: ProLayoutNavigate | null
  messageApi: ProLayoutMessageApi | null
  intl: ProLayoutIntl
  registry: ProLayoutRouteRegistry
  storageKey: string
  maxFixedTabCount: number
  keepAlive: boolean | ProLayoutKeepAliveConfig
  headerHeight: number
  breadcrumbHeight: number
  currentRoutes: ProLayoutCurrentRoute[]
  currentSelectedPath: string[]
  currentPathname: string
  noBar: boolean
  showBreadcrumb: boolean
  onPageDisplay: ProLayoutProps['setPage'] | null
  afterTabClose: ProLayoutProps['afterTabClose'] | null
  renderLogo: ProLayoutLogoRenderer | null
  systemList: ProLayoutSystemItem[]
  /** undefined 表示恢复默认 IndexedDB Adapter，false 表示纯内存模式。 */
  storageAdapter: false | ProLayoutStorageAdapter | undefined
  onStorageLoadError: ProLayoutProps['onStorageLoadError'] | null
}>

/** 创建独立 ProLayout Store 所需的初始参数。 */
export interface CreateProLayoutStoreParams {
  /** 创建 Store 时使用的路由注册表快照。 */
  registry: ProLayoutRouteRegistry
  /** 持久化命名空间。 */
  storageKey: string
  /** 初始权限判断函数。 */
  hasAuth: ProLayoutProps['hasAuth']
  /** 初始最大固定页签数量。 */
  maxFixedTabCount: number
  /** 初始 KeepAlive 配置。 */
  keepAlive: boolean | ProLayoutKeepAliveConfig
  /** Header 高度。 */
  headerHeight: number
  /** 面包屑高度。 */
  breadcrumbHeight: number
  /** 初始是否隐藏菜单和页签栏。 */
  noBar: boolean
  /** 初始是否显示面包屑。 */
  showBreadcrumb: boolean
  /** 初始国际化对象。 */
  intl: ProLayoutIntl
  /** 页面展示回调。 */
  onPageDisplay?: ProLayoutProps['setPage']
  /** 页签关闭后回调。 */
  afterTabClose?: ProLayoutProps['afterTabClose']
  /** Logo 渲染函数。 */
  renderLogo?: ProLayoutLogoRenderer | null
  /** 系统切换入口。 */
  systemList?: ProLayoutSystemItem[]
  /** 初始持久化适配器；undefined 使用默认 IndexedDB Adapter。 */
  storageAdapter?: false | ProLayoutStorageAdapter
  /** SSR 或外部预加载的初始持久化状态。 */
  initialStorageState?: ProLayoutStorageState
  /** Store 创建时宿主路由的 pathname。 */
  initialPathname?: string
  /** 根路径优先使用的默认路由。 */
  defaultRoute?: string | null
  /** 持久化错误回调。 */
  onStorageLoadError?: ProLayoutProps['onStorageLoadError']
}

/** Zustand Store API 的本地别名。 */
export type ProLayoutStoreApi = StoreApi<ProLayoutStoreState>

/** 拆分动作模块共享的 setState 类型。 */
export type SetProLayoutStoreState = ProLayoutStoreApi['setState']

/** 拆分动作模块共享的 getState 类型。 */
export type GetProLayoutStoreState = ProLayoutStoreApi['getState']

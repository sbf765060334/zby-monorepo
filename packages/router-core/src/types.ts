/**
 * 文件职责：集中声明 router-core 对外公开的领域类型和接口。
 *
 * 这个文件没有运行时代码。阅读它可以先弄清“路由、页签、页面、宿主、存储”分别长
 * 什么样，再去看其它实现文件；上层项目也从这些类型获得 TypeScript 提示。
 */
import type { StoreApi } from 'zustand/vanilla'
import type { RouteRegistry } from './registry/types'

/**
 * router-core 的公共领域类型。
 *
 * 本文件只描述平台路由、页签、页面实例和持久化契约，不引用 React、React Router
 * 或任何 UI 组件库。React 层和 ProLayout 后续都应通过这些类型与 core 交互。
 */

/**
 * ZBY 平台路由树节点。
 *
 * core 只消费路径、标题、权限和多页签等路由语义；icon、tag、element 等额外元数据
 * 会被路由快照原样保留，供上层 UI 使用。创建 core 后不要再修改传入的路由对象。
 */
export interface RouterRoute {
  /** 注册路径，支持静态段、`:param` 参数段和末尾 `*` 通配符。 */
  path: string
  /** 页签、菜单或面包屑使用的默认标题。 */
  title: string
  /** 子路由；目录和页面都可以继续拥有子节点。 */
  routes?: RouterRoute[]
  /** 交给 `hasAuth` 判断的权限码。 */
  auth?: string
  /** 动态路由的不同真实 pathname 是否分别创建独立页签。 */
  supportMultipleTabs?: boolean
  /** 默认页面判定只检查该字段是否存在，core 不解释其具体类型。 */
  element?: unknown
  /** 提前加载页面资源；预加载失败由调用方隔离，不改变正常导航语义。 */
  preload?: () => void | Promise<void>
  /** 允许平台上层附加 icon、tag 等元数据，而不让 core 依赖具体 UI 库。 */
  [key: string]: unknown
}

/**
 * 当前 pathname 匹配到的单层路由信息。
 *
 * @typeParam Route 调用方传入的路由节点类型；扩展的 UI 元数据会原样保留。
 */
export interface RouterCurrentRoute<
  Route extends RouterRoute = RouterRoute,
> {
  /** 当前层级匹配到的 Registry 路由快照。 */
  readonly route: Route
  /** 已使用当前 pathname 参数替换占位符的真实层级路径。 */
  readonly realPath: string
}

/**
 * 页面实例保留规则；exclude 的优先级高于 include。
 *
 * @typeParam Route KeepAlive 判断函数接收的调用方路由节点类型。
 */
export interface RouterKeepAliveConfig<
  Route extends RouterRoute = RouterRoute,
> {
  /** 最多保留的页面实例数；活动页和固定页签不会被普通 LRU 淘汰。 */
  maxCachedPages?: number
  /** 允许保留的页签 key 白名单，或按路由判断的白名单函数。 */
  include?: string[] | ((route: Route) => boolean)
  /** 禁止保留的页签 key 黑名单，或按路由判断的黑名单函数。 */
  exclude?: string[] | ((route: Route) => boolean)
}

/** 与具体 Tabs 组件无关的页签领域模型。 */
export interface RouterTab {
  /** 稳定页签身份；共享动态路由通常使用注册 pattern。 */
  readonly key: string
  /** 当前显示标题，默认来自 route.title。 */
  readonly label: string
  /** 是否已由业务调用 `setTabLabel` 覆盖默认标题。 */
  readonly labelCustomized: boolean
}

/**
 * 当前仍保有实际页面实例的路由描述，用于 KeepAlive 与渲染层。
 *
 * @typeParam Route 创建页面实例时保存的调用方路由节点类型。
 */
export interface RouterPage<Route extends RouterRoute = RouterRoute> {
  /** 与 RouterTab 共用的页签身份。 */
  readonly key: string
  /** 页面实例最后对应的真实 pathname。 */
  readonly pathname: string
  /** 创建该页面实例所使用的路由快照。 */
  readonly route: Route
  /** 最近访问时间，用于有限 KeepAlive 的 LRU 淘汰。 */
  readonly touchedAt: number
}

/** core 从宿主路由接收的标准化地址。 */
export interface RouterLocation {
  /** 当前真实路径，不包含 query 和 hash。 */
  pathname: string
  /** 包含或省略 `?` 均可；core 会在缓存边界统一格式。 */
  search: string
  /** 包含或省略 `#` 均可；core 会在缓存边界统一格式。 */
  hash: string
}

/** 当前宿主地址是否已经完成 Core 落点确认。 */
export type RouterNavigationStatus =
  | 'bootstrapping'
  | 'navigating'
  | 'redirecting'
  | 'settled'

/** 宿主路由可以接受的最小导航目标。 */
export type RouterNavigateTarget =
  | string
  | { pathname: string, search?: string, hash?: string }

/** 宿主导航函数；React Router Adapter 后续会实现该契约。 */
export type RouterNavigate = (
  target: RouterNavigateTarget,
  options?: { replace?: boolean },
) => void

/**
 * 真正负责改变 URL 的宿主能力。
 *
 * Core 只会发出导航请求，不假设浏览器或具体框架；React Router Adapter 会实现它。
 */
export interface RouterHost {
  /** core 执行最终地址变更时调用的底层导航能力。 */
  navigate: RouterNavigate
  /**
   * 根路径或目录落点使用的重定向能力。
   *
   * React Adapter 会把它转换为 effect 中的导航；其它宿主可以省略并复用 navigate。
   */
  redirect?: RouterNavigate
}

/** 页签关闭前守卫；只有所有守卫都明确返回 true 才允许关闭。 */
export type RouterBeforeCloseHook = () => boolean | Promise<boolean>

/** 调用关闭命令时允许提供的额外控制项。 */
export interface RouterCloseOptions {
  /** 组合命令或受信调用方可以跳过页面注册的关闭守卫。 */
  skipBeforeClose?: boolean
}

/** 页签完成关闭后传给通知回调的补充信息。 */
export interface RouterAfterTabCloseInfo {
  /** 被关闭页签最后对应的真实 pathname，而不是共享动态 route pattern。 */
  pathname: string
}

/** 向指定页面实例广播的地址变更事件。 */
export interface RouterLocationEventPayload {
  /** 当前真实路径，不包含 query 和 hash。 */
  pathname: string
  /** 标准化查询字符串；非空时始终包含 `?` 前缀。 */
  search: string
  /** 标准化锚点；非空时始终包含 `#` 前缀。 */
  hash: string
}

/** router-core 自己负责持久化的路由状态。 */
export interface RouterStorageState {
  /** 固定页签 key，数组顺序同时代表固定页签的显示顺序。 */
  fixedTabs: string[]
  /** 共享动态页签 key 到最后真实 pathname 的映射。 */
  fixedParamsPathMap: Record<string, string>
  /** 已收藏的注册页面路由 path，数组顺序同时代表收藏顺序。 */
  favoriteRoutePaths: string[]
}

/** 持久化失败时所处的精确读写阶段。 */
export type RouterStorageErrorPhase = 'load' | 'update'

/** 持久化错误回调收到的上下文，帮助业务判断哪一次读写失败。 */
export interface RouterStorageErrorInfo {
  /** 本次读写对应的持久化命名空间。 */
  storageKey: string
  /** 失败的加载或保存阶段。 */
  phase: RouterStorageErrorPhase
}

/**
 * router-core 持久化适配器。
 *
 * 和 idb-keyval 一样：读用 load，写用 update(latest => next)。
 * Core 只提交字段或单个 pathname 的 recipe，由 Adapter 对着磁盘最新值合并。
 */
export interface RouterStorageAdapter {
  /** 加载指定命名空间；字段可缺失，Core 会补空值。 */
  load: (storageKey: string) => Promise<Partial<RouterStorageState>>
  /**
   * 在最新持久化状态上应用一次变更。
   *
   * recipe 收到的是已经补齐字段的完整状态；Adapter 必须基于当前磁盘值执行，
   * 不能先用调用方手里的过期快照整份覆盖。
   */
  update: (
    storageKey: string,
    recipe: (current: RouterStorageState) => RouterStorageState,
  ) => Promise<void>
}

/**
 * 只在一个 router-core 实例创建时读取一次的定义。
 *
 * 这些字段决定 Registry、页面身份或实例生命周期。调用方要变更它们时应创建新的
 * core 实例，不应期待后续 React render 自动覆盖当前实例。
 *
 * @typeParam Route 调用方路由节点类型；扩展元数据会贯穿 Registry、State 和 KeepAlive。
 */
export interface CreateRouterCoreOptions<
  Route extends RouterRoute = RouterRoute,
> {
  /** 用于生成完整索引与权限索引的路由树；创建时递归复制为内部快照。 */
  routes: Route[]
  /** 创建权限路由快照时使用的权限判断函数。 */
  hasAuth?: (code: string) => boolean
  /** 访问根路径 `/` 时优先跳转的具体页面地址。 */
  defaultRedirectPath?: string
  /** 页面路由判断规则；默认以 element 是否存在为准。 */
  isPageRoute?: (route: Route) => boolean
  /** 固定的页面实例缓存策略；省略时等同于 true。 */
  keepAlive?: boolean | RouterKeepAliveConfig<Route>
  /** 固定的持久化驱动；false 表示本实例仅使用内存状态。 */
  storageAdapter?: false | RouterStorageAdapter
  /** 固定的持久化命名空间；省略时使用 `default`。 */
  storageKey?: string
  /** 固定页签数量上限；省略时使用 4。 */
  maxFixedTabCount?: number
}

/**
 * 创建后允许显式更新的运行时回调。
 *
 * 回调不会改变路由身份或 Store 状态，可以由 React Provider 在后续 render 中同步
 * 最新引用；storageKey 和 maxFixedTabCount 等固定配置不属于运行时更新范围。
 */
export interface RouterRuntimeOptions {
  /**
   * 页签关闭状态提交、Cache 和关联资源清理完成后的通知回调。
   *
   * 回调不能撤销已经提交的关闭；需要拒绝关闭时应注册 RouterBeforeCloseHook。core
   * 不等待异步结果，并会隔离、报告同步异常和异步 rejection，避免通知失败阻断导航。
   */
  onTabClose?: (
    tabKey: string,
    info: RouterAfterTabCloseInfo,
  ) => void | Promise<void>
  /**
   * 持久化加载或保存失败后的通知回调。
   *
   * 回调不能替换原始存储错误或改变已经提交的内存状态。core 不等待异步结果，并会
   * 隔离、报告同步异常和异步 rejection，避免错误处理逻辑产生新的未处理异常。
   */
  onStorageError?: (
    error: unknown,
    info: RouterStorageErrorInfo,
  ) => void | Promise<void>
}

/**
 * 可订阅的纯路由运行状态；命令与不可观察协调数据不放入该快照。
 *
 * @typeParam Route currentRoutes 与 pages 中保留的调用方路由节点类型。
 */
export interface RouterCoreState<Route extends RouterRoute = RouterRoute> {
  /** 初始化、pathname 导航、重定向或最终落定状态；403/404 只能在 settled 后判断。 */
  readonly navigationStatus: RouterNavigationStatus
  /** 最近一次由宿主同步的 pathname。 */
  readonly currentPathname: string
  /** 当前 pathname 从根到叶子的路由层级。 */
  readonly currentRoutes: readonly RouterCurrentRoute<Route>[]
  /** currentRoutes 对应的真实路径列表，供菜单选中使用。 */
  readonly currentSelectedPath: readonly string[]
  /** 当前 UI 选中的页签 key；403/404 时可能存在而 activePage 为空。 */
  readonly activeTabKey: string | null
  /** 当前实际显示的页面实例 key。 */
  readonly activePage: string | null
  /** 本次会话已打开的全部页签。 */
  readonly tabs: readonly RouterTab[]
  /** 仍被 KeepAlive 保留的页面实例描述。 */
  readonly pages: readonly RouterPage<Route>[]
  /** 当前固定页签 key，顺序与固定页签显示顺序一致。 */
  readonly fixedSet: readonly string[]
  /** 当前收藏的注册页面路由 path，顺序与收藏菜单显示顺序一致。 */
  readonly favoriteRoutePaths: readonly string[]
  /** 真实 pathname 到业务描述文本的增量映射。 */
  readonly pathnameDescriptionMap: Readonly<Record<string, string>>
  /** 实例创建时固定的持久化命名空间。 */
  readonly storageKey: string
  /** 实例创建时固定的最大页签数量。 */
  readonly maxFixedTabCount: number
  /** 当前 storageKey 是否已经完成首次数据加载。 */
  readonly storageHydrated: boolean
  /** 当前是否存在进行中的 hydration。 */
  readonly storageLoading: boolean
  /** 最近一次 hydration 错误；重试开始时会清空。 */
  readonly storageLoadError: unknown
}

/**
 * 提供给 React selector 和状态观察者的只读 Zustand Store 契约。
 *
 * 只暴露读取初始/当前快照与订阅能力，不暴露 setState。页签、页面、Cache 和持久化
 * 必须通过 RouterCore 领域命令修改，避免调用方绕过关闭守卫和状态不变量。
 *
 * @typeParam Route Store 快照中保留的调用方路由节点类型。
 */
export type RouterReadableStore<Route extends RouterRoute = RouterRoute> = Pick<
  StoreApi<RouterCoreState<Route>>,
  'getState' | 'getInitialState' | 'subscribe'
>

/**
 * 一个独立 router-core 实例提供的查询、订阅和业务命令。
 *
 * 每次调用 createRouterCore 都会返回一套新的 Store、Cache 和私有运行时。业务代码
 * 应复用同一个实例，而不是在每次 React render 中直接重新调用 factory。
 *
 * @typeParam Route 创建时推导的调用方路由节点类型；省略时保持 RouterRoute 兼容类型。
 */
export interface RouterCore<Route extends RouterRoute = RouterRoute> {
  /** 创建时固定的路由查询注册表。 */
  readonly registry: RouteRegistry<Route>
  /** 使用创建实例时固定的权限函数查询任意权限码；未配置时始终返回 true。 */
  readonly hasAuth: (code: string) => boolean
  /** 提供给 React 绑定或状态观察者的只读 vanilla Zustand Store。 */
  readonly store: RouterReadableStore<Route>
  /** 读取当前同步状态快照。 */
  getState: () => RouterCoreState<Route>
  /** 订阅状态变化；返回值由 Zustand 负责取消订阅。 */
  subscribe: StoreApi<RouterCoreState<Route>>['subscribe']
  /** 绑定或解绑实际改变地址的宿主路由。 */
  bindHost: (host: RouterHost | null) => void
  /** 同步允许随宿主生命周期变化的回调引用。 */
  configureRuntime: (options: RouterRuntimeOptions) => void
  /** 从固定 Adapter/storageKey 加载固定页签、动态 pathname 和收藏路由。 */
  hydrateStorage: () => Promise<void>
  /**
   * 接收宿主最新地址，并统一处理根路径/目录落点、路由层级、URL Cache、页签和页面实例。
   * Adapter 不需要也不应分别触发内部 bootstrap 或 pathname 状态确认流程。
   */
  syncLocation: (location: RouterLocation) => void
  /** 请求完整平台导航；页签和页面只在宿主通过 syncLocation 确认后激活。未具体化且无缓存的 pattern 会被忽略。字符串查询串按 URL.search 保留。 */
  jumpTo: (
    url:
      | string
      | { pathname: string, searchParams?: string | null, hash?: string | null },
  ) => void
  /** 同页更新 search/hash 时 replace；pathname 改变时自动转交 jumpTo。 */
  smartNavigate: (data: {
    pathname?: string
    searchParams?: string | null
    hash?: string | null
  }) => void
  /** 根据真实 pathname 计算平台页签身份。 */
  getTabKey: (pathname: string) => string | null
  /** 获取真实 pathname 从根到叶子的路由层级。 */
  getCurrentRoutes: (pathname: string) => RouterCurrentRoute<Route>[]
  /**
   * 按完整 key 排列调整现有页签顺序。
   *
   * 参数必须且只能包含当前全部页签 key，每个 key 恰好出现一次，并保持固定页签组在
   * 普通页签组之前。合法但顺序未变化时返回 true 且不发布状态；非法排列返回 false，
   * 不修改页签、活动页面或持久化数据。
   */
  reorderTabs: (tabKeys: readonly string[]) => boolean
  /** 由业务覆盖指定页签标题。 */
  setTabLabel: (key: string, label: string) => void
  /** 增量合并真实 pathname 的业务描述。 */
  setPathnameDescription: (map: Record<string, string>) => void
  /** 固定或取消固定页签；页签未打开或超过数量限制时返回 false。 */
  toggleFixed: (tabKey: string) => boolean
  /** 收藏或取消收藏注册页面路由；path 无法解析为页面时返回 false。 */
  toggleFavoriteRoute: (path: string) => boolean
  /** 运行关闭守卫；最后一个页签不会关闭。活动页签在宿主确认已离开被关页后清理，确认前同一页签的第二次关闭返回 false。非活动页签立即清理；组合关闭若仍需跳转则先导航，成功后再清理，若该页签在导航中已成为活动页则不再删除。关页跳转使用 replace。 */
  closeTab: (tabKey: string, options?: RouterCloseOptions) => Promise<boolean>
  /** 请求一次最终新地址导航。活动旧页在宿主离开后再关；非活动旧页先跳、成功后再关。整个过程只产生一次最终导航，且使用 replace。 */
  closeThisTabOpenNewOne: (
    data: { oldPath: string, newPath: string },
    options?: RouterCloseOptions,
  ) => Promise<boolean>
  /** 为 pathname 所属页签注册一个关闭前守卫。 */
  addBeforeCloseHook: (handler: RouterBeforeCloseHook, pathname: string) => void
  /** 清理指定守卫；省略 handler 时清理该页签的全部守卫。 */
  clearBeforeCloseHook: (
    pathname: string,
    handler?: RouterBeforeCloseHook,
  ) => void
  /**
   * 订阅指定页签的完整 location，并返回取消订阅函数。
   *
   * 当前页签已经存在宿主 location 时会立即向 listener 补发一次最新地址。同一 tabKey
   * 只绑定当前页面实例的一个 listener；新订阅会接管旧订阅，旧清理函数不会误删新订阅。
   * listener 抛错只记日志，不会打断 syncLocation 或关页通知。
   */
  subscribePageLocation: (
    tabKey: string,
    listener: (location: RouterLocationEventPayload) => void,
  ) => () => void
}

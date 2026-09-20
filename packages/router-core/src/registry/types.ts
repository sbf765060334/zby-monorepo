/**
 * 文件职责：声明 RouteRegistry 的查询结果、公共方法和创建参数。
 *
 * 这些类型描述“路由注册表能回答什么问题”，具体怎么建立索引和匹配地址则分别放在
 * registry.ts 与 matcher.ts 中。
 */
import type { RouterCurrentRoute, RouterRoute } from '../types'

/** 一个真实 pathname 在 Registry 中解析出的注册路由。 */
export interface ResolvedRoute<Route extends RouterRoute = RouterRoute> {
  /** 注册 pattern；普通动态路由也使用它作为共享页签 key。 */
  routeKey: string
  /** 命中的路由快照对象。 */
  route: Route
}

/**
 * 创建时固定的路由查询能力。
 *
 * 返回的路由对象由 Registry 持有，调用方只读不改；它们与传入的路由配置不是同一个
 * 对象，请用 `path` 而不是引用相等来判断是不是同一个路由。
 */
export interface RouteRegistry<Route extends RouterRoute = RouterRoute> {
  /** 创建时复制的完整路由树，包含当前用户无权限的节点。 */
  readonly routes: readonly Route[]
  /** 按 hasAuth 过滤后的路由树，供菜单和可访问页面查询。 */
  readonly permissionRoutes: readonly Route[]
  /** 完整路由的 path 到路由对象映射。 */
  readonly fullRouteMapping: Readonly<Record<string, Route>>
  /** 有权限路由的 path 到路由对象映射。 */
  readonly routeMapping: Readonly<Record<string, Route>>
  /** 根路径 `/` 应前往的具体页面；没有可访问页面时为 `/`。 */
  readonly defaultRoute: string
  /** 解析一个真实 pathname；withinAuth 为 true 时只允许命中权限树。 */
  resolveLeafRoute: (
    pathname: string,
    options?: { withinAuth?: boolean },
  ) => ResolvedRoute<Route> | null
  /** 把真实 pathname 转换成稳定页签 key；未知路径返回 null。 */
  getTabKey: (pathname: string) => string | null
  /** 获取 pathname 从根到叶子的路由与真实层级路径。 */
  getCurrentRoutes: (pathname: string) => RouterCurrentRoute<Route>[]
  /** 只取 getCurrentRoutes 中的真实路径，方便菜单组件直接使用。 */
  getCurrentSelectedPath: (pathname: string) => string[]
  /** 按声明顺序找到第一个可访问页面。 */
  findFirstAccessiblePath: () => string | null
  /** 从指定目录下找到第一个能补齐参数的可访问子页面。 */
  findFirstAccessibleChild: (pathname: string) => string | null
  /** 使用创建 Registry 时固定的规则判断一个节点是不是页面。 */
  isPageRoute: (route?: Route | null) => boolean
}

/** 创建 RouteRegistry 所需的固定输入。 */
export interface CreateRouteRegistryOptions<
  Route extends RouterRoute = RouterRoute,
> {
  /** 要复制、校验和建立索引的业务路由树；创建后不要再修改，含其中的嵌套对象。 */
  routes: Route[]
  /** 权限码判断函数；省略时不会主动删除有 auth 的节点。 */
  hasAuth?: (code: string) => boolean
  /** 访问根路径时优先采用的具体页面。 */
  defaultRedirectPath?: string
  /** 自定义页面判断；默认检查 route.element 是否存在。 */
  isPageRoute?: (route: Route) => boolean
}

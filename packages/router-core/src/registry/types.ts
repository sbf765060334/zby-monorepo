import type { RouterCurrentRoute, RouterRoute } from '../types'

/** 一个真实 pathname 在 Registry 中解析出的注册路由。 */
export interface ResolvedRoute<Route extends RouterRoute = RouterRoute> {
  /** 注册 pattern；普通动态路由也使用它作为共享页签 key。 */
  routeKey: string
  /** 命中的路由快照对象。 */
  route: Route
}

/** 创建时固定的路由查询能力。返回的路由对象都属于内部快照。 */
export interface RouteRegistry<Route extends RouterRoute = RouterRoute> {
  readonly routes: readonly Route[]
  readonly permissionRoutes: readonly Route[]
  readonly fullRouteMapping: Readonly<Record<string, Route>>
  readonly routeMapping: Readonly<Record<string, Route>>
  readonly defaultRoute: string
  resolveLeafRoute: (
    pathname: string,
    options?: { withinAuth?: boolean },
  ) => ResolvedRoute<Route> | null
  getTabKey: (pathname: string) => string | null
  getCurrentRoutes: (pathname: string) => RouterCurrentRoute<Route>[]
  getCurrentSelectedPath: (pathname: string) => string[]
  findFirstAccessiblePath: () => string | null
  findFirstAccessibleChild: (pathname: string) => string | null
  isPageRoute: (route?: Route | null) => boolean
}

/** 创建 RouteRegistry 所需的固定输入。 */
export interface CreateRouteRegistryOptions<
  Route extends RouterRoute = RouterRoute,
> {
  routes: Route[]
  hasAuth?: (code: string) => boolean
  defaultRedirectPath?: string
  isPageRoute?: (route: Route) => boolean
}

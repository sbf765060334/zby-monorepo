import type { RouterCurrentRoute, RouterRoute } from '../types'
import {
  createRouteIndex,
  findFirstAccessiblePath,
  getPathParams,
  isConcreteRoutePath,
  normalizeRoutePath,
  replacePathParams,
  resolveRoute,
} from './matcher'
import {
  filterAuthorizedRoutes,
  isAccessibleRoute,
  snapshotRoutes,
  validateRouteTree,
} from './routeTree'
import type { CreateRouteRegistryOptions, RouteRegistry } from './types'

/**
 * 把创建时路由树转换成可重复查询的静态事实。
 *
 * Registry 不改变浏览器地址，也不维护页签状态。
 */
export function createRouteRegistry<Route extends RouterRoute>(
  options: CreateRouteRegistryOptions<Route>,
): RouteRegistry<Route> {
  const routes = snapshotRoutes(options.routes)
  validateRouteTree(routes)
  const pageMatcher = options.isPageRoute || isAccessibleRoute
  const isPageRoute: RouteRegistry<Route>['isPageRoute'] = (route) =>
    Boolean(route && pageMatcher(route))
  const permissionRoutes = filterAuthorizedRoutes(
    routes,
    options.hasAuth,
    isPageRoute,
  )
  const fullIndex = createRouteIndex(routes)
  const authIndex = createRouteIndex(permissionRoutes)

  const explicitDefault =
    options.defaultRedirectPath && isConcreteRoutePath(options.defaultRedirectPath)
      ? resolveRoute(options.defaultRedirectPath, authIndex)
      : null
  const defaultRoute =
    explicitDefault && isPageRoute(explicitDefault.route)
      ? options.defaultRedirectPath!
      : findFirstAccessiblePath(authIndex.mapping, isPageRoute, isConcreteRoutePath) || '/'

  const resolveLeafRoute: RouteRegistry<Route>['resolveLeafRoute'] = (pathname, params) =>
    resolveRoute(pathname, params?.withinAuth ? authIndex : fullIndex)

  const getTabKey = (pathname: string) => {
    const normalizedPathname = normalizeRoutePath(pathname)
    const leaf = resolveRoute(normalizedPathname, fullIndex)
    if (!leaf)
      return null

    if (!leaf.route.supportMultipleTabs)
      return leaf.routeKey

    const routePattern = normalizeRoutePath(leaf.routeKey)
    return replacePathParams(
      routePattern,
      getPathParams(routePattern, normalizedPathname),
    )
  }

  const getCurrentRoutes = (pathname: string) => {
    const leaf = resolveRoute(pathname, fullIndex)
    if (!leaf)
      return []

    const paramsMap = getPathParams(leaf.routeKey, normalizeRoutePath(pathname))
    const list: RouterCurrentRoute<Route>[] = []
    let current: Route | undefined = leaf.route
    let currentPath = leaf.routeKey

    while (current) {
      list.unshift({
        route: current,
        realPath: replacePathParams(currentPath, paramsMap),
      })
      const parentPath = fullIndex.parentMap[currentPath]
      if (!parentPath)
        break
      currentPath = parentPath
      current = fullIndex.mapping[parentPath]
    }

    return list
  }

  return {
    routes,
    permissionRoutes,
    fullRouteMapping: fullIndex.mapping,
    routeMapping: authIndex.mapping,
    defaultRoute,
    resolveLeafRoute,
    getTabKey,
    getCurrentRoutes,
    getCurrentSelectedPath: (pathname) =>
      getCurrentRoutes(pathname).map((item) => item.realPath),
    findFirstAccessiblePath: () =>
      findFirstAccessiblePath(authIndex.mapping, isPageRoute),
    findFirstAccessibleChild: (pathname) => {
      const parent = resolveRoute(pathname, authIndex)
      if (!parent || !parent.route.routes?.length)
        return null

      const paramsMap = getPathParams(
        normalizeRoutePath(parent.routeKey),
        normalizeRoutePath(pathname),
      )
      const childIndex = createRouteIndex(parent.route.routes as Route[])

      for (const childPath of Object.keys(childIndex.mapping)) {
        if (!isPageRoute(childIndex.mapping[childPath]))
          continue

        const unresolved = childPath.split('/').some((part) => {
          if (!part.startsWith(':') && part !== '*')
            return false
          const value = paramsMap[part]
          return value === undefined || value === part
        })
        if (!unresolved)
          return replacePathParams(childPath, paramsMap)
      }

      return null
    },
    isPageRoute,
  }
}

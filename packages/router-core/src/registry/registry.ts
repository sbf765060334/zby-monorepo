/**
 * 文件职责：根据一棵路由树创建生命周期内不变的 RouteRegistry 查询对象。
 *
 * Registry 同时保存完整路由和有权限路由两套索引，向上层回答默认页、匹配路由、页
 * 签 key、菜单选中链等问题，但它不改变地址，也不维护页签状态。
 */
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
  // 先校验再建索引，避免后续查询面对两个同样合法的答案。
  validateRouteTree(routes)
  const pageMatcher = options.isPageRoute || isAccessibleRoute
  const isPageRoute: RouteRegistry<Route>['isPageRoute'] = (route) =>
    Boolean(route && pageMatcher(route))
  // 完整树用于识别 403，权限树用于菜单、默认页和真正可打开页面。
  const permissionRoutes = filterAuthorizedRoutes(
    routes,
    options.hasAuth,
    isPageRoute,
  )
  const fullIndex = createRouteIndex(routes)
  const authIndex = createRouteIndex(permissionRoutes)

  // 显式默认地址只有在“具体、存在、有权限、是页面”四个条件都满足时才会采用。
  const explicitDefault =
    options.defaultRedirectPath && isConcreteRoutePath(options.defaultRedirectPath)
      ? resolveRoute(options.defaultRedirectPath, authIndex)
      : null
  const defaultRoute =
    explicitDefault && isPageRoute(explicitDefault.route)
      ? options.defaultRedirectPath!
      : findFirstAccessiblePath(authIndex.mapping, isPageRoute, isConcreteRoutePath) || '/'

  /** 按调用参数选择完整索引或权限索引，并解析 pathname 对应的叶子路由。 */
  const resolveLeafRoute: RouteRegistry<Route>['resolveLeafRoute'] = (pathname, params) =>
    resolveRoute(pathname, params?.withinAuth ? authIndex : fullIndex)

  /**
   * 计算稳定页签身份。
   *
   * 默认动态路由共用 pattern 页签；开启 supportMultipleTabs 后才把参数代入生成独立 key。
   */
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

  /** 从叶子路由沿 parentMap 向上查找，得到菜单/面包屑需要的根到叶子链。 */
  const getCurrentRoutes = (pathname: string) => {
    const leaf = resolveRoute(pathname, fullIndex)
    if (!leaf)
      return []

    const paramsMap = getPathParams(leaf.routeKey, normalizeRoutePath(pathname))
    const list: RouterCurrentRoute<Route>[] = []
    let current: Route | undefined = leaf.route
    let currentPath = leaf.routeKey

    // 先从叶子往父级走并不断 unshift，最终数组自然就是根到叶子的顺序。
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
      // 目录跳转要从权限索引中查找，不能把用户带到无权限子页面。
      const parent = resolveRoute(pathname, authIndex)
      if (!parent || !parent.route.routes?.length)
        return null

      const paramsMap = getPathParams(
        normalizeRoutePath(parent.routeKey),
        normalizeRoutePath(pathname),
      )
      const childIndex = createRouteIndex(parent.route.routes as Route[])

      // 保持声明顺序寻找第一个页面，同时确认父级动态参数足以生成具体地址。
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

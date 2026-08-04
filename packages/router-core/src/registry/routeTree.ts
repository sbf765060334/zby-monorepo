import type { RouterRoute } from '../types'
import { analyzeRoutePattern } from './matcher'

/** 创建一份不再受调用方后续数组或对象修改影响的路由树快照。 */
export function snapshotRoutes<Route extends RouterRoute>(routes: Route[]): Route[] {
  return (Array.isArray(routes) ? routes : []).map((route) => ({
    ...route,
    ...(Array.isArray(route.routes)
      ? { routes: snapshotRoutes(route.routes as Route[]) }
      : {}),
  }) as Route)
}

export function filterAuthorizedRoutes<Route extends RouterRoute>(
  routes: Route[],
  hasAuth?: (code: string) => boolean,
  isPageRoute: (route: Route) => boolean = isAccessibleRoute,
): Route[] {
  return routes
    .map((route) => {
      if (route.auth && hasAuth && !hasAuth(route.auth))
        return null

      if (route.routes?.length) {
        const children = filterAuthorizedRoutes(
          route.routes as Route[],
          hasAuth,
          isPageRoute,
        )
        return children.length > 0 || isPageRoute(route)
          ? { ...route, routes: children } as Route
          : null
      }

      return route
    })
    .filter((route): route is Route => route !== null)
}

export function isAccessibleRoute(route?: RouterRoute | null) {
  return Boolean(route?.element)
}

export function validateRouteTree<Route extends RouterRoute>(routes: Route[]) {
  const normalizedPaths = new Map<string, string>()
  const routeShapes = new Map<string, string>()

  const walk = (route: Route) => {
    const analysis = analyzeRoutePattern(route.path)
    const duplicatePath = normalizedPaths.get(analysis.lookupPath)

    if (duplicatePath) {
      throw new Error(
        `[RouterCore] Duplicate route paths "${duplicatePath}" and "${route.path}" ` +
        `resolve to "${analysis.normalizedPath}". Route paths must be unique.`,
      )
    }

    const seenParameterNames = new Set<string>()
    const duplicateParameter = analysis.parameterNames.find((name) => {
      if (seenParameterNames.has(name))
        return true
      seenParameterNames.add(name)
      return false
    })

    if (duplicateParameter) {
      throw new Error(
        `[RouterCore] Duplicate route parameter ":${duplicateParameter}" ` +
        `in "${route.path}". Parameter names must be unique within a route.`,
      )
    }

    const conflictingShape = routeShapes.get(analysis.shapeKey)
    if (conflictingShape) {
      throw new Error(
        `[RouterCore] Conflicting route patterns "${conflictingShape}" and ` +
        `"${route.path}" match the same URL shape.`,
      )
    }

    normalizedPaths.set(analysis.lookupPath, route.path)
    routeShapes.set(analysis.shapeKey, route.path)
    route.routes?.forEach((child) => walk(child as Route))
  }

  routes.forEach(walk)
}

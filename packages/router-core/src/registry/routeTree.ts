/**
 * 文件职责：复制、按权限过滤并校验调用方提供的路由树。
 *
 * 创建 Core 时先经过这里，把外部可变对象变成内部快照，并尽早拒绝重复路径、重复参
 * 数名或会匹配同一地址的冲突 pattern，避免运行到导航阶段才出现模糊结果。
 */
import type { RouterRoute } from '../types'
import { analyzeRoutePattern } from './matcher'

/** 创建一份不再受调用方后续数组或对象修改影响的路由树快照。 */
export function snapshotRoutes<Route extends RouterRoute>(routes: Route[]): Route[] {
  // 每层都创建新数组和新对象，确保调用方之后原地修改不会偷偷改变 Registry。
  return (Array.isArray(routes) ? routes : []).map((route) => ({
    ...route,
    ...(Array.isArray(route.routes)
      ? { routes: snapshotRoutes(route.routes as Route[]) }
      : {}),
  }) as Route)
}

/**
 * 按权限递归生成一棵新路由树。
 *
 * 无权限节点会被删除；没有页面能力且过滤后没有子节点的空目录也会被删除。
 */
export function filterAuthorizedRoutes<Route extends RouterRoute>(
  routes: Route[],
  hasAuth?: (code: string) => boolean,
  isPageRoute: (route: Route) => boolean = isAccessibleRoute,
): Route[] {
  return routes
    .map((route) => {
      // 有 auth 且明确校验失败时，整棵子树都不可访问，不必继续向下遍历。
      if (route.auth && hasAuth && !hasAuth(route.auth))
        return null

      if (route.routes?.length) {
        // 父节点可能自己就是页面，也可能只是目录；先递归得到有权限的子节点。
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

/** 默认页面判断：只要路由提供了 element，就把它当作可打开页面。 */
export function isAccessibleRoute(route?: RouterRoute | null) {
  return Boolean(route?.element)
}

/** 在创建 Registry 前校验整棵路由树，发现有歧义的声明就立即抛出清晰错误。 */
export function validateRouteTree<Route extends RouterRoute>(routes: Route[]) {
  const normalizedPaths = new Map<string, string>()
  const routeShapes = new Map<string, string>()

  /** 校验当前节点，再继续校验所有子节点。 */
  const walk = (route: Route) => {
    const analysis = analyzeRoutePattern(route.path)
    const duplicatePath = normalizedPaths.get(analysis.lookupPath)

    // `/users` 和 `/users/` 规范化后相同，运行时无法区分，必须拒绝。
    if (duplicatePath) {
      throw new Error(
        `[RouterCore] Duplicate route paths "${duplicatePath}" and "${route.path}" ` +
        `resolve to "${analysis.normalizedPath}". Route paths must be unique.`,
      )
    }

    // `/team/:id/member/:id` 会让参数值互相覆盖，所以同一 pattern 内不能重名。
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

    // `/users/:id` 与 `/users/:name` 参数名不同，但能匹配完全相同的 URL，也必须拒绝。
    const conflictingShape = routeShapes.get(analysis.shapeKey)
    if (conflictingShape) {
      throw new Error(
        `[RouterCore] Conflicting route patterns "${conflictingShape}" and ` +
        `"${route.path}" match the same URL shape.`,
      )
    }

    // 当前节点通过后才登记，后续节点就能拿它进行冲突比较。
    normalizedPaths.set(analysis.lookupPath, route.path)
    routeShapes.set(analysis.shapeKey, route.path)
    route.routes?.forEach((child) => walk(child as Route))
  }

  routes.forEach(walk)
}

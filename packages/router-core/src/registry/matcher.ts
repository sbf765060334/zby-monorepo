import type { RouterRoute } from '../types'
import type { ResolvedRoute } from './types'

/** 一棵路由树生成的内部查询索引。 */
export interface RouteIndex<Route extends RouterRoute = RouterRoute> {
  mapping: Record<string, Route>
  normalizedMapping: Record<string, ResolvedRoute<Route>>
  dynamicRoutes: Array<{
    path: string
    route: Route
    score: number
    declarationOrder: number
  }>
  parentMap: Record<string, string>
}

export function matchRoutePath(pattern: string, pathname: string) {
  const normalizedPattern = normalizeRoutePath(pattern)
  const normalizedPathname = normalizeRoutePath(pathname)
  if (normalizedPattern.toLowerCase() === normalizedPathname.toLowerCase())
    return true

  const patternParts = normalizedPattern.split('/')
  const pathnameParts = normalizedPathname.split('/')

  for (let index = 0; index < patternParts.length; index += 1) {
    const part = patternParts[index]
    if (part === '*')
      return index === patternParts.length - 1
    if (pathnameParts[index] === undefined)
      return false
    if (part.startsWith(':') && pathnameParts[index] !== '')
      continue
    if (part.startsWith(':'))
      return false
    if (part.toLowerCase() !== pathnameParts[index].toLowerCase())
      return false
  }

  return patternParts.length === pathnameParts.length
}

export function normalizeRoutePath(path: string) {
  if (!path)
    return '/'
  const [pathname] = path.split(/[?#]/)
  if (!pathname || pathname === '/')
    return '/'
  return pathname.replace(/\/+$/, '')
}

export interface RoutePatternAnalysis {
  normalizedPath: string
  lookupPath: string
  shapeKey: string
  parameterNames: string[]
}

export function analyzeRoutePattern(path: string): RoutePatternAnalysis {
  const normalizedPath = normalizeRoutePath(path)
  const segments = normalizedPath.split('/')
  const parameterNames = segments
    .filter((segment) => segment.startsWith(':'))
    .map((segment) => segment.slice(1))

  const shapeKey = JSON.stringify(
    segments.map((segment) => {
      if (segment === '*')
        return ['wildcard']
      if (segment.startsWith(':'))
        return ['parameter']
      return ['static', segment.toLowerCase()]
    }),
  )

  return {
    normalizedPath,
    lookupPath: normalizedPath.toLowerCase(),
    shapeKey,
    parameterNames,
  }
}

export function createRouteIndex<Route extends RouterRoute>(routes: Route[]): RouteIndex<Route> {
  const mapping: Record<string, Route> = {}
  const normalizedMapping: Record<string, ResolvedRoute<Route>> = {}
  const dynamicRoutes: RouteIndex<Route>['dynamicRoutes'] = []
  const parentMap: Record<string, string> = {}

  const walk = (route: Route, parentPath?: string) => {
    const normalizedPath = normalizeRoutePath(route.path)
    const lookupPath = normalizedPath.toLowerCase()
    mapping[route.path] = route
    normalizedMapping[lookupPath] = { routeKey: route.path, route }
    if (route.path.includes(':') || route.path.includes('*')) {
      dynamicRoutes.push({
        path: route.path,
        route,
        score: computeRouteScore(route.path),
        declarationOrder: dynamicRoutes.length,
      })
    }
    if (parentPath)
      parentMap[route.path] = parentPath
    route.routes?.forEach((child) => walk(child as Route, route.path))
  }

  routes.forEach((route) => walk(route))
  dynamicRoutes.sort(
    (left, right) =>
      right.score - left.score || left.declarationOrder - right.declarationOrder,
  )
  return { mapping, normalizedMapping, dynamicRoutes, parentMap }
}

function computeRouteScore(path: string) {
  const segments = normalizeRoutePath(path).split('/')
  const initial = segments.length + (segments.includes('*') ? -2 : 0)
  return segments
    .filter((segment) => segment !== '*')
    .reduce((score, segment) => {
      if (segment.startsWith(':'))
        return score + 3
      return score + (segment ? 10 : 1)
    }, initial)
}

export function resolveRoute<Route extends RouterRoute>(
  pathname: string,
  index: RouteIndex<Route>,
): ResolvedRoute<Route> | null {
  if (!pathname)
    return null
  const exact = index.mapping[pathname]
  if (exact)
    return { routeKey: pathname, route: exact }
  const normalized = index.normalizedMapping[
    normalizeRoutePath(pathname).toLowerCase()
  ]
  if (normalized)
    return normalized
  for (const item of index.dynamicRoutes) {
    if (matchRoutePath(item.path, pathname))
      return { routeKey: item.path, route: item.route }
  }
  return null
}

export function findFirstAccessiblePath<Route extends RouterRoute>(
  mapping: Record<string, Route>,
  isPageRoute: (route: Route) => boolean,
  isEligible?: (path: string) => boolean,
) {
  return Object.keys(mapping).find(
    (path) => (!isEligible || isEligible(path)) && isPageRoute(mapping[path]),
  ) || null
}

export function isConcreteRoutePath(path: string) {
  return normalizeRoutePath(path)
    .split('/')
    .every((part) => !part.startsWith(':') && part !== '*')
}

export function getPathParams(pattern: string, pathname: string) {
  const patternParts = pattern.split('/')
  const pathParts = pathname.split('/')
  const params: Record<string, string | undefined> = {}
  patternParts.forEach((part, index) => {
    if (part.startsWith(':'))
      params[part] = pathParts[index]
    if (part === '*')
      params[part] = pathParts.slice(index).join('/')
  })
  return params
}

export function replacePathParams(
  path: string,
  params: Record<string, string | undefined>,
) {
  return path
    .split('/')
    .map((part) => params[part] ?? part)
    .join('/')
    .replace(/\/+$/, '') || '/'
}

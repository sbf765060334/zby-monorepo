/**
 * 文件职责：实现路径规范化、静态/参数/通配符匹配，并为路由树建立快速查询索引。
 *
 * 这里是 Registry 的“查字典工具”：先把声明的路由整理成索引，再按明确的优先级找到
 * 最合适的路由。函数只处理字符串和普通对象，不读取权限、Store 或浏览器状态。
 */
import type { RouterRoute } from '../types'
import type { ResolvedRoute } from './types'

/** 一棵路由树生成的内部查询索引。 */
export interface RouteIndex<Route extends RouterRoute = RouterRoute> {
  /** 按声明原路径直接查路由，保留原始大小写和 pattern。 */
  mapping: Record<string, Route>
  /** 按“去掉尾斜杠并转小写”的路径查路由，处理等价地址。 */
  normalizedMapping: Record<string, ResolvedRoute<Route>>
  /** 需要逐个匹配的参数与通配符路由，已经按明确程度排序。 */
  dynamicRoutes: Array<{
    /** 路由声明中的 pattern。 */
    path: string
    /** pattern 对应的路由快照。 */
    route: Route
    /** 静态片段越多分数越高，匹配时越优先。 */
    score: number
    /** 分数相同时按原声明顺序决定先后。 */
    declarationOrder: number
  }>
  /** 子路由 path 到直属父路由 path 的映射，用于生成面包屑链。 */
  parentMap: Record<string, string>
}

/**
 * 判断一个真实 pathname 是否符合某个路由 pattern。
 *
 * `:id` 匹配一个非空片段，`*` 只允许放在末尾并接住剩余片段，静态文字忽略大小写。
 */
export function matchRoutePath(pattern: string, pathname: string) {
  // 先移除 query、hash 与多余尾斜杠，让语义相同的地址使用同一种比较形式。
  const normalizedPattern = normalizeRoutePath(pattern)
  const normalizedPathname = normalizeRoutePath(pathname)
  if (normalizedPattern.toLowerCase() === normalizedPathname.toLowerCase())
    return true

  const patternParts = normalizedPattern.split('/')
  const pathnameParts = normalizedPathname.split('/')

  for (let index = 0; index < patternParts.length; index += 1) {
    // 按片段从左到右比较，一旦确定不可能匹配就立刻返回 false。
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

/** 把任意路由输入整理成不含 query/hash、没有多余尾斜杠的 pathname。 */
export function normalizeRoutePath(path: string) {
  if (!path)
    return '/'
  const [pathname] = path.split(/[?#]/)
  if (!pathname || pathname === '/')
    return '/'
  return pathname.replace(/\/+$/, '')
}

export interface RoutePatternAnalysis {
  /** 规范化后、仍保留原始静态片段大小写的 pattern。 */
  normalizedPath: string
  /** 用于忽略大小写精确查询的 key。 */
  lookupPath: string
  /** 忽略参数名字后的结构指纹，用来发现两个 pattern 会匹配相同地址。 */
  shapeKey: string
  /** pattern 中出现的参数名，用来检查同一路由内的重复参数。 */
  parameterNames: string[]
}

/** 拆解路由 pattern，生成注册校验和索引需要的标准信息。 */
export function analyzeRoutePattern(path: string): RoutePatternAnalysis {
  const normalizedPath = normalizeRoutePath(path)
  const segments = normalizedPath.split('/')
  const parameterNames = segments
    .filter((segment) => segment.startsWith(':'))
    .map((segment) => segment.slice(1))

  // 参数名本身不影响能匹配的 URL，所以都记成 parameter；静态片段仍保留具体文字。
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

/** 递归遍历路由树，建立精确查询、动态匹配和父子关系三类索引。 */
export function createRouteIndex<Route extends RouterRoute>(routes: Route[]): RouteIndex<Route> {
  const mapping: Record<string, Route> = {}
  const normalizedMapping: Record<string, ResolvedRoute<Route>> = {}
  const dynamicRoutes: RouteIndex<Route>['dynamicRoutes'] = []
  const parentMap: Record<string, string> = {}

  /** 把一个节点写入索引，然后继续处理它的子节点。 */
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
  // 动态路由先比较分数；同分时保持声明顺序，保证结果稳定且容易预测。
  dynamicRoutes.sort(
    (left, right) =>
      right.score - left.score || left.declarationOrder - right.declarationOrder,
  )
  return { mapping, normalizedMapping, dynamicRoutes, parentMap }
}

/** 给动态路由计算匹配优先级：静态片段最具体，参数其次，通配符最低。 */
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

/**
 * 按“原路径精确 → 规范化精确 → 动态 pattern”顺序解析一个 pathname。
 *
 * 返回 routeKey 是声明时的注册路径，route 是对应快照；完全无法识别时返回 null。
 */
export function resolveRoute<Route extends RouterRoute>(
  pathname: string,
  index: RouteIndex<Route>,
): ResolvedRoute<Route> | null {
  // 先走成本最低的精确查询，再尝试规范化查询，最后才逐个检查动态 pattern。
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

/** 从保持声明顺序的映射中找到第一个页面路径，并可额外限制路径是否合法。 */
export function findFirstAccessiblePath<Route extends RouterRoute>(
  mapping: Record<string, Route>,
  isPageRoute: (route: Route) => boolean,
  isEligible?: (path: string) => boolean,
) {
  return Object.keys(mapping).find(
    (path) => (!isEligible || isEligible(path)) && isPageRoute(mapping[path]),
  ) || null
}

/** 判断路径是否已经没有 `:param` 或 `*` 占位符，可以直接交给宿主导航。 */
export function isConcreteRoutePath(path: string) {
  return normalizeRoutePath(path)
    .split('/')
    .every((part) => !part.startsWith(':') && part !== '*')
}

/** 从真实 pathname 中提取 pattern 参数；参数 key 保留开头的 `:`，通配符 key 为 `*`。 */
export function getPathParams(pattern: string, pathname: string) {
  const patternParts = pattern.split('/')
  const pathParts = pathname.split('/')
  const params: Record<string, string | undefined> = {}
  // 普通参数拿同位置片段；通配符把当前位置及之后的全部片段重新拼起来。
  patternParts.forEach((part, index) => {
    if (part.startsWith(':'))
      params[part] = pathParts[index]
    if (part === '*')
      params[part] = pathParts.slice(index).join('/')
  })
  return params
}

/**
 * 从真实 pathname 提取页面可用的路径参数。
 *
 * 先做与 `matchRoutePath` 相同的规范化。返回值的键去掉 `:`，末尾通配符的键仍是 `*`。
 * pattern 里没有对应片段的参数不会出现。
 */
export function readRouteParams(pattern: string, pathname: string) {
  const raw = getPathParams(
    normalizeRoutePath(pattern),
    normalizeRoutePath(pathname),
  )
  const params: Record<string, string | undefined> = {}

  for (const key of Object.keys(raw)) {
    const name = key.startsWith(':') ? key.slice(1) : key
    const value = raw[key]
    if (!name || value === undefined)
      continue
    // 与 React Router useParams 一样解码百分号编码；非法编码保留原片段，避免整页抛错。
    params[name] = decodePathParam(value)
  }

  return params
}

/** 解码路径参数。decodeURIComponent 对残缺百分号会抛错，这时保留浏览器给出的原片段。 */
function decodePathParam(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/** 用已经提取的参数替换路径占位符；缺少参数时保留原占位符供上层识别。 */
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

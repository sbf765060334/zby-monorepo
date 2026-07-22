import type { RouterCurrentRoute, RouterRoute } from './types'

/**
 * 路由注册表负责把创建时路由树转换成可重复查询的静态事实。
 *
 * 本模块不改变浏览器地址，也不维护页签状态。它只处理路径标准化、权限过滤、
 * 动态路由优先级、父子层级和真实 pathname 到注册 pattern 的解析。
 */

/**
 * 一个真实 pathname 在 Registry 中解析出的注册路由。
 *
 * @typeParam Route 命中的调用方路由节点类型。
 */
export interface ResolvedRoute<Route extends RouterRoute = RouterRoute> {
  /** 注册 pattern；普通动态路由也使用它作为共享页签 key。 */
  routeKey: string
  /** 命中的路由快照对象。 */
  route: Route
}

/** 一棵路由树生成的内部查询索引。 */
interface RouteIndex<Route extends RouterRoute = RouterRoute> {
  /** 原始注册 path 到路由节点的精确映射。 */
  mapping: Record<string, Route>
  /** 标准化且小写后的 path 到解析结果的映射，用于大小写和尾斜杠兼容。 */
  normalizedMapping: Record<string, ResolvedRoute<Route>>
  /** 按路径具体程度降序保存的参数路由和通配符路由。 */
  dynamicRoutes: Array<{
    path: string
    route: Route
    score: number
    declarationOrder: number
  }>
  /** 子路由注册 path 到父路由注册 path 的 O(1) 回溯映射。 */
  parentMap: Record<string, string>
}

/**
 * 创建时固定的路由查询能力。返回的路由对象都属于内部快照。
 *
 * @typeParam Route 调用方路由节点类型；所有查询结果会保留其扩展元数据类型。
 */
export interface RouteRegistry<Route extends RouterRoute = RouterRoute> {
  /** 未经过权限过滤的完整路由树。 */
  readonly routes: readonly Route[]
  /** 使用创建时 hasAuth 结果过滤后的路由树。 */
  readonly permissionRoutes: readonly Route[]
  /** 完整路由树的精确 path 映射，用于区分 403 与 404。 */
  readonly fullRouteMapping: Readonly<Record<string, Route>>
  /** 权限路由树的精确 path 映射。 */
  readonly routeMapping: Readonly<Record<string, Route>>
  /** 根路径使用的首个具体、可访问页面；不存在时为 `/`。 */
  readonly defaultRoute: string
  /** 在完整索引或权限索引中解析真实 pathname。 */
  resolveLeafRoute: (
    pathname: string,
    options?: { withinAuth?: boolean },
  ) => ResolvedRoute<Route> | null
  /** 根据路由配置决定共享 route pattern 或独立真实 pathname 页签 key。 */
  getTabKey: (pathname: string) => string | null
  /** 获取从根到当前路由的层级，并把已知参数替换成真实值。 */
  getCurrentRoutes: (pathname: string) => RouterCurrentRoute<Route>[]
  /** 获取菜单选中使用的真实层级路径列表。 */
  getCurrentSelectedPath: (pathname: string) => string[]
  /** 返回权限树中第一个可作为页面访问的具体注册路径。 */
  findFirstAccessiblePath: () => string | null
  /** 返回指定目录下第一个能使用现有参数具体化的可访问页面。 */
  findFirstAccessibleChild: (pathname: string) => string | null
  /** 使用创建时固定的页面判断规则判断路由节点。 */
  isPageRoute: (route?: Route | null) => boolean
}

/**
 * 创建 RouteRegistry 所需的固定输入。
 *
 * @typeParam Route 创建快照并贯穿所有查询结果的调用方路由节点类型。
 */
export interface CreateRouteRegistryOptions<
  Route extends RouterRoute = RouterRoute,
> {
  /** 原始路由树；函数内部会递归复制。 */
  routes: Route[]
  /** 权限码判断函数；只用于生成本次权限快照。 */
  hasAuth?: (code: string) => boolean
  /** 校验通过时优先使用的具体默认页面地址。 */
  defaultRedirectPath?: string
  /** 自定义页面节点判断；默认检查 element 是否存在。 */
  isPageRoute?: (route: Route) => boolean
}

/** 创建一份不再受调用方后续数组或对象修改影响的路由树快照。 */
export function snapshotRoutes<Route extends RouterRoute>(routes: Route[]): Route[] {
  return (Array.isArray(routes) ? routes : []).map((route) => ({
    ...route,
    ...(Array.isArray(route.routes)
      ? {
          // 一棵 Registry 路由树共享同一节点契约；递归复制后仍按调用方 Route 返回。
          routes: snapshotRoutes(route.routes as Route[]),
        }
      : {}),
  }) as Route)
}

export function createRouteRegistry<Route extends RouterRoute>(
  options: CreateRouteRegistryOptions<Route>,
): RouteRegistry<Route> {
  // 先复制路由树，调用方随后替换数组或修改 title 都不会改变当前 Registry 的事实。
  const routes = snapshotRoutes(options.routes)
  // 页面判断规则与 Registry 同生命周期；所有索引和查询必须复用同一个判定函数。
  const pageMatcher = options.isPageRoute || isAccessibleRoute
  const isPageRoute: RouteRegistry<Route>['isPageRoute'] = (route) =>
    Boolean(route && pageMatcher(route))
  // 权限树和两份索引一次性生成。后续 hasAuth 闭包结果变化不会隐式刷新当前实例。
  const permissionRoutes = filterAuthorizedRoutes(
    routes,
    options.hasAuth,
    isPageRoute,
  )
  const fullIndex = createRouteIndex(routes)
  const authIndex = createRouteIndex(permissionRoutes)

  // 显式默认地址必须是具体 URL，动态 pattern 不能直接交给宿主浏览器导航。
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
    // 页签身份从完整索引解析：无权限地址仍需能被识别为 403，而不是伪装成未知路由。
    const normalizedPathname = normalizeRoutePath(pathname)
    const leaf = resolveRoute(normalizedPathname, fullIndex)
    if (!leaf)
      return null

    if (!leaf.route.supportMultipleTabs)
      return leaf.routeKey

    // 多页签动态路由保留真实参数，但静态段沿用注册 pattern 的稳定大小写。
    const routePattern = normalizeRoutePath(leaf.routeKey)
    return replacePathParams(
      routePattern,
      getPathParams(routePattern, normalizedPathname),
    )
  }

  const getCurrentRoutes = (pathname: string) => {
    // 面包屑需要保留完整路由事实，因此固定从 fullIndex 开始解析。
    const leaf = resolveRoute(pathname, fullIndex)
    if (!leaf)
      return []

    // 参数只提取一次；向父级回溯时复用相同映射，保持每层真实路径一致。
    const paramsMap = getPathParams(leaf.routeKey, normalizeRoutePath(pathname))
    const list: RouterCurrentRoute<Route>[] = []
    let current: Route | undefined = leaf.route
    let currentPath = leaf.routeKey

    while (current) {
      // 从叶子向父级回溯，但用 unshift 维持最终的根到叶子顺序。
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
      // 目录 pathname 可能包含参数或末尾斜杠，必须动态解析而不能直接读取 mapping。
      const parent = resolveRoute(pathname, authIndex)
      if (!parent || !parent.route.routes?.length)
        return null

      // 只有父目录已经提供的参数才能安全传给后代页面。
      const paramsMap = getPathParams(
        normalizeRoutePath(parent.routeKey),
        normalizeRoutePath(pathname),
      )
      const childIndex = createRouteIndex(parent.route.routes as Route[])

      for (const childPath of Object.keys(childIndex.mapping)) {
        if (!isPageRoute(childIndex.mapping[childPath]))
          continue

        // 子页面引入了当前目录无法提供的新参数时不能生成真实浏览器地址。
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

export function filterAuthorizedRoutes<Route extends RouterRoute>(
  routes: Route[],
  hasAuth?: (code: string) => boolean,
  isPageRoute: (route: Route) => boolean = isAccessibleRoute,
): Route[] {
  // 父节点拒绝权限时整棵子树都不可见；允许时才继续递归处理后代。
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
        // 空目录只有自身也是页面时才保留，避免默认路由落到无法展示的节点。
        return children.length > 0 || isPageRoute(route)
          ? { ...route, routes: children } as Route
          : null
      }

      return route
    })
    .filter((route): route is Route => route !== null)
}

export function isAccessibleRoute(route?: RouterRoute | null) {
  // core 不解释 element 的具体类型，只使用“是否存在”作为默认页面事实。
  return Boolean(route?.element)
}

/**
 * 触发路由资源预加载。
 *
 * 优先使用 route.preload；为兼容现有 ProLayout 路由，再识别 element.preload。
 * 预加载只是 hover、focus 等场景的推测性性能优化，因此统一放进 Promise 微任务，
 * 同时隔离同步 throw 与异步 rejection，不能让预加载失败打断当前页面交互。
 */
export function preloadRoute(route?: RouterRoute | null): void {
  const directPreload = route?.preload
  if (typeof directPreload === 'function') {
    void Promise.resolve()
      .then(() => directPreload())
      .catch(() => undefined)
    return
  }

  const element = route?.element
  if (
    (typeof element === 'function' || typeof element === 'object') &&
    element !== null &&
    'preload' in element &&
    typeof element.preload === 'function'
  ) {
    // 局部常量把类型收窄带进异步闭包；call 保留对象方法可能依赖的 this 绑定。
    const elementPreload = element.preload
    void Promise.resolve()
      .then(() => elementPreload.call(element))
      .catch(() => undefined)
  }
}

export function matchRoutePath(pattern: string, pathname: string) {
  // pattern 与 pathname 共用同一标准化规则，避免精确索引和动态匹配语义不一致。
  const normalizedPattern = normalizeRoutePath(pattern)
  const normalizedPathname = normalizeRoutePath(pathname)
  if (normalizedPattern.toLowerCase() === normalizedPathname.toLowerCase())
    return true

  const patternParts = normalizedPattern.split('/')
  const pathnameParts = normalizedPathname.split('/')

  for (let index = 0; index < patternParts.length; index += 1) {
    const part = patternParts[index]
    // 只支持末尾通配符；它可以匹配零个或多个剩余路径段。
    if (part === '*')
      return index === patternParts.length - 1
    if (pathnameParts[index] === undefined)
      return false
    // 参数段必须消费一个非空真实段，但不限制该段的具体字符。
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
  // query/hash 不参与路由身份；根路径之外统一移除连续尾斜杠。
  const [pathname] = path.split(/[?#]/)
  if (!pathname || pathname === '/')
    return '/'
  return pathname.replace(/\/+$/, '')
}

function createRouteIndex<Route extends RouterRoute>(routes: Route[]): RouteIndex<Route> {
  const mapping: Record<string, Route> = {}
  const normalizedMapping: Record<string, ResolvedRoute<Route>> = {}
  const dynamicRoutes: RouteIndex<Route>['dynamicRoutes'] = []
  const parentMap: Record<string, string> = {}

  const walk = (route: Route, parentPath?: string) => {
    const normalizedPath = normalizeRoutePath(route.path)
    const lookupPath = normalizedPath.toLowerCase()
    const conflict = normalizedMapping[lookupPath]
    if (conflict) {
      // `/Users` 与 `/users/` 按平台匹配语义相同，必须在创建阶段直接失败。
      throw new Error(
        `[RouterCore] Duplicate route paths "${conflict.routeKey}" and "${route.path}" ` +
        `resolve to "${normalizedPath}". Route paths must be unique.`,
      )
    }

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
  // 更具体的动态 pattern 优先；同分时恢复路由树中的原始声明顺序。
  dynamicRoutes.sort(
    (left, right) =>
      right.score - left.score || left.declarationOrder - right.declarationOrder,
  )
  return { mapping, normalizedMapping, dynamicRoutes, parentMap }
}

function computeRouteScore(path: string) {
  // 权重沿用 React Router 的核心直觉：静态段 > 参数段 > 空段，通配符额外降权。
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

function resolveRoute<Route extends RouterRoute>(
  pathname: string,
  index: RouteIndex<Route>,
): ResolvedRoute<Route> | null {
  if (!pathname)
    return null
  // 原始精确查询最快，也允许调用方直接用注册 pattern 查询动态路由。
  const exact = index.mapping[pathname]
  if (exact)
    return { routeKey: pathname, route: exact }
  // 精确查询失败后再处理大小写与末尾斜杠差异。
  const normalized = index.normalizedMapping[
    normalizeRoutePath(pathname).toLowerCase()
  ]
  if (normalized)
    return normalized
  // 动态数组已经按具体程度排序，第一个成功匹配项就是最终结果。
  for (const item of index.dynamicRoutes) {
    if (matchRoutePath(item.path, pathname))
      return { routeKey: item.path, route: item.route }
  }
  return null
}

function findFirstAccessiblePath<Route extends RouterRoute>(
  mapping: Record<string, Route>,
  isPageRoute: (route: Route) => boolean,
  isEligible?: (path: string) => boolean,
) {
  // mapping 的插入顺序来自路由树深度优先遍历，因此 find 保持配置声明顺序。
  return Object.keys(mapping).find(
    (path) => (!isEligible || isEligible(path)) && isPageRoute(mapping[path]),
  ) || null
}

/** 判断路径是否已经提供全部动态参数，可以安全交给宿主导航。 */
export function isConcreteRoutePath(path: string) {
  return normalizeRoutePath(path)
    .split('/')
    .every((part) => !part.startsWith(':') && part !== '*')
}

function getPathParams(pattern: string, pathname: string) {
  const patternParts = pattern.split('/')
  const pathParts = pathname.split('/')
  const params: Record<string, string | undefined> = {}
  // 参数 key 保留 `:` 前缀，通配符则收集当前位置之后的全部剩余段。
  patternParts.forEach((part, index) => {
    if (part.startsWith(':'))
      params[part] = pathParts[index]
    if (part === '*')
      params[part] = pathParts.slice(index).join('/')
  })
  return params
}

function replacePathParams(
  path: string,
  params: Record<string, string | undefined>,
) {
  // 未知参数保留原占位符，调用方可以据此判断路径是否仍无法具体化。
  return path
    .split('/')
    .map((part) => params[part] ?? part)
    .join('/')
    .replace(/\/+$/, '') || '/'
}

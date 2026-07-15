/**
 * ProLayout 路由注册表。
 *
 * 本模块不负责改变浏览器地址，也不负责渲染 React 页面。它把调用方传入的
 * 路由树预处理为完整索引、权限索引和父子关系索引，再向 Store、菜单、页签、
 * 面包屑和页面渲染层提供稳定的查询方法。
 *
 * Registry 是创建时快照：`routes` 或 `hasAuth` 的有效结果发生变化后，调用方
 * 需要重新调用 `createRouteRegistry`，本模块本身不会订阅外部状态变化。
 */
import type {
  ProLayoutCurrentRoute,
  ProLayoutProps,
  ProLayoutRoute,
  ProLayoutRouteMapping,
} from '../interface'
import { matchRoutePath, normalizeRoutePath } from '../router/pathMatcher'

interface DynamicRouteEntry {
  /**
   * 用于动态匹配的注册路径模式，例如 `/projects/:projectId` 或 `/docs/*`。
   */
  path: string
  /** 路由模式对应的原始路由配置；匹配成功后直接作为查询结果返回。 */
  route: ProLayoutRoute
}

interface ProLayoutRouteIndex {
  /**
   * 以注册路径为 key 的扁平路由映射，用于 O(1) 精确查询。
   * key 是配置中的 path，不是带入真实参数后的 pathname。
   */
  mapping: ProLayoutRouteMapping
  /**
   * 以标准化路径为 key 的内部精确索引，用于统一处理静态路径末尾斜杠等差异。
   * value 保留原始 routeKey，既用于检测语义重复，也避免标准化过程改变对外
   * 暴露的路由注册路径。
   */
  normalizedMapping: Record<string, ResolvedLeafRoute>
  /**
   * 按路由树深度优先声明顺序保存的参数路由和通配符路由。
   * 精确查询失败后会顺序扫描该数组，因此先声明的动态模式优先匹配。
   */
  dynamicRoutes: DynamicRouteEntry[]
  /**
   * 子路由注册路径到父路由注册路径的映射，用于沿当前路由向上恢复完整层级。
   */
  parentMap: Record<string, string>
}

interface CreateRouteRegistryParams {
  /** 用于创建完整索引和权限索引的原始路由树。 */
  routes: ProLayoutRoute[]
  /**
   * 根据权限码判断当前用户是否有权限；未提供时按拥有全部路由权限处理。
   */
  hasAuth?: ProLayoutProps['hasAuth']
  /**
   * 优先使用的默认跳转路径；当前实现信任该配置，不校验路径是否存在或有权限。
   */
  defaultRedirectPath?: string
  /**
   * 自定义判断路由是否可以作为页面访问的方法；未提供时要求存在 element
   * 且 route.ignore 不为 true。
   */
  isPageRoute?: (route: ProLayoutRoute) => boolean
}

interface ResolveLeafRouteOptions {
  /**
   * 是否只在通过权限过滤的路由索引中解析。默认使用完整索引，以便上层区分
   * “路由存在但无权访问”的 403 和“路由根本不存在”的 404。
   */
  withinAuth?: boolean
}

interface ResolvedLeafRoute {
  /**
   * 匹配到的注册路径，例如真实地址 `/projects/42` 对应
   * `/projects/:projectId`；它也是动态路由默认共享的页签 key。
   */
  routeKey: string
  /** 匹配到的路由配置。 */
  route: ProLayoutRoute
}

/**
 * ProLayout 路由树生成的查询能力。
 *
 * 该接口只暴露查询方法，但返回的数组、映射和路由对象当前没有执行深冻结；
 * 调用方应将它们视为只读数据，避免索引与原始路由树失去一致性。
 */
export interface ProLayoutRouteRegistry {
  /** 未经过权限过滤的完整路由树，用于保留全部路由事实。 */
  routes: ProLayoutRoute[]
  /**
   * 经过权限过滤后用于菜单和授权页面查询的路由树。
   * 菜单层仍需根据 ignore 等展示属性决定是否渲染具体节点。
   */
  permissionRoutes: ProLayoutRoute[]
  /**
   * 未经过权限过滤的完整路由映射，可用于识别无权限路由和恢复持久化页签信息。
   */
  fullRouteMapping: ProLayoutRouteMapping
  /** 经过权限过滤的路由映射，用于授权页面、菜单和目录跳转查询。 */
  routeMapping: ProLayoutRouteMapping
  /**
   * 访问根路径时使用的默认路由：显式配置优先，其次取权限树中的首个页面，
   * 两者都不存在时回退为 `/`。
   */
  defaultRoute: string
  /**
   * 根据真实 pathname 解析匹配的路由。
   *
   * 为保持既有 API，方法名包含 `Leaf`，但精确命中目录 path 时也会返回目录
   * 节点；调用方应继续使用 `isPageRoute` 判断它能否直接作为页面访问。
   */
  resolveLeafRoute: (
    pathname: string,
    options?: ResolveLeafRouteOptions,
  ) => ResolvedLeafRoute | null
  /**
   * 根据真实 pathname 计算页签 key。普通参数路由共享注册路径 key；开启
   * supportMultipleTabs 后，不同真实 pathname 分别作为独立 key。
   */
  getTabKey: (pathname: string) => string | null
  /**
   * 获取从根节点到当前路由的完整层级，并把层级中的动态参数替换为真实值。
   */
  getCurrentRoutes: (pathname: string) => ProLayoutCurrentRoute[]
  /** 获取菜单选中状态使用的真实路径数组，即 getCurrentRoutes 的 realPath 列表。 */
  getCurrentSelectedPath: (pathname: string) => string[]
  /** 获取权限路由树中按声明顺序出现的第一个可访问页面。 */
  findFirstAccessiblePath: () => string | null
  /**
   * 获取指定已注册目录下的第一个可访问页面。pathname 当前必须是映射表中的
   * 注册路径，真实动态参数路径不会在这里再次执行动态解析。
   */
  findFirstAccessibleChild: (pathname: string) => string | null
  /** 判断路由是否可以作为默认落点或直接同步为页面。 */
  isPageRoute: (route?: ProLayoutRoute | null) => boolean
}

/**
 * 根据路由树、权限函数和默认路径创建独立的路由查询注册表。
 *
 * 创建过程分为四步：
 *
 * 1. 根据 hasAuth 生成权限路由树；
 * 2. 校验路径唯一性，分别为原始路由树和权限路由树建立扁平索引；
 * 3. 计算根路径使用的默认跳转地址；
 * 4. 返回基于这两份快照工作的查询方法。
 */
export function createRouteRegistry(params: CreateRouteRegistryParams): ProLayoutRouteRegistry {
  // routes 是必填类型，这里的空数组回退用于承接运行时传入的异常空值。
  const routes = params.routes || []

  // 自定义 matcher 允许不同宿主定义自己的“页面”概念；客户端默认使用 element。
  const pageRouteMatcher = params.isPageRoute || isAccessibleRoute
  const isPageRoute: ProLayoutRouteRegistry['isPageRoute'] = (route) =>
    route ? pageRouteMatcher(route) : false

  // permissionRoutes 和 authIndex 都是当前 hasAuth 计算结果的快照。
  const permissionRoutes = filterAuthorizedRoutes(routes, params.hasAuth, isPageRoute)
  const fullIndex = createRouteIndex(routes)
  const authIndex = createRouteIndex(permissionRoutes)

  // 显式 defaultRedirectPath 具有最高优先级，当前不会预先验证存在性或权限。
  const defaultRoute =
    params.defaultRedirectPath || findFirstAccessiblePath(authIndex.mapping, isPageRoute) || '/'

  const resolveLeafRoute: ProLayoutRouteRegistry['resolveLeafRoute'] = (pathname, options) => {
    // 完整索引用于识别路由事实，权限索引用于回答“当前用户能否访问”。
    const index = options?.withinAuth ? authIndex : fullIndex
    return resolveRoute(pathname, index)
  }

  const getTabKey = (pathname: string) => {
    // 页签身份不受权限过滤影响，权限变化由后续 Store 同步逻辑负责清理。
    const leaf = resolveRoute(pathname, fullIndex)
    if (!leaf)
      return null

    // 多页签参数路由使用真实 pathname；否则使用注册 pattern 共享同一个页签。
    if (leaf.route.supportMultipleTabs && leaf.routeKey !== pathname)
      return pathname

    return leaf.routeKey
  }

  const getCurrentRoutes = (pathname: string) => {
    // 面包屑需要保留完整路由事实，因此这里固定从 fullIndex 解析。
    const leaf = resolveRoute(pathname, fullIndex)
    if (!leaf)
      return []

    // 参数只解析一次，向上回溯每一层时复用同一份真实参数映射。
    const paramsMap = getPathParams(leaf.routeKey, pathname)
    const list: ProLayoutCurrentRoute[] = []
    let current: ProLayoutRoute | undefined = leaf.route
    let currentPath = leaf.routeKey

    while (current) {
      // 从叶子向父级回溯，但通过 unshift 保证最终结果仍然是根到叶子的顺序。
      list.unshift({
        route: current,
        realPath: replacePathParams(currentPath, paramsMap),
      })

      // parentMap 让每次上溯都是 O(1)，无需重新遍历整棵路由树。
      const previousPath = fullIndex.parentMap[currentPath]
      if (!previousPath)
        break

      currentPath = previousPath
      current = fullIndex.mapping[previousPath]
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
    getCurrentSelectedPath: (pathname) => getCurrentRoutes(pathname).map((item) => item.realPath),
    findFirstAccessiblePath: () => findFirstAccessiblePath(authIndex.mapping, isPageRoute),
    findFirstAccessibleChild: (pathname) => {
      // 这里只接受 authIndex 中已经注册的 path，不会调用 resolveRoute 做动态匹配。
      const route = authIndex.mapping[pathname]
      if (!route)
        return null

      // 仅为目标目录的子树临时建索引，再按照原声明顺序查找首个页面。
      const childIndex = createRouteIndex(route.routes || [])
      return findFirstAccessiblePath(childIndex.mapping, isPageRoute)
    },
    isPageRoute,
  }
}

/**
 * 根据权限递归生成新的路由树。
 *
 * - 未提供 hasAuth 时默认拥有全部权限；
 * - 当前节点权限不通过时，整个节点及其子树都会被移除；
 * - 带有 children 的节点会先递归过滤 children；
 * - children 全部被过滤后，仅当父节点自身也是页面时才保留该父节点；
 * - 没有 children 的叶子节点只进行权限过滤，不在这里判断 element 或 ignore；
 * - 需要替换 children 时创建浅拷贝，不修改调用方传入的原始路由对象。
 */
export function filterAuthorizedRoutes(
  routes: ProLayoutRoute[],
  hasAuth?: ProLayoutProps['hasAuth'],
  isPageRoute: (route: ProLayoutRoute) => boolean = isAccessibleRoute,
): ProLayoutRoute[] {
  if (!Array.isArray(routes) || routes.length === 0)
    return []

  return routes
    .map((route) => {
      // `hasAuth` 不存在代表没有启用权限过滤，而不是默认拒绝受保护路由。
      if (route.auth && hasAuth && !hasAuth(route.auth))
        return null

      if (Array.isArray(route.routes) && route.routes.length > 0) {
        const children = filterAuthorizedRoutes(route.routes, hasAuth, isPageRoute)

        // 目录仍有可访问后代，或目录自身就是页面时，保留当前节点。
        if (children.length > 0 || isPageRoute(route))
          return { ...route, routes: children }

        return null
      }

      return route
    })
    .filter(Boolean) as ProLayoutRoute[]
}

/**
 * 默认的页面路由判定规则。
 *
 * 当前规则要求同时存在 element 且未设置 ignore。需要特别注意，Shuzhi 文档
 * 将 ignore 描述为菜单隐藏属性，但这里也会把它排除在默认页面落点之外；
 * 后续若确认 ignore 只影响菜单，应统一调整该语义及相关集成测试。
 */
export function isAccessibleRoute(route?: ProLayoutRoute | null) {
  return Boolean(route?.element && !route.ignore)
}

/**
 * 判断 prompt 是否代表有效的开发中页面提示。
 * `true` 表示使用默认提示，字符串表示使用调用方提供的提示内容。
 */
export function isPromptRoute(prompt: ProLayoutRoute['prompt']) {
  return prompt === true || typeof prompt === 'string'
}

/**
 * 深度优先遍历路由树并建立四类索引。
 *
 * mapping 保留原始注册路径，normalizedMapping 服务标准化精确查询，
 * dynamicRoutes 服务参数和通配符回退匹配，parentMap 服务面包屑与菜单选中链。
 * path 在整棵树中必须保持语义唯一；完全相同或标准化后相同的 path 会在写入
 * 索引前直接抛错，避免不同查询方式返回不同路由。
 */
function createRouteIndex(routes: ProLayoutRoute[]): ProLayoutRouteIndex {
  const mapping: ProLayoutRouteMapping = {}
  const normalizedMapping: Record<string, ResolvedLeafRoute> = {}
  const dynamicRoutes: DynamicRouteEntry[] = []
  const parentMap: Record<string, string> = {}

  const walk = (route: ProLayoutRoute, parentPath?: string) => {
    const normalizedPath = normalizeRoutePath(route.path)
    const conflict = normalizedMapping[normalizedPath]
    if (conflict) {
      throw new Error(
        `[ProLayout] Duplicate route paths "${conflict.routeKey}" and "${route.path}" ` +
        `resolve to "${normalizedPath}". Route paths must be unique.`,
      )
    }

    // 完成唯一性校验后再写入公开原始映射，避免静默覆盖先声明的路由。
    mapping[route.path] = route

    // 标准化索引只用于内部回退查询，routeKey 始终保留调用方注册的原始 path。
    normalizedMapping[normalizedPath] = {
      routeKey: route.path,
      route,
    }

    // 动态数组保持深度优先声明顺序，resolveRoute 不会再按具体程度重排。
    if (route.path.includes(':') || route.path.includes('*'))
      dynamicRoutes.push({ path: route.path, route })

    // parentMap 记录注册 path 之间的关系，而不是实际参数 pathname 之间的关系。
    if (parentPath)
      parentMap[route.path] = parentPath

    route.routes?.forEach((child) => walk(child, route.path))
  }

  routes.forEach((route) => walk(route))
  return { mapping, normalizedMapping, dynamicRoutes, parentMap }
}

/**
 * 在指定索引中解析 pathname。
 *
 * 原始注册路径始终优先；原始精确查询失败后，使用与 matcher 相同的规则执行
 * 标准化精确查询；仍未命中时，动态路由按照声明顺序逐个匹配。
 */
function resolveRoute(pathname: string, index: ProLayoutRouteIndex): ResolvedLeafRoute | null {
  if (!pathname)
    return null

  // O(1) 精确查询也允许调用方直接用注册 pattern 查到动态路由配置。
  const exact = index.mapping[pathname]
  if (exact)
    return { routeKey: pathname, route: exact }

  // 标准化回退同时兼容注册路径和实际 pathname 是否带有末尾斜杠。
  const normalizedExact = index.normalizedMapping[normalizeRoutePath(pathname)]
  if (normalizedExact)
    return normalizedExact

  // 动态路由不计算 specificity；第一个成功匹配的声明项直接胜出。
  for (let indexPosition = 0; indexPosition < index.dynamicRoutes.length; indexPosition += 1) {
    const item = index.dynamicRoutes[indexPosition]
    if (matchRoutePath(item.path, pathname))
      return { routeKey: item.path, route: item.route }
  }

  return null
}

/**
 * 从扁平映射中查找第一个可作为页面的注册路径。
 *
 * mapping 由深度优先遍历按声明顺序写入，普通字符串 key 的 Object.keys 顺序
 * 会保持该插入顺序，因此这里得到的是路由树声明顺序中的首个页面。
 */
function findFirstAccessiblePath(
  mapping: ProLayoutRouteMapping,
  isPageRoute: (route: ProLayoutRoute) => boolean,
): string | null {
  const keys = Object.keys(mapping)
  const hit = keys.find((key) => isPageRoute(mapping[key]))
  return hit || null
}

/**
 * 从注册 pattern 和真实 pathname 中提取路径参数。
 *
 * 参数名直接保留 `:` 前缀作为 key，例如 `:projectId`；末尾 `*` 的值是从
 * 当前索引开始的全部剩余路径段，供父链真实路径还原使用。
 */
function getPathParams(pattern: string, pathname: string) {
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

/**
 * 使用已经提取的参数替换某一层注册路径中的占位段。
 *
 * 使用空值合并而不是逻辑或，确保 `*` 匹配零段时空字符串仍是有效替换值；
 * 最后移除由空 wildcard 留下的末尾斜杠，并保证空结果回退为根路径。
 */
function replacePathParams(path: string, params: Record<string, string | undefined>) {
  return path
    .split('/')
    .map((part) => params[part] ?? part)
    .join('/')
    .replace(/\/+$/, '') || '/'
}

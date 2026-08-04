/**
 * 文件职责：作为 registry 子模块的统一出口，集中公开路由查询、匹配和树处理能力。
 *
 * 外部模块只需要从 `./registry` 导入，不必知道具体实现分散在哪个文件，也能避免目录
 * 调整时到处修改导入路径。
 */

/** 路径匹配、规范化与“是否已具体化”判断。 */
export {
  isConcreteRoutePath,
  matchRoutePath,
  normalizeRoutePath,
} from './matcher'

/** 页面资源预加载工具。 */
export { preloadRoute } from './preload'

/** 把路由树转换成稳定查询对象的工厂。 */
export { createRouteRegistry } from './registry'

/** 不创建 Registry 时也能单独复用的路由树快照、权限过滤和默认页面判断。 */
export {
  filterAuthorizedRoutes,
  isAccessibleRoute,
  snapshotRoutes,
} from './routeTree'

/** Registry 创建参数、查询接口与单次解析结果类型。 */
export type {
  CreateRouteRegistryOptions,
  ResolvedRoute,
  RouteRegistry,
} from './types'

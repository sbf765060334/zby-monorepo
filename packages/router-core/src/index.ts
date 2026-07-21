/** 创建完全独立的路由、页签、KeepAlive 与持久化 core 实例。 */
export { createRouterCore } from './createRouterCore'

/** 不创建 Store 的纯路由查询、匹配、快照和资源预加载能力。 */
export {
  createRouteRegistry,
  filterAuthorizedRoutes,
  isAccessibleRoute,
  matchRoutePath,
  normalizeRoutePath,
  preloadRoute,
  snapshotRoutes,
} from './registry'

/** Route Registry 的公共创建参数、查询结果与实例类型。 */
export type {
  CreateRouteRegistryOptions,
  ResolvedRoute,
  RouteRegistry,
} from './registry'

/** 默认 IndexedDB、远程 Adapter 包装与持久化数据标准化能力。 */
export {
  createIndexedDBRouterStorageAdapter,
  createRemoteRouterStorageAdapter,
  normalizeRouterStorageState,
} from './storage'

/** router-core 的全部公共领域类型；仅导出类型，不产生运行时代码。 */
export type * from './types'

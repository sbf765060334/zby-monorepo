/**
 * 文件职责：定义 `@zby/router-core` 根入口允许公开的 API。
 *
 * 这里像包的“出口清单”：没有写在这里的内部函数不会成为公共 API，从而让调用方只
 * 依赖稳定能力，而不是不小心依赖某个实现细节。
 */

/** 创建完全独立的路由、页签、KeepAlive 与持久化 core 实例。 */
export { createRouterCore } from './createRouterCore'

/** 不创建 Store 的纯路由查询、匹配、快照和资源预加载能力。 */
export {
  createRouteRegistry,
  filterAuthorizedRoutes,
  isAccessibleRoute,
  isConcreteRoutePath,
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

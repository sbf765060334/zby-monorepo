/** ProLayout 需要持久化的用户状态。 */
export interface ProLayoutStorageState {
  /** 已收藏的路由路径。 */
  collection: string[]
  /** 已固定的页签 key。 */
  fixedTabs: string[]
  /** 参数路由页签 key 对应的真实 pathname。 */
  fixedParamsPathMap: Record<string, string>
}

/** 持久化操作发生错误时所处的阶段。 */
export type ProLayoutStorageErrorPhase =
  | 'load'
  | 'saveCollection'
  | 'saveFixedTabs'
  | 'saveFixedParamsPathMap'

/** 持久化错误回调收到的上下文。 */
export interface ProLayoutStorageErrorInfo {
  /** 本次读写使用的持久化命名空间。 */
  storageKey: string
  /** 发生错误的加载或保存阶段。 */
  phase: ProLayoutStorageErrorPhase
  /** 重新执行本次失败操作的方法。 */
  retry: () => Promise<void>
}

/**
 * ProLayout 持久化适配器。
 *
 * 每个保存方法只负责一个独立字段。实现方必须保证并发调用不会覆盖其它字段，
 * 并保证同一字段的提交顺序可预测。
 */
export interface ProLayoutStorageAdapter {
  /** 根据 storageKey 加载完整的持久化状态。 */
  load: (storageKey: string) => Promise<ProLayoutStorageState>
  /** 保存收藏路由集合。 */
  saveCollection: (storageKey: string, collection: string[]) => Promise<void>
  /** 保存固定页签集合。 */
  saveFixedTabs: (storageKey: string, fixedTabs: string[]) => Promise<void>
  /** 保存参数路由页签 key 与真实 pathname 的映射。 */
  saveFixedParamsPathMap: (
    storageKey: string,
    fixedParamsPathMap: Record<string, string>,
  ) => Promise<void>
}

/** 远程持久化适配器沿用统一的 Storage Adapter 契约。 */
export type ProLayoutRemoteStorageAdapterConfig = ProLayoutStorageAdapter

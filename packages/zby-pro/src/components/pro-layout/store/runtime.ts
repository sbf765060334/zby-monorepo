import type {
  ProLayoutBeforeCloseHook,
  ProLayoutLocationEventPayload,
} from '../interface'
import type { ProLayoutStorageState } from './interface'

/** 持久化状态的三个独立可变字段。 */
export type ProLayoutStorageField = keyof ProLayoutStorageState

/**
 * 每个持久化字段各自的本地修改版本。
 *
 * hydration 开始时记录快照；加载完成后只覆盖版本没有变化的字段，避免用户只修改
 * 收藏时，把同一时刻加载回来的固定页签和参数路径也一并丢弃。
 */
export type ProLayoutStorageMutationVersions = Record<
  ProLayoutStorageField,
  number
>

/**
 * 单个 ProLayout Store 私有的命令协调数据。
 *
 * 这些数据用于判断异步任务是否仍然有效，或保存无法序列化的命令处理器。它们本身
 * 不是 UI 状态，修改后也不应通知 Zustand 订阅者，因此由 createProLayoutStore 的
 * 闭包持有，而不是放入可观察的 Store 快照。
 */
export interface ProLayoutStoreRuntime {
  /** 当前持久化加载任务；并发调用复用同一个 Promise。 */
  storageHydrationPromise: Promise<void> | null
  /** 持久化来源变化时递增，使旧来源尚未完成的异步加载结果失效。 */
  storageSourceGeneration: number
  /** 三个持久化字段各自的本地修改版本，用于字段级 hydration 冲突合并。 */
  storageMutationVersions: ProLayoutStorageMutationVersions
  /** 页签 key 到页面 location 事件发射器的映射。 */
  pageLocationEmitterMap: Map<
    string,
    { emit: (payload: ProLayoutLocationEventPayload) => void }
  >
  /** 页签 key 到关闭前 Hook 注册记录的映射。 */
  beforeTabCloseMap: Map<string, ProLayoutBeforeCloseRegistration[]>
  /** 正在关闭的页签 key；防止重复执行关闭前 Hook。 */
  closingTabKeys: Set<string>
}

/** 关闭前 Hook 注册时保存的历史路由身份，不依赖后续 Registry 重新解析。 */
export interface ProLayoutBeforeCloseRegistration {
  handler: ProLayoutBeforeCloseHook
  pathname: string
}

/** 为一个新 Store 创建完全隔离的私有运行时。 */
export function createProLayoutStoreRuntime(): ProLayoutStoreRuntime {
  return {
    storageHydrationPromise: null,
    storageSourceGeneration: 0,
    storageMutationVersions: createStorageMutationVersions(),
    pageLocationEmitterMap: new Map(),
    beforeTabCloseMap: new Map(),
    closingTabKeys: new Set(),
  }
}

/** 创建三个字段均从 0 开始的本地修改版本。 */
export function createStorageMutationVersions(): ProLayoutStorageMutationVersions {
  return {
    collection: 0,
    fixedTabs: 0,
    fixedParamsPathMap: 0,
  }
}

/**
 * 切换持久化来源时废弃旧 generation，并清空新来源尚未发生的本地修改版本。
 *
 * generation 只递增而不归零，确保任意旧请求保存的编号都不可能重新变成有效值。
 */
export function resetStorageRuntime(runtime: ProLayoutStoreRuntime) {
  // 先使所有捕获旧 generation 的 load 失效，再为新来源建立干净的字段版本基线。
  runtime.storageHydrationPromise = null
  runtime.storageSourceGeneration += 1
  runtime.storageMutationVersions = createStorageMutationVersions()
}

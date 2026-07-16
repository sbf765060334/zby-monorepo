import { normalizeHash, normalizeSearchParams } from './url'

type ParamsPathMapChangeHandler = (fixedParamsPathMap: Record<string, string>) => void

/**
 * ProLayout 页签级 URL 缓存。
 *
 * Cache 同时保存三类数据：
 *
 * - 参数路由共享页签最后使用的真实 pathname，需要通过回调持久化；
 * - 每个页签最后使用的 searchParams，只在当前挂载期间保存在内存；
 * - 每个页签最后使用的 hash，只在当前挂载期间保存在内存。
 *
 * Store 持有一个稳定的 Cache 实例，从而可以在切换页签时恢复完整地址，而不必
 * 把高频变化的 search/hash 放进持久化状态或触发额外 Store 更新。
 */
export class ProLayoutCache {
  /** 参数路由页签 key 到最后一次真实 pathname 的映射。 */
  private paramsPathMap: Record<string, string>

  /** 页签 key 到不含 `?` 前缀的查询参数映射。 */
  private searchParamsMap: Record<string, string> = {}

  /** 页签 key 到包含 `#` 前缀的锚点映射。 */
  private hashMap: Record<string, string> = {}

  /**
   * @param fixedParamsPathMap 已从持久化状态加载的参数路径映射。
   * @param onFixedParamsPathMapChange 参数路径真正变化后的持久化通知。
   */
  constructor(
    fixedParamsPathMap: Record<string, string>,
    private readonly onFixedParamsPathMapChange?: ParamsPathMapChangeHandler,
  ) {
    // 创建副本，避免调用方后续修改入参时绕过 Cache 的变更通知。
    this.paramsPathMap = { ...fixedParamsPathMap }
  }

  /** 根据页签 key 获取参数路由最后使用的真实 pathname。 */
  getParamsPathByTabKey(tabKey: string) {
    return this.paramsPathMap[tabKey] || ''
  }

  /**
   * 获取当前参数路径映射的只读快照。
   *
   * Store 在异步 hydration 开始时记录该快照，加载完成后让当前会话已经确认的
   * 动态 pathname 覆盖旧持久化值。返回副本可以避免调用方绕过变更通知修改 Cache。
   */
  getFixedParamsPathMap() {
    return { ...this.paramsPathMap }
  }

  /**
   * 使用持久化加载结果替换参数路径映射。
   *
   * hydration 本身不触发保存回调，否则刚加载的数据会被立即原样写回存储。
   */
  hydrateFixedParamsPathMap(fixedParamsPathMap: Record<string, string>) {
    this.paramsPathMap = { ...fixedParamsPathMap }
  }

  /**
   * 设置或删除参数路由页签的真实 pathname。
   *
   * 只有映射真正发生变化时才通知持久化层，避免重复访问同一路径造成无意义
   * IndexedDB/远程写入，并降低并发保存的压力。
   */
  setParamsPath(tabKey: string, pathname: string | null) {
    // 使用 in 区分“没有该 key”和“该 key 恰好映射为空值”；虽然后者不会由正常写入
    // 产生，但 hydration 可能接收外部数据，删除语义仍需可靠。
    const hasCurrentPath = tabKey in this.paramsPathMap

    if (!pathname) {
      // 删除不存在的映射不触发持久化，避免关闭普通静态页签产生无意义保存。
      if (!hasCurrentPath)
        return

      delete this.paramsPathMap[tabKey]
    } else {
      // 重复访问同一动态 pathname 不改变业务状态，也不应增加 Storage 写队列压力。
      if (this.paramsPathMap[tabKey] === pathname)
        return

      this.paramsPathMap[tabKey] = pathname
    }

    // 回调只接收快照，不能借此修改 Cache 内部对象。
    this.onFixedParamsPathMapChange?.({ ...this.paramsPathMap })
  }

  /** 设置或清除页签查询参数；Cache 内部统一存储为不含 `?` 的格式。 */
  setSearchParamsForTabKey(tabKey: string, searchParams: string | null | undefined) {
    const normalized = normalizeSearchParams(searchParams)
    if (!normalized) {
      // 空查询统一表现为“没有 Map 项”，读取时再回退为空字符串。
      delete this.searchParamsMap[tabKey]
      return
    }

    this.searchParamsMap[tabKey] = normalized
  }

  /** 获取不含 `?` 前缀的页签查询参数。 */
  getSearchParamsForTabKey(tabKey: string) {
    return this.searchParamsMap[tabKey] || ''
  }

  /** 设置或清除页签锚点；Cache 内部统一存储为包含 `#` 的格式。 */
  setHashForTabKey(tabKey: string, hash: string | null | undefined) {
    const normalized = normalizeHash(hash)
    if (!normalized) {
      // 与 searchParams 一致，清空时删除 key，不在内存中积累空值记录。
      delete this.hashMap[tabKey]
      return
    }

    this.hashMap[tabKey] = normalized
  }

  /** 获取包含 `#` 前缀的页签锚点。 */
  getHashForTabKey(tabKey: string) {
    return this.hashMap[tabKey] || ''
  }

  /**
   * 清理一个已关闭页签关联的全部 URL 状态。
   *
   * search/hash 只需删除内存项；参数 pathname 通过 setParamsPath 删除，以便在
   * 确实存在持久化记录时通知 Storage Adapter 同步清理。
   */
  clearTab(tabKey: string) {
    delete this.searchParamsMap[tabKey]
    delete this.hashMap[tabKey]
    this.setParamsPath(tabKey, null)
  }
}

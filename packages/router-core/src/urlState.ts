/**
 * 文件职责：保存每个页签自己的 pathname/search/hash，并负责 URL 的拆分与拼接。
 *
 * search 和 hash 变化很频繁，所以这里只放在实例私有缓存中，不写进全局 Store；共享
 * 动态页签最后访问的真实 pathname 则会通过回调交给持久化模块保存。
 */

/**
 * 页签级 URL Cache。
 *
 * 共享动态页签的真实 pathname 需要持久化；高频变化的 search/hash 仅保存在当前
 * core 实例内，避免筛选和锚点变化触发无关状态订阅。
 */
export class RouterUrlCache {
  /** 共享动态页签 key 到最后一次真实 pathname 的对应关系。 */
  private paramsPathMap: Record<string, string> = {}
  /** 页签 key 到不带问号的查询字符串的对应关系。 */
  private searchParamsMap: Record<string, string> = {}
  /** 页签 key 到带井号 hash 的对应关系。 */
  private hashMap: Record<string, string> = {}

  /**
   * 注入 pathname 映射变化回调。
   *
   * Cache 不知道数据存在哪里，只在真实 pathname 改变时把完整副本交给持久化协调器。
   */
  constructor(
    private readonly onParamsPathMapChange: (
      value: Record<string, string>,
      tabKey: string,
      pathname: string | null,
    ) => void,
  ) {}

  /** 读取共享动态页签最后访问的真实地址；没有记录时返回空字符串。 */
  getParamsPath(tabKey: string) {
    return this.paramsPathMap[tabKey] || ''
  }

  /**
   * 用持久化加载结果一次性替换 pathname 映射。
   *
   * 这里故意不触发变化回调，否则“刚从数据库读出来的数据”会立刻又写回数据库。
   */
  hydrateParamsPathMap(value: Record<string, string>) {
    this.paramsPathMap = { ...value }
  }

  /** 新增、更新或删除一个真实 pathname，并且只在内容确实变化时通知持久化层。 */
  setParamsPath(tabKey: string, pathname: string | null) {
    if (!pathname) {
      // 删除一个本来就不存在的 key 不算变化，直接结束即可。
      if (!(tabKey in this.paramsPathMap))
        return
      delete this.paramsPathMap[tabKey]
    } else {
      // 新旧值相同就复用现有状态，避免重复写存储。
      if (this.paramsPathMap[tabKey] === pathname)
        return
      this.paramsPathMap[tabKey] = pathname
    }
    // 传递对象副本，外部回调无法反过来修改 Cache 内部数据。
    this.onParamsPathMapChange(
      { ...this.paramsPathMap },
      tabKey,
      pathname || null,
    )
  }

  /** 读取页签最后保存的查询字符串；返回值不包含开头的 `?`。 */
  getSearch(tabKey: string) {
    return this.searchParamsMap[tabKey] || ''
  }

  /** 规范化并保存查询字符串；空值会删除旧缓存。 */
  setSearch(tabKey: string, value: string | null | undefined) {
    const normalized = normalizeSearchParams(value)
    if (normalized)
      this.searchParamsMap[tabKey] = normalized
    else
      delete this.searchParamsMap[tabKey]
  }

  /** 读取页签最后保存的 hash；非空返回值始终以 `#` 开头。 */
  getHash(tabKey: string) {
    return this.hashMap[tabKey] || ''
  }

  /** 规范化并保存 hash；空值会删除旧缓存。 */
  setHash(tabKey: string, value: string | null | undefined) {
    const normalized = normalizeHash(value)
    if (normalized)
      this.hashMap[tabKey] = normalized
    else
      delete this.hashMap[tabKey]
  }

  /** 页签关闭时一次清掉它的 search、hash 和动态真实 pathname。 */
  clear(tabKey: string) {
    delete this.searchParamsMap[tabKey]
    delete this.hashMap[tabKey]
    this.setParamsPath(tabKey, null)
  }
}

/** 使用浏览器 origin 或稳定虚拟 origin 解析应用内相对 URL。 */
export function parseUrl(url: string) {
  // Node/SSR 没有 window，使用虚拟 origin 也能借助标准 URL 正确拆分相对地址。
  const base = typeof window === 'undefined'
    ? 'https://zby.local'
    : window.location.origin
  return new URL(url, base)
}

/** Cache 内部统一保存不含 `?` 的查询字符串。 */
export function normalizeSearchParams(value: string | null | undefined) {
  return value ? String(value).replace(/^\?/, '') : ''
}

/** Router location 统一使用包含 `#` 的非空 hash。 */
export function normalizeHash(value: string | null | undefined) {
  if (!value)
    return ''
  const normalized = String(value)
  return normalized.startsWith('#') ? normalized : `#${normalized}`
}

/** undefined 恢复缓存；null 和空字符串经 normalize 后显式清空。 */
export function resolveSearch(value: string | null | undefined, cached: string) {
  return value === undefined ? cached : normalizeSearchParams(value)
}

/** undefined 恢复缓存；null 和空字符串经 normalize 后显式清空。 */
export function resolveHash(value: string | null | undefined, cached: string) {
  return value === undefined ? cached : normalizeHash(value)
}

/** 组合纯 pathname、查询参数和 hash，不重排或重新编码调用方参数。 */
export function buildUrl(data: {
  /** 不含 query/hash 的目标路径。 */
  pathname: string
  /** 可带或不带 `?` 的查询字符串。 */
  searchParams?: string | null
  /** 可带或不带 `#` 的锚点。 */
  hash?: string | null
}) {
  // 只补齐分隔符，不调用 URLSearchParams，避免改变业务传入的参数顺序或编码形式。
  const search = normalizeSearchParams(data.searchParams)
  return `${data.pathname}${search ? `?${search}` : ''}${normalizeHash(data.hash)}`
}

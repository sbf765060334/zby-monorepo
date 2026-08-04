/**
 * 页签级 URL Cache。
 *
 * 共享动态页签的真实 pathname 需要持久化；高频变化的 search/hash 仅保存在当前
 * core 实例内，避免筛选和锚点变化触发无关状态订阅。
 */
export class RouterUrlCache {
  private paramsPathMap: Record<string, string> = {}
  private searchParamsMap: Record<string, string> = {}
  private hashMap: Record<string, string> = {}

  constructor(
    private readonly onParamsPathMapChange: (
      value: Record<string, string>,
      tabKey: string,
      pathname: string | null,
    ) => void,
  ) {}

  getParamsPath(tabKey: string) {
    return this.paramsPathMap[tabKey] || ''
  }

  hydrateParamsPathMap(value: Record<string, string>) {
    this.paramsPathMap = { ...value }
  }

  setParamsPath(tabKey: string, pathname: string | null) {
    if (!pathname) {
      if (!(tabKey in this.paramsPathMap))
        return
      delete this.paramsPathMap[tabKey]
    } else {
      if (this.paramsPathMap[tabKey] === pathname)
        return
      this.paramsPathMap[tabKey] = pathname
    }
    this.onParamsPathMapChange(
      { ...this.paramsPathMap },
      tabKey,
      pathname || null,
    )
  }

  getSearch(tabKey: string) {
    return this.searchParamsMap[tabKey] || ''
  }

  setSearch(tabKey: string, value: string | null | undefined) {
    const normalized = normalizeSearchParams(value)
    if (normalized)
      this.searchParamsMap[tabKey] = normalized
    else
      delete this.searchParamsMap[tabKey]
  }

  getHash(tabKey: string) {
    return this.hashMap[tabKey] || ''
  }

  setHash(tabKey: string, value: string | null | undefined) {
    const normalized = normalizeHash(value)
    if (normalized)
      this.hashMap[tabKey] = normalized
    else
      delete this.hashMap[tabKey]
  }

  clear(tabKey: string) {
    delete this.searchParamsMap[tabKey]
    delete this.hashMap[tabKey]
    this.setParamsPath(tabKey, null)
  }
}

/** 使用浏览器 origin 或稳定虚拟 origin 解析应用内相对 URL。 */
export function parseUrl(url: string) {
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
  pathname: string
  searchParams?: string | null
  hash?: string | null
}) {
  const search = normalizeSearchParams(data.searchParams)
  return `${data.pathname}${search ? `?${search}` : ''}${normalizeHash(data.hash)}`
}

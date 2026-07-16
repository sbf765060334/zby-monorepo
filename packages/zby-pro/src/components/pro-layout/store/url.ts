/**
 * ProLayout URL 解析在非浏览器环境中使用的虚拟 origin。
 *
 * 该 origin 只用于满足原生 URL 对相对地址的 base 要求，调用方最终只消费
 * pathname、search 和 hash，不会把它作为真实跳转域名。
 */
const FALLBACK_URL_BASE = 'https://zby.local'

/**
 * 将绝对地址或应用内相对地址解析为标准 URL 对象。
 *
 * 浏览器中默认以当前 origin 为 base；SSR、测试等没有 window 的环境使用稳定
 * 的虚拟 origin。调用方可以显式传入 base，以测试或解析其它 origin 下的地址。
 * 无法被原生 URL 接受的输入会保持平台默认行为并抛出 TypeError。
 */
export function parseUrl(url: string, base?: string): URL {
  const baseUrl =
    base || (typeof window === 'undefined' ? FALLBACK_URL_BASE : window.location.origin)

  return new URL(url, baseUrl)
}

/**
 * 把查询参数统一为“不包含问号前缀”的 Cache 存储格式。
 *
 * 空值统一返回空字符串；非空值只移除一个可选的开头 `?`，不会重新排序、
 * 解码或编码参数，因此可以保留调用方原始的查询参数顺序。
 */
export function normalizeSearchParams(input: string | null | undefined) {
  if (!input)
    return ''

  return String(input).replace(/^\?/, '')
}

/**
 * 把锚点统一为“包含井号前缀”的 Router location 格式。
 *
 * 空值统一返回空字符串；非空值已经包含 `#` 时原样保留，否则补充前缀。
 */
export function normalizeHash(input: string | null | undefined) {
  if (!input)
    return ''

  const value = String(input)
  return value.startsWith('#') ? value : `#${value}`
}

interface BuildUrlForTabParams {
  /** 纯 pathname，不应混入 search 或 hash。 */
  pathname: string
  /** 查询参数，可以包含或省略开头的 `?`。 */
  searchParams?: string | null
  /** 锚点，可以包含或省略开头的 `#`。 */
  hash?: string | null
}

/**
 * 将页签缓存的 pathname、searchParams 和 hash 组合成导航字符串。
 *
 * 参数刻意拆分为三个字段，避免参考实现中 path 已含 query/hash 时出现静默忽略
 * searchParams 或重复拼接 hash。该函数不使用 URLSearchParams 重写查询字符串，
 * 因此不会改变已有编码、参数顺序或重复参数。
 */
export function buildUrlForTab(data: BuildUrlForTabParams) {
  const searchParams = normalizeSearchParams(data.searchParams)
  const hash = normalizeHash(data.hash)
  const query = searchParams ? `?${searchParams}` : ''

  return `${data.pathname}${query}${hash}`
}

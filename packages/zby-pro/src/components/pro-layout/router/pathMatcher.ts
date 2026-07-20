/**
 * ProLayout 内部使用的轻量路径匹配器。
 *
 * 这里有意只实现 ProLayout 当前路由契约需要的语法，并不是 React Router
 * `matchPath` 的完整替代品。支持范围如下：
 *
 * - `/dashboard`：静态路径按照 React Router 默认规则忽略大小写；
 * - `/projects/:projectId`：以 `:` 开头的段匹配一个实际路径段；
 * - `/docs/*`：仅允许位于末尾的 `*` 匹配零个或多个剩余路径段；
 * - query、hash 和末尾多余的 `/` 不参与匹配。
 *
 * 路径标准化能力由 `normalizeRoutePath` 统一提供，Route Registry 会复用同一
 * 规则建立标准化精确索引，避免静态路由和动态路由出现不同的匹配语义。
 *
 * @param pattern 路由配置中注册的路径模式。
 * @param pathname 浏览器当前的真实 pathname，也允许包含 query 或 hash。
 * @returns 路径模式能完整覆盖 pathname 时返回 `true`。
 */
export function matchRoutePath(pattern: string, pathname: string) {
  // 两边必须应用同一套标准化规则，否则末尾斜杠等差异会造成误判。
  const normalizedPattern = normalizeRoutePath(pattern)
  const normalizedPathname = normalizeRoutePath(pathname)

  // React Router 默认 caseSensitive=false，完全相同或仅大小写不同都可以直接结束。
  if (normalizedPattern.toLowerCase() === normalizedPathname.toLowerCase())
    return true

  // 以 `/` 开头的绝对路径会产生相同的首个空字符串，不影响逐段对齐。
  const patternParts = normalizedPattern.split('/')
  const pathnameParts = normalizedPathname.split('/')

  for (let index = 0; index < patternParts.length; index += 1) {
    const part = patternParts[index]

    // `*` 在检查实际段是否存在之前处理，因此 `/docs/*` 也能匹配 `/docs`。
    // 非末尾 `*` 明确返回 false，避免形成难以解释的中间贪婪匹配。
    if (part === '*')
      return index === patternParts.length - 1

    // 每个 pattern 段都必须在 pathname 中有对应位置；绝对路径开头的空段由两边共同拥有。
    if (pathnameParts[index] === undefined)
      return false

    // 参数段必须对应非空值，重复斜杠产生的空段不能充当参数；除此以外不约束具体内容。
    if (part.startsWith(':') && pathnameParts[index] !== '')
      continue
    if (part.startsWith(':'))
      return false

    // 静态段与 React Router 默认匹配语义一致，不区分大小写。
    if (part.toLowerCase() !== pathnameParts[index].toLowerCase())
      return false
  }

  // pattern 已经遍历完毕时，pathname 不能再有额外段；额外段只能由末尾 `*` 接收。
  return patternParts.length === pathnameParts.length
}

/**
 * 将参与匹配的路径转换为统一形式。
 *
 * 空字符串按根路径处理；query 和 hash 会被剥离；除根路径外，末尾连续的
 * `/` 会被移除。这里不会合并中间的重复斜杠，也不会执行 URL 解码。
 */
export function normalizeRoutePath(path: string) {
  if (!path)
    return '/'

  // pathname 在 query 或 hash 首次出现的位置结束。
  const [pathname] = path.split(/[?#]/)
  if (!pathname || pathname === '/')
    return '/'

  return pathname.replace(/\/+$/, '')
}

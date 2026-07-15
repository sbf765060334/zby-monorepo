/**
 * ProLayout 内部使用的轻量路径匹配器。
 *
 * 这里有意只实现 ProLayout 当前路由契约需要的语法，并不是 React Router
 * `matchPath` 的完整替代品。支持范围如下：
 *
 * - `/dashboard`：静态路径，每一段都必须完全相等；
 * - `/projects/:projectId`：以 `:` 开头的段匹配一个实际路径段；
 * - `/docs/*`：仅允许位于末尾的 `*` 匹配零个或多个剩余路径段；
 * - query、hash 和末尾多余的 `/` 不参与匹配。
 *
 * 需要注意，Route Registry 会先用原始 pathname 进行映射表精确查询，只有
 * 动态路由回退阶段才会调用本函数。因此本函数的标准化规则不等于 Registry
 * 对所有静态路径都自动执行了相同的标准化。
 *
 * @param pattern 路由配置中注册的路径模式。
 * @param pathname 浏览器当前的真实 pathname，也允许包含 query 或 hash。
 * @returns 路径模式能完整覆盖 pathname 时返回 `true`。
 */
export function matchRoutePath(pattern: string, pathname: string) {
  // 两边必须应用同一套标准化规则，否则末尾斜杠等差异会造成误判。
  const normalizedPattern = normalizePath(pattern)
  const normalizedPathname = normalizePath(pathname)

  // 静态路径或已经完全相同的动态模式可以直接结束，无需逐段比较。
  if (normalizedPattern === normalizedPathname)
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

    // 普通段和参数段都必须在 pathname 中占据一个位置。
    if (pathnameParts[index] === undefined)
      return false

    // 参数段只约束“必须存在一个段”，不约束该段的具体字符串内容。
    if (part.startsWith(':'))
      continue

    // 非参数段按照大小写敏感的字符串规则进行精确比较。
    if (part !== pathnameParts[index])
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
function normalizePath(path: string) {
  if (!path)
    return '/'

  // pathname 在 query 或 hash 首次出现的位置结束。
  const [pathname] = path.split(/[?#]/)
  if (!pathname || pathname === '/')
    return '/'

  return pathname.replace(/\/+$/, '')
}

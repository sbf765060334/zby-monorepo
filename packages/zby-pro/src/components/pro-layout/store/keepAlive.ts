import type { ProLayoutKeepAliveConfig, ProLayoutPage } from '../interface'

/** 判断页面是否满足 KeepAlive 的 include/exclude 过滤条件。 */
function shouldKeepPage(page: ProLayoutPage, config: ProLayoutKeepAliveConfig) {
  const { include, exclude } = config

  if (Array.isArray(exclude) && exclude.includes(page.key))
    return false
  if (typeof exclude === 'function' && exclude(page.route))
    return false
  if (Array.isArray(include))
    return include.includes(page.key)
  if (typeof include === 'function')
    return include(page.route)

  return true
}

/** maxCachedPages 存在时，页面被重新访问需要刷新 LRU 时间。 */
export function shouldRefreshPageTouchedAt(
  keepAlive: boolean | ProLayoutKeepAliveConfig,
) {
  return typeof keepAlive === 'object' && typeof keepAlive.maxCachedPages === 'number'
}

/**
 * 根据 KeepAlive 配置筛选页面并执行 LRU 淘汰。
 *
 * 当前活动页面始终保留；固定页签不参与普通 LRU 淘汰。与参考实现不同，这里会在
 * 一次计算中持续淘汰，直到达到上限或已经没有可淘汰页面。maxCachedPages 小于等于
 * 0 时只保留活动页和不能淘汰的固定页，不再被误判为“无限缓存”。
 */
export function enforceKeepAliveLimit(
  pages: ProLayoutPage[],
  activeKey: string | null,
  keepAlive: boolean | ProLayoutKeepAliveConfig,
  fixedSet: string[],
) {
  if (keepAlive === false)
    return pages.filter((page) => page.key === activeKey)

  let retainedPages =
    typeof keepAlive === 'object'
      ? pages.filter(
          (page) => page.key === activeKey || shouldKeepPage(page, keepAlive),
        )
      : pages

  if (typeof keepAlive !== 'object' || typeof keepAlive.maxCachedPages !== 'number')
    return retainedPages

  if (!Number.isFinite(keepAlive.maxCachedPages))
    return retainedPages

  const limit = Math.max(1, Math.floor(keepAlive.maxCachedPages))

  while (retainedPages.length > limit) {
    const evictable = retainedPages
      .filter((page) => page.key !== activeKey && !fixedSet.includes(page.key))
      .sort((left, right) => left.touchedAt - right.touchedAt)[0]

    if (!evictable)
      break

    retainedPages = retainedPages.filter((page) => page.key !== evictable.key)
  }

  return retainedPages
}

import type { RouterKeepAliveConfig, RouterPage, RouterRoute } from './types'

/** 复制 KeepAlive 数组配置，形成不会受调用方原地修改影响的实例快照。 */
export function snapshotKeepAlive<Route extends RouterRoute>(
  value: boolean | RouterKeepAliveConfig<Route>,
): boolean | RouterKeepAliveConfig<Route> {
  if (typeof value !== 'object')
    return value
  return {
    ...value,
    include: Array.isArray(value.include) ? [...value.include] : value.include,
    exclude: Array.isArray(value.exclude) ? [...value.exclude] : value.exclude,
  }
}

/** 只有启用有限 LRU 时，重访页面才需要更新 touchedAt。 */
export function shouldRefreshTouchedAt<Route extends RouterRoute>(
  keepAlive: boolean | RouterKeepAliveConfig<Route>,
) {
  return typeof keepAlive === 'object' &&
    typeof keepAlive.maxCachedPages === 'number'
}

/** 应用 KeepAlive 过滤与 LRU 上限。 */
export function enforceKeepAlive<Route extends RouterRoute>(
  pages: readonly RouterPage<Route>[],
  activeKey: string | null,
  keepAlive: boolean | RouterKeepAliveConfig<Route>,
  fixedSet: readonly string[],
) {
  if (keepAlive === false) {
    const activePages = pages.filter((page) => page.key === activeKey)
    return activePages.length === pages.length ? pages : activePages
  }

  const filteredPages = typeof keepAlive === 'object'
    ? pages.filter(
        (page) =>
          page.key === activeKey || shouldKeepPage(page, keepAlive),
      )
    : pages
  let retained = filteredPages.length === pages.length ? pages : filteredPages
  if (
    typeof keepAlive !== 'object' ||
    typeof keepAlive.maxCachedPages !== 'number' ||
    !Number.isFinite(keepAlive.maxCachedPages)
  ) {
    return retained
  }

  const limit = Math.max(activeKey ? 1 : 0, Math.floor(keepAlive.maxCachedPages))
  while (retained.length > limit) {
    const evictable = retained
      .filter((page) => page.key !== activeKey && !fixedSet.includes(page.key))
      .sort((left, right) => left.touchedAt - right.touchedAt)[0]
    if (!evictable)
      break
    retained = retained.filter((page) => page.key !== evictable.key)
  }
  return retained
}

function shouldKeepPage<Route extends RouterRoute>(
  page: RouterPage<Route>,
  config: RouterKeepAliveConfig<Route>,
) {
  if (Array.isArray(config.exclude) && config.exclude.includes(page.key))
    return false
  if (typeof config.exclude === 'function' && config.exclude(page.route))
    return false
  if (Array.isArray(config.include))
    return config.include.includes(page.key)
  if (typeof config.include === 'function')
    return config.include(page.route)
  return true
}

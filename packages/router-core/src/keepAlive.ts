/**
 * 文件职责：决定哪些页面实例应该继续保留，以及缓存超过上限时淘汰哪一个页面。
 *
 * 它只处理 RouterPage 描述数组，不渲染组件。可以把它理解成页面缓存的“保留名单和
 * 清理规则”，活动页面与固定页签会得到额外保护。
 */
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
    // 完全关闭 KeepAlive 时只留下当前正在显示的页面，其余页面实例立即交给 UI 卸载。
    const activePages = pages.filter((page) => page.key === activeKey)
    return activePages.length === pages.length ? pages : activePages
  }

  // include/exclude 只过滤非活动页面；当前正在看的页面不能在一次状态计算中被移除。
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
    // 没有配置有效数字上限时，完成名单过滤就可以返回。
    return retained
  }

  // 即使 maxCachedPages 写成 0，只要存在活动页，也至少要保留这一页。
  const limit = Math.max(activeKey ? 1 : 0, Math.floor(keepAlive.maxCachedPages))
  while (retained.length > limit) {
    // 从可淘汰页面里找 touchedAt 最小的，也就是最久没有访问的那一页。
    const evictable = retained
      .filter((page) => page.key !== activeKey && !fixedSet.includes(page.key))
      .sort((left, right) => left.touchedAt - right.touchedAt)[0]
    if (!evictable)
      break
    retained = retained.filter((page) => page.key !== evictable.key)
  }
  return retained
}

/** 按“exclude 优先于 include”的顺序判断一个非活动页面是否应该保留。 */
function shouldKeepPage<Route extends RouterRoute>(
  page: RouterPage<Route>,
  config: RouterKeepAliveConfig<Route>,
) {
  // 数组配置按页签 key 匹配，函数配置则可以查看完整业务路由元数据。
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

import type { ProLayoutKeepAliveConfig, ProLayoutPage } from '../interface'

/** 判断页面是否满足 KeepAlive 的 include/exclude 过滤条件。 */
function shouldKeepPage(page: ProLayoutPage, config: ProLayoutKeepAliveConfig) {
  const { include, exclude } = config

  // exclude 优先级高于 include：同一页面同时命中时必须被移除。
  if (Array.isArray(exclude) && exclude.includes(page.key))
    return false
  if (typeof exclude === 'function' && exclude(page.route))
    return false
  // include 存在时变为白名单；未配置 include/exclude 才默认保留全部页面。
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
  // 完全关闭 KeepAlive 时只保留当前活动页面，切换后其它页面实例立即销毁。
  if (keepAlive === false) {
    const activePages = pages.filter((page) => page.key === activeKey)
    return activePages.length === pages.length ? pages : activePages
  }

  // 活动页面即使命中 exclude 也必须保留到导航完成，否则当前视图会在同一轮状态更新
  // 中先被卸载；其余页面才应用 include/exclude 配置。
  const filteredPages =
    typeof keepAlive === 'object'
      ? pages.filter(
          (page) => page.key === activeKey || shouldKeepPage(page, keepAlive),
        )
      : pages
  let retainedPages = filteredPages.length === pages.length ? pages : filteredPages

  // boolean true 或未设置数字上限时只应用过滤规则，不启用 LRU。
  if (typeof keepAlive !== 'object' || typeof keepAlive.maxCachedPages !== 'number')
    return retainedPages

  // Infinity 表示调用方不希望限制数量；NaN 同样不参与大小比较，保持当前集合。
  if (!Number.isFinite(keepAlive.maxCachedPages))
    return retainedPages

  // 至少给活动页面保留一个名额；小数向下取整，保持“最多 N 个页面”的直觉语义。
  const limit = Math.max(1, Math.floor(keepAlive.maxCachedPages))

  while (retainedPages.length > limit) {
    // 活动页和固定页签都是不可淘汰项；剩余候选按 touchedAt 升序取最久未访问页面。
    const evictable = retainedPages
      .filter((page) => page.key !== activeKey && !fixedSet.includes(page.key))
      .sort((left, right) => left.touchedAt - right.touchedAt)[0]

    // 固定页数量本身可能超过上限，此时没有合法候选，宁可超过 limit 也不能破坏固定语义。
    if (!evictable)
      break

    // 每轮只移除当前最旧候选，然后重新计算；可一次收敛到新配置要求的上限。
    retainedPages = retainedPages.filter((page) => page.key !== evictable.key)
  }

  return retainedPages
}

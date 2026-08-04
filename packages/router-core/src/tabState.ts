import { isConcreteRoutePath } from './registry'
import type { RouteRegistry } from './registry'
import type { RouterRoute, RouterTab } from './types'

/** 清理重复、已删除或无法恢复真实地址的固定页签。 */
export function sanitizeFixedTabKeys<Route extends RouterRoute>(
  fixedTabs: readonly string[],
  fixedParamsPathMap: Readonly<Record<string, string>>,
  registry: RouteRegistry<Route>,
) {
  const seen = new Set<string>()
  const sanitized: string[] = []

  fixedTabs.forEach((key) => {
    const tabKey = registry.getTabKey(key)
    const route = tabKey ? registry.resolveLeafRoute(tabKey)?.route : null
    if (!tabKey || seen.has(tabKey) || !registry.isPageRoute(route))
      return

    if (!isConcreteRoutePath(tabKey)) {
      const pathname = fixedParamsPathMap[tabKey]
      if (
        !pathname ||
        !isConcreteRoutePath(pathname) ||
        registry.getTabKey(pathname) !== tabKey
      ) {
        return
      }
    }

    seen.add(tabKey)
    sanitized.push(tabKey)
  })

  return sanitized
}

/** 清理重复或已经不存在的收藏路由，同时保持首次出现顺序。 */
export function sanitizeFavoriteRoutePaths<Route extends RouterRoute>(
  favoriteRoutePaths: readonly string[],
  registry: RouteRegistry<Route>,
) {
  const seen = new Set<string>()
  const sanitized: string[] = []

  favoriteRoutePaths.forEach((path) => {
    const resolved = registry.resolveLeafRoute(path)
    const routeKey = resolved?.routeKey
    if (!routeKey || seen.has(routeKey) || !registry.isPageRoute(resolved?.route))
      return

    seen.add(routeKey)
    sanitized.push(routeKey)
  })

  return sanitized
}

function createTabsFromFixedSet<Route extends RouterRoute>(
  fixedSet: readonly string[],
  registry: RouteRegistry<Route>,
) {
  const tabs = fixedSet.reduce<RouterTab[]>((result, key) => {
    const route = registry.resolveLeafRoute(key)?.route
    if (registry.isPageRoute(route)) {
      result.push({ key, label: route!.title, labelCustomized: false })
    }
    return result
  }, [])
  return sortTabs(tabs, fixedSet)
}

/** hydration 只补入新固定页签，不删除当前会话已经打开的普通页签。 */
export function mergeTabsWithFixedSet<Route extends RouterRoute>(
  tabs: readonly RouterTab[],
  fixedSet: readonly string[],
  registry: RouteRegistry<Route>,
) {
  const map = new Map(tabs.map((tab) => [tab.key, tab]))
  createTabsFromFixedSet(fixedSet, registry).forEach((tab) => {
    if (!map.has(tab.key))
      map.set(tab.key, tab)
  })
  return sortTabs([...map.values()], fixedSet)
}

/** 固定组遵循 fixedSet 顺序，普通组保持 tabs 中的原始顺序。 */
export function sortTabs(tabs: readonly RouterTab[], fixedSet: readonly string[]) {
  const tabMap = new Map(tabs.map((tab) => [tab.key, tab]))
  const fixedKeySet = new Set(fixedSet)
  const fixedTabs = fixedSet
    .map((key) => tabMap.get(key))
    .filter((tab): tab is RouterTab => Boolean(tab))

  return fixedTabs.concat(
    tabs.filter((tab) => !fixedKeySet.has(tab.key)),
  )
}

export function areStringArraysEqual(
  left: readonly string[],
  right: readonly string[],
) {
  return left === right || (
    left.length === right.length &&
    left.every((item, index) => item === right[index])
  )
}

export function areStringRecordsEqual(
  left: Record<string, string>,
  right: Record<string, string>,
) {
  if (left === right)
    return true
  const leftKeys = Object.keys(left)
  return leftKeys.length === Object.keys(right).length &&
    leftKeys.every((key) => left[key] === right[key])
}

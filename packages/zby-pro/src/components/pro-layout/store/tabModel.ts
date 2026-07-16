import type { ProLayoutRouteRegistry } from '../route'
import type { ProLayoutTab } from './types'

/**
 * 清理持久化固定页签中的无效 key，并保持原始顺序。
 *
 * 使用 Registry 动态解析而不是只查 fullRouteMapping，因此开启 supportMultipleTabs
 * 的真实参数 pathname 仍然可以作为合法固定 key；已经删除或不再是页面的路由会
 * 被移除，避免它们不可见地占用 maxFixedTabCount。
 */
export function sanitizeFixedTabKeys(
  fixedTabs: string[],
  registry: ProLayoutRouteRegistry,
) {
  const seen = new Set<string>()

  return fixedTabs.filter((key) => {
    if (seen.has(key))
      return false

    const route = registry.resolveLeafRoute(key)?.route
    if (!registry.isPageRoute(route))
      return false

    seen.add(key)
    return true
  })
}

/** 将固定页签稳定地排在普通页签之前，同时保留两个分组各自的已有顺序。 */
export function sortTabs(tabs: ProLayoutTab[], fixedSet: string[]) {
  return tabs
    .filter((tab) => fixedSet.includes(tab.key))
    .concat(tabs.filter((tab) => !fixedSet.includes(tab.key)))
}

/** 根据持久化 fixedSet 创建可以直接交给 Store 的页签模型。 */
export function createTabsFromFixedSet(
  fixedSet: string[],
  registry: ProLayoutRouteRegistry,
) {
  return fixedSet.reduce<ProLayoutTab[]>((tabs, key) => {
    const route = registry.resolveLeafRoute(key)?.route
    if (registry.isPageRoute(route))
      tabs.push({ key, label: route!.title })

    return tabs
  }, [])
}

/**
 * 创建首屏页签集合。
 *
 * 持久化固定页签先进入列表；当前 URL 对应页签如果尚不存在，则追加后再按固定组
 * 排序。这里只创建页签描述，不创建 React 页面实例。
 */
export function createInitialTabs(params: {
  fixedSet: string[]
  registry: ProLayoutRouteRegistry
  initialTabKey: string | null
  initialRoute?: { title: string }
}) {
  const tabs = createTabsFromFixedSet(params.fixedSet, params.registry)

  if (!params.initialTabKey || !params.initialRoute)
    return tabs

  if (tabs.some((tab) => tab.key === params.initialTabKey))
    return sortTabs(tabs, params.fixedSet)

  return sortTabs(
    tabs.concat({ key: params.initialTabKey, label: params.initialRoute.title }),
    params.fixedSet,
  )
}

/**
 * hydration 后把新固定页签补进现有页签集合。
 *
 * 当前会话已经打开的普通页签不会因为加载持久化状态而消失；新的固定页签只在
 * Registry 仍能解析为页面时加入，最后统一恢复固定组排序。
 */
export function mergeTabsWithFixedSet(
  tabs: ProLayoutTab[],
  fixedSet: string[],
  registry: ProLayoutRouteRegistry,
) {
  const tabMap = new Map(tabs.map((tab) => [tab.key, tab]))

  createTabsFromFixedSet(fixedSet, registry).forEach((tab) => {
    if (!tabMap.has(tab.key))
      tabMap.set(tab.key, tab)
  })

  return sortTabs(Array.from(tabMap.values()), fixedSet)
}

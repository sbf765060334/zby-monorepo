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
  // Set 同时承担去重和保持“第一次出现位置”的职责。
  const seen = new Set<string>()

  return fixedTabs.filter((key) => {
    if (seen.has(key))
      return false

    // 不能只查精确映射：多页签动态路由的 key 是真实 pathname，需要 Registry 动态匹配。
    const route = registry.resolveLeafRoute(key)?.route
    if (!registry.isPageRoute(route))
      return false

    // 只有通过页面校验的 key 才写入 seen；无效项不会影响后续合法项的判断。
    seen.add(key)
    return true
  })
}

/** 将固定页签稳定地排在普通页签之前，同时保留两个分组各自的已有顺序。 */
export function sortTabs(tabs: ProLayoutTab[], fixedSet: string[]) {
  // 两次 filter 都按 tabs 原顺序遍历，因此这是稳定分组，不会自行重排固定组或普通组。
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
    // fixedSet 已经清理过，但 Registry 可能在运行时替换；这里再次防御已失效路由。
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
  // Map 保留已有 tabs 的插入顺序，并支持 O(1) 判断持久化固定页签是否已在当前会话打开。
  const tabMap = new Map(tabs.map((tab) => [tab.key, tab]))

  createTabsFromFixedSet(fixedSet, registry).forEach((tab) => {
    // 已打开页签保留当前动态标题；只为缺失的固定项采用 Registry 标题创建模型。
    if (!tabMap.has(tab.key))
      tabMap.set(tab.key, tab)
  })

  // 补齐后统一按最新 fixedSet 分组，同时保持两个分组内部的 Map 插入顺序。
  return sortTabs(Array.from(tabMap.values()), fixedSet)
}

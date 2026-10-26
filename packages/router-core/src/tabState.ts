/**
 * 文件职责：提供页签状态的纯计算工具，例如清洗旧数据、合并固定页签和比较快照。
 *
 * “纯计算”表示这些函数不会直接改 Store 或写数据库：给它们同样的输入，就会得到同
 * 样的输出，因此持久化加载和页签命令都可以安全复用这些规则。
 */
import { isConcreteRoutePath } from './registry'
import type { RouteRegistry } from './registry'
import type { RouterRoute, RouterTab } from './types'

const DEFAULT_MAX_FIXED_TAB_COUNT = 4

/** 创建期把固定页签上限收成有限非负整数；非法值回退默认 4，0 表示禁止固定。 */
export function normalizeMaxFixedTabCount(value: number | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value))
    return DEFAULT_MAX_FIXED_TAB_COUNT
  const normalized = Math.floor(value)
  return normalized < 0 ? DEFAULT_MAX_FIXED_TAB_COUNT : normalized
}

/** 清理重复、已删除或无法恢复真实地址的固定页签。 */
export function sanitizeFixedTabKeys<Route extends RouterRoute>(
  fixedTabs: readonly string[],
  fixedParamsPathMap: Readonly<Record<string, string>>,
  registry: RouteRegistry<Route>,
) {
  const seen = new Set<string>()
  const sanitized: string[] = []

  fixedTabs.forEach((key) => {
    // 先把旧数据转换成当前 Registry 认可的标准页签 key，并排除重复或非页面路由。
    const tabKey = registry.getTabKey(key)
    const route = tabKey ? registry.resolveLeafRoute(tabKey)?.route : null
    if (!tabKey || seen.has(tabKey) || !registry.isPageRoute(route))
      return

    if (!isConcreteRoutePath(tabKey)) {
      // 共享动态页签的 key 仍带 `:param`，必须同时找到同页签的真实地址才能恢复。
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
    // 收藏统一保存注册 routeKey；真实动态地址和大小写差异都会被收敛到同一项。
    const resolved = registry.resolveLeafRoute(path)
    const routeKey = resolved?.routeKey
    if (!routeKey || seen.has(routeKey) || !registry.isPageRoute(resolved?.route))
      return

    seen.add(routeKey)
    sanitized.push(routeKey)
  })

  return sanitized
}

/** 把已经清洗过的固定页签 key 转成最小 RouterTab 描述。 */
function createTabsFromFixedSet<Route extends RouterRoute>(
  fixedSet: readonly string[],
  registry: RouteRegistry<Route>,
) {
  // 旧存储仍可能与新路由表不一致，所以生成页签前再确认一次页面身份。
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
  // Map 既能去重，也会保留当前会话已经自定义过的页签标题。
  const map = new Map(tabs.map((tab) => [tab.key, tab]))
  createTabsFromFixedSet(fixedSet, registry).forEach((tab) => {
    if (!map.has(tab.key))
      map.set(tab.key, tab)
  })
  return sortTabs([...map.values()], fixedSet)
}

/**
 * 新页签插到当前活动页签右侧。
 * 未固定页签紧挨活动页签；活动页签已固定时，未固定的新页签不能插进固定组，放到固定组之后。
 * 没有活动页签时追加到末尾。最终仍由 sortTabs 保证固定组在前。
 */
export function insertTabAfterActive(
  tabs: readonly RouterTab[],
  tab: RouterTab,
  activeKey: string | null,
  fixedSet: readonly string[],
) {
  const fixedKeySet = new Set(fixedSet)
  const activeIndex = activeKey == null
    ? -1
    : tabs.findIndex((item) => item.key === activeKey)
  let insertAt = tabs.length

  if (activeIndex >= 0 && activeKey != null) {
    if (fixedKeySet.has(activeKey)) {
      const firstUnfixed = tabs.findIndex((item) => !fixedKeySet.has(item.key))
      insertAt = firstUnfixed < 0 ? tabs.length : firstUnfixed
    } else {
      insertAt = activeIndex + 1
    }
  }

  const next = tabs.slice()
  next.splice(insertAt, 0, tab)
  return sortTabs(next, fixedSet)
}

/** 固定组遵循 fixedSet 顺序，普通组保持 tabs 中的原始顺序。 */
export function sortTabs(tabs: readonly RouterTab[], fixedSet: readonly string[]) {
  // 固定页签严格按 fixedSet 排列；Map 用来快速从 key 找回完整页签对象。
  const tabMap = new Map(tabs.map((tab) => [tab.key, tab]))
  const fixedKeySet = new Set(fixedSet)
  const fixedTabs = fixedSet
    .map((key) => tabMap.get(key))
    .filter((tab): tab is RouterTab => Boolean(tab))

  return fixedTabs.concat(
    tabs.filter((tab) => !fixedKeySet.has(tab.key)),
  )
}

/** 按顺序比较两个字符串数组；顺序不同也属于不同状态。 */
export function areStringArraysEqual(
  left: readonly string[],
  right: readonly string[],
) {
  return left === right || (
    left.length === right.length &&
    left.every((item, index) => item === right[index])
  )
}

/** 比较两个字符串字典是否拥有完全相同的 key 和 value。 */
export function areStringRecordsEqual(
  left: Record<string, string>,
  right: Record<string, string>,
) {
  // 引用相同是最快的成功分支，不必再枚举 key。
  if (left === right)
    return true
  const leftKeys = Object.keys(left)
  // 数量相同再逐项比较，可以同时发现新增、删除和修改。
  return leftKeys.length === Object.keys(right).length &&
    leftKeys.every((key) => left[key] === right[key])
}

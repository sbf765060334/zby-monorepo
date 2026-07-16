import type { ProLayoutPage } from '../interface'
import type { ProLayoutRouteRegistry } from '../route'
import { normalizeProLayoutStorageState } from './storage'
import { createInitialTabs, sanitizeFixedTabKeys } from './tabModel'
import type { CreateProLayoutStoreParams, ProLayoutTab } from './types'

/** 创建 Store 前可以一次性计算完成的首屏状态。 */
export interface ProLayoutInitialState {
  /** 首屏收藏集合。 */
  collectionSet: string[]
  /** 已清理无效 key 的首屏固定页签集合。 */
  fixedSet: string[]
  /** 首屏页签。 */
  tabs: ProLayoutTab[]
  /** 首屏页面实例。 */
  pages: ProLayoutPage[]
  /** 首屏活动页签 key。 */
  activeTabKey: string | null
  /** 首屏活动页面 key。 */
  activePage: string | null
  /** 首屏宿主 pathname。 */
  currentPathname: string
  /** 首屏路由层级。 */
  currentRoutes: ReturnType<ProLayoutRouteRegistry['getCurrentRoutes']>
  /** 首屏菜单选中路径。 */
  currentSelectedPath: string[]
  /** Cache 初始化使用的参数路径映射。 */
  fixedParamsPathMap: Record<string, string>
}

/**
 * 计算创建 Store 所需的首屏快照。
 *
 * 该函数没有副作用：不创建 Store、不导航，也不读写外部存储，方便对 SSR 首屏
 * 和普通浏览器首屏使用同一套初始化规则。
 */
export function createProLayoutInitialState(
  params: CreateProLayoutStoreParams,
): ProLayoutInitialState {
  const storageState = normalizeProLayoutStorageState(params.initialStorageState)
  const fixedSet = sanitizeFixedTabKeys(storageState.fixedTabs, params.registry)
  const initialPagePathname = resolveInitialPagePathname(
    params.registry,
    params.initialPathname,
    params.defaultRoute,
  )
  const initialLeaf = initialPagePathname
    ? params.registry.resolveLeafRoute(initialPagePathname)
    : null
  const initialTabKey = initialPagePathname
    ? params.registry.getTabKey(initialPagePathname)
    : null
  const fixedParamsPathMap = { ...storageState.fixedParamsPathMap }

  if (
    initialPagePathname &&
    initialTabKey &&
    initialTabKey !== initialPagePathname &&
    !initialLeaf?.route.supportMultipleTabs
  ) {
    fixedParamsPathMap[initialTabKey] = initialPagePathname
  }

  const currentPathname = initialPagePathname || params.initialPathname || ''
  const currentRoutes = currentPathname
    ? params.registry.getCurrentRoutes(currentPathname)
    : []
  const currentSelectedPath = currentPathname
    ? params.registry.getCurrentSelectedPath(currentPathname)
    : []
  const pages = createInitialPages(initialPagePathname, initialTabKey, initialLeaf?.route)

  return {
    collectionSet: storageState.collection,
    fixedSet,
    tabs: createInitialTabs({
      fixedSet,
      registry: params.registry,
      initialTabKey,
      initialRoute: initialLeaf?.route,
    }),
    pages,
    activeTabKey: initialTabKey,
    activePage: pages.length > 0 ? initialTabKey : null,
    currentPathname,
    currentRoutes,
    currentSelectedPath,
    fixedParamsPathMap,
  }
}

/** 根据入口 pathname 解析首个真正可展示的页面地址。 */
function resolveInitialPagePathname(
  registry: ProLayoutRouteRegistry,
  pathname?: string,
  defaultRoute?: string | null,
) {
  if (!pathname)
    return null

  if (pathname === '/')
    return defaultRoute || registry.findFirstAccessiblePath() || null

  const leaf = registry.resolveLeafRoute(pathname)
  if (registry.isPageRoute(leaf?.route))
    return pathname

  return registry.findFirstAccessibleChild(pathname) || null
}

/** 当前 pathname 可以直接展示时，为其创建首个页面实例描述。 */
function createInitialPages(
  pathname: string | null,
  tabKey: string | null,
  route?: ProLayoutPage['route'],
) {
  if (!pathname || !tabKey || !route)
    return []

  return [
    {
      key: tabKey,
      pathname,
      route,
      // 首屏页面早于后续通过 Date.now 创建的页面，0 可以自然成为 LRU 最旧项。
      touchedAt: 0,
    },
  ]
}

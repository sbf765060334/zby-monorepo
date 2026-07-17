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
  // initialStorageState 可能来自 SSR、远端预取或调用方手写对象，先在边界补齐字段并
  // 复制集合，后续初始化逻辑即可只处理可信结构。
  const storageState = normalizeProLayoutStorageState(params.initialStorageState)
  // 持久化固定项可能属于旧路由配置；创建 tabs 前先去重并移除当前 Registry 无法
  // 解析成页面的 key，避免无效项占用固定上限。
  const fixedSet = sanitizeFixedTabKeys(storageState.fixedTabs, params.registry)
  // 入口可能是根路径、目录或叶子页，统一解析为首个真正可以渲染的 pathname。
  const initialPagePathname = resolveInitialPagePathname(
    params.registry,
    params.initialPathname,
  )
  const initialLeaf = initialPagePathname
    ? params.registry.resolveLeafRoute(initialPagePathname, { withinAuth: true })
    : null
  const initialTabKey = initialPagePathname
    ? params.registry.getTabKey(initialPagePathname)
    : null
  // Cache 拥有自己的可变副本，不能直接复用 storageState 中的对象引用。
  const fixedParamsPathMap = { ...storageState.fixedParamsPathMap }

  if (
    initialPagePathname &&
    initialTabKey &&
    initialTabKey !== initialPagePathname &&
    !initialLeaf?.route.supportMultipleTabs
  ) {
    // 共享动态路由的 tabKey 是注册 pattern，必须用首屏真实 pathname 覆盖持久化旧值，
    // 否则异步 hydration 前首次切换页签就可能跳回上次会话的参数地址。
    fixedParamsPathMap[initialTabKey] = initialPagePathname
  }

  // 未解析到页面时仍保留宿主传入 pathname，供 403/404 和面包屑等外层逻辑判断；
  // tabs/pages 则保持为空，不为目录或未知路由提前创建页面实例。
  const currentPathname = initialPagePathname || params.initialPathname || ''
  const currentRoutes = currentPathname
    ? params.registry.getCurrentRoutes(currentPathname)
    : []
  const currentSelectedPath = currentPathname
    ? params.registry.getCurrentSelectedPath(currentPathname)
    : []
  // 只有合法叶子路由同时具备 pathname、tabKey 和 route 时才创建首屏页面实例。
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
    // 入口存在于完整索引但不在权限索引时，保留 currentPathname 供 403 判断，但不能
    // 让一个尚未创建页签和页面实例的受限 routeKey 成为活动页签。
    activeTabKey: pages.length > 0 ? initialTabKey : null,
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
) {
  if (!pathname)
    return null

  // 根路径只使用 Registry 已完成存在性、页面类型和权限校验的默认落点。`/` 是没有
  // 任何可访问页面时的哨兵值，不能把它当成业务页面继续创建页签。
  if (pathname === '/')
    return registry.defaultRoute === '/' ? null : registry.defaultRoute

  // 权限索引中的页面保持原始真实 pathname，动态参数不会在这里被替换成 pattern。
  const leaf = registry.resolveLeafRoute(pathname, { withinAuth: true })
  if (registry.isPageRoute(leaf?.route))
    return pathname

  // 目录路由进入首个可访问子页面；未知地址或空目录无法生成首屏页面。
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

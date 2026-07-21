import { createStore } from 'zustand/vanilla'

import { createRouteRegistry } from './registry'
import { createIndexedDBRouterStorageAdapter, normalizeRouterStorageState } from './storage'
import type {
  CreateRouterCoreOptions,
  RouterBeforeCloseHook,
  RouterCloseOptions,
  RouterCore,
  RouterCoreState,
  RouterHost,
  RouterKeepAliveConfig,
  RouterLocation,
  RouterLocationEventPayload,
  RouterPage,
  RouterRoute,
  RouterRuntimeOptions,
  RouterStorageAdapter,
  RouterStorageErrorPhase,
  RouterTab,
} from './types'

/**
 * router-core 实例实现。
 *
 * 每次调用 createRouterCore 都会创建互相隔离的 Registry、Zustand Store、URL Cache
 * 和命令运行时。Store 只保存需要订阅的业务状态；宿主函数、关闭守卫和异步任务版本
 * 留在闭包中，避免内部协调动作触发 UI 重渲染。
 */

/** 未显式注入 Adapter 时复用同一个懒加载 IndexedDB 实现。 */
const DEFAULT_STORAGE_ADAPTER = createIndexedDBRouterStorageAdapter()

/** 可以独立发生本地修改、因而需要独立 hydration 版本号的持久化字段。 */
type PersistedField = 'fixedTabs' | 'fixedParamsPathMap'

/**
 * 入口 pathname 的落点处理结果。
 *
 * `continue` 表示宿主地址已经是最终地址，应继续确认页签和页面状态；`redirected`
 * 表示根路径或目录已经发起新导航，必须等待宿主回传最终 pathname；`settled` 表示
 * 当前地址没有可跳转页面，并且非活动页面状态已经在 bootstrap 阶段完成。
 */
type BootstrapResult = 'continue' | 'redirected' | 'settled'

/** 单个 core 实例私有、不可观察的命令与异步协调状态。 */
interface RouterRuntime {
  /** 实际执行地址变化的宿主；未绑定时业务导航安全 no-op。 */
  host: RouterHost | null
  /** 最近一次完成落点判断的 pathname，用于过滤 StrictMode 与 Adapter 的重复通知。 */
  lastBootstrappedPathname: string | null
  /** 始终使用最新引用的页签关闭回调。 */
  onTabClose: RouterRuntimeOptions['onTabClose'] | null
  /** 始终使用最新引用的持久化错误回调。 */
  onStorageError: RouterRuntimeOptions['onStorageError'] | null
  /** 页签 key 到关闭前守卫列表的映射。 */
  beforeCloseMap: Map<string, RouterBeforeCloseHook[]>
  /** 页签 key 到当前页面 location 事件接收器的映射。 */
  locationEmitterMap: Map<
    string,
    { emit: (payload: RouterLocationEventPayload) => void }
  >
  /** 正在执行关闭事务的页签，防止重复点击并发运行守卫。 */
  closingTabKeys: Set<string>
  /** 组合关闭命令需要跳过中间回退导航的页签。 */
  silentCloseTabKeys: Set<string>
  /** 当前 hydration Promise；并发调用方共享同一任务。 */
  storageHydrationPromise: Promise<void> | null
  /** storageKey 变化时递增，使旧来源晚到结果立即失效。 */
  storageSourceGeneration: number
  /** 加载期间每个字段的本地修改版本，用于字段级冲突合并。 */
  storageMutationVersions: Record<PersistedField, number>
}

/**
 * 页签级 URL Cache。
 *
 * 共享动态页签的真实 pathname 需要持久化；高频变化的 search/hash 仅保存在当前
 * core 实例内。Cache 不进入 Zustand，避免筛选和锚点变化触发无关状态订阅。
 */
class RouterCache {
  /** 共享动态页签 key 到最后真实 pathname 的映射。 */
  private paramsPathMap: Record<string, string>
  /** 页签 key 到不含 `?` 前缀的查询字符串。 */
  private searchParamsMap: Record<string, string> = {}
  /** 页签 key 到包含 `#` 前缀的锚点。 */
  private hashMap: Record<string, string> = {}

  constructor(
    initial: Record<string, string>,
    private readonly onParamsPathMapChange: (
      value: Record<string, string>,
    ) => void,
  ) {
    // 拷贝初始映射，调用方不能绕过变更通知直接修改 Cache 内部状态。
    this.paramsPathMap = { ...initial }
  }

  /** 获取共享动态页签最后使用的真实 pathname。 */
  getParamsPath(tabKey: string) {
    return this.paramsPathMap[tabKey] || ''
  }

  /** 返回参数路径副本，供 hydration 记录当前会话覆盖层。 */
  getParamsPathMap() {
    return { ...this.paramsPathMap }
  }

  /** 使用加载结果替换映射，但不把“刚加载的数据”再次当成本地修改保存。 */
  hydrateParamsPathMap(value: Record<string, string>) {
    this.paramsPathMap = { ...value }
  }

  /** 更新或删除真实 pathname；只有值真正变化时才通知持久化层。 */
  setParamsPath(tabKey: string, pathname: string | null) {
    if (!pathname) {
      if (!(tabKey in this.paramsPathMap))
        return
      delete this.paramsPathMap[tabKey]
    } else {
      if (this.paramsPathMap[tabKey] === pathname)
        return
      this.paramsPathMap[tabKey] = pathname
    }
    // 回调接收副本，持久化实现无法借此修改 Cache 内部对象。
    this.onParamsPathMapChange({ ...this.paramsPathMap })
  }

  /** 获取不含 `?` 的查询字符串。 */
  getSearch(tabKey: string) {
    return this.searchParamsMap[tabKey] || ''
  }

  /** 规范化并缓存查询字符串；空值统一表现为没有 Map 项。 */
  setSearch(tabKey: string, value: string | null | undefined) {
    const normalized = normalizeSearchParams(value)
    if (normalized)
      this.searchParamsMap[tabKey] = normalized
    else
      delete this.searchParamsMap[tabKey]
  }

  /** 获取包含 `#` 的页签锚点。 */
  getHash(tabKey: string) {
    return this.hashMap[tabKey] || ''
  }

  /** 规范化并缓存锚点；空值统一表现为没有 Map 项。 */
  setHash(tabKey: string, value: string | null | undefined) {
    const normalized = normalizeHash(value)
    if (normalized)
      this.hashMap[tabKey] = normalized
    else
      delete this.hashMap[tabKey]
  }

  /** 页签关闭后清理它关联的全部 URL 状态。 */
  clear(tabKey: string) {
    delete this.searchParamsMap[tabKey]
    delete this.hashMap[tabKey]
    this.setParamsPath(tabKey, null)
  }
}

export function createRouterCore(
  options: CreateRouterCoreOptions,
): RouterCore {
  // Registry 先于 Store 创建，并独立复制路由树；它是整个实例生命周期的路由事实。
  const registry = createRouteRegistry({
    routes: options.routes,
    hasAuth: options.hasAuth,
    defaultRedirectPath: options.defaultRedirectPath,
    isPageRoute: options.isPageRoute,
  })
  // KeepAlive 对象中的数组同样复制，避免调用方原地修改后偷偷改变页面淘汰规则。
  const keepAlive = snapshotKeepAlive(options.keepAlive ?? true)
  const storageAdapter = resolveStorageAdapter(options.storageAdapter)
  // 初始持久化数据始终在边界标准化，后续首屏逻辑只处理可信完整结构。
  const initialStorage = normalizeRouterStorageState(options.initial?.storageState)
  // 旧存储可能包含已经删除或不再是页面的固定 key，创建页签前先清理。
  const fixedSet = sanitizeFixedTabKeys(initialStorage.fixedTabs, registry)
  // 根路径和目录在首屏解析到可展示页面，避免订阅者先观察到无效空页签状态。
  const initialPathname = resolveInitialPathname(
    options.initial?.pathname,
    registry,
  )
  const initialLeaf = initialPathname
    ? registry.resolveLeafRoute(initialPathname, { withinAuth: true })
    : null
  const initialTabKey = initialPathname
    ? registry.getTabKey(initialPathname)
    : null
  const initialParamsPathMap = { ...initialStorage.fixedParamsPathMap }

  if (
    initialPathname &&
    initialTabKey &&
    initialTabKey !== initialPathname &&
    !initialLeaf?.route.supportMultipleTabs
  ) {
    // 当前首屏真实 URL 必须覆盖存储中的旧动态地址，保证共享页签不会倒退。
    initialParamsPathMap[initialTabKey] = initialPathname
  }

  // runtime 每个实例独立创建，多个平台区域或测试实例不会共享守卫与异步版本。
  const runtime: RouterRuntime = {
    host: null,
    lastBootstrappedPathname: null,
    onTabClose: null,
    onStorageError: null,
    beforeCloseMap: new Map(),
    locationEmitterMap: new Map(),
    closingTabKeys: new Set(),
    silentCloseTabKeys: new Set(),
    storageHydrationPromise: null,
    storageSourceGeneration: 0,
    storageMutationVersions: createMutationVersions(),
  }

  const initialPages = createInitialPages(
    initialPathname,
    initialTabKey,
    initialLeaf?.route,
  )
  const currentPathname = initialPathname || options.initial?.pathname || ''
  // Store 在创建时直接拥有同步首屏快照，不需要额外 initialization setState。
  const store = createStore<RouterCoreState>(() => ({
    currentPathname,
    currentRoutes: currentPathname
      ? registry.getCurrentRoutes(currentPathname)
      : [],
    currentSelectedPath: currentPathname
      ? registry.getCurrentSelectedPath(currentPathname)
      : [],
    activeTabKey: initialPages.length > 0 ? initialTabKey : null,
    activePage: initialPages.length > 0 ? initialTabKey : null,
    tabs: createInitialTabs(fixedSet, initialTabKey, initialLeaf?.route, registry),
    pages: initialPages,
    fixedSet,
    pathnameDescriptionMap: {},
    storageKey: 'default',
    maxFixedTabCount: 4,
    storageHydrated: options.initial?.storageState != null || storageAdapter === false,
    storageLoading: false,
    storageLoadError: undefined,
  }))

  const cache = new RouterCache(
    initialParamsPathMap,
    (value) => persistParamsPathMap(value),
  )

  const setState = store.setState
  const getState = store.getState

  /** 由宿主 Adapter 在挂载/卸载时绑定或清除底层导航能力。 */
  function bindHost(host: RouterHost | null) {
    runtime.host = host
  }

  /**
   * 同步允许变化的运行时依赖。
   *
   * 回调保存在闭包中，不触发 Store 订阅；只有状态字段真正变化时才提交 setState。
   * storageKey 切换属于持久化来源切换，会废弃旧 hydration 并加载新命名空间。
   */
  function configureRuntime(next: RouterRuntimeOptions) {
    if ('onTabClose' in next)
      runtime.onTabClose = next.onTabClose || null
    if ('onStorageError' in next)
      runtime.onStorageError = next.onStorageError || null

    const previous = getState()
    const nextStorageKey =
      'storageKey' in next && next.storageKey !== undefined
        ? next.storageKey
        : previous.storageKey
    const storageChanged = nextStorageKey !== previous.storageKey
    // 新来源加载前保留仍打开共享页签的真实 pathname，避免当前地址被旧存储覆盖。
    const overlay = storageChanged ? getOpenParamsPathOverlay() : null

    if (storageChanged)
      resetStorageRuntime(runtime)

    const statePatch: Partial<RouterCoreState> = {}
    if (
      next.maxFixedTabCount !== undefined &&
      next.maxFixedTabCount !== previous.maxFixedTabCount
    ) {
      statePatch.maxFixedTabCount = next.maxFixedTabCount
    }
    if (storageChanged) {
      statePatch.storageKey = nextStorageKey
      statePatch.storageHydrated = storageAdapter === false
      statePatch.storageLoading = false
      statePatch.storageLoadError = undefined
    }
    if (Object.keys(statePatch).length > 0)
      setState(statePatch)

    if (storageChanged && storageAdapter !== false) {
      // 先安装当前会话覆盖层，再异步合并新命名空间中的旧数据。
      cache.hydrateParamsPathMap(overlay || {})
      void hydrateStorage()
    }
  }

  /**
   * 解析入口 pathname 是否需要重定向，并把处理结果交还给 location 同步流程。
   *
   * 叶子页面、403、404 和无子页面的目录继续交给 syncByPathname 统一确认；只有已经
   * 发起宿主导航或根路径确定没有可访问页面时，才阻止旧 pathname 创建临时页面状态。
   */
  function bootstrapByPathname(pathname: string): BootstrapResult {
    if (pathname === '/') {
      if (registry.defaultRoute !== '/') {
        jumpTo(registry.defaultRoute)
        return 'redirected'
      }

      setInactiveState(null)
      return 'settled'
    }

    const leaf = registry.resolveLeafRoute(pathname, { withinAuth: true })
    // 已是授权页面时不二次导航，真正页签创建交给 location 同步流程。
    if (registry.isPageRoute(leaf?.route))
      return 'continue'

    const child = registry.findFirstAccessibleChild(pathname)
    if (child) {
      jumpTo(child)
      return 'redirected'
    }

    // 无权限页面、未知地址和空目录仍要进入 syncByPathname，统一保留合法的旧页签选中
    // 身份并清理活动页面；bootstrap 只决定是否需要改变宿主地址。
    return 'continue'
  }

  /**
   * 接收宿主 location 的唯一入口。
   *
   * 先同步派生层级与 URL Cache，再根据最终 pathname 创建/激活页面；这样 jumpTo、
   * 浏览器前进后退和外部宿主地址变化都会走同一套状态确认流程。
   */
  function syncLocation(location: RouterLocation) {
    const pathname = location.pathname || '/'
    const pathnameChanged = getState().currentPathname !== pathname

    if (pathnameChanged) {
      const currentRoutes = registry.getCurrentRoutes(pathname)
      setState((state) => ({
        ...state,
        currentPathname: pathname,
        currentRoutes,
        currentSelectedPath: currentRoutes.map((item) => item.realPath),
      }))
    }

    const tabKey = registry.getTabKey(pathname)
    if (tabKey) {
      cache.setSearch(tabKey, location.search)
      cache.setHash(tabKey, location.hash)
      const leaf = registry.resolveLeafRoute(pathname)
      // 共享动态路由用 pattern 作为 tabKey，真实 pathname 另存 Cache。
      if (leaf && tabKey !== pathname && !leaf.route.supportMultipleTabs)
        cache.setParamsPath(tabKey, pathname)
    }

    // currentPathname 可能已经由 initial.pathname 建立首屏快照，因此不能用 Store 字段
    // 判断 bootstrap 是否执行过；私有标记只过滤 StrictMode、重复 Adapter 通知以及
    // 单纯 search/hash 变化，同时允许浏览器离开后再次进入同一路径时重新处理落点。
    if (runtime.lastBootstrappedPathname === pathname)
      return

    runtime.lastBootstrappedPathname = pathname
    const bootstrapResult = bootstrapByPathname(pathname)
    if (bootstrapResult === 'continue')
      syncByPathname(pathname)
  }

  /** 根据确认后的 pathname 创建授权页面，或进入 403/404 的非活动页面状态。 */
  function syncByPathname(pathname: string) {
    const leaf = registry.resolveLeafRoute(pathname, { withinAuth: true })
    if (!registry.isPageRoute(leaf?.route)) {
      // 旧页签可以继续保持 UI 选中身份，但不能创建无权限页面实例。
      const tabKey = registry.getTabKey(pathname)
      const activeTabKey =
        tabKey && getState().tabs.some((tab) => tab.key === tabKey)
          ? tabKey
          : null
      setInactiveState(activeTabKey)
      return
    }
    ensureTabState(pathname, true)
  }

  /**
   * 确保 pathname 对应页签存在并按需创建页面实例。
   *
   * jumpTo 对全新目标只提前创建页签，等待宿主 location 生效后再创建页面；已存在的
   * KeepAlive 页面则可以立即激活，避免切换时出现空白帧。
   */
  function ensureTabState(pathname: string, ensurePage: boolean) {
    const leaf = registry.resolveLeafRoute(pathname, { withinAuth: true })
    const route = leaf?.route
    if (!route || !registry.isPageRoute(route))
      return null
    const tabKey = registry.getTabKey(pathname)
    if (!tabKey)
      return null

    setState((previous) => {
      let tabs = previous.tabs
      let pages = previous.pages
      if (!tabs.some((tab) => tab.key === tabKey)) {
        // 新页签先追加，再恢复“固定组在前、两个分组内部顺序稳定”的平台规则。
        tabs = sortTabs(
          tabs.concat({
            key: tabKey,
            label: route.title,
            labelCustomized: false,
          }),
          previous.fixedSet,
        )
      }

      if (ensurePage) {
        const now = Date.now()
        const pageIndex = pages.findIndex((page) => page.key === tabKey)
        if (pageIndex < 0) {
          // hydration 可提前创建固定页签，页面实例在首次真正访问时才生成。
          pages = pages.concat({ key: tabKey, pathname, route, touchedAt: now })
        } else if (
          pages[pageIndex].pathname !== pathname ||
          shouldRefreshTouchedAt(keepAlive)
        ) {
          pages = pages.map((page) =>
            page.key === tabKey
              ? { ...page, pathname, route, touchedAt: now }
              : page,
          )
        }
        pages = enforceKeepAlive(
          pages,
          tabKey,
          keepAlive,
          previous.fixedSet,
        )
      }

      return {
        ...previous,
        tabs,
        pages,
        activeTabKey: tabKey,
        ...(ensurePage ? { activePage: tabKey } : {}),
      }
    })

    // 共享动态页签记录最后真实参数地址，重新激活时才能恢复完整 URL。
    if (tabKey !== pathname && !route.supportMultipleTabs)
      cache.setParamsPath(tabKey, pathname)
    return tabKey
  }

  /**
   * 执行完整平台导航。
   *
   * 字符串被视为完整目标 URL；结构化参数中 undefined 表示恢复页签缓存，null/空串
   * 表示显式清空。目录、权限、共享页签与 KeepAlive 都在调用宿主前完成处理。
   */
  function jumpTo(
    input:
      | string
      | { pathname: string, searchParams?: string | null, hash?: string | null },
  ) {
    if (!runtime.host)
      return

    // 字符串先拆成三个独立片段；结构化输入保留 undefined/null 的业务区别。
    const parsed = typeof input === 'string' ? parseUrl(input) : null
    let pathname = typeof input === 'string' ? parsed!.pathname : input.pathname
    const searchParams =
      typeof input === 'string' ? parsed!.searchParams.toString() : input.searchParams
    const hash = typeof input === 'string' ? parsed!.hash : input.hash

    const target = registry.resolveLeafRoute(pathname, { withinAuth: true })
    // 目录地址优先跳到第一个能被当前参数具体化的授权子页面。
    if (target && !registry.isPageRoute(target.route))
      pathname = registry.findFirstAccessibleChild(pathname) || pathname

    const tabKey = registry.getTabKey(pathname)
    if (!tabKey)
      return

    const authorized = registry.resolveLeafRoute(pathname, { withinAuth: true })
    if (!registry.isPageRoute(authorized?.route)) {
      // 地址仍可改变以展示 403，但绝不能补建新的受限页面实例。
      const activeTabKey = getState().tabs.some((tab) => tab.key === tabKey)
        ? tabKey
        : null
      setInactiveState(activeTabKey)
      runtime.host.navigate(
        buildUrl({
          pathname: cache.getParamsPath(tabKey) || pathname,
          searchParams: resolveSearch(searchParams, cache.getSearch(tabKey)),
          hash: resolveHash(hash, cache.getHash(tabKey)),
        }),
      )
      return
    }

    const shouldActivateCachedPage =
      keepAlive !== false && getState().pages.some((page) => page.key === tabKey)
    if (!ensureTabState(pathname, shouldActivateCachedPage))
      return

    // 共享动态页签恢复最后真实 pathname；未指定 search/hash 时恢复对应缓存。
    runtime.host.navigate(
      buildUrl({
        pathname: cache.getParamsPath(tabKey) || pathname,
        searchParams: resolveSearch(searchParams, cache.getSearch(tabKey)),
        hash: resolveHash(hash, cache.getHash(tabKey)),
      }),
    )
  }

  /** 同页 URL 状态使用 replace；真正切换 pathname 时转交完整 jumpTo 流程。 */
  function smartNavigate(data: {
    pathname?: string
    searchParams?: string | null
    hash?: string | null
  }) {
    if (!runtime.host)
      return
    const state = getState()
    const activeKey = state.activePage || state.activeTabKey
    const activePage = activeKey
      ? state.pages.find((page) => page.key === activeKey)
      : undefined
    const activePathname =
      activePage?.pathname ||
      (activeKey ? cache.getParamsPath(activeKey) || activeKey : '')

    if (data.pathname && activePathname && data.pathname !== activePathname) {
      // pathname 变化可能改变页签身份和权限，不能绕过 jumpTo 的完整处理。
      jumpTo({
        pathname: data.pathname,
        searchParams: data.searchParams,
        hash: data.hash,
      })
      return
    }

    const pathname = data.pathname || activePathname
    if (!pathname)
      return
    const tabKey = registry.getTabKey(pathname) || activeKey
    if (!tabKey)
      return

    runtime.host.navigate(
      {
        pathname,
        search: resolveSearch(data.searchParams, cache.getSearch(tabKey)),
        hash: resolveHash(data.hash, cache.getHash(tabKey)),
      },
      { replace: true },
    )
  }

  /** 替换页签顺序；只有固定组相对顺序变化时才写入持久化。 */
  function setTabs(tabs: RouterTab[]) {
    const state = getState()
    // 拖拽组件可能返回内容相同的新数组，领域数据相同就不通知订阅者。
    if (areTabsEqual(state.tabs, tabs))
      return
    const fixedSet = tabs
      .filter((tab) => state.fixedSet.includes(tab.key))
      .map((tab) => tab.key)
    if (!areStringArraysEqual(state.fixedSet, fixedSet))
      persistFixedTabs(fixedSet)
    setState({ tabs, fixedSet })
  }

  /** 覆盖业务页签标题，并记录标题不再跟随 route.title。 */
  function setTabLabel(key: string, label: string) {
    setState((state) => {
      const hit = state.tabs.find((tab) => tab.key === key)
      if (!hit || (hit.label === label && hit.labelCustomized))
        return state
      return {
        ...state,
        tabs: state.tabs.map((tab) =>
          tab.key === key ? { ...tab, label, labelCustomized: true } : tab,
        ),
      }
    })
  }

  /** 固定或取消固定页签；新增固定项才受最大数量限制。 */
  function toggleFixed(tabKey: string) {
    const state = getState()
    const isFixed = state.fixedSet.includes(tabKey)
    if (!isFixed && state.fixedSet.length >= state.maxFixedTabCount)
      return false
    const fixedSet = isFixed
      ? state.fixedSet.filter((key) => key !== tabKey)
      : state.fixedSet.concat(tabKey)
    persistFixedTabs(fixedSet)
    setState({ fixedSet, tabs: sortTabs(state.tabs, fixedSet) })
    return true
  }

  /**
   * 执行单个页签关闭事务。
   *
   * 顺序固定为：取得关闭权、运行守卫、重新确认页签、提交状态、清理命令资源、执行
   * 必要导航、通知回调。同一 key 的重复关闭在运行守卫前直接失败。
   */
  async function closeTab(tabKey: string, closeOptions?: RouterCloseOptions) {
    if (!getState().tabs.some((tab) => tab.key === tabKey))
      return false
    if (runtime.closingTabKeys.has(tabKey))
      return false

    runtime.closingTabKeys.add(tabKey)
    try {
      if (!closeOptions?.skipBeforeClose) {
        const hooks = runtime.beforeCloseMap.get(tabKey) || []
        // 守卫可以并行完成，但每一个都必须明确返回 true；undefined/false 都拒绝关闭。
        const results = await Promise.all(hooks.map((hook) => hook()))
        if (!results.every((result) => result === true))
          return false
      }

      const state = getState()
      // 等待异步守卫期间其它命令可能已经移除页签，提交前必须再次确认。
      if (!state.tabs.some((tab) => tab.key === tabKey))
        return false
      const closedIndex = state.tabs.findIndex((tab) => tab.key === tabKey)
      const nextTabs = state.tabs.filter((tab) => tab.key !== tabKey)
      // 关闭活动页优先回退左侧；关闭首项时退到原右侧位置。
      const nextActive =
        state.activeTabKey === tabKey
          ? nextTabs[Math.max(0, closedIndex - 1)] || nextTabs[closedIndex] || null
          : null
      const closedPathname = cache.getParamsPath(tabKey) || tabKey
      const fixedSet = state.fixedSet.includes(tabKey)
        ? state.fixedSet.filter((key) => key !== tabKey)
        : state.fixedSet
      if (!areStringArraysEqual(fixedSet, state.fixedSet))
        persistFixedTabs(fixedSet)

      const pages = state.pages.filter((page) => page.key !== tabKey)
      const descriptions = { ...state.pathnameDescriptionMap }
      // 共享动态页签可能对应多个真实 pathname，必须按 tabKey 清理全部描述。
      Object.keys(descriptions).forEach((pathname) => {
        if (registry.getTabKey(pathname) === tabKey)
          delete descriptions[pathname]
      })
      setState({
        tabs: nextTabs,
        pages,
        fixedSet,
        activeTabKey: nextActive
          ? nextActive.key
          : state.activeTabKey === tabKey
            ? null
            : state.activeTabKey,
        activePage: nextActive
          ? pages.some((page) => page.key === nextActive.key)
            ? nextActive.key
            : null
          : state.activePage === tabKey
            ? null
            : state.activePage,
        pathnameDescriptionMap: descriptions,
      })

      runtime.beforeCloseMap.delete(tabKey)
      runtime.locationEmitterMap.delete(tabKey)
      cache.clear(tabKey)

      // 组合关闭命令会自行打开最终地址，因此这里必须抑制相邻页/根路径中间导航。
      if (!runtime.silentCloseTabKeys.has(tabKey)) {
        if (nextActive) {
          runtime.host?.navigate(
            buildUrl({
              pathname: cache.getParamsPath(nextActive.key) || nextActive.key,
              searchParams: cache.getSearch(nextActive.key),
              hash: cache.getHash(nextActive.key),
            }),
          )
        } else if (getState().activeTabKey === null) {
          runtime.host?.navigate('/')
        }
      }

      runtime.onTabClose?.(tabKey, { pathname: closedPathname })
      return true
    } finally {
      runtime.closingTabKeys.delete(tabKey)
    }
  }

  /** 组合“关闭旧页签 + 打开新地址”，保证只产生一次最终宿主导航。 */
  async function closeThisTabOpenNewOne(
    data: { oldPath: string, newPath: string },
    closeOptions?: RouterCloseOptions,
  ) {
    const target = parseUrl(data.newPath)
    const oldTabKey = registry.getTabKey(parseUrl(data.oldPath).pathname)
    if (oldTabKey && getState().tabs.some((tab) => tab.key === oldTabKey)) {
      // 已有关闭事务时不能抢占静默标记，否则会破坏原事务的导航语义。
      if (runtime.closingTabKeys.has(oldTabKey))
        return false
      runtime.silentCloseTabKeys.add(oldTabKey)
      try {
        const closed = await closeTab(oldTabKey, closeOptions)
        if (!closed)
          return false
      } finally {
        runtime.silentCloseTabKeys.delete(oldTabKey)
      }
    }
    jumpTo({
      pathname: target.pathname,
      searchParams: target.searchParams.toString(),
      hash: target.hash,
    })
    return true
  }

  /** 关闭守卫按 tabKey 归组，共享动态 pathname 因而属于同一个关闭事务。 */
  function addBeforeCloseHook(
    handler: RouterBeforeCloseHook,
    pathname: string,
  ) {
    const tabKey = registry.getTabKey(pathname)
    if (!tabKey)
      return
    runtime.beforeCloseMap.set(
      tabKey,
      (runtime.beforeCloseMap.get(tabKey) || []).concat(handler),
    )
  }

  /** 清理一个守卫；未指定 handler 时清理该页签注册的全部守卫。 */
  function clearBeforeCloseHook(
    pathname: string,
    handler?: RouterBeforeCloseHook,
  ) {
    const tabKey = registry.getTabKey(pathname)
    if (!tabKey)
      return
    if (!handler) {
      runtime.beforeCloseMap.delete(tabKey)
      return
    }
    const next = (runtime.beforeCloseMap.get(tabKey) || []).filter(
      (item) => item !== handler,
    )
    if (next.length)
      runtime.beforeCloseMap.set(tabKey, next)
    else
      runtime.beforeCloseMap.delete(tabKey)
  }

  /** 注册当前页面实例的 location 接收器，并返回不会误删新实例的清理函数。 */
  function registerPageLocationEmitter(
    tabKey: string,
    emitter: { emit: (payload: RouterLocationEventPayload) => void } | null,
  ) {
    if (!tabKey || !emitter)
      return () => undefined
    runtime.locationEmitterMap.set(tabKey, emitter)
    return () => {
      // 同一 key 可能已由新页面实例接管，旧实例卸载时只能删除自己的引用。
      if (runtime.locationEmitterMap.get(tabKey) === emitter)
        runtime.locationEmitterMap.delete(tabKey)
    }
  }

  /** 进入目录、403 或 404 等没有活动业务页面的状态。 */
  function setInactiveState(activeTabKey: string | null) {
    setState((state) => ({
      ...state,
      activeTabKey,
      activePage: null,
      pages: enforceKeepAlive(
        state.pages,
        null,
        keepAlive,
        state.fixedSet,
      ),
    }))
  }

  /** 将固定页签保存委托给统一字段持久化流程。 */
  function persistFixedTabs(value: string[]) {
    persist('fixedTabs', 'saveFixedTabs', (adapter, storageKey) =>
      adapter.saveFixedTabs(storageKey, value))
  }

  /** 将共享动态 pathname 映射保存委托给统一字段持久化流程。 */
  function persistParamsPathMap(value: Record<string, string>) {
    persist(
      'fixedParamsPathMap',
      'saveFixedParamsPathMap',
      (adapter, storageKey) =>
        adapter.saveFixedParamsPathMap(storageKey, value),
    )
  }

  /**
   * 执行一个字段保存动作。
   *
   * 先递增本地版本，确保在途 hydration 不覆盖用户刚完成的操作；纯内存模式仍需
   * 递增版本。Adapter 失败不回滚内存状态，而是暴露绑定当前快照的 retry。
   */
  function persist(
    field: PersistedField,
    phase: Exclude<RouterStorageErrorPhase, 'load'>,
    action: (adapter: RouterStorageAdapter, storageKey: string) => Promise<void>,
  ) {
    runtime.storageMutationVersions[field] += 1
    if (storageAdapter === false)
      return
    const storageKey = getState().storageKey
    // Promise.resolve 同时收敛不规范 Adapter 的同步 throw 与异步 rejection。
    const execute = () => Promise.resolve().then(() => action(storageAdapter, storageKey))
    void execute().catch((error) => {
      runtime.onStorageError?.(error, { storageKey, phase, retry: execute })
    })
  }

  /** 启动或复用当前持久化来源的 hydration 任务。 */
  function hydrateStorage() {
    // 并发调用方必须等待同一个 Promise，而不是看到 loading 后提前返回。
    if (runtime.storageHydrationPromise)
      return runtime.storageHydrationPromise
    if (storageAdapter === false || getState().storageHydrated)
      return Promise.resolve()

    const promise = executeHydration().finally(() => {
      // storageKey 切换可能已经安装新任务，旧任务不能清空新 Promise 引用。
      if (runtime.storageHydrationPromise === promise)
        runtime.storageHydrationPromise = null
    })
    runtime.storageHydrationPromise = promise
    return promise
  }

  /** 执行一次绑定 Adapter、storageKey 与 generation 的实际加载事务。 */
  async function executeHydration() {
    if (storageAdapter === false)
      return
    const storageKey = getState().storageKey
    // 请求来源和字段版本都在 await 前快照，完成后据此决定哪些结果仍可提交。
    const generation = runtime.storageSourceGeneration
    const mutationVersions = { ...runtime.storageMutationVersions }
    const currentParams = cache.getParamsPathMap()
    setState({ storageLoading: true, storageLoadError: undefined })

    try {
      const loaded = normalizeRouterStorageState(
        await storageAdapter.load(storageKey),
      )
      // 新命名空间已经接管实例时，旧请求不得修改 loading、error 或业务状态。
      if (generation !== runtime.storageSourceGeneration)
        return
      const state = getState()
      const fixedUnchanged =
        mutationVersions.fixedTabs === runtime.storageMutationVersions.fixedTabs
      const paramsUnchanged =
        mutationVersions.fixedParamsPathMap ===
        runtime.storageMutationVersions.fixedParamsPathMap
      const nextFixedSet = fixedUnchanged
        ? sanitizeFixedTabKeys(loaded.fixedTabs, registry)
        : state.fixedSet
      if (paramsUnchanged) {
        // 当前会话确认的动态地址比存储旧值更新，展开顺序确保 currentParams 胜出。
        cache.hydrateParamsPathMap({
          ...loaded.fixedParamsPathMap,
          ...currentParams,
        })
      }
      setState({
        fixedSet: nextFixedSet,
        tabs: fixedUnchanged
          ? mergeTabsWithFixedSet(state.tabs, nextFixedSet, registry)
          : state.tabs,
        storageHydrated: true,
        storageLoading: false,
      })
      if (fixedUnchanged && !areStringArraysEqual(nextFixedSet, loaded.fixedTabs))
        // 清理无效/重复固定 key 后回写，避免下次加载重复清理。
        persistFixedTabs(nextFixedSet)
    } catch (error) {
      if (generation !== runtime.storageSourceGeneration)
        return
      setState({ storageLoading: false, storageLoadError: error })
      runtime.onStorageError?.(error, {
        storageKey,
        phase: 'load',
        retry: hydrateStorage,
      })
    }
  }

  /**
   * 切换 storageKey 时提取仍打开共享动态页签的真实 pathname。
   *
   * 以 tabs 而不是 pages 为准：页面实例可能已被 KeepAlive LRU 淘汰，但只要页签仍
   * 打开，用户再次点击时就必须恢复当前会话最后访问的参数地址。
   */
  function getOpenParamsPathOverlay() {
    const state = getState()
    const map = cache.getParamsPathMap()
    return state.tabs.reduce<Record<string, string>>((result, tab) => {
      const pathname = map[tab.key]
      const leaf = pathname ? registry.resolveLeafRoute(pathname) : null
      if (
        pathname &&
        leaf &&
        registry.getTabKey(pathname) === tab.key &&
        !leaf.route.supportMultipleTabs
      ) {
        // 仅保留当前 Registry 仍能解析且页签身份一致的共享动态路由映射。
        result[tab.key] = pathname
      }
      return result
    }, {})
  }

  // 对外只暴露领域查询与命令；Cache、runtime 和持久化协调函数继续封装在实例闭包内。
  return {
    registry,
    store,
    getState,
    subscribe: store.subscribe,
    bindHost,
    configureRuntime,
    hydrateStorage,
    syncLocation,
    jumpTo,
    smartNavigate,
    getTabKey: registry.getTabKey,
    getCurrentRoutes: registry.getCurrentRoutes,
    setTabs,
    setTabLabel,
    setPathnameDescription: (map) =>
      setState((state) => ({
        ...state,
        pathnameDescriptionMap: { ...state.pathnameDescriptionMap, ...map },
      })),
    toggleFixed,
    closeTab,
    closeThisTabOpenNewOne,
    addBeforeCloseHook,
    clearBeforeCloseHook,
    registerPageLocationEmitter,
    emitPageLocationEvent: (tabKey, payload) =>
      runtime.locationEmitterMap.get(tabKey)?.emit(payload),
  }
}

/** 复制 KeepAlive 数组配置，形成不会受调用方原地修改影响的实例快照。 */
function snapshotKeepAlive(
  value: boolean | RouterKeepAliveConfig,
): boolean | RouterKeepAliveConfig {
  if (typeof value !== 'object')
    return value
  return {
    ...value,
    include: Array.isArray(value.include) ? [...value.include] : value.include,
    exclude: Array.isArray(value.exclude) ? [...value.exclude] : value.exclude,
  }
}

/** undefined 使用默认 IndexedDB，false 显式关闭外部持久化。 */
function resolveStorageAdapter(
  value: false | RouterStorageAdapter | undefined,
) {
  return value === false ? false : value || DEFAULT_STORAGE_ADAPTER
}

/** 将根路径、目录或页面入口解析成首屏真正可以展示的授权页面。 */
function resolveInitialPathname(
  pathname: string | undefined,
  registry: ReturnType<typeof createRouteRegistry>,
) {
  if (!pathname)
    return null
  // `/` 是入口语义，不直接创建业务页签；默认页不存在时保持空页面状态。
  if (pathname === '/')
    return registry.defaultRoute === '/' ? null : registry.defaultRoute
  const leaf = registry.resolveLeafRoute(pathname, { withinAuth: true })
  if (registry.isPageRoute(leaf?.route))
    return pathname
  return registry.findFirstAccessibleChild(pathname)
}

/** 只有 pathname、tabKey 和授权 route 都存在时才创建首个页面实例。 */
function createInitialPages(
  pathname: string | null,
  tabKey: string | null,
  route?: RouterRoute,
): RouterPage[] {
  return pathname && tabKey && route
    ? [{ key: tabKey, pathname, route, touchedAt: 0 }]
    : []
}

/** 清理持久化固定页签中的重复、已删除或非页面 key，同时保持首次出现顺序。 */
function sanitizeFixedTabKeys(
  fixedTabs: string[],
  registry: ReturnType<typeof createRouteRegistry>,
) {
  const seen = new Set<string>()
  return fixedTabs.filter((key) => {
    const route = registry.resolveLeafRoute(key)?.route
    if (seen.has(key) || !registry.isPageRoute(route))
      return false
    seen.add(key)
    return true
  })
}

/** 用固定页签和可选首屏页面创建顺序稳定的初始页签模型。 */
function createInitialTabs(
  fixedSet: string[],
  initialTabKey: string | null,
  initialRoute: RouterRoute | undefined,
  registry: ReturnType<typeof createRouteRegistry>,
) {
  const tabs = fixedSet.reduce<RouterTab[]>((result, key) => {
    const route = registry.resolveLeafRoute(key)?.route
    if (registry.isPageRoute(route)) {
      result.push({ key, label: route!.title, labelCustomized: false })
    }
    return result
  }, [])
  if (initialTabKey && initialRoute && !tabs.some((tab) => tab.key === initialTabKey)) {
    tabs.push({
      key: initialTabKey,
      label: initialRoute.title,
      labelCustomized: false,
    })
  }
  return sortTabs(tabs, fixedSet)
}

/** hydration 只补入新固定页签，不删除当前会话已经打开的普通页签。 */
function mergeTabsWithFixedSet(
  tabs: RouterTab[],
  fixedSet: string[],
  registry: ReturnType<typeof createRouteRegistry>,
) {
  const map = new Map(tabs.map((tab) => [tab.key, tab]))
  createInitialTabs(fixedSet, null, undefined, registry).forEach((tab) => {
    if (!map.has(tab.key))
      map.set(tab.key, tab)
  })
  return sortTabs([...map.values()], fixedSet)
}

/** 把固定页签稳定分组到前面，并保持固定组与普通组各自的原始顺序。 */
function sortTabs(tabs: RouterTab[], fixedSet: string[]) {
  return tabs
    .filter((tab) => fixedSet.includes(tab.key))
    .concat(tabs.filter((tab) => !fixedSet.includes(tab.key)))
}

/** 只有启用有限 LRU 时，重访页面才需要更新 touchedAt。 */
function shouldRefreshTouchedAt(
  keepAlive: boolean | RouterKeepAliveConfig,
) {
  return typeof keepAlive === 'object' &&
    typeof keepAlive.maxCachedPages === 'number'
}

/**
 * 应用 KeepAlive 过滤与 LRU 上限。
 *
 * 当前活动页始终保留；固定页签不参与普通淘汰。配置数量小于不可淘汰页面数时允许
 * 超出 limit，不能为了满足数量上限破坏固定页签语义。
 */
function enforceKeepAlive(
  pages: RouterPage[],
  activeKey: string | null,
  keepAlive: boolean | RouterKeepAliveConfig,
  fixedSet: string[],
) {
  if (keepAlive === false)
    // 完全关闭时只保留当前活动实例，切页后旧页面立即卸载。
    return pages.filter((page) => page.key === activeKey)

  // 活动页即使命中 exclude 也保留到导航完成，避免当前视图在同一轮先被卸载。
  let retained = typeof keepAlive === 'object'
    ? pages.filter(
        (page) =>
          page.key === activeKey || shouldKeepPage(page, keepAlive),
      )
    : pages
  if (
    typeof keepAlive !== 'object' ||
    typeof keepAlive.maxCachedPages !== 'number' ||
    !Number.isFinite(keepAlive.maxCachedPages)
  ) {
    return retained
  }

  const limit = Math.max(activeKey ? 1 : 0, Math.floor(keepAlive.maxCachedPages))
  while (retained.length > limit) {
    // 每轮淘汰最久未访问的普通页面，直到满足上限或已没有合法候选。
    const evictable = retained
      .filter((page) => page.key !== activeKey && !fixedSet.includes(page.key))
      .sort((left, right) => left.touchedAt - right.touchedAt)[0]
    if (!evictable)
      break
    retained = retained.filter((page) => page.key !== evictable.key)
  }
  return retained
}

/** 应用单页 include/exclude；exclude 优先级高于 include。 */
function shouldKeepPage(page: RouterPage, config: RouterKeepAliveConfig) {
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

/** 使用浏览器 origin 或稳定虚拟 origin 解析应用内相对 URL。 */
function parseUrl(url: string) {
  const base = typeof window === 'undefined'
    ? 'https://zby.local'
    : window.location.origin
  return new URL(url, base)
}

/** Cache 内部统一保存不含 `?` 的查询字符串。 */
function normalizeSearchParams(value: string | null | undefined) {
  return value ? String(value).replace(/^\?/, '') : ''
}

/** Router location 统一使用包含 `#` 的非空 hash。 */
function normalizeHash(value: string | null | undefined) {
  if (!value)
    return ''
  const normalized = String(value)
  return normalized.startsWith('#') ? normalized : `#${normalized}`
}

/** undefined 恢复缓存；null 和空字符串经 normalize 后显式清空。 */
function resolveSearch(value: string | null | undefined, cached: string) {
  return value === undefined ? cached : normalizeSearchParams(value)
}

/** undefined 恢复缓存；null 和空字符串经 normalize 后显式清空。 */
function resolveHash(value: string | null | undefined, cached: string) {
  return value === undefined ? cached : normalizeHash(value)
}

/** 组合纯 pathname、查询参数和 hash，不重排或重新编码调用方参数。 */
function buildUrl(data: {
  pathname: string
  searchParams?: string | null
  hash?: string | null
}) {
  const search = normalizeSearchParams(data.searchParams)
  return `${data.pathname}${search ? `?${search}` : ''}${normalizeHash(data.hash)}`
}

/** 为两个独立持久化字段建立从 0 开始的本地修改版本。 */
function createMutationVersions(): Record<PersistedField, number> {
  return { fixedTabs: 0, fixedParamsPathMap: 0 }
}

/** 切换持久化来源时废弃旧任务，并为新来源建立干净字段版本基线。 */
function resetStorageRuntime(runtime: RouterRuntime) {
  runtime.storageHydrationPromise = null
  runtime.storageSourceGeneration += 1
  runtime.storageMutationVersions = createMutationVersions()
}

/** 按顺序比较字符串数组；固定页签的顺序本身属于业务状态。 */
function areStringArraysEqual(left: string[], right: string[]) {
  return left === right || (
    left.length === right.length &&
    left.every((item, index) => item === right[index])
  )
}

/** 比较页签领域字段，过滤拖拽组件只创建新对象造成的无效更新。 */
function areTabsEqual(left: RouterTab[], right: RouterTab[]) {
  return left === right || (
    left.length === right.length &&
    left.every(
      (tab, index) =>
        tab.key === right[index]?.key &&
        tab.label === right[index]?.label &&
        tab.labelCustomized === right[index]?.labelCustomized,
    )
  )
}

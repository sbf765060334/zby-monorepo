import { createStore } from 'zustand/vanilla'

import { createRouteRegistry, isConcreteRoutePath } from './registry'
import type { RouteRegistry } from './registry'
import { createIndexedDBRouterStorageAdapter, normalizeRouterStorageState } from './storage'
import type {
  CreateRouterCoreOptions,
  RouterAfterTabCloseInfo,
  RouterBeforeCloseHook,
  RouterCloseOptions,
  RouterCore,
  RouterCoreState,
  RouterHost,
  RouterKeepAliveConfig,
  RouterLocation,
  RouterLocationEventPayload,
  RouterNavigate,
  RouterPage,
  RouterReadableStore,
  RouterRoute,
  RouterRuntimeOptions,
  RouterStorageAdapter,
  RouterStorageErrorInfo,
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

/**
 * 入口 pathname 的落点处理结果。
 *
 * `continue` 表示宿主地址已经是最终地址，应继续确认页签和页面状态；`redirected`
 * 表示根路径或目录已经发起新导航，必须等待宿主回传最终 pathname；`settled` 表示
 * 当前地址没有可跳转页面，并且非活动页面状态已经在 bootstrap 阶段完成；`deferred`
 * 表示当前需要重定向但宿主尚未绑定，本次只同步状态并允许相同 pathname 后续重试。
 */
type BootstrapResult = 'continue' | 'redirected' | 'settled' | 'deferred'

/** jumpTo 与组合关闭命令共同接受的平台导航输入。 */
type RouterNavigationInput =
  | string
  | { pathname: string, searchParams?: string | null, hash?: string | null }

/** 已通过 Registry 验证、可以安全执行的最终导航计划。 */
interface RouterNavigationPlan {
  pathname: string
  searchParams?: string | null
  hash?: string | null
  tabKey: string
  authorized: boolean
}

/** 导航计划执行时允许替换的宿主能力；普通命令继续使用当前 Host.navigate。 */
interface ExecuteNavigationPlanOptions {
  navigate?: RouterNavigate
  replace?: boolean
  trackNavigation?: boolean
}

/**
 * 仅供 core 内部组合关闭命令使用的事务控制参数。
 *
 * 普通 closeTab 不传该参数，继续执行原有的相邻页或根路径回退；组合命令则可以在
 * 守卫完成后再次确认外部条件，并把最终导航放进同一次关闭提交中。
 */
interface CloseTabTransaction {
  /** 返回 false 时取消提交，页签状态和相关资源保持不变。 */
  canCommit?: () => boolean
  /** 关闭状态和资源清理完成后立即执行的最终导航。 */
  navigateAfterClose?: () => boolean
}

/** 单个 core 实例私有、不可观察的命令与异步协调状态。 */
interface RouterRuntime {
  /** 实际执行地址变化的宿主；未绑定时业务导航安全 no-op。 */
  host: RouterHost | null
  /** 最近一次完成落点判断的 pathname，用于过滤 StrictMode 与 Adapter 的重复通知。 */
  lastBootstrappedPathname: string | null
  /**
   * 最近一次由宿主确认的标准化 location。
   *
   * 页面实例可能晚于首次 syncLocation 创建；保留该快照后，新订阅的页面 listener
   * 可以立即补收当前地址，而不要求 Adapter 额外重放一次 location。
   */
  latestLocation: RouterLocationEventPayload | null
  /** 始终使用最新引用的页签关闭回调。 */
  onTabClose: RouterRuntimeOptions['onTabClose'] | null
  /** 始终使用最新引用的持久化错误回调。 */
  onStorageError: RouterRuntimeOptions['onStorageError'] | null
  /** 页签 key 到关闭前守卫列表的映射。 */
  beforeCloseMap: Map<string, RouterBeforeCloseHook[]>
  /** 页签 key 到当前页面 location 事件接收器的映射。 */
  /** 每个页签当前页面实例绑定的 location 监听器。 */
  pageLocationListenerMap: Map<
    string,
    (location: RouterLocationEventPayload) => void
  >
  /** 正在执行关闭事务的页签，防止重复点击并发运行守卫。 */
  closingTabKeys: Set<string>
  /** 当前 hydration Promise；并发调用方共享同一任务。 */
  storageHydrationPromise: Promise<void> | null
  /** 加载期间固定页签集合的本地修改版本，防止旧加载结果覆盖用户操作。 */
  fixedTabsMutationVersion: number
  /** 加载期间收藏路由集合的本地修改版本，防止旧加载结果覆盖用户操作。 */
  favoriteRoutesMutationVersion: number
  /**
   * 首次 hydration 完成前发生的动态 pathname 增量；null 表示删除。
   *
   * Cache 此时还没有存储中的完整 Map，不能直接保存它的局部快照，否则首个动态
   * pathname 会覆盖其它已持久化映射。加载完成后再把这些增量覆盖到完整结果上。
   */
  pendingParamsPathMutations: Map<string, string | null>
}

/**
 * 页签级 URL Cache。
 *
 * 共享动态页签的真实 pathname 需要持久化；高频变化的 search/hash 仅保存在当前
 * core 实例内。Cache 不进入 Zustand，避免筛选和锚点变化触发无关状态订阅。
 */
class RouterCache {
  /** 共享动态页签 key 到最后真实 pathname 的映射。 */
  private paramsPathMap: Record<string, string> = {}
  /** 页签 key 到不含 `?` 前缀的查询字符串。 */
  private searchParamsMap: Record<string, string> = {}
  /** 页签 key 到包含 `#` 前缀的锚点。 */
  private hashMap: Record<string, string> = {}

  constructor(
    private readonly onParamsPathMapChange: (
      value: Record<string, string>,
      tabKey: string,
      pathname: string | null,
    ) => void,
  ) {}

  /** 获取共享动态页签最后使用的真实 pathname。 */
  getParamsPath(tabKey: string) {
    return this.paramsPathMap[tabKey] || ''
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
    this.onParamsPathMapChange(
      { ...this.paramsPathMap },
      tabKey,
      pathname || null,
    )
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

/**
 * 创建一套完全独立的路由领域实例。
 *
 * @typeParam Route 调用方路由节点类型；创建参数会自动推导，并贯穿 Registry 与状态。
 */
export function createRouterCore<Route extends RouterRoute>(
  options: CreateRouterCoreOptions<Route>,
): RouterCore<Route> {
  // 权限函数与 Registry 同生命周期；未配置时沿用现有的“全部允许”语义。
  // 页面级权限可以复用该只读 API，但权限变化仍应通过创建新 core 重建路由快照。
  const hasAuth = options.hasAuth ?? (() => true)
  // Registry 先于 Store 创建，并独立复制路由树；它是整个实例生命周期的路由事实。
  const registry = createRouteRegistry({
    routes: options.routes,
    hasAuth,
    defaultRedirectPath: options.defaultRedirectPath,
    isPageRoute: options.isPageRoute,
  })
  // KeepAlive 对象中的数组同样复制，避免调用方原地修改后偷偷改变页面淘汰规则。
  const keepAlive = snapshotKeepAlive(options.keepAlive ?? true)
  const storageAdapter = resolveStorageAdapter(options.storageAdapter)

  // runtime 每个实例独立创建，多个平台区域或测试实例不会共享守卫与异步版本。
  const runtime: RouterRuntime = {
    host: null,
    lastBootstrappedPathname: null,
    latestLocation: null,
    onTabClose: null,
    onStorageError: null,
    beforeCloseMap: new Map(),
    pageLocationListenerMap: new Map(),
    closingTabKeys: new Set(),
    storageHydrationPromise: null,
    fixedTabsMutationVersion: 0,
    favoriteRoutesMutationVersion: 0,
    pendingParamsPathMutations: new Map(),
  }

  // Core 创建阶段不猜测宿主地址或预加载外部数据；页面只由 syncLocation 建立，
  // 固定页签只由 hydrateStorage 恢复，使两类状态各自只有一个权威入口。
  const store = createStore<RouterCoreState<Route>>(() => ({
    navigationStatus: 'bootstrapping',
    currentPathname: '',
    currentRoutes: [],
    currentSelectedPath: [],
    activeTabKey: null,
    activePage: null,
    tabs: [],
    pages: [],
    fixedSet: [],
    favoriteRoutePaths: [],
    pathnameDescriptionMap: {},
    // 固定配置随首个 Store 快照一起建立，宿主首次同步 location 时即可直接使用。
    storageKey: options.storageKey ?? 'default',
    maxFixedTabCount: options.maxFixedTabCount ?? 4,
    // 只要存在外部 Adapter，就必须通过 hydrateStorage 建立完整持久化快照。
    storageHydrated: storageAdapter === false,
    storageLoading: false,
    storageLoadError: undefined,
  }))

  // 对外返回独立 facade，而不是仅在类型上隐藏 setState；JavaScript 调用方同样无法
  // 绕过领域命令直接写 Store。三个方法仍是 Zustand useStore 所需的完整只读契约。
  const readableStore: RouterReadableStore<Route> = {
    getState: store.getState,
    getInitialState: store.getInitialState,
    subscribe: store.subscribe,
  }

  const setState = store.setState
  const getState = store.getState
  const cache = new RouterCache(
    (value, tabKey, pathname) => {
      if (!getState().storageHydrated) {
        // hydration 前 Cache 只包含本次会话触达的局部数据。记录最后一次增量即可，
        // 不能把局部 Map 当成完整快照保存，加载成功后会统一合并并回写。
        runtime.pendingParamsPathMutations.set(tabKey, pathname)
        return
      }
      persistParamsPathMap(value)
    },
  )

  /** 由宿主 Adapter 在挂载/卸载时绑定或清除底层导航能力。 */
  function bindHost(host: RouterHost | null) {
    runtime.host = host
    if (!host && getState().navigationStatus !== 'settled') {
      // redirect effect 提交前卸载时，请求只存在于旧 Adapter。清除去重标记，使新 Host
      // 对同一入口 pathname 的首次同步可以重新产生重定向请求。
      runtime.lastBootstrappedPathname = null
      setNavigationStatus('bootstrapping')
    }
  }

  /** 仅在状态真正变化时发布导航阶段，避免重复 location 通知触发无意义渲染。 */
  function setNavigationStatus(
    navigationStatus: RouterCoreState<Route>['navigationStatus'],
  ) {
    setState((state) => state.navigationStatus === navigationStatus
      ? state
      : { ...state, navigationStatus })
  }

  /**
   * 请求宿主执行根路径或目录重定向。
   *
   * React Host 使用专用 redirect 把真实导航延后到 effect；其它 Host 继续兼容原有
   * navigate 契约。replace 避免默认落点在浏览器历史中留下无法停留的中间记录。
   */
  function requestRedirect(pathname: string) {
    const host = runtime.host
    if (!host)
      return false

    const plan = resolveNavigationPlan(pathname)
    if (!plan)
      return false

    // 必须先进入 redirecting：同步 Host 可能在 navigate 内立即回传最终 location，
    // 此时嵌套 syncLocation 应以 settled 作为最终状态，不能被外层再次覆盖。
    setNavigationStatus('redirecting')
    const executed = executeNavigationPlan(plan, {
      navigate: host.redirect || host.navigate,
      replace: true,
      trackNavigation: false,
    })
    if (!executed)
      setNavigationStatus('bootstrapping')
    return executed
  }

  /**
   * 同步允许变化的运行时回调。
   *
   * 回调保存在闭包中，不触发 Store 订阅；显式传入 undefined 时会清理旧引用。
   * storageKey 和 maxFixedTabCount 在实例创建时固定，不在这里隐式修改 Store。
   */
  function configureRuntime(next: RouterRuntimeOptions) {
    if ('onTabClose' in next)
      runtime.onTabClose = next.onTabClose || null
    if ('onStorageError' in next)
      runtime.onStorageError = next.onStorageError || null
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
        // Core 可以早于宿主 Adapter 创建。此时不能把未执行的默认页导航记为已完成，
        // 否则 host 绑定后再次同步相同根路径也不会重试。
        if (!runtime.host)
          return 'deferred'

        return requestRedirect(registry.defaultRoute) ? 'redirected' : 'continue'
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
      // 目录地址只有在宿主真实可用时才算完成 bootstrap；未绑定时继续确认当前
      // 非活动状态，但保留下一次相同 pathname 的重试资格。
      if (!runtime.host)
        return 'deferred'

      return requestRedirect(child) ? 'redirected' : 'continue'
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
    const normalizedSearch = normalizeSearchParams(location.search)
    const locationPayload: RouterLocationEventPayload = {
      pathname,
      search: normalizedSearch ? `?${normalizedSearch}` : '',
      hash: normalizeHash(location.hash),
    }

    // location 不进入 Zustand，但必须始终保留最新值：search/hash 变化不会触发页面状态
    // 更新，却仍然属于页面需要接收的地址事件；首个页面晚挂载时也依赖该快照补发。
    runtime.latestLocation = locationPayload

    if (pathnameChanged) {
      const currentRoutes = registry.getCurrentRoutes(pathname)
      setState((state) => ({
        ...state,
        navigationStatus: 'bootstrapping',
        currentPathname: pathname,
        currentRoutes,
        currentSelectedPath: currentRoutes.map((item) => item.realPath),
      }))
    }

    const tabKey = registry.getTabKey(pathname)
    if (tabKey) {
      // search/hash 可以高频变化，只写入实例私有 Cache，不进入 Zustand；相同 pathname
      // 会在后面的 bootstrap 去重分支返回，因此不会通知菜单、面包屑和页签订阅者。
      cache.setSearch(tabKey, location.search)
      cache.setHash(tabKey, location.hash)
      const leaf = registry.resolveLeafRoute(pathname)
      // 共享动态路由用 pattern 作为 tabKey，真实 pathname 另存 Cache。
      if (leaf && tabKey !== pathname && !leaf.route.supportMultipleTabs)
        cache.setParamsPath(tabKey, pathname)
    }

    // currentPathname 会在 bootstrap 前写入 Store，因此不能用 Store 字段判断本次落点
    // 是否已经处理；私有标记只过滤 StrictMode、重复 Adapter 通知以及单纯 search/hash
    // 变化，同时允许浏览器离开后再次进入同一路径时重新处理落点。
    if (runtime.lastBootstrappedPathname !== pathname) {
      const bootstrapResult = bootstrapByPathname(pathname)
      // deferred 没有真正完成导航，既不能记录当前 pathname，也不能保留更早路径的
      // 去重标记；否则离开旧路径后再次返回时可能跳过页面重新激活。其它结果都已完成
      // 本轮落点判断，可以安全记录。
      if (bootstrapResult === 'deferred')
        runtime.lastBootstrappedPathname = null
      else
        runtime.lastBootstrappedPathname = pathname

      if (bootstrapResult === 'continue' || bootstrapResult === 'deferred')
        syncByPathname(pathname)

      if (bootstrapResult === 'continue' || bootstrapResult === 'settled')
        setNavigationStatus('settled')
    }

    // 页面事件和 pathname bootstrap 具有不同的去重语义：即使 pathname 没变，新的
    // search/hash 也必须发布。新页面尚未订阅时不会丢失，subscribe 会从 latestLocation
    // 补发当前快照。
    if (tabKey)
      runtime.pageLocationListenerMap.get(tabKey)?.(locationPayload)
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

      // jumpTo 可能再次打开已经处于活动状态的 KeepAlive 页面。若页签、页面和活动身份
      // 都没有变化，必须返回原 state，避免仅因新对象引用通知全部 Zustand 订阅者。
      if (
        tabs === previous.tabs &&
        pages === previous.pages &&
        previous.activeTabKey === tabKey &&
        (!ensurePage || previous.activePage === tabKey)
      ) {
        return previous
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
   * 解析并验证一次平台导航，但不修改 Store、Cache 或宿主地址。
   *
   * 组合关闭命令必须在删除旧页签前完成本步骤；未知路由返回 null，使调用方可以保留
   * 原页面。已注册但无权限的路由仍是合法计划，执行阶段会导航到原地址展示 403。
   */
  function resolveNavigationPlan(
    input: RouterNavigationInput,
  ): RouterNavigationPlan | null {
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
      return null

    if (!isConcreteRoutePath(pathname)) {
      const cachedPathname = cache.getParamsPath(tabKey)
      if (
        !cachedPathname ||
        !isConcreteRoutePath(cachedPathname) ||
        registry.getTabKey(cachedPathname) !== tabKey
      ) {
        // 路由 pattern 只是页签身份；缺少同页签的真实 pathname 时不能交给宿主导航。
        return null
      }
      pathname = cachedPathname
    }

    const authorized = registry.resolveLeafRoute(pathname, { withinAuth: true })
    return {
      pathname,
      searchParams,
      hash,
      tabKey,
      authorized: registry.isPageRoute(authorized?.route),
    }
  }

  /** 执行已经验证的导航计划；返回 false 表示宿主已解绑或页面状态无法建立。 */
  function executeNavigationPlan(
    plan: RouterNavigationPlan,
    options: ExecuteNavigationPlanOptions = {},
  ) {
    const host = runtime.host
    if (!host)
      return false
    const navigate = options.navigate || host.navigate
    const navigateOptions = options.replace === undefined
      ? undefined
      : { replace: options.replace }
    const commitNavigate: RouterNavigate = navigateOptions
      ? (target) => {
          trackPathnameNavigation(target)
          navigate(target, navigateOptions)
        }
      : (target) => {
          trackPathnameNavigation(target)
          navigate(target)
        }

    function trackPathnameNavigation(target: Parameters<RouterNavigate>[0]) {
      if (options.trackNavigation === false)
        return
      const targetPathname = typeof target === 'string'
        ? parseUrl(target).pathname
        : target.pathname
      const currentPathname = runtime.latestLocation?.pathname || getState().currentPathname
      if (targetPathname !== currentPathname)
        setNavigationStatus('navigating')
    }

    if (!plan.authorized) {
      // 地址仍可改变以展示 403，但绝不能补建新的受限页面实例。导航计划已经把动态
      // pattern 恢复为具体路径；这里使用本次计划地址，避免同页签的旧 Cache 参数覆盖
      // 调用方明确传入的新 pathname。
      const activeTabKey = getState().tabs.some((tab) => tab.key === plan.tabKey)
        ? plan.tabKey
        : null
      setInactiveState(activeTabKey)
      commitNavigate(
        buildUrl({
          pathname: plan.pathname,
          searchParams: resolveSearch(
            plan.searchParams,
            cache.getSearch(plan.tabKey),
          ),
          hash: resolveHash(plan.hash, cache.getHash(plan.tabKey)),
        }),
      )
      return true
    }

    const shouldActivateCachedPage =
      keepAlive !== false && getState().pages.some((page) => page.key === plan.tabKey)
    if (!ensureTabState(plan.pathname, shouldActivateCachedPage))
      return false

    // 共享动态页签恢复最后真实 pathname；未指定 search/hash 时恢复对应缓存。
    commitNavigate(
      buildUrl({
        pathname: cache.getParamsPath(plan.tabKey) || plan.pathname,
        searchParams: resolveSearch(
          plan.searchParams,
          cache.getSearch(plan.tabKey),
        ),
        hash: resolveHash(plan.hash, cache.getHash(plan.tabKey)),
      }),
    )
    return true
  }

  /**
   * 执行完整平台导航。
   *
   * 字符串被视为完整目标 URL；结构化参数中 undefined 表示恢复页签缓存，null/空串
   * 表示显式清空。目录、权限、共享页签与 KeepAlive 都在调用宿主前完成处理。
   */
  function jumpTo(input: RouterNavigationInput) {
    if (!runtime.host)
      return
    const plan = resolveNavigationPlan(input)
    if (plan)
      executeNavigationPlan(plan)
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

  /**
   * 调整当前完整页签集合的显示顺序。
   *
   * 只接收 key 可以避免拖拽层借排序覆盖页签标题等领域数据；完整排列校验则保证排序
   * 不能成为新增、删除或重复页签的旁路。固定和普通页签属于两个稳定分组，跨组排列
   * 会破坏平台“固定项始终在前”的语义，因此同样拒绝并保持原状态。
   */
  function reorderTabs(tabKeys: readonly string[]) {
    const state = getState()
    if (!Array.isArray(tabKeys) || tabKeys.length !== state.tabs.length)
      return false

    const tabMap = new Map(state.tabs.map((tab) => [tab.key, tab]))
    const fixedKeySet = new Set(state.fixedSet)
    const seen = new Set<string>()
    let normalTabReached = false

    for (const key of tabKeys) {
      // 长度相同仍可能包含未知或重复 key；两者都会让某个现有页签从排列中消失。
      if (seen.has(key) || !tabMap.has(key))
        return false
      seen.add(key)

      if (fixedKeySet.has(key)) {
        if (normalTabReached)
          return false
      } else {
        normalTabReached = true
      }
    }

    const currentKeys = state.tabs.map((tab) => tab.key)
    // 无效拖拽常产生内容相同的新数组；合法 no-op 仍返回成功，但不通知订阅者。
    if (areStringArraysEqual(currentKeys, [...tabKeys]))
      return true

    // 只按 key 读取 core 持有的规范页签对象，不保存调用方创建的可变对象。
    const tabs = tabKeys.map((key) => tabMap.get(key)!)
    const fixedSet = tabKeys.filter((key) => fixedKeySet.has(key))
    const fixedOrderChanged = !areStringArraysEqual(state.fixedSet, fixedSet)

    if (fixedOrderChanged)
      persistFixedTabs(fixedSet)

    setState({
      tabs,
      ...(fixedOrderChanged ? { fixedSet } : {}),
    })
    return true
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

  /** 固定或取消固定页签；只允许操作当前已经打开的页签。 */
  function toggleFixed(tabKey: string) {
    const state = getState()
    // 固定状态是已打开页签的附属属性。拒绝未知或尚未打开的 key，避免 fixedSet、
    // tabs 与持久化数据产生无法在当前界面解释的不一致项。
    if (!state.tabs.some((tab) => tab.key === tabKey))
      return false

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

  /** 收藏或取消收藏注册页面路由。 */
  function toggleFavoriteRoute(path: string) {
    const state = getState()
    const routeKey = sanitizeFavoriteRoutePaths([path], registry)[0]
    if (!routeKey)
      return false

    const favoriteRoutePaths = state.favoriteRoutePaths.includes(routeKey)
      ? state.favoriteRoutePaths.filter((item) => item !== routeKey)
      : state.favoriteRoutePaths.concat(routeKey)
    persistFavoriteRoutePaths(favoriteRoutePaths)
    setState({ favoriteRoutePaths })
    return true
  }

  /** 把通知回调错误暴露到开发控制台，但不改变已经提交的关闭结果。 */
  function reportTabCloseError(error: unknown) {
    console.error('[RouterCore] onTabClose callback failed.', error)
  }

  /**
   * 触发关闭完成通知，并同时隔离同步 throw 与异步 rejection。
   *
   * onTabClose 是提交后的通知而不是守卫，因此不等待 Promise；业务若需要在关闭前完成
   * 保存或校验，应使用 before-close Hook 返回明确结果。
   */
  function notifyTabClose(
    tabKey: string,
    info: RouterAfterTabCloseInfo,
  ) {
    const callback = runtime.onTabClose
    if (!callback)
      return

    try {
      void Promise.resolve(callback(tabKey, info)).catch(reportTabCloseError)
    } catch (error) {
      reportTabCloseError(error)
    }
  }

  /**
   * 执行单个页签关闭事务。
   *
   * 顺序固定为：取得关闭权、运行守卫、重新确认页签、提交状态、清理命令资源、执行
   * 必要导航、通知回调。同一 key 的重复关闭在运行守卫前直接失败。
   */
  async function closeTab(
    tabKey: string,
    closeOptions?: RouterCloseOptions,
    transaction?: CloseTabTransaction,
  ) {
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
      // 组合命令还要确认宿主等事务前提；失败时不能先删旧页再报告导航失败。
      if (transaction?.canCommit && !transaction.canCommit())
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
      runtime.pageLocationListenerMap.delete(tabKey)
      cache.clear(tabKey)

      let result = true
      if (transaction?.navigateAfterClose) {
        // 最终导航必须早于通知回调，避免 onTabClose 解绑宿主后丢失本次导航。
        result = transaction.navigateAfterClose()
      } else {
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

      notifyTabClose(tabKey, { pathname: closedPathname })
      return result
    } finally {
      runtime.closingTabKeys.delete(tabKey)
    }
  }

  /**
   * 组合“关闭旧页签 + 打开新地址”，保证只产生一次最终宿主导航。
   *
   * 新目标必须在关闭事务前完成 Registry 验证；未知目标或未绑定宿主都直接失败并保留
   * 旧页签，避免浏览器仍停留在旧地址但对应页面状态已经被删除。
   */
  async function closeThisTabOpenNewOne(
    data: { oldPath: string, newPath: string },
    closeOptions?: RouterCloseOptions,
  ) {
    const host = runtime.host
    if (!host)
      return false
    const target = resolveNavigationPlan(data.newPath)
    if (!target)
      return false

    const oldTabKey = registry.getTabKey(parseUrl(data.oldPath).pathname)
    if (oldTabKey && getState().tabs.some((tab) => tab.key === oldTabKey)) {
      return closeTab(oldTabKey, closeOptions, {
        // 守卫可能触发组件卸载；宿主已变化时保留旧页，避免状态与地址脱节。
        canCommit: () => runtime.host === host,
        navigateAfterClose: () => executeNavigationPlan(target),
      })
    }
    return executeNavigationPlan(target)
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

  /**
   * 订阅当前页面实例的 location，并补发属于该页签的最近地址。
   *
   * 订阅发生在首次 syncLocation 之后时，补发保证页面仍能收到首个 pathname/search/hash；
   * 清理函数只删除当前 listener，避免旧页面卸载时误删已接管同一 tabKey 的新实例。
   */
  function subscribePageLocation(
    tabKey: string,
    listener: (location: RouterLocationEventPayload) => void,
  ) {
    if (!tabKey)
      return () => undefined
    runtime.pageLocationListenerMap.set(tabKey, listener)

    const unsubscribe = () => {
      // 同一 key 可能已由新页面实例接管，旧实例卸载时只能删除自己的引用。
      if (runtime.pageLocationListenerMap.get(tabKey) === listener)
        runtime.pageLocationListenerMap.delete(tabKey)
    }

    try {
      const latestLocation = runtime.latestLocation
      if (
        latestLocation &&
        registry.getTabKey(latestLocation.pathname) === tabKey
      ) {
        listener(latestLocation)
      }
    } catch (error) {
      // 初始化补发失败表示本次订阅没有成功建立；先撤销已写入的 listener，再把原始
      // 页面错误交给调用方或 React ErrorBoundary，避免坏 listener 持续破坏路由同步。
      unsubscribe()
      throw error
    }

    return unsubscribe
  }

  /** 进入目录、403 或 404 等没有活动业务页面的状态。 */
  function setInactiveState(activeTabKey: string | null) {
    setState((state) => {
      const pages = enforceKeepAlive(
        state.pages,
        null,
        keepAlive,
        state.fixedSet,
      )

      // 重复进入同一个 403/404/空目录时，如果活动身份和 KeepAlive 结果都没有变化，
      // 继续复用原 state，避免无业务变化的通知。
      if (
        state.activeTabKey === activeTabKey &&
        state.activePage === null &&
        pages === state.pages
      ) {
        return state
      }

      return {
        ...state,
        activeTabKey,
        activePage: null,
        pages,
      }
    })
  }

  /** 将固定页签保存委托给统一字段持久化流程。 */
  function persistFixedTabs(value: readonly string[]) {
    // 即使处于纯内存模式也要记录版本，保证在途 hydration 不会覆盖本地操作。
    runtime.fixedTabsMutationVersion += 1
    persist('saveFixedTabs', (adapter, storageKey) =>
      adapter.saveFixedTabs(storageKey, [...value]))
  }

  /** 将共享动态 pathname 映射保存委托给统一字段持久化流程。 */
  function persistParamsPathMap(value: Record<string, string>) {
    persist(
      'saveFixedParamsPathMap',
      (adapter, storageKey) =>
        adapter.saveFixedParamsPathMap(storageKey, value),
    )
  }

  /** 将收藏路由保存委托给统一字段持久化流程。 */
  function persistFavoriteRoutePaths(value: readonly string[]) {
    runtime.favoriteRoutesMutationVersion += 1
    persist('saveFavoriteRoutePaths', (adapter, storageKey) =>
      adapter.saveFavoriteRoutePaths(storageKey, [...value]))
  }

  /** 报告错误通知回调自身的异常，但不能再次进入 onStorageError 形成递归通知。 */
  function reportStorageErrorCallbackError(error: unknown) {
    console.error('[RouterCore] onStorageError callback failed.', error)
  }

  /**
   * 发送持久化错误通知，并隔离同步 throw 与异步 rejection。
   *
   * onStorageError 只负责观察失败；Adapter 原始错误已经写入状态或由当前保存任务
   * 持有，因此通知失败不能覆盖原始错误，也不能制造未处理 Promise。
   */
  function notifyStorageError(
    error: unknown,
    info: RouterStorageErrorInfo,
  ) {
    const callback = runtime.onStorageError
    if (!callback)
      return

    try {
      void Promise.resolve(callback(error, info))
        .catch(reportStorageErrorCallbackError)
    } catch (callbackError) {
      reportStorageErrorCallbackError(callbackError)
    }
  }

  /**
   * 执行一个字段保存动作。
   *
   * Adapter 失败只发送通知，不回滚当前内存状态。需要参与 hydration 冲突判断的
   * 固定页签版本由调用方在进入本函数前递增；动态 pathname 使用独立增量 Map 合并。
   */
  function persist(
    phase: Exclude<RouterStorageErrorPhase, 'load'>,
    action: (adapter: RouterStorageAdapter, storageKey: string) => Promise<void>,
  ) {
    if (storageAdapter === false)
      return
    const storageKey = getState().storageKey
    // Promise.resolve 同时收敛不规范 Adapter 的同步 throw 与异步 rejection。
    void Promise.resolve().then(() => action(storageAdapter, storageKey)).catch((error) => {
      notifyStorageError(error, { storageKey, phase })
    })
  }

  /** 启动或复用固定持久化来源的 hydration 任务。 */
  function hydrateStorage() {
    // 并发调用方必须等待同一个 Promise，而不是看到 loading 后提前返回。
    if (runtime.storageHydrationPromise)
      return runtime.storageHydrationPromise
    if (storageAdapter === false || getState().storageHydrated)
      return Promise.resolve()

    const promise = executeHydration().finally(() => {
      runtime.storageHydrationPromise = null
    })
    runtime.storageHydrationPromise = promise
    return promise
  }

  /** 执行一次绑定固定 Adapter 与 storageKey 的实际加载事务。 */
  async function executeHydration() {
    if (storageAdapter === false)
      return
    const storageKey = getState().storageKey
    // 固定页签仍以字段版本判断加载期间是否被用户修改；动态 pathname 则保留每个
    // tabKey 的增量，避免一个局部变化覆盖尚未加载的其它映射。
    const fixedTabsMutationVersion = runtime.fixedTabsMutationVersion
    const favoriteRoutesMutationVersion = runtime.favoriteRoutesMutationVersion
    setState({ storageLoading: true, storageLoadError: undefined })

    try {
      const loaded = normalizeRouterStorageState(
        await storageAdapter.load(storageKey),
      )
      const state = getState()
      const fixedUnchanged =
        fixedTabsMutationVersion === runtime.fixedTabsMutationVersion
      const favoritesUnchanged =
        favoriteRoutesMutationVersion === runtime.favoriteRoutesMutationVersion

      // 增量 Map 包含 load 前和 load 期间的全部本地变化。字符串覆盖存储旧值，null
      // 显式删除旧映射；未触达的 key 原样保留，避免首个动态页覆盖其它页签历史。
      const mergedParamsPathMap = { ...loaded.fixedParamsPathMap }
      runtime.pendingParamsPathMutations.forEach((pathname, tabKey) => {
        if (pathname)
          mergedParamsPathMap[tabKey] = pathname
        else
          delete mergedParamsPathMap[tabKey]
      })
      // 持久化数组顺序就是固定页签显示顺序；旧数据超过当前上限时只保留前 N 项，
      // 后面的差异检测会回写清理结果，避免下次 hydration 再次恢复超限数据。
      const nextFixedSet = fixedUnchanged
        ? sanitizeFixedTabKeys(
            loaded.fixedTabs,
            mergedParamsPathMap,
            registry,
          ).slice(0, state.maxFixedTabCount)
        : state.fixedSet
      const nextFavoriteRoutePaths = favoritesUnchanged
        ? sanitizeFavoriteRoutePaths(loaded.favoriteRoutePaths, registry)
        : state.favoriteRoutePaths

      // 使用 hydrate 方法替换完整 Cache 不会产生保存回调；清空增量后再把 Store 标记为
      // hydrated，后续 pathname 更新即可按普通完整快照直接持久化。
      cache.hydrateParamsPathMap(mergedParamsPathMap)
      runtime.pendingParamsPathMutations.clear()
      setState({
        fixedSet: nextFixedSet,
        favoriteRoutePaths: nextFavoriteRoutePaths,
        tabs: fixedUnchanged
          ? mergeTabsWithFixedSet(state.tabs, nextFixedSet, registry)
          : state.tabs,
        storageHydrated: true,
        storageLoading: false,
      })
      if (fixedUnchanged && !areStringArraysEqual(nextFixedSet, loaded.fixedTabs))
        // 清理无效/重复固定 key 后回写，避免下次加载重复清理。
        persistFixedTabs(nextFixedSet)
      if (!areStringRecordsEqual(mergedParamsPathMap, loaded.fixedParamsPathMap)) {
        // 本次会话的动态地址在完整加载结果上合并后只回写一次，不会覆盖未触达 key。
        persistParamsPathMap(mergedParamsPathMap)
      }
      if (
        favoritesUnchanged &&
        !areStringArraysEqual(nextFavoriteRoutePaths, loaded.favoriteRoutePaths)
      ) {
        persistFavoriteRoutePaths(nextFavoriteRoutePaths)
      }
    } catch (error) {
      setState({ storageLoading: false, storageLoadError: error })
      notifyStorageError(error, {
        storageKey,
        phase: 'load',
      })
    }
  }

  // 对外只暴露领域查询与命令；Cache、runtime 和持久化协调函数继续封装在实例闭包内。
  return {
    registry,
    hasAuth,
    store: readableStore,
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
    reorderTabs,
    setTabLabel,
    setPathnameDescription: (map) =>
      setState((state) => {
        const hasChanged = Object.keys(map).some(
          (pathname) => state.pathnameDescriptionMap[pathname] !== map[pathname],
        )

        // Zustand 以 state 引用判断是否需要通知订阅者；空输入或重复描述没有领域变化，
        // 返回原对象可避免无意义的全局通知，同时保留真实增量更新的合并语义。
        if (!hasChanged)
          return state

        return {
          ...state,
          pathnameDescriptionMap: { ...state.pathnameDescriptionMap, ...map },
        }
      }),
    toggleFixed,
    toggleFavoriteRoute,
    closeTab,
    closeThisTabOpenNewOne,
    addBeforeCloseHook,
    clearBeforeCloseHook,
    subscribePageLocation,
  }
}

/** 复制 KeepAlive 数组配置，形成不会受调用方原地修改影响的实例快照。 */
function snapshotKeepAlive<Route extends RouterRoute>(
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

/** undefined 使用默认 IndexedDB，false 显式关闭外部持久化。 */
function resolveStorageAdapter(
  value: false | RouterStorageAdapter | undefined,
) {
  return value === false ? false : value || DEFAULT_STORAGE_ADAPTER
}

/**
 * 清理重复、已删除或无法恢复真实地址的固定页签，同时保持首次出现顺序。
 *
 * 静态页签的 key 本身就是可导航地址；共享动态页签使用注册 pattern 作为 key，必须
 * 同时存在能够解析回同一 tabKey 的具体 pathname，否则该持久化缓存无法安全恢复。
 */
function sanitizeFixedTabKeys<Route extends RouterRoute>(
  fixedTabs: readonly string[],
  fixedParamsPathMap: Readonly<Record<string, string>>,
  registry: RouteRegistry<Route>,
) {
  const seen = new Set<string>()
  const sanitized: string[] = []

  fixedTabs.forEach((key) => {
    // Registry 匹配大小写和末尾斜杠时会返回规范页签身份。持久化数据必须统一使用该
    // 身份，否则 `/Dashboard/` 与后续访问产生的 `/dashboard` 会成为两个页签。
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
function sanitizeFavoriteRoutePaths<Route extends RouterRoute>(
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

/** 用已清理的固定页签创建顺序稳定的页签模型。 */
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
function mergeTabsWithFixedSet<Route extends RouterRoute>(
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

/** 固定组遵循 fixedSet 的持久化顺序，普通组保持 tabs 中的原始顺序。 */
function sortTabs(tabs: readonly RouterTab[], fixedSet: readonly string[]) {
  const tabMap = new Map(tabs.map((tab) => [tab.key, tab]))
  const fixedKeySet = new Set(fixedSet)
  const fixedTabs = fixedSet
    .map((key) => tabMap.get(key))
    .filter((tab): tab is RouterTab => Boolean(tab))

  return fixedTabs.concat(
    tabs.filter((tab) => !fixedKeySet.has(tab.key)),
  )
}

/** 只有启用有限 LRU 时，重访页面才需要更新 touchedAt。 */
function shouldRefreshTouchedAt<Route extends RouterRoute>(
  keepAlive: boolean | RouterKeepAliveConfig<Route>,
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
function enforceKeepAlive<Route extends RouterRoute>(
  pages: readonly RouterPage<Route>[],
  activeKey: string | null,
  keepAlive: boolean | RouterKeepAliveConfig<Route>,
  fixedSet: readonly string[],
) {
  if (keepAlive === false) {
    // 完全关闭时只保留当前活动实例，切页后旧页面立即卸载。
    const activePages = pages.filter((page) => page.key === activeKey)
    return activePages.length === pages.length ? pages : activePages
  }

  // 活动页即使命中 exclude 也保留到导航完成，避免当前视图在同一轮先被卸载。
  const filteredPages = typeof keepAlive === 'object'
    ? pages.filter(
        (page) =>
          page.key === activeKey || shouldKeepPage(page, keepAlive),
      )
    : pages
  // filter 即使保留全部页面也会创建新数组；领域结果未变化时复用原引用，使上层
  // ensureTabState/setInactiveState 能准确识别 no-op 更新。
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

/** 按顺序比较字符串数组；固定页签的顺序本身属于业务状态。 */
function areStringArraysEqual(
  left: readonly string[],
  right: readonly string[],
) {
  return left === right || (
    left.length === right.length &&
    left.every((item, index) => item === right[index])
  )
}

/** 按键和值比较字符串记录，避免 hydration 对未变化的动态路径执行重复回写。 */
function areStringRecordsEqual(
  left: Record<string, string>,
  right: Record<string, string>,
) {
  if (left === right)
    return true
  const leftKeys = Object.keys(left)
  return leftKeys.length === Object.keys(right).length &&
    leftKeys.every((key) => left[key] === right[key])
}

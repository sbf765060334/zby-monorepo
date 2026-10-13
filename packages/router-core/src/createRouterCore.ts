/**
 * 文件职责：组装一个完整的 RouterCore 实例，并协调导航、路由匹配、页签和持久化。
 *
 * 新手可以把这里理解成“总调度室”：它自己不操作浏览器，也不渲染页面，而是把宿主
 * 回传的地址交给各个小模块处理，最后向外提供 jumpTo、closeTab 等统一命令。
 */
import { createStore } from 'zustand/vanilla'

import { snapshotKeepAlive } from './keepAlive'
import { createRouterPersistence, resolveStorageAdapter } from './persistence'
import type { RouterPersistence } from './persistence'
import { createRouteRegistry, isConcreteRoutePath } from './registry'
import { normalizeMaxFixedTabCount } from './tabState'
import { createRouterTabs } from './tabs'
import {
  buildUrl,
  normalizeHash,
  normalizeSearchParams,
  parseUrl,
  resolveHash,
  resolveSearch,
  RouterUrlCache,
} from './urlState'
import type {
  CreateRouterCoreOptions,
  RouterCloseOptions,
  RouterCloseTabsOptions,
  RouterCore,
  RouterCoreState,
  RouterHost,
  RouterLocation,
  RouterLocationEventPayload,
  RouterNavigate,
  RouterReadableStore,
  RouterRoute,
  RouterRuntimeOptions,
} from './types'

/**
 * router-core 实例实现。
 *
 * 每次调用 createRouterCore 都会创建互相隔离的 Registry、Zustand Store、URL Cache
 * 和命令运行时。Store 只保存需要订阅的业务状态；宿主函数、关闭守卫和异步任务版本
 * 留在闭包中，避免内部协调动作触发 UI 重渲染。
 */

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
  /** 已经确认可交给宿主的具体 pathname。 */
  pathname: string
  /** 本次调用指定的查询参数；undefined 表示稍后恢复页签缓存。 */
  searchParams?: string | null
  /** 本次调用指定的 hash；undefined 表示稍后恢复页签缓存。 */
  hash?: string | null
  /** 目标真实地址对应的稳定页签身份。 */
  tabKey: string
}

/** 导航计划执行时允许替换的宿主能力；普通命令继续使用当前 Host.navigate。 */
interface ExecuteNavigationPlanOptions {
  /** 临时替换默认 host.navigate，例如目录重定向使用 host.redirect。 */
  navigate?: RouterNavigate
  /** 是否替换当前浏览器 history 记录。 */
  replace?: boolean
  /** false 表示本次重定向不发布普通 navigating 阶段。 */
  trackNavigation?: boolean
}

/** 单个 core 实例私有、不可观察的命令与异步协调状态。 */
interface RouterRuntime {
  /** 实际执行地址变化的宿主；未绑定时业务导航安全 no-op。 */
  host: RouterHost | null
  /** 最近一次完成落点判断的 pathname，用于过滤 StrictMode 与 Provider 的重复通知。 */
  lastBootstrappedPathname: string | null
  /**
   * 最近一次由宿主确认的标准化 location。
   *
   * 页面实例可能晚于首次 syncLocation 创建；保留该快照后，新订阅的页面 listener
   * 可以立即补收当前地址，而不要求 Provider 额外重放一次 location。
   */
  latestLocation: RouterLocationEventPayload | null
  /** 始终使用最新引用的页签关闭回调。 */
  onTabClose: RouterRuntimeOptions['onTabClose'] | null
  /** 始终使用最新引用的持久化错误回调。 */
  onStorageError: RouterRuntimeOptions['onStorageError'] | null
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
  // 标题描述符的语义归渲染层所有，core 只需要知道「两个描述符算不算同一个」。
  const isSameTitle = options.isSameTitle ?? Object.is
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
    batchCloseAwaitingGuard: false,
    // 固定配置随首个 Store 快照一起建立，宿主首次同步 location 时即可直接使用。
    storageKey: options.storageKey ?? 'default',
    maxFixedTabCount: normalizeMaxFixedTabCount(options.maxFixedTabCount),
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
  // Cache 构造期不会触发写回；持久化协调器随后立即接管该回调。
  let persistence!: RouterPersistence
  const cache = new RouterUrlCache((tabKey, pathname) =>
    persistence.handleParamsPathMapChange(tabKey, pathname))
  persistence = createRouterPersistence({
    storageAdapter,
    registry,
    cache,
    getState,
    setState,
    getOnStorageError: () => runtime.onStorageError,
  })
  const {
    hydrateStorage,
    persistFavoriteRoutePaths,
    persistFixedTabs,
  } = persistence
  // executeNavigationPlan 在后面才定义，关闭流程通过这个绑定调用最终实现。
  let activateTabForCloseImpl: (tabKey: string) => boolean | Promise<boolean> = () => false
  const activationWaiters: Array<() => void> = []
  const tabs = createRouterTabs({
    registry,
    cache,
    keepAlive,
    isSameTitle,
    getState,
    setState,
    getHost: () => runtime.host,
    getLatestLocation: () => runtime.latestLocation,
    getOnTabClose: () => runtime.onTabClose,
    persistFixedTabs,
    persistFavoriteRoutePaths,
    activateTabForClose: (tabKey) => activateTabForCloseImpl(tabKey),
  })
  const {
    addBeforeCloseHook,
    clearBeforeCloseHook,
    closeTab,
    confirmPendingTabClose,
    getInFlightTabClose,
    getPendingCloseTabKey,
    hasBeforeCloseHook,
    waitForPendingTabClose,
    ensureTabState,
    publishPageLocation,
    reorderTabs,
    setInactiveState,
    setTabLabel,
    subscribePageLocation,
    toggleFavoriteRoute,
    toggleFixed,
  } = tabs

  /** 由 RouterCoreProvider 在挂载/卸载时绑定或清除底层导航能力。 */
  function bindHost(host: RouterHost | null) {
    runtime.host = host
    if (!host && getState().navigationStatus !== 'settled') {
      // redirect effect 提交前卸载时，请求只存在于旧 Provider。清除去重标记，使新 Host
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
   * React 绑定使用专用 redirect 把真实导航延后到 effect；测试里可以只提供 navigate。
   * replace 避免默认落点在浏览器历史中留下无法停留的中间记录。
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
      // Core 可以早于 Provider 创建。此时不能把未执行的默认页导航记为已完成，
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
    let notifyConfirmedTabClose: (() => void) | undefined
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
      // currentPathname 先采用宿主事实；随后清理旧页，最后由 syncByPathname 激活目标。
      notifyConfirmedTabClose = confirmPendingTabClose(pathname)
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
    // 是否已经处理；私有标记只过滤 StrictMode、重复 Provider 通知以及单纯 search/hash
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
      publishPageLocation(tabKey, locationPayload)
    const arrived = activationWaiters.splice(0)
    for (const resolve of arrived)
      resolve()
    notifyConfirmedTabClose?.()
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
   * 解析并验证一次平台导航，但不修改 Store、Cache 或宿主地址。
   *
   * 组合关闭命令必须在删除旧页签前完成本步骤；未知路由返回 null，使调用方可以保留
   * 原页面。已注册但无权限的路由仍是合法计划，执行阶段会导航到原地址展示 403。
   */
  function resolveNavigationPlan(
    input: RouterNavigationInput,
  ): RouterNavigationPlan | null {
    // 字符串先拆成三个独立片段；查询串取 URL.search，避免 searchParams.toString() 重编码。
    const parsed = typeof input === 'string' ? parseUrl(input) : null
    let pathname = typeof input === 'string' ? parsed!.pathname : input.pathname
    const searchParams =
      typeof input === 'string' ? normalizeSearchParams(parsed!.search) : input.searchParams
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

    return {
      pathname,
      searchParams,
      hash,
      tabKey,
    }
  }

  /** 执行已经验证的导航计划；返回 false 表示宿主已经解绑。 */
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

    /** 只有目标 pathname 真正变化时才发布 navigating，单纯 search/hash 变化不发布。 */
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

    commitNavigate(buildNavigationTarget(plan))
    return true
  }

  function waitUntilTabActive(tabKey: string): Promise<void> | void {
    if (getState().activeTabKey === tabKey)
      return
    return new Promise((resolve) => {
      activationWaiters.push(resolve)
    })
  }

  activateTabForCloseImpl = (tabKey) => {
    if (getState().activeTabKey === tabKey)
      return true
    const plan = resolveNavigationPlan({
      pathname: cache.getParamsPath(tabKey) || tabKey,
    })
    if (!plan || plan.tabKey !== tabKey)
      return false
    if (!executeNavigationPlan(plan, { replace: true }))
      return false
    if (getState().activeTabKey === tabKey)
      return true
    const pending = waitUntilTabActive(tabKey)
    if (!pending)
      return getState().activeTabKey === tabKey
    return pending.then(() => getState().activeTabKey === tabKey)
  }

  function setBatchCloseAwaitingGuard(waiting: boolean) {
    setState((state) => state.batchCloseAwaitingGuard === waiting
      ? state
      : { ...state, batchCloseAwaitingGuard: waiting })
  }

  /** 生成交给宿主的最终 URL，但不提前创建或激活任何页签和页面。 */
  function buildNavigationTarget(plan: RouterNavigationPlan) {
    return buildUrl({
      // pathname 已在 resolveNavigationPlan 中完成「pattern → 缓存真实地址」；
      // 具体地址必须原样交给宿主，search/hash 才按页签缓存补齐。
      pathname: plan.pathname,
      searchParams: resolveSearch(
        plan.searchParams,
        cache.getSearch(plan.tabKey),
      ),
      hash: resolveHash(plan.hash, cache.getHash(plan.tabKey)),
    })
  }

  /**
   * 执行完整平台导航。
   *
   * 字符串被视为完整目标 URL；查询串取 URL.search，不经 URLSearchParams 重编码。
   * 结构化参数中 undefined 表示恢复页签缓存，null/空串表示显式清空。这里仅解析目录、
   * 权限和缓存 URL；活动状态等待 syncLocation 确认。
   */
  function jumpTo(input: RouterNavigationInput) {
    if (!runtime.host)
      return
    const plan = resolveNavigationPlan(input)
    if (plan) {
      executeNavigationPlan(plan)
      return
    }
    warnUnresolvedPatternJump(input)
  }

  /** 未具体化的 pattern 缺少可恢复地址时不导航，并给出控制台提示。 */
  function warnUnresolvedPatternJump(input: RouterNavigationInput) {
    const pathname = typeof input === 'string' ? parseUrl(input).pathname : input.pathname
    if (isConcreteRoutePath(pathname))
      return
    console.warn(
      `[router-core] jumpTo 忽略了未具体化的路由 pattern "${pathname}"。请传入 /orders/79 这类具体 pathname。`,
    )
  }

  /**
   * 替换指定页签的查询串。
   *
   * 活动页交给宿主，等 syncLocation 回写缓存。缓存页不能走宿主，否则会改掉用户
   * 正在看的地址；这里直接写该页签缓存，并通知它自己的 location。
   */
  function replacePageSearch(
    tabKey: string,
    searchParams: string | null,
    options?: { replace?: boolean },
  ) {
    const state = getState()
    const page = state.pages.find((item) => item.key === tabKey)
    const pathname = page?.pathname || cache.getParamsPath(tabKey) || tabKey
    const normalized = normalizeSearchParams(searchParams)
    const active = state.activePage === tabKey

    if (active && runtime.host) {
      runtime.host.navigate(
        {
          pathname,
          search: normalized ? `?${normalized}` : '',
          hash: cache.getHash(tabKey),
        },
        { replace: options?.replace !== false },
      )
      return
    }

    cache.setSearch(tabKey, normalized)
    const search = cache.getSearch(tabKey)
    publishPageLocation(tabKey, {
      pathname,
      search: search ? `?${search}` : '',
      hash: cache.getHash(tabKey),
    })
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
        navigation: {
          getPathname: () => parseUrl(buildNavigationTarget(target)).pathname,
          execute: () => executeNavigationPlan(target, { replace: true }),
        },
      })
    }
    return executeNavigationPlan(target)
  }

  // 同时只跑一批关闭。上一批的守卫或宿主确认还没结束时，下一批在队列里等。
  let closeTabsQueue: Promise<void> = Promise.resolve()

  /**
   * 按顺序关闭页签。某一页的守卫拒绝或抛错时留下该页，后面的页签继续关。
   *
   * closeTab 在活动页的 replace 发出后就返回，真正删除要等宿主确认。批量关闭必须等
   * 这次确认结束，否则下一页会在浏览器还停在旧地址时被删掉，落点也可能被提前关闭。
   */
  function closeTabs(
    tabKeys: readonly string[],
    options: RouterCloseTabsOptions,
  ) {
    const run = () => runCloseTabs(tabKeys, options)
    const task = closeTabsQueue.then(run, run)
    closeTabsQueue = task.then(() => undefined, () => undefined)
    return task
  }

  /**
   * 先等名单里已经开始的关闭。落点可能排在它前面，不能等循环走到它才停。
   * 守卫拒绝后页还在的，循环里不再关第二次。
   */
  async function waitForClosesAlreadyUnderway(
    tabKeys: readonly string[],
    errors: unknown[],
  ) {
    const underway = tabKeys.filter((tabKey) =>
      getInFlightTabClose(tabKey) || getPendingCloseTabKey() === tabKey,
    )
    for (const tabKey of underway) {
      const inFlight = getInFlightTabClose(tabKey)
      if (!inFlight)
        continue
      try {
        await inFlight
      } catch (error) {
        errors.push(error)
      }
    }
    const pendingKey = getPendingCloseTabKey()
    if (pendingKey)
      await waitForActiveCloseToSettle(pendingKey)
    return new Set(underway.filter((tabKey) =>
      getState().tabs.some((tab) => tab.key === tabKey),
    ))
  }

  async function runCloseTabs(
    tabKeys: readonly string[],
    options: RouterCloseTabsOptions,
  ) {
    const anchorKey = options.anchorKey
    if (!getState().tabs.some((tab) => tab.key === anchorKey))
      return false

    const errors: unknown[] = []
    // 没有进行中的关闭时不要 await：async 函数即使立刻返回也会多让出一次微任务。
    const hasUnderwayClose = Boolean(getPendingCloseTabKey()) ||
      tabKeys.some((tabKey) => getInFlightTabClose(tabKey))
    const leftOpen = hasUnderwayClose
      ? await waitForClosesAlreadyUnderway(tabKeys, errors)
      : new Set<string>()
    // 活动页要等其余页处理完再离开。中途只为了打开下一张带守卫的页才导航。
    let deferredActiveKey: string | null = null
    try {
      for (let index = 0; index < tabKeys.length; index += 1) {
        const tabKey = tabKeys[index]
        if (leftOpen.has(tabKey))
          continue
        if (tabKey === anchorKey)
          continue
        if (getState().tabs.length <= 1)
          break
        if (!getState().tabs.some((tab) => tab.key === tabKey))
          continue
        if (!getState().tabs.some((tab) => tab.key === anchorKey))
          break
        const inFlight = getInFlightTabClose(tabKey)
        if (inFlight) {
          try {
            await inFlight
            await waitForActiveCloseToSettle(tabKey)
          } catch (error) {
            errors.push(error)
          }
          continue
        }
        try {
          if (hasBeforeCloseHook(tabKey)) {
            if (deferredActiveKey && deferredActiveKey !== tabKey) {
              await closeDeferredActive(deferredActiveKey, tabKey)
              deferredActiveKey = null
            }
            if (await closeGuardedTabDeferringActive(tabKey))
              deferredActiveKey = tabKey
          } else if (getState().activeTabKey === tabKey) {
            deferredActiveKey = tabKey
          } else {
            await closeBackgroundTab(tabKey)
          }
        } catch (error) {
          errors.push(error)
        }
      }

      if (
        deferredActiveKey &&
        getState().tabs.some((tab) => tab.key === deferredActiveKey) &&
        getState().tabs.some((tab) => tab.key === anchorKey)
      ) {
        try {
          await closeDeferredActive(deferredActiveKey, anchorKey)
        } catch (error) {
          errors.push(error)
        }
      }
    } finally {
      setBatchCloseAwaitingGuard(false)
    }

    if (errors.length)
      throw errors[0]
    return true
  }

  function anchorPlan(anchorKey: string) {
    if (!getState().tabs.some((tab) => tab.key === anchorKey))
      return null
    return resolveNavigationPlan({
      pathname: cache.getParamsPath(anchorKey) || anchorKey,
    })
  }

  /** 这次关闭已经发出活动页跳转时，等宿主确认离开后再继续批量关闭。 */
  async function waitForActiveCloseToSettle(tabKey: string) {
    const pending = waitForPendingTabClose(tabKey)
    if (pending)
      await pending
  }

  /** 没有守卫的后台页当场删掉，不导航。 */
  async function closeBackgroundTab(tabKey: string) {
    const host = runtime.host
    await closeTab(tabKey, undefined, {
      canCommit: () => runtime.host === host && host !== null,
      onlyWhenActive: true,
    })
  }

  /**
   * 先打开带守卫的页再询问。选择关闭且它仍是活动页时先不跳，交给调用方延后。
   * 返回 true 表示活动页已确认关闭，但还停在这一页。
   */
  async function closeGuardedTabDeferringActive(tabKey: string) {
    const host = runtime.host
    let deferred = false
    await closeTab(tabKey, undefined, {
      canCommit: () => runtime.host === host && host !== null,
      onlyWhenActive: true,
      deferWhenActive: true,
      onAsyncGuard: setBatchCloseAwaitingGuard,
      onDeferred: () => {
        deferred = true
      },
    })
    await waitForActiveCloseToSettle(tabKey)
    return deferred
  }

  /** 离开先前确认关闭的活动页。目标是下一张要出示的守卫页，或最终的右键页。 */
  async function closeDeferredActive(tabKey: string, destinationKey: string) {
    const host = runtime.host
    await closeTab(tabKey, { skipBeforeClose: true }, {
      canCommit: () => runtime.host === host && host !== null,
      onlyWhenActive: true,
      navigation: {
        getPathname: () => anchorPlan(destinationKey)?.pathname || '/',
        execute: () => {
          const plan = anchorPlan(destinationKey)
          if (!host || runtime.host !== host || !plan || plan.tabKey === tabKey)
            return false
          return executeNavigationPlan(plan, { replace: true })
        },
      },
    })
    await waitForActiveCloseToSettle(tabKey)
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
    replacePageSearch,
    getTabKey: registry.getTabKey,
    getCurrentRoutes: registry.getCurrentRoutes,
    reorderTabs,
    setTabLabel,
    setPathnameDescription: (map) =>
      setState((state) => {
        const hasChanged = Object.keys(map).some(
          (pathname) => !isSameTitle(state.pathnameDescriptionMap[pathname], map[pathname]),
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
    closeTabs,
    closeThisTabOpenNewOne,
    addBeforeCloseHook,
    clearBeforeCloseHook,
    subscribePageLocation,
  }
}

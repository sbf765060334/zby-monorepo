import { closeTab, ensureTabStateForPathname } from './tabs'
import type { ProLayoutStoreRuntime } from './runtime'
import type {
  GetProLayoutStoreState,
  SetProLayoutStoreState,
} from './types'
import { buildUrlForTab, normalizeHash, normalizeSearchParams, parseUrl } from './url'
import type { ProLayoutCloseOptions } from '../interface'

/** 根据首个 pathname 处理根路径、目录路由和无页面状态。 */
export function bootstrapByPathname(
  set: SetProLayoutStoreState,
  get: GetProLayoutStoreState,
  data: { pathname: string },
) {
  const state = get()

  if (data.pathname === '/') {
    // 根路径自身不创建页签。Registry.defaultRoute 已经校验过存在性、页面类型和权限；
    // `/` 仅表示当前没有任何可访问页面，不能触发无意义的自导航。
    const fallback = state.registry.defaultRoute
    if (fallback !== '/') {
      state.jumpTo(fallback)
      return
    }

    set({ activeTabKey: null, activePage: null })
    return
  }

  // 已经是可展示叶子页时，真正的页签创建由随后 location 同步统一完成，避免这里
  // 导航或建页后又被 Router 的 location effect 重复处理。
  const leaf = state.resolveLeafRoute(data.pathname)
  if (state.registry.isPageRoute(leaf?.route))
    return

  // 目录地址跳到权限范围内第一个可访问子页面；没有子页面的未知/空目录清空活动项。
  const child = state.registry.findFirstAccessibleChild(data.pathname)
  if (child) {
    state.jumpTo(child)
    return
  }

  set({ activeTabKey: null, activePage: null })
}

/** 宿主路由 pathname 变化后，创建或激活对应的页面和页签。 */
export function syncByPathname(
  set: SetProLayoutStoreState,
  get: GetProLayoutStoreState,
  pathname: string,
) {
  // 根路径由 bootstrapByPathname 负责默认页解析，空值则代表 Router 尚未准备完成。
  if (!pathname || pathname === '/')
    return

  const state = get()
  const leaf = state.resolveLeafRoute(pathname, true)
  // 权限索引不能解析的页面不得创建或激活业务实例。若它已有保留页签，只保留页签
  // 选中身份，activePage 清空后由渲染层按完整索引区分 403 与 404。
  if (!state.registry.isPageRoute(leaf?.route)) {
    const fullTabKey = state.getTabKey(pathname)
    const activeTabKey =
      fullTabKey && state.tabs.some((tab) => tab.key === fullTabKey)
        ? fullTabKey
        : null

    set((previous) => {
      if (previous.activeTabKey === activeTabKey && previous.activePage === null)
        return previous
      return { activeTabKey, activePage: null }
    })
    return
  }

  ensureTabStateForPathname(set, get, pathname, { ensurePage: true })
}

/**
 * 打开字符串 URL 或结构化 URL。
 *
 * 结构化参数中 undefined 表示“调用方没有指定，恢复页签缓存”；null 和空字符串
 * 表示“显式清空”。字符串 URL 被视为完整目标，因此没有 search/hash 时会清空旧值。
 */
export function jumpTo(
  set: SetProLayoutStoreState,
  get: GetProLayoutStoreState,
  params:
    | string
    | { pathname: string, searchParams?: string | null, hash?: string | null },
) {
  const state = get()
  // Store 可以早于 Router Adapter 创建；navigate 尚未注入时不提前修改活动页签状态。
  if (!state.navigate)
    return

  // 字符串被视为完整 URL，统一拆出 pathname/search/hash；结构化参数保留 undefined，
  // 以便后面区分“恢复缓存”和“显式清空”。
  const parsedUrl = typeof params === 'string' ? parseUrl(params) : null
  let pathname = typeof params === 'string' ? parsedUrl!.pathname : params.pathname
  const searchParams =
    typeof params === 'string' ? parsedUrl!.searchParams.toString() : params.searchParams
  const hash = typeof params === 'string' ? parsedUrl!.hash : params.hash

  const targetLeaf = state.resolveLeafRoute(pathname, true)
  if (targetLeaf && !state.registry.isPageRoute(targetLeaf.route)) {
    // 目录判断和真实参数还原统一交给 Registry，因此动态目录和带末尾斜杠的目录
    // 与精确注册路径具有相同导航语义。没有可具体化子页时继续保留原地址。
    pathname = state.registry.findFirstAccessibleChild(pathname) || pathname
  }

  const tabKey = state.getTabKey(pathname)
  if (!tabKey)
    return

  const authorizedLeaf = state.resolveLeafRoute(pathname, true)
  const isAuthorizedPage = state.registry.isPageRoute(authorizedLeaf?.route)

  if (!isAuthorizedPage) {
    // 失权页签仍可导航到原 URL 展示 403，但不能重新创建页面实例。不存在旧页签时
    // 不补建一个新的受限页签，当前活动页签也应清空，避免继续高亮其它业务页面。
    const activeTabKey = state.tabs.some((tab) => tab.key === tabKey)
      ? tabKey
      : null
    set({ activeTabKey, activePage: null })

    const latest = get()
    const realPath = latest.cache.getParamsPathByTabKey(tabKey) || pathname
    latest.navigate?.(
      buildUrlForTab({
        pathname: realPath,
        searchParams: resolveSearchParams(
          searchParams,
          latest.cache.getSearchParamsForTabKey(tabKey),
        ),
        hash: resolveHash(hash, latest.cache.getHashForTabKey(tabKey)),
      }),
    )
    return
  }

  // jumpTo 只在已有 KeepAlive 页面时立即切换 activePage；新页面仍交给 Router location
  // 生效后的 syncByPathname 创建，避免导航尚未完成就提前渲染目标路由。
  const shouldActivateCachedPage =
    state.keepAlive !== false && state.pages.some((page) => page.key === tabKey)
  const ensuredTabKey = ensureTabStateForPathname(set, get, pathname, {
    ensurePage: shouldActivateCachedPage,
  })
  if (!ensuredTabKey)
    return

  // ensureTabStateForPathname 可能更新 Cache，因此重新读取最新状态，不沿用函数入口快照。
  const latest = get()
  // 共享动态页签优先恢复 Cache 中最后访问的真实 pathname；首次打开时使用传入地址。
  const realPath = latest.cache.getParamsPathByTabKey(tabKey) || pathname

  latest.navigate?.(
    buildUrlForTab({
      pathname: realPath,
      searchParams: resolveSearchParams(
        searchParams,
        latest.cache.getSearchParamsForTabKey(tabKey),
      ),
      hash: resolveHash(hash, latest.cache.getHashForTabKey(tabKey)),
    }),
  )
}

/**
 * 优先在当前页签内替换地址；pathname 真正变化时转交 jumpTo。
 *
 * replace 导航不会新增浏览器历史记录，适合筛选条件和锚点变化。search/hash 的
 * undefined、null 和空字符串语义与 jumpTo 完全一致。
 */
export function smartNavigate(
  get: GetProLayoutStoreState,
  data: { pathname?: string, searchParams?: string | null, hash?: string | null },
) {
  const state = get()
  if (!state.navigate)
    return

  // activePage 是当前实际渲染页面，activeTabKey 是 UI 选中页签；过渡阶段优先以前者
  // 定位地址，找不到页面实例时再从共享动态页签 Cache 恢复真实 pathname。
  const activeKey = state.activePage || state.activeTabKey
  const activePage = activeKey
    ? state.pages.find((page) => page.key === activeKey)
    : undefined
  const activePathname =
    activePage?.pathname ||
    (activeKey ? state.cache.getParamsPathByTabKey(activeKey) || activeKey : '')

  if (data.pathname && activePathname && data.pathname !== activePathname) {
    // pathname 改变意味着可能切换页签或路由身份，必须走完整 jumpTo 流程；只有同页
    // search/hash 更新才可以直接 replace 当前历史记录。
    state.jumpTo({
      pathname: data.pathname,
      searchParams: data.searchParams,
      hash: data.hash,
    })
    return
  }

  const pathname = data.pathname || activePathname
  if (!pathname)
    return

  const tabKey = state.getTabKey(pathname) || activeKey
  if (!tabKey)
    return

  // replace 只更新 Router location。页面 effect 随后会把最新 search/hash 写入 Cache，
  // 此处读取 Cache 仅用于补全调用方未提供（undefined）的部分。
  state.navigate(
    {
      pathname,
      search: resolveSearchParams(
        data.searchParams,
        state.cache.getSearchParamsForTabKey(tabKey),
      ),
      hash: resolveHash(data.hash, state.cache.getHashForTabKey(tabKey)),
    },
    { replace: true },
  )
}

/** 关闭旧页签成功后解析并打开新 URL。 */
export async function closeThisTabOpenNewOne(
  set: SetProLayoutStoreState,
  get: GetProLayoutStoreState,
  runtime: ProLayoutStoreRuntime,
  data: { oldPath: string, newPath: string },
  options?: ProLayoutCloseOptions,
) {
  // oldPath 可能包含 query/hash，关闭身份只由 pathname 对应的 tabKey 决定。
  const oldTabKey = get().getTabKey(parseUrl(data.oldPath).pathname)
  if (oldTabKey && get().tabs.some((tab) => tab.key === oldTabKey)) {
    // 只有旧页签确实存在才执行关闭守卫；守卫拒绝时不能继续打开新页面。
    const closed = await closeTab(set, get, runtime, oldTabKey, options)
    if (!closed)
      return false
  }

  // 新地址按完整 URL 解析后交给 jumpTo，确保 query/hash 的“显式值”语义不丢失。
  const url = parseUrl(data.newPath)
  get().jumpTo({
    pathname: url.pathname,
    searchParams: url.searchParams.toString(),
    hash: url.hash,
  })
  return true
}

/** undefined 恢复缓存；其它值先规范化，因此 null/空字符串都会显式清空。 */
function resolveSearchParams(
  searchParams: string | null | undefined,
  cachedSearchParams: string,
) {
  return searchParams === undefined
    ? cachedSearchParams
    : normalizeSearchParams(searchParams)
}

/** undefined 恢复缓存；其它值先规范化，因此 null/空字符串都会显式清空。 */
function resolveHash(hash: string | null | undefined, cachedHash: string) {
  return hash === undefined ? cachedHash : normalizeHash(hash)
}

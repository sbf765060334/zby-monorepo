import { closeTab, ensureTabStateForPathname } from './tabs'
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
  data: { pathname: string, defaultRoute?: string | null },
) {
  const state = get()

  if (data.pathname === '/') {
    const fallback = data.defaultRoute || state.registry.findFirstAccessiblePath()
    if (fallback) {
      state.jumpTo(fallback)
      return
    }

    set({ activeTabKey: null, activePage: null })
    return
  }

  const leaf = state.resolveLeafRoute(data.pathname)
  if (state.registry.isPageRoute(leaf?.route))
    return

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
  if (!pathname || pathname === '/')
    return

  const state = get()
  const leaf = state.resolveLeafRoute(pathname)
  if (!state.registry.isPageRoute(leaf?.route))
    return

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
  if (!state.navigate)
    return

  const parsedUrl = typeof params === 'string' ? parseUrl(params) : null
  let pathname = typeof params === 'string' ? parsedUrl!.pathname : params.pathname
  const searchParams =
    typeof params === 'string' ? parsedUrl!.searchParams.toString() : params.searchParams
  const hash = typeof params === 'string' ? parsedUrl!.hash : params.hash

  const exactRoute = state.routeMapping[pathname]
  if (
    exactRoute &&
    !state.registry.isPageRoute(exactRoute) &&
    Array.isArray(exactRoute.routes) &&
    exactRoute.routes.length > 0
  ) {
    pathname = state.registry.findFirstAccessibleChild(pathname) || pathname
  }

  const tabKey = state.getTabKey(pathname)
  if (!tabKey)
    return

  const shouldActivateCachedPage =
    state.keepAlive !== false && state.pages.some((page) => page.key === tabKey)
  const ensuredTabKey = ensureTabStateForPathname(set, get, pathname, {
    ensurePage: shouldActivateCachedPage,
  })
  if (!ensuredTabKey)
    return

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

  const activeKey = state.activePage || state.activeTabKey
  const activePage = activeKey
    ? state.pages.find((page) => page.key === activeKey)
    : undefined
  const activePathname =
    activePage?.pathname ||
    (activeKey ? state.cache.getParamsPathByTabKey(activeKey) || activeKey : '')

  if (data.pathname && activePathname && data.pathname !== activePathname) {
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
  data: { oldPath: string, newPath: string },
  options?: ProLayoutCloseOptions,
) {
  const oldTabKey = get().getTabKey(parseUrl(data.oldPath).pathname)
  if (oldTabKey && get().tabs.some((tab) => tab.key === oldTabKey)) {
    const closed = await closeTab(set, get, oldTabKey, options)
    if (!closed)
      return false
  }

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

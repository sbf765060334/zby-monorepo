/**
 * 文件职责：读取和替换当前 KeepAlive 页面自己的查询串。
 *
 * React Router 的 useSearchParams 绑定浏览器当前地址。缓存页调用它的 setter 会改掉
 * 正在显示的页签。这里的 setter 只替换这一页的 search。
 */
import { useCallback, useMemo, useRef } from 'react'

import { useRouterPageSelector } from './RouterPageProvider'

/** setPageSearchParams 接受的查询串初始值，形状对齐 URLSearchParams 的常见入参。 */
export type PageSearchParamsInit =
  | string
  | URLSearchParams
  | Record<string, string | readonly string[]>
  | Array<[string, string]>

/** 替换当前页面查询串。默认 replace；缓存页不会改浏览器地址，因此忽略 replace。 */
export type SetPageSearchParams = (
  next: PageSearchParamsInit | ((current: URLSearchParams) => PageSearchParamsInit),
  options?: { replace?: boolean },
) => void

/**
 * 读取并替换当前页面自己的查询串。
 *
 * 返回值和 `useSearchParams()` 一样，是 `[URLSearchParams, setter]`。必须在
 * `RouterPageProvider` 内调用。
 */
export function usePageSearchParams(): readonly [URLSearchParams, SetPageSearchParams] {
  const search = useRouterPageSelector((page) => page.location?.search ?? '')
  const tabKey = useRouterPageSelector((page) => page.tabKey)
  const router = useRouterPageSelector((page) => page.router)
  const searchRef = useRef(search)
  searchRef.current = search
  const params = useMemo(
    () => new URLSearchParams(stripSearchPrefix(search)),
    [search],
  )
  const setSearchParams = useCallback<SetPageSearchParams>((next, options) => {
    const current = new URLSearchParams(stripSearchPrefix(searchRef.current))
    const init = typeof next === 'function' ? next(current) : next
    const searchParams = toSearchString(init)
    router.replacePageSearch(tabKey, searchParams, options)
    // 渲染可能还停在旧 search。先记下这次结果，同一次点击里的函数式更新才能叠加上去。
    searchRef.current = searchParams ? `?${searchParams}` : ''
  }, [router, tabKey])

  return [params, setSearchParams]
}

/** URLSearchParams 不把前导 `?` 当成查询串起始符，页面 location 却总是带这个前缀。 */
function stripSearchPrefix(search: string) {
  return search.startsWith('?') ? search.slice(1) : search
}

/** 把 setter 入参收成不含 `?` 的查询串。对象和数组的序列化方式与 URLSearchParams 一致。 */
function toSearchString(init: PageSearchParamsInit) {
  if (typeof init === 'string')
    // 走 URLSearchParams，避免字符串里的 # 被浏览器当成 hash，也让读回的值和写入一致。
    return new URLSearchParams(stripSearchPrefix(init)).toString()
  if (init instanceof URLSearchParams)
    return init.toString()
  if (Array.isArray(init))
    return new URLSearchParams(init).toString()

  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(init)) {
    // readonly string[] 不能被 Array.isArray 收成 string，所以按 typeof 区分。
    if (typeof value === 'string') {
      params.set(key, value)
      continue
    }
    for (const item of value)
      params.append(key, item)
  }
  return params.toString()
}

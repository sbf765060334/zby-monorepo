/**
 * 文件职责：从当前 KeepAlive 页面自己的 pathname 和叶子路由 pattern 解析路径参数。
 *
 * 页面不在 React Router 的 `<Route>` 匹配结果里，所以不能用 `useParams`。这个 Hook
 * 只读页面 Context 里已经确定的地址；缓存中的其它页面继续保留自己的参数。
 */
import { readRouteParams } from '../registry/matcher'
import type { RouterRoute } from '../types'
import {
  useRouterPageSelector,
  type RouterPageContextValue,
} from './RouterPageProvider'

/** 与 React Router `useParams` 相同形状的路径参数。值都是字符串。 */
export type PageParams<Key extends string = string> = {
  readonly [key in Key]: string | undefined
}

/**
 * 读取当前页面 pathname 上的路径参数。
 *
 * 用法与 `useParams()` 相同，例如 `const { id } = usePageParams()`。必须在
 * `RouterPageProvider` 内调用。查询串不属于这里。
 */
export function usePageParams<
  Key extends string = string,
>(): PageParams<Key> {
  return useRouterPageSelector(
    selectPageParams,
    arePageParamsEqual,
  ) as PageParams<Key>
}

/** 用叶子路由的注册 pattern 解析这一页最后确认的真实 pathname。 */
function selectPageParams(
  page: RouterPageContextValue<RouterRoute>,
): PageParams {
  const leaf = page.currentRoutes[page.currentRoutes.length - 1]
  return readRouteParams(leaf?.route.path ?? '', page.pathname)
}

/** 参数名和值都没变时复用上次对象，避免 search/hash 更新带动页面重渲染。 */
function arePageParamsEqual(left: PageParams, right: PageParams) {
  const leftKeys = Object.keys(left)
  if (leftKeys.length !== Object.keys(right).length)
    return false

  return leftKeys.every((key) => Object.is(left[key], right[key]))
}

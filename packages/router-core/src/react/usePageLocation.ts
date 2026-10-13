/**
 * 文件职责：读取当前 KeepAlive 页面自己的 pathname、search 和 hash。
 *
 * React Router 的 useLocation 只有浏览器当前这一条地址。缓存页如果调用它，会看到
 * 正在显示的页签。这个 Hook 只读页面 Context 里已经确认的地址。
 */
import type { RouterRoute } from '../types'
import {
  useRouterPageSelector,
  type RouterPageContextValue,
} from './RouterPageProvider'

/** 当前页面自己的地址。没有浏览器历史 state，也没有 location.key。 */
export interface PageLocation {
  /** 这一页最后确认的真实 pathname。 */
  readonly pathname: string
  /** 查询串。非空时以 `?` 开头；还没有地址快照时为空字符串。 */
  readonly search: string
  /** 锚点。非空时以 `#` 开头；还没有地址快照时为空字符串。 */
  readonly hash: string
}

/**
 * 读取当前页面自己的地址。
 *
 * 用法对应 `useLocation()` 的 pathname、search、hash。必须在 `RouterPageProvider` 内调用。
 */
export function usePageLocation(): PageLocation {
  return useRouterPageSelector(selectPageLocation, arePageLocationsEqual)
}

/**
 * pathname 以页面实例为准。location 只补充 search/hash，避免共享动态页签刚换
 * pathname、地址快照还没跟上时，这里仍返回上一页的路径。
 */
function selectPageLocation(
  page: RouterPageContextValue<RouterRoute>,
): PageLocation {
  return {
    pathname: page.pathname,
    search: page.location?.search ?? '',
    hash: page.location?.hash ?? '',
  }
}

/** 三段都没变时复用上次对象，避免页面 Context 的其它字段带动重渲染。 */
function arePageLocationsEqual(left: PageLocation, right: PageLocation) {
  return left.pathname === right.pathname &&
    left.search === right.search &&
    left.hash === right.hash
}

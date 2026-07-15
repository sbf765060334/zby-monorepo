/** ProLayout 关心的宿主路由位置。 */
export interface ProLayoutLocation {
  /** 当前地址的 pathname 部分。 */
  pathname: string
  /** 当前地址包含 `?` 前缀的 search 部分，没有查询参数时为空字符串。 */
  search: string
  /** 当前地址包含 `#` 前缀的 hash 部分，没有锚点时为空字符串。 */
  hash: string
}

/** ProLayout 可以交给宿主路由执行的导航目标。 */
export type ProLayoutNavigateTarget =
  | string
  | {
    /** 目标地址的 pathname 部分。 */
    pathname: string
    /** 目标地址的 search 部分，可以包含或省略 `?` 前缀。 */
    search?: string
    /** 目标地址的 hash 部分，可以包含或省略 `#` 前缀。 */
    hash?: string
  }

/** 与宿主路由无关的通用导航选项。 */
export interface ProLayoutNavigateOptions {
  /** 是否替换当前历史记录，而不是新增一条历史记录。 */
  replace?: boolean
}

export type ProLayoutNavigate = (
  target: ProLayoutNavigateTarget,
  options?: ProLayoutNavigateOptions,
) => void

/**
 * ProLayout 与具体路由库之间的最小适配器。
 *
 * ZBY 当前只迁移 React Router Adapter，但核心层不直接依赖 react-router-dom。
 */
export interface ProLayoutRouterAdapter {
  /** 宿主路由提供的当前地址。 */
  location: ProLayoutLocation
  /** 由宿主路由实现的导航函数。 */
  navigate: ProLayoutNavigate
  /** 根据路由路径生成可用于链接元素的 href。 */
  createHref?: (path: string) => string
}

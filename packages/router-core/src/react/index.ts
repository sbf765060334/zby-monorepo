/** React 树与既有 RouterCore 实例之间的 Provider 和状态订阅 Hook。 */
export {
  RouterCoreProvider,
  useRouterCore,
  useRouterCoreSelector,
} from './RouterCoreProvider'
export type { RouterCoreProviderProps } from './RouterCoreProvider'

/** 单个 KeepAlive 页面实例的 Context、生命周期与 location 订阅能力。 */
export {
  RouterPageProvider,
  useRouterPage,
  useRouterPageSelector,
} from './RouterPageProvider'
export type {
  RouterPageContextValue,
  RouterPageProviderProps,
} from './RouterPageProvider'

/** selector 比较函数的公共类型。 */
export type { RouterSelectorEqualityFn } from './useStoreSelector'

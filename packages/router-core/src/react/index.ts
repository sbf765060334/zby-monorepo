/**
 * 文件职责：定义 `@zby/router-core/react` 入口公开的 Provider、Hook 和相关类型。
 *
 * 这个文件只做重新导出，真正的 Context 生命周期和订阅逻辑在同目录其它文件中。
 */

/** React 树与既有 RouterCore 实例之间的 Provider 和状态订阅 Hook。 */
export {
  RouterCoreProvider,
  useRouterCore,
  useRouterCoreSelector,
} from './RouterCoreProvider'
export type { RouterCoreProviderProps } from './RouterCoreProvider'

/** 把标题描述符解释成文本的中性 Context；core 自身不依赖任何 i18n 库。 */
export {
  RouterTitleProvider,
  useRouterTitle,
} from './RouterTitleProvider'
export type {
  RouterTitleContextValue,
  RouterTitleProviderProps,
} from './RouterTitleProvider'

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

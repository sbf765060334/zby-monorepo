/**
 * 文件职责：定义 `@zby/router-core/react-router` 入口公开的适配组件、Hook 和类型。
 *
 * 它只是稳定的导出清单，React Router 的绑定细节都在 Adapter 实现文件里。
 */

/** React Router 宿主绑定与 basename-aware 原生 href 能力。 */
export {
  RouterCoreReactRouterAdapter,
  useRouterCoreCreateHref,
} from './RouterCoreReactRouterAdapter'
export type {
  RouterCoreLocationSyncScheduler,
  RouterCoreReactRouterAdapterProps,
} from './RouterCoreReactRouterAdapter'

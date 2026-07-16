import { createContext, useContext } from 'react'
import { shallow } from 'zustand/shallow'

import type { StoreApi } from 'zustand/vanilla'

import type {
  ProLayoutBeforeCloseHook,
  ProLayoutCloseOptions,
  ProLayoutCurrentRoute,
  ProLayoutRoute,
} from '../interface'
import type { ProLayoutStoreState } from '../store'
import { useStoreSelector } from './useStoreSelector'

/** 页面业务可以从 ProLayout 读取的公共布局能力。 */
export interface ProLayoutContextValue {
  /** 宿主 Router 当前的真实 pathname。 */
  currentPathname: string
  /** 当前 pathname 对应的完整路由层级。 */
  currentRoutes: ProLayoutCurrentRoute[]
  /** 动态 pathname 对应的页面描述。 */
  pathnameDescriptionMap: Record<string, string>
  /** 打开目标地址，并按页签语义恢复 URL Cache。 */
  jumpTo: ProLayoutStoreState['jumpTo']
  /** 在当前页签内替换地址，或在 pathname 变化时打开目标页签。 */
  smartNavigate: ProLayoutStoreState['smartNavigate']
  /** 关闭旧页签成功后打开新地址。 */
  closeThisTabOpenNewOne: ProLayoutStoreState['closeThisTabOpenNewOne']
  /** 运行关闭守卫后关闭指定页签。 */
  closeTab: (key: string, options?: ProLayoutCloseOptions) => Promise<boolean>
  /** 合并动态 pathname 的页面描述。 */
  setPathnameDescription: (map: Record<string, string>) => void
  /** 更新指定页签标题。 */
  setTabLabel: (key: string, label: string) => void
  /** 为 pathname 对应的页签注册关闭前 Hook。 */
  addBeforeCloseHook: (handler: ProLayoutBeforeCloseHook, pathname: string) => void
  /** 清理指定或全部关闭前 Hook。 */
  clearBeforeCloseHook: (pathname: string, handler?: ProLayoutBeforeCloseHook) => void
  /** 在完整路由索引或权限索引中解析目标路由。 */
  resolveLeafRoute: (
    pathname: string,
    withinAuth?: boolean,
  ) => { routeKey: string, route: ProLayoutRoute } | null
  /** 获取 pathname 对应的路由层级。 */
  getCurrentRoutes: (pathname: string) => ProLayoutCurrentRoute[]
  /** 是否隐藏菜单和页签栏。 */
  noBar: boolean
  /** 是否展示面包屑。 */
  showBreadcrumb: boolean
  /** Header 高度。 */
  headerHeight: number
  /** 面包屑区域高度。 */
  breadcrumbHeight: number
}

/**
 * 只承载 vanilla Store 引用的 React Context。
 *
 * Context value 在 Store 整个生命周期中保持稳定；消费组件通过 selector 精确订阅
 * Store 字段，避免把完整状态对象作为普通 Context value 引起整棵页面树刷新。
 */
export const ProLayoutStoreContext = createContext<StoreApi<ProLayoutStoreState> | null>(
  null,
)

/** Provider 外调用公共 Hook 时返回的无副作用默认能力。 */
export const emptyProLayoutContext: ProLayoutContextValue = {
  currentPathname: '',
  currentRoutes: [],
  pathnameDescriptionMap: {},
  jumpTo: () => undefined,
  smartNavigate: () => undefined,
  closeThisTabOpenNewOne: async () => false,
  closeTab: async () => false,
  setPathnameDescription: () => undefined,
  setTabLabel: () => undefined,
  addBeforeCloseHook: () => undefined,
  clearBeforeCloseHook: () => undefined,
  resolveLeafRoute: () => null,
  getCurrentRoutes: () => [],
  noBar: false,
  showBreadcrumb: true,
  headerHeight: 0,
  breadcrumbHeight: 0,
}

/** 把不可变默认值包装成符合 useSyncExternalStore 契约的只读 Store。 */
export function createReadonlyStore<State>(state: State): StoreApi<State> {
  return {
    getState: () => state,
    getInitialState: () => state,
    setState: () => undefined,
    subscribe: () => () => undefined,
  } as StoreApi<State>
}

// 空 Store 只在 Provider 外提供安全默认值。类型断言不会进入真实 Store 或持久化流程。
const emptyProLayoutStore = createReadonlyStore(
  emptyProLayoutContext as unknown as ProLayoutStoreState,
)

/** 把内部 Store 投影为稳定、受控的公共 Context 契约。 */
const publicSelector = (state: ProLayoutStoreState): ProLayoutContextValue => ({
  currentPathname: state.currentPathname,
  currentRoutes: state.currentRoutes,
  pathnameDescriptionMap: state.pathnameDescriptionMap,
  jumpTo: state.jumpTo,
  smartNavigate: state.smartNavigate,
  closeThisTabOpenNewOne: state.closeThisTabOpenNewOne,
  closeTab: state.closeTab,
  setPathnameDescription: state.setPathnameDescription,
  setTabLabel: state.setTabLabel,
  addBeforeCloseHook: state.addBeforeCloseHook,
  clearBeforeCloseHook: state.clearBeforeCloseHook,
  resolveLeafRoute: state.resolveLeafRoute,
  getCurrentRoutes: state.getCurrentRoutes,
  noBar: state.noBar,
  showBreadcrumb: state.showBreadcrumb,
  headerHeight: state.headerHeight,
  breadcrumbHeight: state.breadcrumbHeight,
})

export function useProLayoutContext(): ProLayoutContextValue
export function useProLayoutContext<Selected>(
  selector: (state: ProLayoutContextValue) => Selected,
  equalityFn?: (left: Selected, right: Selected) => boolean,
): Selected
/** 读取完整公共布局能力，或通过 selector 只订阅需要的部分。 */
export function useProLayoutContext<Selected>(
  selector?: (state: ProLayoutContextValue) => Selected,
  equalityFn?: (left: Selected, right: Selected) => boolean,
) {
  const store = useContext(ProLayoutStoreContext) || emptyProLayoutStore
  const finalSelector: (state: ProLayoutStoreState) => unknown = selector
    ? (state) => selector(publicSelector(state))
    : publicSelector

  // 未传 selector 时 publicSelector 每次会创建新对象，默认 shallow 可以在公共字段
  // 都未变化时稳定结果；显式 selector 则默认使用 Object.is。
  return useStoreSelector(
    store,
    finalSelector,
    (selector ? equalityFn : shallow) as (left: unknown, right: unknown) => boolean,
  )
}

/** 内部组件直接选择完整 Store 字段，不扩大对外 Context 契约。 */
export function useProLayoutStoreSelector<Selected>(
  selector: (state: ProLayoutStoreState) => Selected,
  equalityFn?: (left: Selected, right: Selected) => boolean,
) {
  const store = useContext(ProLayoutStoreContext) || emptyProLayoutStore
  return useStoreSelector(store, selector, equalityFn)
}

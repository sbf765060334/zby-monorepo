import type { ProLayoutRouteRegistry } from '../route'
import type { ProLayoutStoreRuntime } from './runtime'
import type { ProLayoutStoreState } from './types'

export interface ProLayoutAuthorizationConvergence {
  /** 已移除无权限页面后的 KeepAlive 页面集合。 */
  pages: ProLayoutStoreState['pages']
  /** 活动页面失权时为 null，否则保持原活动页面。 */
  activePage: ProLayoutStoreState['activePage']
  /** 删除失权页面真实 pathname 后的动态描述映射。 */
  pathnameDescriptionMap: ProLayoutStoreState['pathnameDescriptionMap']
}

/**
 * 按新权限 Registry 销毁已经失权的业务页面实例及其私有运行时资源。
 *
 * 页签、固定、收藏和 URL Cache 是用户偏好，不在这里删除；当前 URL 可以继续停留
 * 在受限地址，由后续页面渲染层展示 403。pages 则代表真实业务组件实例，必须立即
 * 移除，防止 KeepAlive 或历史页签继续持有失权页面状态。
 *
 * 权限撤销不是用户主动关闭页签，因此不会执行 before-close Hook，也不会触发
 * afterTabClose。对应 Hook 和 emitter 直接注销，动态页面描述按真实 pathname 删除。
 */
export function removeUnauthorizedPageInstances(
  state: ProLayoutStoreState,
  registry: ProLayoutRouteRegistry,
  runtime: ProLayoutStoreRuntime,
): ProLayoutAuthorizationConvergence | null {
  const unauthorizedPages = state.pages.filter((page) => {
    const leaf = registry.resolveLeafRoute(page.pathname, { withinAuth: true })
    return !registry.isPageRoute(leaf?.route)
  })

  if (unauthorizedPages.length === 0)
    return null

  const unauthorizedKeys = new Set(unauthorizedPages.map((page) => page.key))
  const pathnameDescriptionMap = { ...state.pathnameDescriptionMap }

  unauthorizedPages.forEach((page) => {
    // runtime 不是 Zustand 状态，权限收敛时必须显式释放，不能等待未来关闭页签。
    runtime.pageLocationEmitterMap.delete(page.key)
    runtime.beforeTabCloseMap.delete(page.key)
  })

  // 共享动态页签可能先后访问多个真实 pathname，并为每个地址留下描述。不能只删除
  // page.pathname；应使用权限变化前的完整 Registry 把所有历史地址还原到 tabKey，
  // 一次清理失权页面实例拥有的全部描述。
  Object.keys(pathnameDescriptionMap).forEach((pathname) => {
    const tabKey = state.registry.getTabKey(pathname)
    if (tabKey && unauthorizedKeys.has(tabKey))
      delete pathnameDescriptionMap[pathname]
  })

  return {
    pages: state.pages.filter((page) => !unauthorizedKeys.has(page.key)),
    activePage:
      state.activePage && unauthorizedKeys.has(state.activePage)
        ? null
        : state.activePage,
    pathnameDescriptionMap,
  }
}

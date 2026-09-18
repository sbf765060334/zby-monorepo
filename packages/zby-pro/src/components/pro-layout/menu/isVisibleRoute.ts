import { isConcreteRoutePath } from '@zby/router-core'

import type { ProLayoutRoute } from '../types'

/**
 * 菜单统一可见性规则。
 *
 * `ignore` 拥有最高优先级；带 `:param` 或通配符的页面路径不能作为菜单入口。
 * 其余路由只要能直接打开具体页面、显示 prompt、跳转外链，或包含任意可见后代，
 * 就应保留在导航树中。递归判断可以避免渲染空目录。
 */
export function isVisibleRoute(route: ProLayoutRoute): boolean {
  if (route.ignore)
    return false
  if (route.prompt || route._blank)
    return true
  if (route.element && isConcreteRoutePath(route.path))
    return true
  return Boolean(route.routes?.some(isVisibleRoute))
}

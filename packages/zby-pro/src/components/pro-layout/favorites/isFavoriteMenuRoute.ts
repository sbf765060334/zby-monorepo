import { isConcreteRoutePath, type RouterCore } from '@zby/router-core'
import type { ProLayoutRoute } from '../types'

/** 只有普通静态页面菜单显示收藏入口；core 只负责校验注册页面路由。 */
export function isFavoriteMenuRoute(
  router: RouterCore<ProLayoutRoute>,
  route?: ProLayoutRoute | null,
): route is ProLayoutRoute {
  return Boolean(
    route &&
    !route.ignore &&
    !route.prompt &&
    isConcreteRoutePath(route.path) &&
    router.registry.isPageRoute(route),
  )
}

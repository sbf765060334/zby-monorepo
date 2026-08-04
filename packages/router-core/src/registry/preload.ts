/**
 * 文件职责：尝试提前加载路由页面资源，并把预加载失败限制在预加载流程内部。
 *
 * 预加载只是性能优化，失败不应阻止用户随后正常导航，所以无论 preload 是同步抛错
 * 还是返回被拒绝的 Promise，本文件都会安全吞掉该错误。
 */
import type { RouterRoute } from '../types'

/** 触发路由资源预加载，并隔离同步 throw 与异步 rejection。 */
export function preloadRoute(route?: RouterRoute | null): void {
  // 路由对象自己声明 preload 时优先使用，这是最直接也最明确的预加载入口。
  const directPreload = route?.preload
  if (typeof directPreload === 'function') {
    void Promise.resolve()
      .then(() => directPreload())
      .catch(() => undefined)
    return
  }

  // 某些懒加载组件把 preload 挂在 element 上；没有路由级入口时再兼容这种写法。
  const element = route?.element
  if (
    (typeof element === 'function' || typeof element === 'object') &&
    element !== null &&
    'preload' in element &&
    typeof element.preload === 'function'
  ) {
    const elementPreload = element.preload
    void Promise.resolve()
      .then(() => elementPreload.call(element))
      .catch(() => undefined)
  }
}

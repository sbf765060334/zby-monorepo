import type { RouterRoute } from '../types'

/** 触发路由资源预加载，并隔离同步 throw 与异步 rejection。 */
export function preloadRoute(route?: RouterRoute | null): void {
  const directPreload = route?.preload
  if (typeof directPreload === 'function') {
    void Promise.resolve()
      .then(() => directPreload())
      .catch(() => undefined)
    return
  }

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

/**
 * ProLayout 页面资源预加载工具。
 *
 * 该模块只负责找到路由组件并触发组件自行提供的 preload 方法，不决定何时
 * 触发。菜单 hover、focus 和页签预加载等交互层会在后续模块中调用这里。
 */
import type { ProLayoutRoute } from '../interface'
import type { ProLayoutRouteRegistry } from './registry'

/**
 * 页签预加载实际需要的最小 Cache 契约。
 *
 * 这里只依赖参数路径恢复能力，避免路由模块反向依赖完整的 ProLayoutCache
 * 实现，也允许后续测试传入简单对象替身。
 */
interface ProLayoutTabPathCache {
  /**
   * 根据页签 key 获取参数路由最后一次使用的真实 pathname；没有缓存时返回空串。
   */
  getParamsPathByTabKey: (tabKey: string) => string
}

/** ProLayout 预加载逻辑关心的页面组件最小结构。 */
interface PreloadableRouteComponent {
  /**
   * 在真正导航到页面前预加载页面资源；既可以同步完成，也可以返回 Promise。
   */
  preload?: () => void | Promise<void>
}

/**
 * 在 hover、focus 等推测性预加载场景调用页面组件提供的 preload 方法。
 *
 * 没有 preload 的普通组件会被直接忽略。Promise rejection 会被静默处理，避免
 * 预加载失败打断用户当前交互；真正导航到页面时仍由正常加载流程处理错误。
 *
 * 当前表达式会先执行 preload 再交给 Promise.resolve，因此只会吞掉异步
 * rejection，同步 throw 仍会向调用方传播。这是当前既有行为，不应误认为
 * 所有形式的异常都已经被捕获。
 */
export function preloadRouteElement(route: ProLayoutRoute) {
  // route.element 也允许是 ReactElement；没有 preload 属性时读取结果为 undefined。
  const preload = (route.element as PreloadableRouteComponent | undefined)?.preload

  // Promise.resolve 同时兼容返回 void 和返回 Promise 的 preload 实现。
  if (typeof preload === 'function')
    void Promise.resolve(preload()).catch(() => undefined)
}

/**
 * 根据页签 key 解析真实路由并预加载对应页面组件。
 *
 * 普通静态页签可以直接用 tabKey 查询；共享页签的参数路由需要先从 Cache
 * 恢复最近一次真实 pathname，例如把 `/projects/:projectId` 恢复为
 * `/projects/42`，再交给 Registry 找到对应组件。
 */
export function preloadTabRoute(
  tabKey: string,
  registry: ProLayoutRouteRegistry,
  cache: ProLayoutTabPathCache,
) {
  // Cache 没有记录真实参数路径时，静态路由或独立页签直接回退使用 tabKey。
  const pathname = cache.getParamsPathByTabKey(tabKey) || tabKey
  const leaf = registry.resolveLeafRoute(pathname)
  if (!leaf?.route)
    return

  // 统一复用组件级预加载入口及其失败处理语义。
  preloadRouteElement(leaf.route)
}

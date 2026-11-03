/**
 * 文件职责：创建可直接放进 route.element 的懒页面，并让 chunk 加载失败后仍能重试。
 *
 * React.lazy 会把拒绝永久记在那一个 lazy 实例上，再次挂载也不会重新调用 loader。
 * 路由上的组件引用又必须稳定，KeepAlive 和错误边界都用它识别页面。因此对外返回的
 * 函数引用不变，只在闭包里替换内部的 LazyComponent。
 *
 * 请求缓存和实例是否报废是两件事。modulePromise 失败就清空，后续 preload 或渲染
 * 可以重新请求。lazyRejected 只在当前 lazy factory 读到这次拒绝时置位；preload
 * 单独失败，或错误页还在时另起一次请求，都不能清掉它。
 */
import { createElement, lazy } from 'react'
import type { ComponentType } from 'react'

export interface ProLayoutLazyPageModule {
  default: ComponentType<Record<string, never>>
}

export type ProLayoutLazyPageLoader = () => Promise<ProLayoutLazyPageModule>

export type ProLayoutLazyPage = ComponentType<Record<string, never>> & {
  preload: () => Promise<void>
}

const lazyPageResetters = new WeakMap<object, () => void>()

/**
 * 错误边界重试时，为已经缓存拒绝结果的 lazy 实例换一个新的 React.lazy。
 *
 * element 不一定来自 lazyPage。重置函数放在 WeakMap 里，找不到时保持空操作，
 * 也不把恢复细节混进组件公开的 preload 形状。
 */
export function resetLazyPage(component: unknown) {
  if (
    (typeof component === 'function' || typeof component === 'object') &&
    component !== null
  ) {
    lazyPageResetters.get(component)?.()
  }
}

/** 创建可被 ProLayout 渲染的懒页面组件；首次进入时才加载模块。 */
export function lazyPage(
  loader: ProLayoutLazyPageLoader,
): ProLayoutLazyPage {
  /** 进行中的或已成功的模块请求。失败后清空，以便下一次重新请求。 */
  let modulePromise: Promise<ProLayoutLazyPageModule> | undefined
  /** 当前 LazyComponent 已缓存拒绝。只有换掉该实例时才清掉。 */
  let lazyRejected = false
  /** 当前 modulePromise 是否已被现在这份 lazy factory 读取。 */
  let currentPromiseSeenByLazy = false
  let LazyComponent = lazy(loadForRender)

  function load() {
    if (modulePromise)
      return modulePromise

    // 新请求还没有被任何 lazy factory 读过。已经报废的旧实例不会再进入这里。
    currentPromiseSeenByLazy = false
    const pendingPromise: Promise<ProLayoutLazyPageModule> = Promise.resolve()
      .then(loader)
      .catch((error: unknown) => {
        if (modulePromise === pendingPromise) {
          modulePromise = undefined
          // 只能置位。后一次没人读过的失败，不能把已经报废的实例洗白。
          if (currentPromiseSeenByLazy)
            lazyRejected = true
        }
        throw error
      })

    modulePromise = pendingPromise
    return modulePromise
  }

  /**
   * 只给 React.lazy 使用的 factory。
   *
   * preload 走 load()，不会把一次尚未渲染的失败记成实例报废。同步抛错被
   * Promise.resolve().then 推迟到微任务，所以这里可以先于 catch 标上已读。
   */
  function loadForRender() {
    const pendingPromise = load()
    currentPromiseSeenByLazy = true
    return pendingPromise
  }

  function replaceRejectedLazy() {
    // 健康实例已经 Resolved。换掉它会让渲染错误的重试再 suspend 一帧。
    if (!lazyRejected)
      return

    lazyRejected = false
    currentPromiseSeenByLazy = false
    LazyComponent = lazy(loadForRender)
  }

  const Component: ProLayoutLazyPage = Object.assign(
    // 每次渲染读取闭包里的当前实例，重试替换后下一次渲染才用到新的 lazy。
    () => createElement(LazyComponent),
    {
      // 与渲染共用 modulePromise，避免预取和首次进入各打一次请求。
      preload: () => load().then(() => undefined),
    },
  )
  lazyPageResetters.set(Component, replaceRejectedLazy)
  return Component
}

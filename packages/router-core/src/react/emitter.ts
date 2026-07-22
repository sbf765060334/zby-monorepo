import { useLayoutEffect, useRef } from 'react'

/**
 * React 页面可以订阅的同步事件流。
 *
 * 事件流只向页面公开订阅能力；emit 保留在 Provider 内部，避免业务代码伪造页面显示
 * 状态或宿主 location。回调始终使用最近一次 render 的引用，订阅本身不会反复重建。
 */
export interface RouterReactEvent<Payload> {
  /** 在当前页面组件挂载期间订阅事件，组件卸载时自动取消。 */
  useSubscription: (callback: (payload: Payload) => void) => void
}

/** Provider 内部使用的可发布事件流。 */
export interface RouterReactEmitter<Payload> extends RouterReactEvent<Payload> {
  /** 同步通知当前全部订阅者。 */
  emit: (payload: Payload) => void
}

/**
 * 创建与单个页面实例同生命周期的事件流。
 *
 * 使用 layout effect 注册是为了让页面子树先完成订阅，再由外层 RouterPageProvider
 * 发布首次 lifecycle/location，避免首次挂载只能收到后续变化。
 */
export function createRouterReactEmitter<Payload>(): RouterReactEmitter<Payload> {
  const subscriptions = new Set<(payload: Payload) => void>()

  return {
    emit(payload) {
      // 使用订阅快照，避免回调执行期间增删订阅者而改变本轮遍历结果。
      Array.from(subscriptions).forEach((subscription) => subscription(payload))
    },
    useSubscription(callback) {
      const callbackRef = useRef(callback)
      callbackRef.current = callback

      useLayoutEffect(() => {
        const subscription = (payload: Payload) => callbackRef.current(payload)
        subscriptions.add(subscription)

        return () => {
          subscriptions.delete(subscription)
        }
      }, [])
    },
  }
}

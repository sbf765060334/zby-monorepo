import { useLayoutEffect, useRef } from 'react'

import type { ProLayoutEmitter } from '../interface'

/**
 * 创建与单个页面实例同生命周期的同步事件流。
 *
 * `useSubscription` 使用 layout effect 注册监听器，确保页面订阅早于外层
 * LocationCacheEffects 的被动 effect 发布首次 location。回调引用在每次渲染时更新，
 * 订阅本身不需要反复注销和重建。
 */
export function createProLayoutEmitter<Payload>(): ProLayoutEmitter<Payload> {
  const subscriptions = new Set<(payload: Payload) => void>()

  return {
    emit: (payload) => {
      // 使用当前订阅快照，避免回调在发布过程中注销自己时影响其它监听器。
      Array.from(subscriptions).forEach((subscription) => subscription(payload))
    },
    useSubscription: (callback) => {
      // 该方法本身是页面组件调用的 Hook；ref 让已注册监听器始终执行最新回调。
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

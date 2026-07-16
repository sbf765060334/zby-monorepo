import { useCallback, useRef, useSyncExternalStore } from 'react'

import type { StoreApi } from 'zustand/vanilla'

type EqualityFn<Selected> = (left: Selected, right: Selected) => boolean

const objectIs = Object.is as <Selected>(left: Selected, right: Selected) => boolean

/**
 * 使用 React 官方外部 Store 协议订阅 Zustand vanilla Store 的一个选择结果。
 *
 * Zustand 状态变化时，getSnapshot 会使用当前渲染传入的 selector 重新计算结果；
 * equalityFn 判定结果等价时继续返回旧引用，从而避免未消费字段变化导致组件刷新。
 * selector 即使只因组件 props 或闭包变量变化，也必须重新计算，不能仅凭 Store state
 * 引用相同就复用旧值，否则选择结果会一直陈旧到下一次 Store 更新。
 */
export function useStoreSelector<State, Selected>(
  store: StoreApi<State>,
  selector: (state: State) => Selected,
  equalityFn: EqualityFn<Selected> = objectIs,
) {
  const selectedRef = useRef<{
    state: State
    selector: (state: State) => Selected
    selected: Selected
  } | undefined>(undefined)

  const readSelectedState = useCallback(
    (state: State) => {
      const previous = selectedRef.current
      // useSyncExternalStore 要求同一个 Store snapshot 的读取结果保持引用稳定。只有
      // state 和 selector 身份都未变化时才能直接复用：前者保证底层数据相同，后者
      // 保证 selector 没有因为 props 或闭包变量变化而表达新的查询条件。
      if (previous?.state === state && previous.selector === selector)
        return previous.selected

      const selected = selector(state)

      // 等价结果继续返回旧引用，满足 useSyncExternalStore 对稳定 snapshot 的要求。
      if (previous && equalityFn(previous.selected, selected)) {
        selectedRef.current = {
          state,
          selector,
          selected: previous.selected,
        }
        return previous.selected
      }

      selectedRef.current = { state, selector, selected }
      return selected
    },
    [equalityFn, selector],
  )

  const getSnapshot = useCallback(
    () => readSelectedState(store.getState()),
    [readSelectedState, store],
  )
  const getServerSnapshot = useCallback(
    () => readSelectedState(store.getInitialState()),
    [readSelectedState, store],
  )

  return useSyncExternalStore(store.subscribe, getSnapshot, getServerSnapshot)
}

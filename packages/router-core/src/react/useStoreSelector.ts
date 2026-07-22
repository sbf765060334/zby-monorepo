import { useCallback, useRef, useSyncExternalStore } from 'react'

/** React 外部 Store 协议需要的最小只读接口。 */
interface ReadableStore<State> {
  /** 读取当前同步快照。 */
  getState: () => State
  /** 服务端渲染和 hydration 使用的初始快照。 */
  getInitialState: () => State
  /** 订阅状态变化，并返回取消订阅函数。 */
  subscribe: (listener: (state: State, previousState: State) => void) => () => void
}

/** selector 结果比较函数；返回 true 表示可以继续复用上一次结果。 */
export type RouterSelectorEqualityFn<Selected> = (
  left: Selected,
  right: Selected,
) => boolean

const objectIs = Object.is as <Selected>(left: Selected, right: Selected) => boolean

/**
 * 使用 React 官方外部 Store 协议订阅只读 Store 的一个选择结果。
 *
 * selector 可能捕获组件 props，因此即使 Store 快照没有变化，只要 selector 引用变化
 * 也必须重新计算。比较函数判定新旧结果等价时继续返回旧引用，既避免无关字段导致的
 * 重渲染，也满足 useSyncExternalStore 对同一快照返回值稳定性的要求。
 */
export function useStoreSelector<State, Selected>(
  store: ReadableStore<State>,
  selector: (state: State) => Selected,
  equalityFn: RouterSelectorEqualityFn<Selected> = objectIs,
) {
  const selectedRef = useRef<{
    store: ReadableStore<State>
    state: State
    selector: (state: State) => Selected
    selected: Selected
  } | undefined>(undefined)

  const readSelectedState = useCallback(
    (state: State) => {
      const previous = selectedRef.current

      // 只有底层快照和 selector 语义都没有变化时，才可以跳过本次计算。
      if (
        previous?.store === store &&
        previous.state === state &&
        previous.selector === selector
      ) {
        return previous.selected
      }

      const selected = selector(state)
      if (previous && equalityFn(previous.selected, selected)) {
        selectedRef.current = {
          store,
          state,
          selector,
          selected: previous.selected,
        }
        return previous.selected
      }

      selectedRef.current = { store, state, selector, selected }
      return selected
    },
    [equalityFn, selector, store],
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

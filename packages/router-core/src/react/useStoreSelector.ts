/**
 * 文件职责：把 Zustand 风格的只读 Store 接入 React，并只订阅 selector 选中的结果。
 *
 * 它相当于一个“小筛子”：Store 可以很大，但组件只拿自己关心的部分；结果没有真正变
 * 化时会复用旧引用，从而减少无关重渲染并满足 React 外部 Store 协议。
 */
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

  // 把“读取 Store + 执行 selector + 比较结果”收口成一个稳定函数供客户端和 SSR 复用。
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

  // 客户端渲染读取 Store 当前快照。
  const getSnapshot = useCallback(
    () => readSelectedState(store.getState()),
    [readSelectedState, store],
  )
  // SSR/hydration 读取 Store 创建时的初始快照，符合 useSyncExternalStore 协议。
  const getServerSnapshot = useCallback(
    () => readSelectedState(store.getInitialState()),
    [readSelectedState, store],
  )

  return useSyncExternalStore(store.subscribe, getSnapshot, getServerSnapshot)
}

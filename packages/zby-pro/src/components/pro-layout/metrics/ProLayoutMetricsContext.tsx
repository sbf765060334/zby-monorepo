import { createContext, memo, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createStore } from 'zustand/vanilla'

import type { ReactNode } from 'react'
import type { StoreApi } from 'zustand/vanilla'

/** Layout dimensions calculated from ProLayout tokens rather than DOM measurements. */
export interface ProLayoutMetrics {
  headerHeight: number
  breadcrumbHeight: number
  siderWidth: number
}

/** Public layout context fields used by business pages and content containers. */
export interface ProLayoutContextValue extends ProLayoutMetrics {
  noBar: boolean
  showBreadcrumb: boolean
}

export type ProLayoutSelectorEqualityFn<Selected> = (left: Selected, right: Selected) => boolean

const EMPTY_CONTEXT: ProLayoutContextValue = {
  headerHeight: 0,
  breadcrumbHeight: 0,
  siderWidth: 0,
  noBar: false,
  showBreadcrumb: true,
}

const EMPTY_STORE = createStore<ProLayoutContextValue>(() => EMPTY_CONTEXT)
const ProLayoutStoreContext = createContext<StoreApi<ProLayoutContextValue> | null>(null)
const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/** Synchronizes token and visibility inputs before the layout UI runs its layout effects. */
const SyncProLayoutContextEffects = memo((props: {
  store: StoreApi<ProLayoutContextValue>
  value: ProLayoutContextValue
}) => {
  const { store, value } = props

  useBrowserLayoutEffect(() => {
    const previous = store.getState()
    if (areContextValuesEqual(previous, value))
      return

    store.setState(value)
  }, [store, value])

  return null
})

SyncProLayoutContextEffects.displayName = 'SyncProLayoutContextEffects'

/** Keeps one layout store per ProLayout instance, matching Shuzhi's provider lifecycle. */
export function ProLayoutProvider(props: {
  children?: ReactNode
  value: ProLayoutContextValue
}) {
  const [store] = useState(() => createStore<ProLayoutContextValue>(() => props.value))

  return (
    <ProLayoutStoreContext.Provider value={store}>
      <SyncProLayoutContextEffects store={store} value={props.value} />
      {props.children}
    </ProLayoutStoreContext.Provider>
  )
}

/** Selects a stable slice of ProLayout state, like Shuzhi's context hook. */
export function useProLayoutContext(): ProLayoutContextValue
export function useProLayoutContext<Selected>(
  selector: (state: ProLayoutContextValue) => Selected,
  equalityFn?: ProLayoutSelectorEqualityFn<Selected>,
): Selected
export function useProLayoutContext<Selected>(
  selector?: (state: ProLayoutContextValue) => Selected,
  equalityFn: ProLayoutSelectorEqualityFn<Selected> = Object.is,
) {
  const store = useContext(ProLayoutStoreContext) || EMPTY_STORE
  const finalSelector = selector || (identity as (state: ProLayoutContextValue) => Selected)

  return useStoreSelector(store, finalSelector, equalityFn)
}

/** Returns the token-derived metrics for compatibility with the previous metrics hook. */
export function useProLayoutMetrics(): ProLayoutMetrics {
  return useProLayoutContext(selectMetrics, areMetricsEqual)
}

export function useProLayoutHeaderHeight() {
  return useProLayoutContext((state) => state.headerHeight)
}

export function useProLayoutBreadcrumbHeight() {
  return useProLayoutContext((state) => state.breadcrumbHeight)
}

export function useProLayoutSiderWidth() {
  return useProLayoutContext((state) => state.siderWidth)
}

function identity(state: ProLayoutContextValue) {
  return state
}

function selectMetrics(state: ProLayoutContextValue): ProLayoutMetrics {
  return {
    breadcrumbHeight: state.breadcrumbHeight,
    headerHeight: state.headerHeight,
    siderWidth: state.siderWidth,
  }
}

function areMetricsEqual(left: ProLayoutMetrics, right: ProLayoutMetrics) {
  return (
    left.headerHeight === right.headerHeight &&
    left.breadcrumbHeight === right.breadcrumbHeight &&
    left.siderWidth === right.siderWidth
  )
}

function areContextValuesEqual(left: ProLayoutContextValue, right: ProLayoutContextValue) {
  return (
    left.headerHeight === right.headerHeight &&
    left.breadcrumbHeight === right.breadcrumbHeight &&
    left.siderWidth === right.siderWidth &&
    left.noBar === right.noBar &&
    left.showBreadcrumb === right.showBreadcrumb
  )
}

function useStoreSelector<State, Selected>(
  store: StoreApi<State>,
  selector: (state: State) => Selected,
  equalityFn: ProLayoutSelectorEqualityFn<Selected>,
) {
  const selectedRef = useRef<{
    store: StoreApi<State>
    state: State
    selector: (state: State) => Selected
    selected: Selected
  }>()

  const readSelectedState = useCallback(
    (state: State) => {
      const previous = selectedRef.current
      if (
        previous?.store === store &&
        previous.state === state &&
        previous.selector === selector
      ) {
        return previous.selected
      }

      const selected = selector(state)
      if (previous && equalityFn(previous.selected, selected)) {
        selectedRef.current = { store, state, selector, selected: previous.selected }
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

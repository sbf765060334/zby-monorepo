import { createContext, memo, useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createStore } from 'zustand/vanilla'

import type { ReactNode } from 'react'
import type { StoreApi } from 'zustand/vanilla'
import type { UseThemeReturn } from '../theme/types'

/** Layout dimensions calculated from ProLayout tokens rather than DOM measurements. */
export interface ProLayoutMetrics {
  headerHeight: number
  breadcrumbHeight: number
  siderWidth: number
}

/** 页面读取和切换当前语言。语言包仍由内部的 ZbyIntlProvider 提供。 */
export interface UseLocaleReturn {
  locale: string
  setLocale: (locale: string) => void
}

/** Public layout context fields used by business pages and content containers. */
export interface ProLayoutContextValue extends ProLayoutMetrics, UseThemeReturn, UseLocaleReturn {
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
  theme: 'light',
  resolvedTheme: 'light',
  density: 'default',
  setMode: () => undefined,
  setDensity: () => undefined,
  locale: 'zh-CN',
  setLocale: () => undefined,
}

interface ProLayoutStoreState extends ProLayoutContextValue {
  /** 当前页面是否真的渲染了面包屑。由内容容器上报。 */
  breadcrumbRendered: boolean
}

const EMPTY_STORE = createStore<ProLayoutStoreState>(() => ({
  ...EMPTY_CONTEXT,
  breadcrumbRendered: false,
}))
const ProLayoutStoreContext = createContext<StoreApi<ProLayoutStoreState> | null>(null)
/** KeepAlive 隐藏页默认不参与上报。布局外没有这个边界，按当前页处理。 */
const ProLayoutPageActiveContext = createContext(true)
const breadcrumbReports = new WeakMap<StoreApi<ProLayoutStoreState>, Map<string, boolean>>()
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
  const [store] = useState(() => createStore<ProLayoutStoreState>(() => ({
    ...props.value,
    breadcrumbRendered: false,
  })))

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

/** 布局总开关。布局外返回 false，避免内容容器在没有路由上下文时渲染面包屑。 */
export function useProLayoutBreadcrumbEnabled() {
  const store = useContext(ProLayoutStoreContext)
  const enabled = useStoreSelector(
    store ?? EMPTY_STORE,
    (state) => state.showBreadcrumb,
    Object.is,
  )
  return store !== null && enabled
}

/** 标记当前 KeepAlive 页是否正在显示。隐藏页里的内容容器不参与顶栏阴影判断。 */
export function ProLayoutPageActiveProvider(props: {
  active: boolean
  children?: ReactNode
}) {
  return (
    <ProLayoutPageActiveContext.Provider value={props.active}>
      {props.children}
    </ProLayoutPageActiveContext.Provider>
  )
}

/** 内容容器上报本页是否渲染了面包屑，供顶栏滚动阴影判断。 */
export function useReportProLayoutBreadcrumb(rendered: boolean) {
  const store = useContext(ProLayoutStoreContext)
  const pageActive = useContext(ProLayoutPageActiveContext)
  const id = useId()

  useBrowserLayoutEffect(() => {
    if (!store || !pageActive)
      return

    writeBreadcrumbReport(store, id, rendered)
    return () => {
      writeBreadcrumbReport(store, id, null)
    }
  }, [id, pageActive, rendered, store])
}

export function useProLayoutBreadcrumbRendered() {
  const store = useContext(ProLayoutStoreContext)
  return useStoreSelector(
    store ?? EMPTY_STORE,
    (state) => state.breadcrumbRendered,
    Object.is,
  )
}

export function useProLayoutSiderWidth() {
  return useProLayoutContext((state) => state.siderWidth)
}

/** 读取 ProLayout 内部的主题。布局外调用会抛错，不退回空的布局数据。 */
export function useTheme(): UseThemeReturn {
  const store = useContext(ProLayoutStoreContext)
  const theme = useStoreSelector(store ?? EMPTY_STORE, selectTheme, areThemeEqual)
  if (!store)
    throw new Error('useTheme must be used within ProLayout')
  return theme
}

/** 读取并切换 ProLayout 内部的语言。布局外调用会抛错。 */
export function useLocale(): UseLocaleReturn {
  const store = useContext(ProLayoutStoreContext)
  const locale = useStoreSelector(store ?? EMPTY_STORE, selectLocale, areLocaleEqual)
  if (!store)
    throw new Error('useLocale must be used within ProLayout')
  return locale
}

function writeBreadcrumbReport(
  store: StoreApi<ProLayoutStoreState>,
  id: string,
  rendered: boolean | null,
) {
  let reports = breadcrumbReports.get(store)
  if (!reports) {
    reports = new Map()
    breadcrumbReports.set(store, reports)
  }

  if (rendered === null)
    reports.delete(id)
  else
    reports.set(id, rendered)

  const next = Array.from(reports.values()).some(Boolean)
  if (store.getState().breadcrumbRendered !== next)
    store.setState({ breadcrumbRendered: next })
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

function selectTheme(state: ProLayoutContextValue): UseThemeReturn {
  return {
    theme: state.theme,
    resolvedTheme: state.resolvedTheme,
    density: state.density,
    setMode: state.setMode,
    setDensity: state.setDensity,
  }
}

function areThemeEqual(left: UseThemeReturn, right: UseThemeReturn) {
  return (
    left.theme === right.theme &&
    left.resolvedTheme === right.resolvedTheme &&
    left.density === right.density &&
    left.setMode === right.setMode &&
    left.setDensity === right.setDensity
  )
}

function selectLocale(state: ProLayoutContextValue): UseLocaleReturn {
  return {
    locale: state.locale,
    setLocale: state.setLocale,
  }
}

function areLocaleEqual(left: UseLocaleReturn, right: UseLocaleReturn) {
  return left.locale === right.locale && left.setLocale === right.setLocale
}

function areContextValuesEqual(left: ProLayoutContextValue, right: ProLayoutContextValue) {
  return (
    left.headerHeight === right.headerHeight &&
    left.breadcrumbHeight === right.breadcrumbHeight &&
    left.siderWidth === right.siderWidth &&
    left.noBar === right.noBar &&
    left.showBreadcrumb === right.showBreadcrumb &&
    left.theme === right.theme &&
    left.resolvedTheme === right.resolvedTheme &&
    left.density === right.density &&
    left.locale === right.locale &&
    left.setMode === right.setMode &&
    left.setDensity === right.setDensity &&
    left.setLocale === right.setLocale
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

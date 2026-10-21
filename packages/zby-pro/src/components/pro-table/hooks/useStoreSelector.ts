import * as React from 'react'

import type { ProTableController, ProTableControllerState, ProTableQueryRecord } from '../interface'
import type { ProTableViewActions, ProTableViewState, ProTableViewStore } from '../store'

export function shallow(left: unknown, right: unknown) {
  if (Object.is(left, right)) return true
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false

  const leftRecord = left as Record<string, unknown>
  const rightRecord = right as Record<string, unknown>
  const leftKeys = Object.keys(leftRecord)
  const rightKeys = Object.keys(rightRecord)

  return leftKeys.length === rightKeys.length && leftKeys.every((key) => Object.is(leftRecord[key], rightRecord[key]))
}

/**
 * 订阅 controller 的公开状态。第三个参数是相等比较，默认 `Object.is`。
 * 选择器返回新对象时传 `shallow`。不要选择整个 state，也不要在选择器里调用 `getSelectedRows()`。
 */
export function useControllerSelector<RecordType, Query extends ProTableQueryRecord, Summary, Selected>(
  controller: ProTableController<RecordType, Query, Summary>,
  selector: (state: ProTableControllerState<RecordType, Query, Summary>) => Selected,
  equalityFn: (left: Selected, right: Selected) => boolean = Object.is,
) {
  const selectionRef = React.useRef<{ hasValue: boolean; value: Selected | undefined }>({
    hasValue: false,
    value: undefined,
  })

  const getSnapshot = React.useCallback(() => {
    const nextValue = selector(controller.getState())
    const cached = selectionRef.current

    if (!cached.hasValue || !equalityFn(cached.value as Selected, nextValue)) {
      cached.hasValue = true
      cached.value = nextValue
    }

    return cached.value as Selected
  }, [controller, equalityFn, selector])

  return React.useSyncExternalStore(controller.subscribe, getSnapshot, getSnapshot)
}

export function useViewStoreSelector<Selected>(
  store: ProTableViewStore,
  selector: (state: ProTableViewState & ProTableViewActions) => Selected,
  equalityFn: (left: Selected, right: Selected) => boolean = Object.is,
) {
  const selectionRef = React.useRef<{ hasValue: boolean; value: Selected | undefined }>({
    hasValue: false,
    value: undefined,
  })

  const getSnapshot = React.useCallback(() => {
    const nextValue = selector(store.getState())
    const cached = selectionRef.current
    if (!cached.hasValue || !equalityFn(cached.value as Selected, nextValue)) {
      cached.hasValue = true
      cached.value = nextValue
    }
    return cached.value as Selected
  }, [equalityFn, selector, store])

  return React.useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot)
}

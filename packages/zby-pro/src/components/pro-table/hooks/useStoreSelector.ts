import * as React from 'react'

import type { ProTableController, ProTableControllerState } from '../interface'
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

export function useControllerSelector<RecordType, Query extends Record<string, unknown>, Summary, Selected>(
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

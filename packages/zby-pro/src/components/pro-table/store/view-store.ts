import { createStore, type StoreApi } from 'zustand/vanilla'

import type { ProTableColumnPreference } from '../interface'
import { isSearchValueEqual } from '../utils/search'

export interface ProTableViewState {
  columnsReady: boolean
  searchReady: boolean
  mergedColumnsPreferences: ProTableColumnPreference[]
  columnsModalOpen: boolean
  advancedOverlayOpen: boolean
  advancedDraftQuery: Record<string, unknown> | null
  fullscreenActive: boolean
}

export interface ProTableViewActions {
  setColumnsReady: (ready: boolean) => void
  setSearchReady: (ready: boolean) => void
  setMergedColumnsPreferences: (items: ProTableColumnPreference[]) => void
  setColumnsModalOpen: (open: boolean) => void
  setAdvancedOverlayOpen: (open: boolean) => void
  setAdvancedDraftQuery: (query: Record<string, unknown> | null) => void
  setAdvancedDraftField: (key: string, value: unknown) => void
  setFullscreenActive: (active: boolean) => void
}

export type ProTableViewStore = StoreApi<ProTableViewState & ProTableViewActions>

const setBooleanValue =
  <
    Key extends keyof Pick<
      ProTableViewState,
      | 'advancedOverlayOpen'
      | 'columnsModalOpen'
      | 'columnsReady'
      | 'fullscreenActive'
      | 'searchReady'
    >,
  >(
    key: Key,
  ) =>
    (value: boolean) =>
      (state: ProTableViewState) =>
        state[key] === value ? state : { [key]: value }

function isFieldPreferenceEqual(left: ProTableColumnPreference, right: ProTableColumnPreference) {
  return (
    left.key === right.key &&
    left.visible === right.visible &&
    left.order === right.order &&
    (left.pin ?? null) === (right.pin ?? null) &&
    left.width === right.width
  )
}

function isFieldPreferencesEqual(left: ProTableColumnPreference[], right: ProTableColumnPreference[]) {
  return (
    left.length === right.length &&
    left.every((preference, index) => isFieldPreferenceEqual(preference, right[index]))
  )
}

function isDraftQueryEqual(
  left: Record<string, unknown> | null,
  right: Record<string, unknown> | null,
) {
  if (left === right) {
    return true
  }

  if (left === null || right === null) {
    return false
  }

  const keys = new Set([...Object.keys(left), ...Object.keys(right)])
  return Array.from(keys).every((key) => isSearchValueEqual(left[key], right[key]))
}

export function createProTableViewStore(): ProTableViewStore {
  return createStore<ProTableViewState & ProTableViewActions>((set) => ({
    columnsReady: false,
    searchReady: false,
    mergedColumnsPreferences: [],
    columnsModalOpen: false,
    advancedOverlayOpen: false,
    advancedDraftQuery: null,
    fullscreenActive: false,
    setColumnsReady: (ready) => set(setBooleanValue('columnsReady')(ready)),
    setSearchReady: (ready) => set(setBooleanValue('searchReady')(ready)),
    setMergedColumnsPreferences: (items) =>
      set((state) =>
        isFieldPreferencesEqual(state.mergedColumnsPreferences, items)
          ? state
          : { mergedColumnsPreferences: items },
      ),
    setColumnsModalOpen: (open) => set(setBooleanValue('columnsModalOpen')(open)),
    setAdvancedOverlayOpen: (open) => set(setBooleanValue('advancedOverlayOpen')(open)),
    setAdvancedDraftQuery: (query) =>
      set((state) =>
        isDraftQueryEqual(state.advancedDraftQuery, query) ? state : { advancedDraftQuery: query },
      ),
    setAdvancedDraftField: (key, value) =>
      set((state) => {
        const currentDraftQuery = state.advancedDraftQuery ?? {}
        if (isSearchValueEqual(currentDraftQuery[key], value)) {
          return state
        }
        return {
          advancedDraftQuery: {
            ...currentDraftQuery,
            [key]: value,
          },
        }
      }),
    setFullscreenActive: (active) => set(setBooleanValue('fullscreenActive')(active)),
  }))
}

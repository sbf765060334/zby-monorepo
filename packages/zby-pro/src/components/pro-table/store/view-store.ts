import { createStore, type StoreApi } from 'zustand/vanilla'

import type { ProTableColumnPreference, ProTableFilterPreference } from '../interface'
import { isFilterPreferencesEqual } from '../utils/filter-config'

export interface ProTableViewState {
  columnsReady: boolean
  mergedColumnsPreferences: ProTableColumnPreference[]
  columnsModalOpen: boolean
  mergedFilterPreferences: ProTableFilterPreference[]
  filtersModalOpen: boolean
  fullscreenActive: boolean
}

export interface ProTableViewActions {
  setColumnsReady: (ready: boolean) => void
  setMergedColumnsPreferences: (items: ProTableColumnPreference[]) => void
  setColumnsModalOpen: (open: boolean) => void
  setMergedFilterPreferences: (items: ProTableFilterPreference[]) => void
  setFiltersModalOpen: (open: boolean) => void
  setFullscreenActive: (active: boolean) => void
}

export type ProTableViewStore = StoreApi<ProTableViewState & ProTableViewActions>

const setBooleanValue =
  <
    Key extends keyof Pick<
      ProTableViewState,
      'columnsModalOpen' | 'columnsReady' | 'filtersModalOpen' | 'fullscreenActive'
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

export function createProTableViewStore(): ProTableViewStore {
  return createStore<ProTableViewState & ProTableViewActions>((set) => ({
    columnsReady: false,
    mergedColumnsPreferences: [],
    columnsModalOpen: false,
    mergedFilterPreferences: [],
    filtersModalOpen: false,
    fullscreenActive: false,
    setColumnsReady: (ready) => set(setBooleanValue('columnsReady')(ready)),
    setMergedColumnsPreferences: (items) =>
      set((state) =>
        isFieldPreferencesEqual(state.mergedColumnsPreferences, items)
          ? state
          : { mergedColumnsPreferences: items },
      ),
    setColumnsModalOpen: (open) => set(setBooleanValue('columnsModalOpen')(open)),
    setMergedFilterPreferences: (items) =>
      set((state) =>
        isFilterPreferencesEqual(state.mergedFilterPreferences, items)
          ? state
          : { mergedFilterPreferences: items },
      ),
    setFiltersModalOpen: (open) => set(setBooleanValue('filtersModalOpen')(open)),
    setFullscreenActive: (active) => set(setBooleanValue('fullscreenActive')(active)),
  }))
}

import { createStore, type StoreApi } from 'zustand/vanilla'

import type { ProTableColumnPreference } from '../interface'

export interface ProTableViewState {
  columnsReady: boolean
  mergedColumnsPreferences: ProTableColumnPreference[]
  columnsModalOpen: boolean
  fullscreenActive: boolean
}

export interface ProTableViewActions {
  setColumnsReady: (ready: boolean) => void
  setMergedColumnsPreferences: (items: ProTableColumnPreference[]) => void
  setColumnsModalOpen: (open: boolean) => void
  setFullscreenActive: (active: boolean) => void
}

export type ProTableViewStore = StoreApi<ProTableViewState & ProTableViewActions>

const setBooleanValue =
  <
    Key extends keyof Pick<
      ProTableViewState,
      'columnsModalOpen' | 'columnsReady' | 'fullscreenActive'
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
    fullscreenActive: false,
    setColumnsReady: (ready) => set(setBooleanValue('columnsReady')(ready)),
    setMergedColumnsPreferences: (items) =>
      set((state) =>
        isFieldPreferencesEqual(state.mergedColumnsPreferences, items)
          ? state
          : { mergedColumnsPreferences: items },
      ),
    setColumnsModalOpen: (open) => set(setBooleanValue('columnsModalOpen')(open)),
    setFullscreenActive: (active) => set(setBooleanValue('fullscreenActive')(active)),
  }))
}

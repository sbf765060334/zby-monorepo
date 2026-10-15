import { useCallback, useEffect, useMemo, useRef } from 'react'

import type { ProTableFilter, ProTableFilterPreference, ProTableQueryRecord } from '../interface'
import type { ProTableViewStore } from '../store'
import {
  isFilterPreferencesEqual,
  resolveFilterPreferences,
} from '../utils/filter-config'

type UseFiltersStateParams<Query extends ProTableQueryRecord> = {
  filters: ProTableFilter<Query>[]
  viewStore: ProTableViewStore
  viewInitializationReady: boolean
}

export function createFilterSchemaSignature<Query extends ProTableQueryRecord>(
  filters: ProTableFilter<Query>[],
) {
  return JSON.stringify(
    filters.map((filter) => ({
      key: String(filter.key),
      hidden: Boolean(filter.hidden),
    })),
  )
}

export function useFiltersState<Query extends ProTableQueryRecord>({
  filters,
  viewStore,
  viewInitializationReady,
}: UseFiltersStateParams<Query>) {
  const filterSchemaSignature = useMemo(
    () => createFilterSchemaSignature(filters),
    [filters],
  )
  const lastFilterSchemaSignatureRef = useRef<string | null>(null)

  useEffect(() => {
    if (!viewInitializationReady) {
      return
    }

    const actions = viewStore.getState()
    const shouldReconcile = lastFilterSchemaSignatureRef.current !== filterSchemaSignature
    lastFilterSchemaSignatureRef.current = filterSchemaSignature

    if (!shouldReconcile) {
      return
    }

    const nextPreferences = resolveFilterPreferences(
      filters,
      actions.mergedFilterPreferences,
    )
    if (!isFilterPreferencesEqual(actions.mergedFilterPreferences, nextPreferences)) {
      actions.setMergedFilterPreferences(nextPreferences)
    }
  }, [filterSchemaSignature, filters, viewInitializationReady, viewStore])

  const applyFiltersState = useCallback(
    async (items: ProTableFilterPreference[]) => {
      const actions = viewStore.getState()
      actions.setMergedFilterPreferences(resolveFilterPreferences(filters, items))
    },
    [filters, viewStore],
  )

  return {
    applyFiltersState,
  }
}

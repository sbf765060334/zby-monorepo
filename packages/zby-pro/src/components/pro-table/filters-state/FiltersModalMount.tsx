import React, { memo, useCallback } from 'react'

import type { ProTableFilter, ProTableFilterPreference } from '../interface'
import { useViewStoreSelector } from '../hooks'
import type { ProTableViewStore } from '../store'
import { FilterSettings } from './FilterSettings'

type FiltersModalMountProps<Query extends Record<string, unknown>> = {
  viewStore: ProTableViewStore
  filters: ProTableFilter<Query>[]
  onApply: (items: ProTableFilterPreference[]) => Promise<void>
  prefixCls: string
}

function FiltersModalMount<Query extends Record<string, unknown>>({
  viewStore,
  filters,
  onApply,
  prefixCls,
}: FiltersModalMountProps<Query>) {
  const open = useViewStoreSelector(viewStore, (state) => state.filtersModalOpen)
  const currentPreferences = useViewStoreSelector(
    viewStore,
    (state) => state.mergedFilterPreferences,
  )
  const handleCancel = useCallback(() => {
    viewStore.getState().setFiltersModalOpen(false)
  }, [viewStore])

  return (
    <FilterSettings
      open={open}
      filters={filters}
      currentPreferences={currentPreferences}
      onApply={onApply}
      onCancel={handleCancel}
      prefixCls={prefixCls}
    />
  )
}

const MemoFiltersModalMount = memo(FiltersModalMount) as typeof FiltersModalMount & {
  displayName?: string
}

MemoFiltersModalMount.displayName = 'ProTableFiltersModalMount'

export { MemoFiltersModalMount as FiltersModalMount }

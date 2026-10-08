import React, { memo, useCallback } from 'react'

import { useViewStoreSelector } from '../hooks'
import type { ProTableColumnPreference, ProTableFilter, ProTableFilterPreference } from '../interface'
import type { ModalScopeProps } from '../search-region'
import type { ProTableViewStore } from '../store'
import type { ProTableColumnDefinition } from '../utils/columns'
import { TableSettings } from './TableSettings'

type TableSettingsMountProps<Query extends Record<string, unknown>> = {
  viewStore: ProTableViewStore
  definitions: ProTableColumnDefinition[]
  maxVisible?: number
  maxFixed?: number
  filters: ProTableFilter<Query>[]
  onApplyColumns: (items: ProTableColumnPreference[]) => Promise<void>
  onApplyFilters: (items: ProTableFilterPreference[]) => Promise<void>
  getContainer?: () => HTMLElement
  prefixCls: string
  modalProps: ModalScopeProps
}

function TableSettingsMount<Query extends Record<string, unknown>>({
  viewStore,
  definitions,
  maxVisible,
  maxFixed,
  filters,
  onApplyColumns,
  onApplyFilters,
  getContainer,
  prefixCls,
  modalProps,
}: TableSettingsMountProps<Query>) {
  const open = useViewStoreSelector(viewStore, (state) => state.settingsModalOpen)
  const currentColumnPreferences = useViewStoreSelector(
    viewStore,
    (state) => state.mergedColumnsPreferences,
  )
  const currentFilterPreferences = useViewStoreSelector(
    viewStore,
    (state) => state.mergedFilterPreferences,
  )
  const handleCancel = useCallback(() => {
    viewStore.getState().setSettingsModalOpen(false)
  }, [viewStore])
  const handleApply = useCallback(
    async (columns: ProTableColumnPreference[], nextFilters: ProTableFilterPreference[]) => {
      await onApplyColumns(columns)
      await onApplyFilters(nextFilters)
      viewStore.getState().setSettingsModalOpen(false)
    },
    [onApplyColumns, onApplyFilters, viewStore],
  )

  return (
    <TableSettings
      open={open}
      definitions={definitions}
      currentColumnPreferences={currentColumnPreferences}
      maxVisible={maxVisible}
      maxFixed={maxFixed}
      filters={filters}
      currentFilterPreferences={currentFilterPreferences}
      onApply={handleApply}
      onCancel={handleCancel}
      getContainer={getContainer}
      prefixCls={prefixCls}
      className={modalProps.className}
      rootClassName={modalProps.rootClassName}
      style={modalProps.style}
    />
  )
}

const MemoTableSettingsMount = memo(TableSettingsMount) as typeof TableSettingsMount & {
  displayName?: string
}

MemoTableSettingsMount.displayName = 'ProTableTableSettingsMount'

export { MemoTableSettingsMount as TableSettingsMount }

import React, { memo, useCallback } from 'react'

import type { ProTableColumnPreference } from '../interface'
import { useViewStoreSelector } from '../hooks'
import type { ProTableViewStore } from '../store'
import type { ModalScopeProps } from '../search-region'
import type { ProTableColumnDefinition } from '../utils/columns'
import { ColumnSettings } from './ColumnSettings'

type ColumnsModalMountProps = {
  viewStore: ProTableViewStore
  definitions: ProTableColumnDefinition[]
  maxVisible?: number
  maxFixed?: number
  onApply: (items: ProTableColumnPreference[]) => Promise<void>
  prefixCls: string
  modalProps: ModalScopeProps
}

function ColumnsModalMount({
  viewStore,
  definitions,
  maxVisible,
  maxFixed,
  onApply,
  prefixCls,
  modalProps,
}: ColumnsModalMountProps) {
  const open = useViewStoreSelector(viewStore, (state) => state.columnsModalOpen)
  const currentPreferences = useViewStoreSelector(
    viewStore,
    (state) => state.mergedColumnsPreferences,
  )
  const handleCancel = useCallback(() => {
    viewStore.getState().setColumnsModalOpen(false)
  }, [viewStore])

  return (
    <ColumnSettings
      open={open}
      definitions={definitions}
      currentPreferences={currentPreferences}
      maxVisible={maxVisible}
      maxFixed={maxFixed}
      onApply={onApply}
      onCancel={handleCancel}
      prefixCls={prefixCls}
      className={modalProps.className}
      rootClassName={modalProps.rootClassName}
      style={modalProps.style}
    />
  )
}

const MemoColumnsModalMount = memo(ColumnsModalMount) as typeof ColumnsModalMount & {
  displayName?: string
}

MemoColumnsModalMount.displayName = 'ProTableColumnsModalMount'

export { MemoColumnsModalMount as ColumnsModalMount }

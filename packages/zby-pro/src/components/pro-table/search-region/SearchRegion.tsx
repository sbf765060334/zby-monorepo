import { memo, useMemo } from 'react'
import { Flex } from 'antd'
import { clsx } from 'clsx'

import { SearchViewManagementMount } from './components'
import type { SearchRegionProps } from './types'

function SearchRegionInner<RecordType, Query extends Record<string, unknown>, Summary>({
  className,
  controller,
  searchEnabled = false,
  views,
  viewStore,
  prefixCls,
  style,
  viewManagementAdapter,
  viewManagementInstanceId,
  viewManagementLoading,
  viewManagementLoadError,
  onRetryViewManagementLoad,
  initialStorageState,
  buildSystemDefaultSnapshot,
  createCurrentSnapshot,
  onApplyManagedView,
  onResetManagedView,
}: SearchRegionProps<RecordType, Query, Summary>) {
  const viewManagementNode = useMemo(
    () =>
      views !== false ? (
        <SearchViewManagementMount
          buildSystemDefaultSnapshot={buildSystemDefaultSnapshot}
          controller={controller}
          createCurrentSnapshot={createCurrentSnapshot}
          initialStorageState={initialStorageState}
          onApplyManagedView={onApplyManagedView}
          onResetManagedView={onResetManagedView}
          onRetryViewManagementLoad={onRetryViewManagementLoad}
          prefixCls={prefixCls}
          viewManagementAdapter={viewManagementAdapter}
          viewManagementInstanceId={viewManagementInstanceId}
          viewManagementLoadError={viewManagementLoadError}
          viewManagementLoading={viewManagementLoading}
          viewStore={viewStore}
        />
      ) : null,
    [
      buildSystemDefaultSnapshot,
      controller,
      createCurrentSnapshot,
      initialStorageState,
      onApplyManagedView,
      onResetManagedView,
      onRetryViewManagementLoad,
      prefixCls,
      viewManagementAdapter,
      viewManagementInstanceId,
      viewManagementLoadError,
      viewManagementLoading,
      views,
      viewStore,
    ],
  )

  if (!viewManagementNode && !searchEnabled) {
    return null
  }

  return (
    <Flex
      className={clsx(`${prefixCls}-search-row`, className)}
      style={style}
      align="center"
      gap="small"
      wrap="wrap"
    >
      {viewManagementNode}
    </Flex>
  )
}

const MemoSearchRegion = memo(SearchRegionInner) as typeof SearchRegionInner & {
  displayName?: string
}

MemoSearchRegion.displayName = 'ProTableSearchRegion'

export const SearchRegion = MemoSearchRegion

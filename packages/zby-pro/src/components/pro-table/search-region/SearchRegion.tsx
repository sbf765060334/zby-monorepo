import { memo, useMemo } from 'react'
import { Flex } from 'antd'

import { useViewStoreSelector } from '../hooks'
import { SearchViewManagementMount } from './components'
import type { SearchRegionProps } from './types'

function SearchRegionInner<RecordType, Query extends Record<string, unknown>, Summary>({
  children,
  contentReady,
  controller,
  views,
  viewStore,
  prefixCls,
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
  const searchReady = useViewStoreSelector(viewStore, (state) => state.searchReady)
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

  if (!searchReady || !contentReady) {
    return viewManagementNode ? (
      <div className={`${prefixCls}-search-shell`}>
        <Flex className={`${prefixCls}-search-row`} align="center" gap="small" wrap="wrap">
          {viewManagementNode}
        </Flex>
      </div>
    ) : null
  }

  return (
    <>
      <div className={`${prefixCls}-search-shell`}>
        <Flex className={`${prefixCls}-search-row`} align="center" gap="small" wrap="wrap">
          {viewManagementNode}
        </Flex>
      </div>
      <div className={`${prefixCls}-search-content-shell`}>{children}</div>
    </>
  )
}

const MemoSearchRegion = memo(SearchRegionInner) as typeof SearchRegionInner & {
  displayName?: string
}

MemoSearchRegion.displayName = 'ProTableSearchRegion'

export const SearchRegion = MemoSearchRegion

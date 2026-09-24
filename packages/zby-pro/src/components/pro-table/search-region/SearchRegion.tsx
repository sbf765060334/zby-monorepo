import { memo, useMemo } from 'react'
import { useIntl } from '@zby/intl'
import { Button, Flex } from 'antd'
import { clsx } from 'clsx'

import { SearchFields, SearchViewManagementMount } from './components'
import type { SearchRegionProps } from './types'

function SearchRegionInner<RecordType, Query extends Record<string, unknown>, Summary>({
  className,
  controller,
  filters = [],
  moreOpen = false,
  onResetSearch,
  onSearch,
  onToggleMore,
  searchEnabled = false,
  searchFilters,
  showMore = false,
  filterSettingEnabled = false,
  onOpenFilterSettings,
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
  onSaveManagedView,
}: SearchRegionProps<RecordType, Query, Summary>) {
  const intl = useIntl()
  const viewManagementNode = useMemo(
    () =>
      views !== false ? (
        <SearchViewManagementMount
          buildSystemDefaultSnapshot={buildSystemDefaultSnapshot}
          controller={controller}
          createCurrentSnapshot={createCurrentSnapshot}
          filters={searchFilters ?? filters}
          initialStorageState={initialStorageState}
          onApplyManagedView={onApplyManagedView}
          onResetManagedView={onResetManagedView}
          onSaveManagedView={onSaveManagedView}
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
      filters,
      initialStorageState,
      onApplyManagedView,
      onResetManagedView,
      onSaveManagedView,
      onRetryViewManagementLoad,
      prefixCls,
      searchFilters,
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
      {searchEnabled ? (
        <SearchFields controller={controller} filters={filters} prefixCls={prefixCls} />
      ) : null}
      {searchEnabled ? (
        <Flex
          className={`${prefixCls}-search-actions`}
          align="center"
          gap="small"
          wrap={false}
        >
          <Button type="primary" onClick={onSearch}>
            {intl.getMessage('zby.pro.table.search', '查询')}
          </Button>
          {showMore ? (
            <Button aria-expanded={moreOpen} onClick={onToggleMore}>
              {intl.getMessage('zby.pro.table.moreFilters', '更多筛选')}
            </Button>
          ) : null}
          <Button onClick={onResetSearch}>
            {intl.getMessage('zby.pro.table.resetSearch', '重置')}
          </Button>
          {filterSettingEnabled ? (
            <Button autoInsertSpace={false} onClick={onOpenFilterSettings}>
              {intl.getMessage('zby.pro.table.filterSetting', '筛选设置')}
            </Button>
          ) : null}
        </Flex>
      ) : null}
    </Flex>
  )
}

const MemoSearchRegion = memo(SearchRegionInner) as typeof SearchRegionInner & {
  displayName?: string
}

MemoSearchRegion.displayName = 'ProTableSearchRegion'

export const SearchRegion = MemoSearchRegion

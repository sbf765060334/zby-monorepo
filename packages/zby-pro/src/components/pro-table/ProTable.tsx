import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { clsx } from 'clsx'

import { cancelProTableControllerRequests, createProTableController } from './controller'
import { SearchRegion } from './search-region'
import { SearchMorePanel, SearchTagsMount } from './search-region/components'
import type {
  ProTableComponent,
  ProTableController,
  ProTableProps,
  ProTableRef,
} from './interface'
import { ColumnsModalMount, useColumnsState } from './columns-state'
import { FiltersModalMount, useFiltersState } from './filters-state'
import {
  useAutoRequest,
  useResolvedProTableConfig,
  useViewInitialization,
  useViewStoreSelector,
} from './hooks'
import { createProTableViewStore } from './store'
import { TableRegion } from './table-region'
import { ToolbarRegion } from './toolbar-region'
import { buildColumnDefinitions, collectLocalSortFields, splitFiltersByPreference } from './utils'
import { useViewPersistence } from './view-management'

const mergeInlineStyles = (...values: Array<React.CSSProperties | undefined>) =>
  values.reduce<React.CSSProperties>((current, value) => ({ ...current, ...value }), {})

function isShallowEqualRecord(left: Record<string, unknown>, right: Record<string, unknown>) {
  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every((key) => Object.is(left[key], right[key]))
  )
}

function useShallowStableObject<T extends Record<string, unknown>>(value: T) {
  const valueRef = useRef(value)
  if (!isShallowEqualRecord(valueRef.current, value)) {
    valueRef.current = value
  }
  return valueRef.current
}

const VIEW_LOADING_DELAY = 300

function ProTableInner<RecordType extends object, Query extends Record<string, unknown>, Summary>(
  props: ProTableProps<RecordType, Query, Summary>,
  ref: React.Ref<ProTableRef<RecordType, Query, Summary>>,
) {
  const {
    controller: controllerProp,
    controllerConfig,
    queryRequest,
    summaryRequest,
    defaultQuery,
    onControllerReady,
    columns,
    rowKey,
    views,
    toolbar,
    columnResize,
    persistenceKey,
    heightMode,
    autoRequest,
    layout,
    emptyState,
    onTableChange,
    loading,
    columnEmptyText,
    className,
    rootClassName,
    style,
    classNames,
    styles,
    rowSelection,
    expandable,
    pagination,
    scroll,
    filterSetting: _filterSetting,
    ...tableProps
  } = props
  const resolvedConfig = useResolvedProTableConfig({
    ...props,
    views,
    toolbar,
    columnResize,
    heightMode,
    autoRequest,
    layout,
    emptyState,
    className,
    rootClassName,
    style,
    classNames,
    styles,
    rowSelection,
    expandable,
    pagination,
    scroll,
  })
  const internalControllerRef = useRef<ProTableController<RecordType, Query, Summary> | null>(null)
  if (!controllerProp && !internalControllerRef.current) {
    internalControllerRef.current = createProTableController<RecordType, Query, Summary>({
      ...controllerConfig,
      defaultQuery,
      queryRequest,
      summaryRequest,
      rowKey,
      pagination: {
        defaultCurrent:
          (pagination && typeof pagination === 'object' ? pagination.defaultCurrent : undefined) ??
          controllerConfig?.pagination?.defaultCurrent,
        defaultPageSize:
          (pagination && typeof pagination === 'object' ? pagination.defaultPageSize : undefined) ??
          controllerConfig?.pagination?.defaultPageSize,
      },
    })
  }

  const controller = controllerProp ?? internalControllerRef.current!
  const viewStoreRef = useRef(createProTableViewStore())
  const viewStore = viewStoreRef.current
  const stableTableProps = useShallowStableObject(
    tableProps as Record<string, unknown>,
  ) as typeof tableProps
  const columnDefinitions = useMemo(
    () => buildColumnDefinitions(columns),
    [columns],
  )
  const localSortFields = useMemo(() => collectLocalSortFields(columns), [columns])
  const filters = resolvedConfig.mergedFilters
  const mergedFilterPreferences = useViewStoreSelector(
    viewStore,
    (state) => state.mergedFilterPreferences,
  )
  const { row: visibleFilters, more: moreFilters } = useMemo(
    () => splitFiltersByPreference(filters, mergedFilterPreferences),
    [filters, mergedFilterPreferences],
  )
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false)

  useImperativeHandle(
    ref,
    () => ({
      controller,
    }),
    [controller],
  )

  useEffect(() => {
    if (!controllerProp) {
      controller.configure({
        ...controllerConfig,
        defaultQuery,
        queryRequest,
        summaryRequest,
        rowKey,
      })
    }
  }, [controller, controllerConfig, controllerProp, defaultQuery, queryRequest, rowKey, summaryRequest])

  useEffect(() => {
    controller.configure({ localSortFields })
  }, [controller, localSortFields])

  useEffect(
    () => () => {
      if (!controllerProp) {
        cancelProTableControllerRequests(controller)
      }
    },
    [controller, controllerProp],
  )

  useEffect(() => {
    onControllerReady?.(controller)
  }, [controller, onControllerReady])

  const viewPersistence = useViewPersistence<RecordType, Query, Summary>({
    controller,
    viewStore,
    views: resolvedConfig.mergedViews,
    persistenceKey,
    filters,
    columnDefinitions,
    newColumnPolicy: resolvedConfig.mergedColumnSetting
      ? resolvedConfig.mergedColumnSetting.newColumnPolicy
      : undefined,
  })

  const viewInitialization = useViewInitialization<RecordType, Query, Summary>({
    controller,
    viewStore,
    buildSystemDefaultSnapshot: viewPersistence.buildSystemDefaultSnapshot,
    normalizeSnapshotForCurrentSchema: viewPersistence.normalizeSnapshotForCurrentSchema,
    viewsEnabled: resolvedConfig.mergedViews !== false,
    viewManagementAdapter: viewPersistence.viewManagementAdapter,
    viewManagementInstanceId: viewPersistence.viewManagementInstanceId,
  })

  useAutoRequest({
    autoRequest: resolvedConfig.mergedAutoRequest,
    controller,
    ready: viewInitialization.ready,
  })

  const columnsStateActions = useColumnsState({
    columnSetting: resolvedConfig.mergedColumnSetting,
    preferencesEnabled: resolvedConfig.columnPreferencesEnabled,
    viewStore,
    columnDefinitions,
    viewInitializationReady: viewInitialization.ready,
  })
  const filtersStateActions = useFiltersState({
    filters,
    viewStore,
    viewInitializationReady: viewInitialization.ready,
  })
  const viewsEnabled = resolvedConfig.mergedViews !== false
  const columnSettingEnabled = resolvedConfig.mergedColumnSetting !== false
  const filterSettingEnabled =
    resolvedConfig.mergedFilterSetting !== false && filters.length > 0
  const shouldWaitForViewInitialization = viewsEnabled && !viewInitialization.ready
  const viewInitializationError = viewInitialization.error
  const [viewLoadingVisible, setViewLoadingVisible] = useState(false)
  const handleRetryViewInitialization = useCallback(() => {
    setViewLoadingVisible(true)
    viewInitialization.retry()
  }, [viewInitialization.retry])
  const lastViewLoadErrorRef = useRef<unknown>(undefined)

  useEffect(() => {
    if (!shouldWaitForViewInitialization) {
      return
    }

    if (viewInitializationError) {
      setViewLoadingVisible(false)
      return
    }

    const timer = setTimeout(() => {
      setViewLoadingVisible(true)
    }, VIEW_LOADING_DELAY)

    return () => {
      clearTimeout(timer)
    }
  }, [shouldWaitForViewInitialization, viewInitializationError])

  useEffect(() => {
    if (!viewInitialization.loading) {
      setViewLoadingVisible(false)
    }
  }, [viewInitialization.loading])

  useEffect(() => {
    const onLoadError =
      resolvedConfig.mergedViews !== false ? resolvedConfig.mergedViews.onLoadError : undefined
    const error = viewInitializationError

    if (!error) {
      lastViewLoadErrorRef.current = undefined
      return
    }

    if (lastViewLoadErrorRef.current === error) {
      return
    }

    lastViewLoadErrorRef.current = error
    onLoadError?.(error, {
      instanceId: viewPersistence.viewManagementInstanceId,
      retry: handleRetryViewInitialization,
    })
  }, [
    handleRetryViewInitialization,
    resolvedConfig.mergedViews,
    viewInitializationError,
    viewPersistence.viewManagementInstanceId,
  ])

  const shouldBlockViewContent = shouldWaitForViewInitialization
  const shouldExposeViewLoadingState =
    shouldBlockViewContent && (viewLoadingVisible || Boolean(viewInitializationError))
  const handleSearch = useCallback(() => {
    setMoreFiltersOpen(false)
    void controller.submitQuery({ resetPage: true })
  }, [controller])
  const handleResetSearch = useCallback(() => {
    setMoreFiltersOpen(false)
    controller.resetQuery()
    void controller.submitQuery({ resetPage: true })
  }, [controller])
  const handleToggleMoreFilters = useCallback(() => {
    setMoreFiltersOpen((open) => !open)
  }, [])
  const handleCloseMoreFilters = useCallback(() => {
    setMoreFiltersOpen(false)
  }, [])
  const handleOpenFilterSettings = useCallback(() => {
    viewStore.getState().setFiltersModalOpen(true)
  }, [viewStore])
  const handleApplyManagedView = useCallback(
    async (view: Parameters<typeof viewPersistence.handleApplyManagedView>[0]) => {
      setMoreFiltersOpen(false)
      await viewPersistence.handleApplyManagedView(view)
    },
    [viewPersistence.handleApplyManagedView],
  )
  const handleResetManagedView = useCallback(
    async (view: Parameters<typeof viewPersistence.handleResetManagedView>[0]) => {
      setMoreFiltersOpen(false)
      await viewPersistence.handleResetManagedView(view)
    },
    [viewPersistence.handleResetManagedView],
  )
  const searchEnabled = filters.length > 0
  useEffect(() => {
    if (!searchEnabled || moreFilters.length === 0) {
      setMoreFiltersOpen(false)
    }
  }, [moreFilters.length, searchEnabled])
  const showSearchRow =
    (viewsEnabled || searchEnabled) &&
    !(shouldBlockViewContent && !shouldExposeViewLoadingState)
  const showTable = !shouldBlockViewContent
  const contentNode = useMemo(
    () => {
      if (!showSearchRow && !showTable) {
        return null
      }

      return (
        <div
          className={clsx(
            `${resolvedConfig.prefixCls}-content`,
            resolvedConfig.mergedLayout?.separated !== false &&
              `${resolvedConfig.prefixCls}-content-separated`,
            resolvedConfig.mergedSemanticClassNames.content,
          )}
          style={resolvedConfig.mergedSemanticStyles.content}
        >
          {showSearchRow ? (
            <SearchRegion
              className={resolvedConfig.mergedSemanticClassNames.search}
              controller={controller}
              filters={visibleFilters}
              moreOpen={moreFiltersOpen}
              onResetSearch={handleResetSearch}
              onSearch={handleSearch}
              onToggleMore={handleToggleMoreFilters}
              searchEnabled={searchEnabled}
              searchFilters={filters}
              showMore={moreFilters.length > 0}
              filterSettingEnabled={filterSettingEnabled}
              onOpenFilterSettings={handleOpenFilterSettings}
              views={resolvedConfig.mergedViews}
              viewStore={viewStore}
              prefixCls={resolvedConfig.prefixCls}
              style={resolvedConfig.mergedSemanticStyles.search}
              viewManagementAdapter={viewPersistence.viewManagementAdapter}
              viewManagementInstanceId={viewPersistence.viewManagementInstanceId}
              viewManagementLoading={viewInitialization.loading && viewLoadingVisible}
              viewManagementLoadError={viewInitializationError}
              onRetryViewManagementLoad={handleRetryViewInitialization}
              initialStorageState={viewInitialization.initialStorageState}
              buildSystemDefaultSnapshot={viewPersistence.buildSystemDefaultSnapshot}
              createCurrentSnapshot={viewPersistence.createCurrentSnapshot}
              onApplyManagedView={handleApplyManagedView}
              onResetManagedView={handleResetManagedView}
              onSaveManagedView={viewPersistence.handleSaveManagedView}
            />
          ) : null}
          {showTable ? (
            <div className={`${resolvedConfig.prefixCls}-content-main`}>
              <SearchMorePanel
                controller={controller}
                filters={moreFilters}
                onClose={handleCloseMoreFilters}
                open={moreFiltersOpen}
                prefixCls={resolvedConfig.prefixCls}
              />
              {searchEnabled ? (
                <SearchTagsMount
                  controller={controller}
                  filters={filters}
                  prefixCls={resolvedConfig.prefixCls}
                />
              ) : null}
              {(resolvedConfig.mergedToolbar || resolvedConfig.mergedLayout?.tableTop) && (
                <div className={`${resolvedConfig.prefixCls}-toolbar-block`}>
                  {resolvedConfig.mergedToolbar && (
                    <ToolbarRegion
                      controller={controller}
                      toolbar={resolvedConfig.mergedToolbar}
                      columnSettingEnabled={columnSettingEnabled}
                      fullscreenEnabled={resolvedConfig.fullscreenEnabled}
                      viewStore={viewStore}
                      prefixCls={resolvedConfig.prefixCls}
                      className={resolvedConfig.mergedSemanticClassNames.toolbar}
                      style={resolvedConfig.mergedSemanticStyles.toolbar}
                    />
                  )}
                  {resolvedConfig.mergedLayout?.tableTop ? (
                    <div className={`${resolvedConfig.prefixCls}-table-top`}>
                      {resolvedConfig.mergedLayout.tableTop}
                    </div>
                  ) : null}
                </div>
              )}
              <div className={`${resolvedConfig.prefixCls}-table-layout`}>
                {resolvedConfig.mergedLayout?.tableAside ? (
                  <div className={`${resolvedConfig.prefixCls}-table-aside`}>
                    {resolvedConfig.mergedLayout.tableAside}
                  </div>
                ) : null}
                <div className={`${resolvedConfig.prefixCls}-table-main`}>
                  <TableRegion
                    controller={controller}
                    columns={columns}
                    columnDefinitions={columnDefinitions}
                    columnsStateEnabled={resolvedConfig.columnPreferencesEnabled}
                    columnResize={resolvedConfig.mergedColumnResize}
                    columnResizeDefaultPersist={resolvedConfig.columnPreferencesEnabled}
                    viewStore={viewStore}
                    emptyState={resolvedConfig.mergedEmptyState}
                    columnEmptyText={columnEmptyText}
                    heightMode={resolvedConfig.mergedHeightMode}
                    loadingOverride={loading}
                    onTableChange={onTableChange}
                    rowKey={rowKey}
                    rowSelection={resolvedConfig.mergedRowSelection}
                    expandable={resolvedConfig.mergedExpandable}
                    pagination={resolvedConfig.mergedPagination}
                    scroll={resolvedConfig.mergedScroll}
                    prefixCls={resolvedConfig.prefixCls}
                    className={resolvedConfig.mergedSemanticClassNames.table}
                    style={resolvedConfig.mergedSemanticStyles.table}
                    tableProps={stableTableProps}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )
    },
    [
      columnDefinitions,
      columnEmptyText,
      handleApplyManagedView,
      handleCloseMoreFilters,
      handleResetManagedView,
      handleResetSearch,
      handleSearch,
      handleToggleMoreFilters,
      handleOpenFilterSettings,
      columnSettingEnabled,
      filterSettingEnabled,
      controller,
      handleRetryViewInitialization,
      loading,
      moreFiltersOpen,
      moreFilters,
      filters,
      onTableChange,
      columns,
      resolvedConfig.columnPreferencesEnabled,
      resolvedConfig.fullscreenEnabled,
      resolvedConfig.mergedColumnResize,
      resolvedConfig.mergedEmptyState,
      resolvedConfig.mergedExpandable,
      resolvedConfig.mergedHeightMode,
      resolvedConfig.mergedLayout,
      resolvedConfig.mergedPagination,
      resolvedConfig.mergedRowSelection,
      resolvedConfig.mergedScroll,
      resolvedConfig.mergedSemanticClassNames.content,
      resolvedConfig.mergedSemanticClassNames.search,
      resolvedConfig.mergedSemanticClassNames.table,
      resolvedConfig.mergedSemanticClassNames.toolbar,
      resolvedConfig.mergedSemanticStyles.content,
      resolvedConfig.mergedSemanticStyles.search,
      resolvedConfig.mergedSemanticStyles.table,
      resolvedConfig.mergedSemanticStyles.toolbar,
      resolvedConfig.mergedToolbar,
      resolvedConfig.mergedViews,
      resolvedConfig.prefixCls,
      rowKey,
      searchEnabled,
      showSearchRow,
      visibleFilters,
      showTable,
      stableTableProps,
      viewInitialization.initialStorageState,
      viewInitialization.loading,
      viewInitializationError,
      viewLoadingVisible,
      viewPersistence.buildSystemDefaultSnapshot,
      viewPersistence.createCurrentSnapshot,
      viewPersistence.handleSaveManagedView,
      viewPersistence.viewManagementAdapter,
      viewPersistence.viewManagementInstanceId,
      viewStore,
    ],
  )
  const rootStyle = useMemo(
    () => mergeInlineStyles(resolvedConfig.mergedSemanticStyles.root, resolvedConfig.mergedStyle),
    [resolvedConfig.mergedSemanticStyles.root, resolvedConfig.mergedStyle],
  )

  const content = (
    <div
      className={clsx(
        resolvedConfig.prefixCls,
        resolvedConfig.rootStyleClassName,
        resolvedConfig.mergedHeightMode === 'fill' && `${resolvedConfig.prefixCls}-fill`,
        resolvedConfig.mergedClassName,
        resolvedConfig.mergedRootClassName,
        resolvedConfig.mergedSemanticClassNames.root,
      )}
      style={rootStyle}
    >
      {contentNode}
      {columnSettingEnabled && resolvedConfig.mergedColumnSetting && (
        <ColumnsModalMount
          viewStore={viewStore}
          definitions={columnDefinitions}
          maxVisible={resolvedConfig.mergedColumnSetting.maxVisible}
          maxFixed={resolvedConfig.mergedColumnSetting.maxFixed}
          onApply={columnsStateActions.applyColumnsState}
          prefixCls={resolvedConfig.prefixCls}
          modalProps={resolvedConfig.columnsModalProps}
        />
      )}
      {filterSettingEnabled ? (
        <FiltersModalMount
          viewStore={viewStore}
          filters={filters}
          onApply={filtersStateActions.applyFiltersState}
          prefixCls={resolvedConfig.prefixCls}
        />
      ) : null}
    </div>
  )

  const fullscreenActive = useViewStoreSelector(viewStore, (state) => state.fullscreenActive)

  if (resolvedConfig.fullscreenEnabled && fullscreenActive && typeof document !== 'undefined') {
    return createPortal(
      <div
        className={clsx(
          `${resolvedConfig.prefixCls}-fullscreen`,
          resolvedConfig.rootStyleClassName,
          resolvedConfig.mergedSemanticClassNames.fullscreen,
        )}
        style={resolvedConfig.mergedSemanticStyles.fullscreen}
      >
        {content}
      </div>,
      document.body,
    )
  }

  return content
}

const ProTable = React.forwardRef(ProTableInner) as ProTableComponent

ProTable.displayName = 'ProTable'

export default ProTable

import type { Key } from 'react'
import { createStore } from 'zustand/vanilla'

import type {
  ProTableController,
  ProTableControllerConfig,
  ProTableControllerState,
  ProTableRequestParams,
  ProTableViewSorter,
} from './interface'
import { isSearchValueEqual } from './utils/search'
import { cloneSort, isSorterListEqual, normalizeSortItems, toRequestSort } from './utils/sort'

const CANCEL_REQUESTS = Symbol('ProTableCancelRequests')
const QUERY_OVERLAY = Symbol('ProTableQueryOverlay')

type InternalControllerState<
  RecordType,
  Query extends Record<string, unknown>,
  Summary,
> = ProTableControllerState<RecordType, Query, Summary> & {
  selectedRowMap: Map<Key, RecordType>;
  requestSeq: number;
  queryOverlay: Partial<Query>;
  queryRequest?: ProTableControllerConfig<RecordType, Query, Summary>['queryRequest'];
  summaryRequest?: ProTableControllerConfig<RecordType, Query, Summary>['summaryRequest'];
  rowKey?: ProTableControllerConfig<RecordType, Query, Summary>['rowKey'];
  localSortFields: string[];
  pendingExpandAllRows: boolean;
}

type OverlayableProTableController<
  RecordType,
  Query extends Record<string, unknown>,
  Summary,
> = ProTableController<RecordType, Query, Summary> & {
  [QUERY_OVERLAY]?: {
    consume: () => Partial<Query>
    clear: () => void
  }
}

type AbortableProTableController<
  RecordType,
  Query extends Record<string, unknown>,
  Summary,
> = ProTableController<RecordType, Query, Summary> & {
  [CANCEL_REQUESTS]?: () => void
}

function toRecordKey(value: unknown): Key | undefined {
  if (typeof value === 'string' || typeof value === 'number') {
    return value
  }

  return undefined
}

const DEFAULT_ROW_KEY = 'key'

function resolveRowKey<RecordType>(
  rowKey: ProTableControllerConfig<RecordType, any, any>['rowKey'],
) {
  return rowKey ?? DEFAULT_ROW_KEY
}

function getRowRecordKey<RecordType>(
  rowKey: ProTableControllerConfig<RecordType, any, any>['rowKey'],
  record: RecordType,
  index: number,
): Key | undefined {
  const resolvedRowKey = resolveRowKey(rowKey)

  if (typeof resolvedRowKey === 'function') {
    return resolvedRowKey(record, index)
  }

  if (typeof resolvedRowKey === 'string' || typeof resolvedRowKey === 'number') {
    return toRecordKey((record as Record<string, unknown>)[resolvedRowKey as string])
  }

  return undefined
}

function cloneSelectedRowMap<RecordType>(map: Map<Key, RecordType>) {
  return new Map(map)
}

function areSelectedRowMapsEqual<RecordType>(
  left: Map<Key, RecordType>,
  right: Map<Key, RecordType>,
) {
  if (left.size !== right.size) {
    return false
  }

  for (const [key, record] of left) {
    if (!Object.is(record, right.get(key))) {
      return false
    }
  }

  return true
}

function indexRowsByKey<RecordType>(
  rows: readonly RecordType[] | undefined,
  rowKey: ProTableControllerConfig<RecordType, any, any>['rowKey'],
) {
  const indexed = new Map<Key, RecordType>()
  ;(rows ?? []).forEach((record, index) => {
    const recordKey = getRowRecordKey(rowKey, record, index)
    if (recordKey !== undefined) {
      indexed.set(recordKey, record)
    }
  })
  return indexed
}

function syncSelectedRowMap<RecordType>(
  keys: readonly Key[],
  previousMap: Map<Key, RecordType>,
  rowKey: ProTableControllerConfig<RecordType, any, any>['rowKey'],
  sources: Array<readonly RecordType[] | undefined>,
) {
  const nextMap = new Map<Key, RecordType>()
  const indexedSources = sources.map((source) => indexRowsByKey(source, rowKey))

  keys.forEach((key) => {
    for (const indexed of indexedSources) {
      const record = indexed.get(key)
      if (record !== undefined) {
        nextMap.set(key, record)
        return
      }
    }

    const previous = previousMap.get(key)
    if (previous !== undefined) {
      nextMap.set(key, previous)
    }
  })

  return nextMap
}

function cloneQuery<Query>(query: Query): Query {
  if (query && typeof query === 'object') {
    return { ...(query as Record<string, unknown>) } as Query
  }

  return query
}

function mergeQueryOverlay<Query>(overlay: Partial<Query>, patch: Partial<Query>): Partial<Query> {
  return {
    ...(overlay as Record<string, unknown>),
    ...(patch as Record<string, unknown>),
  } as Partial<Query>
}

function mergeQueryPatch<Query>(query: Query, patch: Partial<Query>): Query {
  return {
    ...(query as Record<string, unknown>),
    ...(patch as Record<string, unknown>),
  } as Query
}

function setQueryValue<Query>(query: Query, key: string, value: unknown): Query {
  return {
    ...(query as Record<string, unknown>),
    [key]: value,
  } as Query
}

function areKeyArraysEqual(left: Key[], right: readonly Key[]) {
  return left.length === right.length && left.every((key, index) => Object.is(key, right[index]))
}

function areStringArraysEqual(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((item, index) => item === right[index])
}

function isQueryPatchEqual<Query>(query: Query, patch: Partial<Query>) {
  return Object.keys(patch as Record<string, unknown>).every((key) =>
    isSearchValueEqual(
      (query as Record<string, unknown>)[key],
      (patch as Record<string, unknown>)[key],
    ),
  )
}

function isQueryEqual<Query>(left: Query, right: Query) {
  if (Object.is(left, right)) {
    return true
  }

  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') {
    return false
  }

  const leftRecord = left as Record<string, unknown>
  const rightRecord = right as Record<string, unknown>
  const keys = new Set([...Object.keys(leftRecord), ...Object.keys(rightRecord)])
  return Array.from(keys).every((key) => isSearchValueEqual(leftRecord[key], rightRecord[key]))
}

function assembleRequestParams<Query extends Record<string, unknown>>(
  filters: Query,
  currentPage: number,
  pageSize: number,
  sort: readonly ProTableViewSorter[],
): ProTableRequestParams<Query> {
  const params: Record<string, unknown> = {
    ...(filters as Record<string, unknown>),
    page: currentPage,
    pageSize,
  }

  if (sort.length > 0) {
    params.sort = cloneSort(sort)
  } else {
    delete params.sort
  }

  return params as ProTableRequestParams<Query>
}

function toPublicState<RecordType, Query extends Record<string, unknown>, Summary>(
  state: InternalControllerState<RecordType, Query, Summary>,
): ProTableControllerState<RecordType, Query, Summary> {
  return {
    query: state.query,
    committedQuery: state.committedQuery,
    defaultQuery: state.defaultQuery,
    latestParams: state.latestParams,
    dataSource: state.dataSource,
    total: state.total,
    currentPage: state.currentPage,
    pageSize: state.pageSize,
    loading: state.loading,
    requested: state.requested,
    requestReady: state.requestReady,
    inquired: state.inquired,
    summary: state.summary,
    selectedRowKeys: state.selectedRowKeys,
    expandedRowKeys: state.expandedRowKeys,
    sort: state.sort,
  }
}

function collectSelectedRows<RecordType, Query extends Record<string, unknown>, Summary>(
  state: InternalControllerState<RecordType, Query, Summary>,
) {
  return state.selectedRowKeys
    .map((key) => state.selectedRowMap.get(key))
    .filter((item): item is RecordType => Boolean(item))
}

function cloneKeys(keys: readonly Key[] | undefined) {
  return keys ? [...keys] : []
}

function takePendingExpandAll<RecordType>(
  state: Pick<
    InternalControllerState<RecordType, any, any>,
    'dataSource' | 'pendingExpandAllRows' | 'rowKey'
  >,
) {
  if (!state.pendingExpandAllRows || state.dataSource.length === 0) {
    return undefined
  }

  return {
    pendingExpandAllRows: false,
    expandedRowKeys: getExpandedKeys(state.dataSource, state.rowKey),
  }
}

function getExpandedKeys<RecordType>(
  rows: RecordType[],
  rowKey: ProTableControllerConfig<RecordType, any, any>['rowKey'],
) {
  const keys: Key[] = []

  const visit = (list: RecordType[]) => {
    list.forEach((record, index) => {
      const children = (record as { children?: RecordType[] }).children
      if (Array.isArray(children) && children.length > 0) {
        const key = getRowRecordKey(rowKey, record, index)
        if (key !== undefined && !keys.includes(key)) {
          keys.push(key)
        }
        visit(children)
      }
    })
  }

  visit(rows)

  return keys
}

function isAbortError(error: unknown, signal: AbortSignal) {
  if (signal.aborted) {
    return true
  }

  if (typeof DOMException !== 'undefined' && error instanceof DOMException) {
    return error.name === 'AbortError'
  }

  return error instanceof Error && error.name === 'AbortError'
}

export function cancelProTableControllerRequests(
  controller: ProTableController<any, any, any>,
): void {
  (controller as AbortableProTableController<any, any, any>)[CANCEL_REQUESTS]?.()
}

export function ignoreProTableRequestError(task: Promise<unknown>) {
  void task.catch(() => undefined)
}

export function consumeProTableQueryOverlay<Query extends Record<string, unknown>>(
  controller: ProTableController<any, Query, any>,
): Partial<Query> {
  return (
    (controller as OverlayableProTableController<any, Query, any>)[QUERY_OVERLAY]?.consume() ?? {}
  )
}

export function clearProTableQueryOverlay(controller: ProTableController<any, any, any>): void {
  (controller as OverlayableProTableController<any, any, any>)[QUERY_OVERLAY]?.clear()
}

export function createProTableController<
  RecordType,
  Query extends Record<string, unknown>,
  Summary = unknown,
>(
  config: ProTableControllerConfig<RecordType, Query, Summary> = {},
): ProTableController<RecordType, Query, Summary> {
  const defaultCurrent = config.pagination?.defaultCurrent ?? 1
  const defaultPageSize = config.pagination?.defaultPageSize ?? 10
  const defaultQuery = cloneQuery((config.defaultQuery ?? {}) as Query)
  const initialSelectedRowKeys = cloneKeys(config.defaultSelectedRowKeys)
  const pendingExpandAllRows = Boolean(config.defaultExpandAllRows)
  const initialExpandedRowKeys = pendingExpandAllRows
    ? []
    : cloneKeys(config.defaultExpandedRowKeys)

  const store = createStore<InternalControllerState<RecordType, Query, Summary>>(() => ({
    query: cloneQuery(defaultQuery),
    committedQuery: cloneQuery(defaultQuery),
    defaultQuery: cloneQuery(defaultQuery),
    latestParams: null,
    dataSource: [],
    total: 0,
    currentPage: defaultCurrent,
    pageSize: defaultPageSize,
    loading: false,
    requested: false,
    requestReady: Boolean(config.queryRequest),
    inquired: false,
    summary: undefined,
    selectedRowKeys: initialSelectedRowKeys,
    selectedRowMap: new Map<Key, RecordType>(),
    expandedRowKeys: initialExpandedRowKeys,
    pendingExpandAllRows,
    sort: [],
    requestSeq: 0,
    queryOverlay: {},
    queryRequest: config.queryRequest,
    summaryRequest: config.summaryRequest,
    rowKey: resolveRowKey(config.rowKey),
    localSortFields: config.localSortFields ? [...config.localSortFields] : [],
  }))
  let listAbortController: AbortController | null = null
  let summaryAbortController: AbortController | null = null
  let lastSettledIdentity = {
    committedQuery: cloneQuery(defaultQuery),
    currentPage: defaultCurrent,
    pageSize: defaultPageSize,
    sort: [] as ProTableViewSorter[],
    latestParams: null as ProTableRequestParams<Query> | null,
    selectedRowKeys: [...initialSelectedRowKeys],
    selectedRowMap: new Map<Key, RecordType>(),
  }

  const abortListRequest = () => {
    listAbortController?.abort()
    listAbortController = null
  }

  const abortSummaryRequest = () => {
    summaryAbortController?.abort()
    summaryAbortController = null
  }

  const abortAllRequests = () => {
    abortListRequest()
    abortSummaryRequest()
  }

  const rememberSettledIdentity = () => {
    const current = store.getState()
    lastSettledIdentity = {
      committedQuery: cloneQuery(current.committedQuery),
      currentPage: current.currentPage,
      pageSize: current.pageSize,
      sort: cloneSort(current.sort),
      latestParams: current.latestParams
        ? ({ ...current.latestParams } as ProTableRequestParams<Query>)
        : null,
      selectedRowKeys: [...current.selectedRowKeys],
      selectedRowMap: cloneSelectedRowMap(current.selectedRowMap),
    }
  }

  const restoreSettledIdentity = () => {
    const current = store.getState()
    const nextKeys = [...lastSettledIdentity.selectedRowKeys]
    store.setState({
      committedQuery: cloneQuery(lastSettledIdentity.committedQuery),
      currentPage: lastSettledIdentity.currentPage,
      pageSize: lastSettledIdentity.pageSize,
      sort: cloneSort(lastSettledIdentity.sort),
      latestParams: lastSettledIdentity.latestParams
        ? ({ ...lastSettledIdentity.latestParams } as ProTableRequestParams<Query>)
        : null,
      selectedRowKeys: nextKeys,
      selectedRowMap: syncSelectedRowMap(
        nextKeys,
        lastSettledIdentity.selectedRowMap,
        current.rowKey,
        [current.dataSource],
      ),
      loading: false,
    })
  }

  const dispatchRequest = async (input: {
    filters: Query
    currentPage: number
    pageSize: number
    sort: ProTableViewSorter[]
    commitDraft: boolean
    clearSelection: boolean
  }) => {
    const state = store.getState()
    const requestParams = assembleRequestParams(
      input.filters,
      input.currentPage,
      input.pageSize,
      toRequestSort(input.sort, state.localSortFields),
    )
    const snapshot = {
      currentPage: input.currentPage,
      pageSize: input.pageSize,
      sort: cloneSort(input.sort),
      latestParams: requestParams,
      ...(input.commitDraft
        ? {
            query: cloneQuery(input.filters),
            committedQuery: cloneQuery(input.filters),
          }
        : {}),
      ...(input.clearSelection &&
      (state.selectedRowKeys.length > 0 || state.selectedRowMap.size > 0)
        ? {
            selectedRowKeys: [] as Key[],
            selectedRowMap: new Map<Key, RecordType>(),
          }
        : {}),
    }
    const { queryRequest, summaryRequest } = state

    if (!queryRequest) {
      abortAllRequests()
      store.setState(snapshot)
      rememberSettledIdentity()
      return
    }

    abortAllRequests()
    listAbortController = new AbortController()
    const listSignal = listAbortController.signal
    let summarySignal: AbortSignal | undefined
    if (typeof summaryRequest === 'function') {
      summaryAbortController = new AbortController()
      summarySignal = summaryAbortController.signal
    }
    const requestSeq = state.requestSeq + 1

    store.setState({
      ...snapshot,
      loading: true,
      requested: true,
      requestReady: true,
      requestSeq,
    })

    try {
      const listPromise = queryRequest(requestParams, { signal: listSignal })
      const [listResult, summaryResult] = summaryRequest && summarySignal
        ? await Promise.all([
            listPromise,
            summaryRequest(requestParams, { signal: summarySignal }),
          ])
        : [await listPromise, undefined]

      if (store.getState().requestSeq !== requestSeq) {
        return
      }

      store.setState((current) => {
        const nextDataSource = listResult.data ?? []
        const nextState = {
          ...current,
          dataSource: nextDataSource,
          total: typeof listResult.total === 'number' ? listResult.total : nextDataSource.length,
          selectedRowMap: syncSelectedRowMap(
            current.selectedRowKeys,
            current.selectedRowMap,
            current.rowKey,
            [nextDataSource],
          ),
          ...(summaryRequest ? { summary: summaryResult } : {}),
          loading: false,
          inquired: true,
        }
        return {
          ...nextState,
          ...takePendingExpandAll(nextState),
        }
      })
      rememberSettledIdentity()
    } catch (error) {
      if (store.getState().requestSeq !== requestSeq) {
        return
      }

      const aborted =
        isAbortError(error, listSignal) ||
        (summarySignal !== undefined && isAbortError(error, summarySignal))

      abortAllRequests()
      restoreSettledIdentity()

      if (aborted) {
        return
      }

      throw error
    }
  }

  const controller: ProTableController<RecordType, Query, Summary> = {
    getState: () => toPublicState(store.getState()),
    subscribe: (listener) => store.subscribe((state) => listener(toPublicState(state))),
    configure: (nextConfig) => {
      store.setState((state) => {
        const nextDefaultQuery =
          nextConfig.defaultQuery === undefined
            ? state.defaultQuery
            : cloneQuery(nextConfig.defaultQuery as Query)
        const nextQueryRequest = nextConfig.queryRequest ?? state.queryRequest
        const nextSummaryRequest = nextConfig.summaryRequest ?? state.summaryRequest
        const nextRowKey =
          nextConfig.rowKey === undefined ? state.rowKey : resolveRowKey(nextConfig.rowKey)
        const nextRequestReady = Boolean(nextQueryRequest)
        const nextLocalSortFields =
          nextConfig.localSortFields === undefined
            ? state.localSortFields
            : [...nextConfig.localSortFields]

        if (
          isQueryEqual(state.defaultQuery, nextDefaultQuery) &&
          nextQueryRequest === state.queryRequest &&
          nextSummaryRequest === state.summaryRequest &&
          Object.is(nextRowKey, state.rowKey) &&
          nextRequestReady === state.requestReady &&
          areStringArraysEqual(state.localSortFields, nextLocalSortFields)
        ) {
          return state
        }

        return {
          defaultQuery: isQueryEqual(state.defaultQuery, nextDefaultQuery)
            ? state.defaultQuery
            : cloneQuery(nextDefaultQuery),
          queryRequest: nextQueryRequest,
          requestReady: nextRequestReady,
          summaryRequest: nextSummaryRequest,
          rowKey: nextRowKey,
          localSortFields: nextLocalSortFields,
        }
      })
    },
    setViewState: (viewState) => {
      const { query, sorter, committed = false } = viewState
      store.setState((state) => {
        // eslint-disable-next-line e18e/prefer-object-has-own -- current TS lib target does not expose Object.hasOwn
        const hasSorter = Object.prototype.hasOwnProperty.call(viewState, 'sorter')
        const nextSort = hasSorter
          ? normalizeSortItems(sorter ?? [])
          : state.sort

        return {
          query: cloneQuery(query),
          committedQuery: committed ? cloneQuery(query) : state.committedQuery,
          sort: nextSort,
        }
      })
    },
    setQueryField: (key, value) => {
      store.setState((state) => {
        const currentValue = (state.query as Record<string, unknown>)[key]
        const queryUnchanged = isSearchValueEqual(currentValue, value)
        const overlayRecord = state.queryOverlay as Record<string, unknown>
        // eslint-disable-next-line e18e/prefer-object-has-own -- current TS lib target does not expose Object.hasOwn
        const overlayHasKey = Object.prototype.hasOwnProperty.call(overlayRecord, key)
        const overlayUnchanged = overlayHasKey && isSearchValueEqual(overlayRecord[key], value)
        if (queryUnchanged && overlayUnchanged) {
          return state
        }

        return {
          ...(queryUnchanged ? {} : { query: setQueryValue(state.query, key, value) }),
          queryOverlay: mergeQueryOverlay(state.queryOverlay, { [key]: value } as Partial<Query>),
        }
      })
    },
    setQuery: (patch) => {
      store.setState((state) => {
        const queryUnchanged = isQueryPatchEqual(state.query, patch)
        const nextOverlay = mergeQueryOverlay(state.queryOverlay, patch)
        const overlayUnchanged = isQueryPatchEqual(state.queryOverlay as Query, patch) &&
          Object.keys(patch as Record<string, unknown>).every((key) =>
            // eslint-disable-next-line e18e/prefer-object-has-own -- current TS lib target does not expose Object.hasOwn
            Object.prototype.hasOwnProperty.call(state.queryOverlay, key),
          )
        if (queryUnchanged && overlayUnchanged) {
          return state
        }

        return {
          ...(queryUnchanged ? {} : { query: mergeQueryPatch(state.query, patch) }),
          queryOverlay: nextOverlay,
        }
      })
    },
    resetQuery: (patch) => {
      store.setState((state) => ({
        query: patch ? mergeQueryPatch(state.defaultQuery, patch) : cloneQuery(state.defaultQuery),
        queryOverlay: patch ? mergeQueryOverlay({}, patch) : {},
      }))
    },
    submitQuery: async (options) => {
      const resetPage = options?.resetPage !== false
      const state = store.getState()
      await dispatchRequest({
        filters: state.query,
        currentPage: resetPage ? 1 : state.currentPage,
        pageSize: state.pageSize,
        sort: state.sort,
        commitDraft: true,
        clearSelection: resetPage && Boolean(state.requested),
      })
    },
    reload: async () => {
      const state = store.getState()
      await dispatchRequest({
        filters: state.committedQuery,
        currentPage: state.currentPage,
        pageSize: state.pageSize,
        sort: state.sort,
        commitDraft: false,
        clearSelection: false,
      })
    },
    setPage: async (page) => {
      const state = store.getState()
      await dispatchRequest({
        filters: state.committedQuery,
        currentPage: page,
        pageSize: state.pageSize,
        sort: state.sort,
        commitDraft: false,
        clearSelection: false,
      })
    },
    setPageSize: async (pageSize) => {
      const state = store.getState()
      await dispatchRequest({
        filters: state.committedQuery,
        currentPage: 1,
        pageSize,
        sort: state.sort,
        commitDraft: false,
        clearSelection: true,
      })
    },
    setSort: async (sort) => {
      const nextSort = normalizeSortItems(sort)
      const state = store.getState()

      if (isSorterListEqual(state.sort, nextSort)) {
        return
      }

      const previousRequestSort = toRequestSort(state.sort, state.localSortFields)
      const nextRequestSort = toRequestSort(nextSort, state.localSortFields)

      if (isSorterListEqual(previousRequestSort, nextRequestSort)) {
        store.setState({ sort: nextSort })
        lastSettledIdentity = {
          ...lastSettledIdentity,
          sort: cloneSort(nextSort),
        }
        return
      }

      await dispatchRequest({
        filters: state.committedQuery,
        currentPage: 1,
        pageSize: state.pageSize,
        sort: nextSort,
        commitDraft: false,
        clearSelection: true,
      })
    },
    setDataSource: (rows, total) => {
      store.setState((state) => {
        const nextState = {
          ...state,
          dataSource: rows,
          total: typeof total === 'number' ? total : rows.length,
          selectedRowMap: syncSelectedRowMap(
            state.selectedRowKeys,
            state.selectedRowMap,
            state.rowKey,
            [rows],
          ),
        }
        return {
          ...nextState,
          ...takePendingExpandAll(nextState),
        }
      })
    },
    patchRow: (uniqueKey, targetValue, patch) => {
      store.setState((state) => {
        const applyPatch = (row: RecordType) =>
          row[uniqueKey] === targetValue
            ? ({
                ...row,
                ...patch,
              } as RecordType)
            : row

        const nextDataSource = state.dataSource.map(applyPatch)
        const patchedPreviousMap = new Map<Key, RecordType>()
        state.selectedRowMap.forEach((row, key) => {
          patchedPreviousMap.set(key, applyPatch(row))
        })
        const nextMap = syncSelectedRowMap(
          state.selectedRowKeys,
          patchedPreviousMap,
          state.rowKey,
          [nextDataSource],
        )
        const dataUnchanged = nextDataSource.every((row, index) =>
          Object.is(row, state.dataSource[index]),
        )

        if (dataUnchanged && areSelectedRowMapsEqual(state.selectedRowMap, nextMap)) {
          return state
        }

        return {
          ...(dataUnchanged ? {} : { dataSource: nextDataSource }),
          selectedRowMap: nextMap,
        }
      })
    },
    setSelectedRowKeys: (keys, rows) => {
      store.setState((state) => {
        const nextKeys = [...keys]
        const nextMap = syncSelectedRowMap(
          nextKeys,
          state.selectedRowMap,
          state.rowKey,
          [state.dataSource, rows],
        )

        if (
          areKeyArraysEqual(state.selectedRowKeys, nextKeys) &&
          areSelectedRowMapsEqual(state.selectedRowMap, nextMap)
        ) {
          return state
        }

        return {
          selectedRowKeys: nextKeys,
          selectedRowMap: nextMap,
        }
      })
    },
    getSelectedRows: () => collectSelectedRows(store.getState()),
    setExpandedRowKeys: (keys) => {
      store.setState((state) => {
        const keysUnchanged = areKeyArraysEqual(state.expandedRowKeys, keys)
        if (keysUnchanged && !state.pendingExpandAllRows) {
          return state
        }

        return {
          expandedRowKeys: keys,
          pendingExpandAllRows: false,
        }
      })
    },
    expandAllRows: () => {
      const state = store.getState()
      store.setState({
        expandedRowKeys: getExpandedKeys(state.dataSource, state.rowKey),
        pendingExpandAllRows: false,
      })
    },
    collapseAllRows: () => {
      store.setState((state) => {
        if (state.expandedRowKeys.length === 0 && !state.pendingExpandAllRows) {
          return state
        }

        return {
          expandedRowKeys: [],
          pendingExpandAllRows: false,
        }
      })
    },
    getRequestParams: () => {
      const state = store.getState()
      return assembleRequestParams(
        state.committedQuery,
        state.currentPage,
        state.pageSize,
        toRequestSort(state.sort, state.localSortFields),
      )
    },
  };
  (controller as AbortableProTableController<RecordType, Query, Summary>)[CANCEL_REQUESTS] =
    abortAllRequests
  ;(controller as OverlayableProTableController<RecordType, Query, Summary>)[QUERY_OVERLAY] = {
    consume: () => {
      const overlay = cloneQuery(store.getState().queryOverlay)
      store.setState({ queryOverlay: {} })
      return overlay
    },
    clear: () => {
      store.setState((state) =>
        Object.keys(state.queryOverlay as Record<string, unknown>).length === 0
          ? state
          : { queryOverlay: {} },
      )
    },
  }

  return controller
}

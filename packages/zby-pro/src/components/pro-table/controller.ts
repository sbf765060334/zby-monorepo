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

const CANCEL_REQUESTS = Symbol('ProTableCancelRequests')

type InternalControllerState<
  RecordType,
  Query extends Record<string, unknown>,
  Summary,
> = ProTableControllerState<RecordType, Query, Summary> & {
  selectedRowMap: Map<Key, RecordType>;
  requestSeq: number;
  queryRequest?: ProTableControllerConfig<RecordType, Query, Summary>['queryRequest'];
  summaryRequest?: ProTableControllerConfig<RecordType, Query, Summary>['summaryRequest'];
  rowKey?: ProTableControllerConfig<RecordType, Query, Summary>['rowKey'];
}

type AbortableProTableController<
  RecordType,
  Query extends Record<string, unknown>,
  Summary,
> = ProTableController<RecordType, Query, Summary> & {
  [CANCEL_REQUESTS]?: () => void;
}

function toRecordKey(value: unknown): Key | undefined {
  if (typeof value === 'string' || typeof value === 'number') {
    return value
  }

  return undefined
}

function getRowRecordKey<RecordType>(
  rowKey: ProTableControllerConfig<RecordType, any, any>['rowKey'],
  record: RecordType,
  index: number,
): Key | undefined {
  if (typeof rowKey === 'function') {
    return rowKey(record, index)
  }

  if (typeof rowKey === 'string' || typeof rowKey === 'number') {
    return toRecordKey((record as Record<string, unknown>)[rowKey as string])
  }

  return undefined
}

function cloneQuery<Query>(query: Query): Query {
  if (query && typeof query === 'object') {
    return { ...(query as Record<string, unknown>) } as Query
  }

  return query
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

function isValidSortOrder(order: unknown): order is ProTableViewSorter['order'] {
  return order === 'ascend' || order === 'descend'
}

function assembleRequestParams<Query extends Record<string, unknown>>(
  filters: Query,
  currentPage: number,
  pageSize: number,
  sortField: string | undefined,
  sortOrder: 'ascend' | 'descend' | null | undefined,
): ProTableRequestParams<Query> {
  const params: Record<string, unknown> = {
    ...(filters as Record<string, unknown>),
    page: currentPage,
    pageSize,
  }

  if (sortField && isValidSortOrder(sortOrder)) {
    params.sortBy = sortField
    params.sortOrder = sortOrder
  } else {
    delete params.sortBy
    delete params.sortOrder
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
    sortField: state.sortField,
    sortOrder: state.sortOrder,
  }
}

function collectSelectedRows<RecordType, Query extends Record<string, unknown>, Summary>(
  state: InternalControllerState<RecordType, Query, Summary>,
) {
  return state.selectedRowKeys
    .map((key) => state.selectedRowMap.get(key))
    .filter((item): item is RecordType => Boolean(item))
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
    selectedRowKeys: [],
    selectedRowMap: new Map<Key, RecordType>(),
    expandedRowKeys: [],
    sortField: undefined,
    sortOrder: null,
    requestSeq: 0,
    queryRequest: config.queryRequest,
    summaryRequest: config.summaryRequest,
    rowKey: config.rowKey,
  }))
  let listAbortController: AbortController | null = null
  let summaryAbortController: AbortController | null = null
  let summaryRequestSeq = 0

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

  const resolveRequestFilters = (
    state: InternalControllerState<RecordType, Query, Summary>,
  ) => state.committedQuery

  const performRequest = async (
    filters: Query,
    options: { commitFilters?: boolean; resetPage?: boolean } = {},
  ) => {
    const state = store.getState()
    const { queryRequest, summaryRequest } = state
    const requestParams = assembleRequestParams(
      filters,
      state.currentPage,
      state.pageSize,
      state.sortField,
      state.sortOrder,
    )
    const commitFilters = options.commitFilters === true

    if (!queryRequest) {
      abortAllRequests()
      store.setState({
        ...(commitFilters
          ? {
              query: cloneQuery(filters),
              committedQuery: cloneQuery(filters),
            }
          : {}),
        latestParams: requestParams,
      })
      return
    }

    abortListRequest()
    listAbortController = new AbortController()
    const listSignal = listAbortController.signal
    const requestSeq = state.requestSeq + 1

    store.setState({
      loading: true,
      requested: true,
      requestReady: true,
      requestSeq,
      ...(commitFilters
        ? {
            query: cloneQuery(filters),
            committedQuery: cloneQuery(filters),
          }
        : {}),
      latestParams: requestParams,
    })

    const shouldFetchSummary = options.resetPage !== false && typeof summaryRequest === 'function'
    let summaryPromise: Promise<Summary | undefined> | undefined
    let summarySignal: AbortSignal | undefined
    let summarySeq: number | undefined

    const commitSummary = (summaryResult: Summary | undefined) => {
      if (
        summarySeq === undefined ||
        summaryResult === undefined ||
        summarySignal?.aborted ||
        summarySeq !== summaryRequestSeq
      ) {
        return
      }

      store.setState({ summary: summaryResult })
    }

    if (shouldFetchSummary && summaryRequest) {
      abortSummaryRequest()
      summaryAbortController = new AbortController()
      summarySignal = summaryAbortController.signal
      summarySeq = summaryRequestSeq + 1
      summaryRequestSeq = summarySeq
      summaryPromise = summaryRequest(requestParams, { signal: summarySignal }).catch((error) => {
        if (summarySignal && isAbortError(error, summarySignal)) {
          return undefined
        }

        throw error
      })
      void summaryPromise.catch(() => undefined)
    }

    try {
      const listResult = await queryRequest(requestParams, { signal: listSignal })

      if (store.getState().requestSeq !== requestSeq) {
        return
      }

      const summaryResult = summaryPromise ? await summaryPromise : undefined
      if (store.getState().requestSeq !== requestSeq) {
        commitSummary(summaryResult)
        return
      }

      store.setState((current) => ({
        dataSource: listResult.data ?? [],
        total: typeof listResult.total === 'number' ? listResult.total : current.total,
        summary: summaryResult === undefined ? current.summary : summaryResult,
        loading: false,
        inquired: true,
      }))
    } catch (error) {
      if (isAbortError(error, listSignal)) {
        summaryPromise?.then(commitSummary, () => undefined)
        return
      }

      if (store.getState().requestSeq === requestSeq) {
        store.setState({ loading: false })
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
        const nextRowKey = nextConfig.rowKey ?? state.rowKey
        const nextRequestReady = Boolean(nextQueryRequest)

        if (
          isQueryEqual(state.defaultQuery, nextDefaultQuery) &&
          nextQueryRequest === state.queryRequest &&
          nextSummaryRequest === state.summaryRequest &&
          Object.is(nextRowKey, state.rowKey) &&
          nextRequestReady === state.requestReady
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
        }
      })
    },
    setViewState: (viewState) => {
      const { query, sorter, committed = false } = viewState
      store.setState((state) => {
        // eslint-disable-next-line e18e/prefer-object-has-own -- current TS lib target does not expose Object.hasOwn
        const hasSorter = Object.prototype.hasOwnProperty.call(viewState, 'sorter')
        const nextSortField = hasSorter ? sorter?.field : state.sortField
        const nextSortOrder = hasSorter
          ? isValidSortOrder(sorter?.order)
            ? sorter.order
            : null
          : state.sortOrder

        return {
          query: cloneQuery(query),
          committedQuery: committed ? cloneQuery(query) : state.committedQuery,
          sortField: nextSortField,
          sortOrder: nextSortOrder,
        }
      })
    },
    setQueryField: (key, value) => {
      store.setState((state) => {
        if (isSearchValueEqual((state.query as Record<string, unknown>)[key], value)) {
          return state
        }

        return {
          query: setQueryValue(state.query, key, value),
        }
      })
    },
    setQuery: (patch) => {
      store.setState((state) => {
        if (isQueryPatchEqual(state.query, patch)) {
          return state
        }

        return {
          query: mergeQueryPatch(state.query, patch),
        }
      })
    },
    resetQuery: (patch) => {
      store.setState((state) => ({
        query: patch ? mergeQueryPatch(state.defaultQuery, patch) : cloneQuery(state.defaultQuery),
      }))
    },
    submitQuery: async (options) => {
      const resetPage = options?.resetPage !== false
      const filters = store.getState().query

      store.setState((current) => ({
        currentPage: resetPage ? 1 : current.currentPage,
        selectedRowKeys:
          resetPage && current.selectedRowKeys.length > 0 ? [] : current.selectedRowKeys,
      }))

      await performRequest(filters, { commitFilters: true, resetPage })
    },
    reload: async () => {
      const state = store.getState()
      await performRequest(resolveRequestFilters(state), { resetPage: false })
    },
    setPage: async (page) => {
      store.setState({ currentPage: page })
      const state = store.getState()
      await performRequest(resolveRequestFilters(state), { resetPage: false })
    },
    setPageSize: async (pageSize) => {
      store.setState((current) => ({
        currentPage: 1,
        pageSize,
        selectedRowKeys: current.selectedRowKeys.length === 0 ? current.selectedRowKeys : [],
      }))
      const state = store.getState()
      await performRequest(resolveRequestFilters(state), { resetPage: true })
    },
    setSort: async (field, order) => {
      const nextSortOrder = isValidSortOrder(order) ? order : null
      const state = store.getState()

      if (state.sortField === field && state.sortOrder === nextSortOrder) {
        return
      }

      store.setState((current) => ({
        sortField: field,
        sortOrder: nextSortOrder,
        currentPage: 1,
        selectedRowKeys: current.selectedRowKeys.length === 0 ? current.selectedRowKeys : [],
      }))

      await performRequest(resolveRequestFilters(store.getState()), { resetPage: true })
    },
    setDataSource: (rows, total) => {
      store.setState({
        dataSource: rows,
        total: typeof total === 'number' ? total : rows.length,
      })
    },
    patchRow: (uniqueKey, targetValue, patch) => {
      store.setState((state) => ({
        dataSource: state.dataSource.map((row) =>
          row[uniqueKey] === targetValue
            ? ({
                ...row,
                ...patch,
              } as RecordType)
            : row,
        ),
      }))
    },
    setSelectedRowKeys: (keys, rows) => {
      store.setState((state) => {
        if (!rows && areKeyArraysEqual(state.selectedRowKeys, keys)) {
          return state
        }

        const nextMap = new Map(state.selectedRowMap)
        const list = rows ?? state.dataSource

        list.forEach((record, index) => {
          const recordKey = getRowRecordKey(state.rowKey, record, index)
          if (recordKey !== undefined && keys.includes(recordKey)) {
            nextMap.set(recordKey, record)
          }
        })

        return {
          selectedRowKeys: keys,
          selectedRowMap: nextMap,
        }
      })
    },
    getSelectedRows: () => collectSelectedRows(store.getState()),
    setExpandedRowKeys: (keys) => {
      store.setState((state) =>
        areKeyArraysEqual(state.expandedRowKeys, keys) ? state : { expandedRowKeys: keys },
      )
    },
    expandAllRows: () => {
      const state = store.getState()
      store.setState({
        expandedRowKeys: getExpandedKeys(state.dataSource, state.rowKey),
      })
    },
    collapseAllRows: () => {
      store.setState((state) =>
        state.expandedRowKeys.length === 0 ? state : { expandedRowKeys: [] },
      )
    },
    getRequestParams: () => {
      const state = store.getState()
      return assembleRequestParams(
        resolveRequestFilters(state),
        state.currentPage,
        state.pageSize,
        state.sortField,
        state.sortOrder,
      )
    },
  };
  (controller as AbortableProTableController<RecordType, Query, Summary>)[CANCEL_REQUESTS] =
    abortAllRequests

  return controller
}

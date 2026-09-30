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
  let lastSettledIdentity = {
    committedQuery: cloneQuery(defaultQuery),
    currentPage: defaultCurrent,
    pageSize: defaultPageSize,
    sortField: undefined as string | undefined,
    sortOrder: null as 'ascend' | 'descend' | null,
    latestParams: null as ProTableRequestParams<Query> | null,
    selectedRowKeys: [] as Key[],
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
      sortField: current.sortField,
      sortOrder: current.sortOrder ?? null,
      latestParams: current.latestParams
        ? ({ ...current.latestParams } as ProTableRequestParams<Query>)
        : null,
      selectedRowKeys: [...current.selectedRowKeys],
    }
  }

  const restoreSettledIdentity = () => {
    store.setState({
      committedQuery: cloneQuery(lastSettledIdentity.committedQuery),
      currentPage: lastSettledIdentity.currentPage,
      pageSize: lastSettledIdentity.pageSize,
      sortField: lastSettledIdentity.sortField,
      sortOrder: lastSettledIdentity.sortOrder,
      latestParams: lastSettledIdentity.latestParams
        ? ({ ...lastSettledIdentity.latestParams } as ProTableRequestParams<Query>)
        : null,
      selectedRowKeys: [...lastSettledIdentity.selectedRowKeys],
      loading: false,
    })
  }

  const dispatchRequest = async (input: {
    filters: Query
    currentPage: number
    pageSize: number
    sortField: string | undefined
    sortOrder: 'ascend' | 'descend' | null | undefined
    commitDraft: boolean
    clearSelection: boolean
  }) => {
    const state = store.getState()
    const requestParams = assembleRequestParams(
      input.filters,
      input.currentPage,
      input.pageSize,
      input.sortField,
      input.sortOrder,
    )
    const snapshot = {
      currentPage: input.currentPage,
      pageSize: input.pageSize,
      sortField: input.sortField,
      sortOrder: input.sortOrder ?? null,
      latestParams: requestParams,
      ...(input.commitDraft
        ? {
            query: cloneQuery(input.filters),
            committedQuery: cloneQuery(input.filters),
          }
        : {}),
      ...(input.clearSelection && state.selectedRowKeys.length > 0 ? { selectedRowKeys: [] } : {}),
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

      store.setState((current) => ({
        dataSource: listResult.data ?? [],
        total: typeof listResult.total === 'number' ? listResult.total : current.total,
        ...(summaryRequest ? { summary: summaryResult } : {}),
        loading: false,
        inquired: true,
      }))
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
      const state = store.getState()
      await dispatchRequest({
        filters: state.query,
        currentPage: resetPage ? 1 : state.currentPage,
        pageSize: state.pageSize,
        sortField: state.sortField,
        sortOrder: state.sortOrder,
        commitDraft: true,
        clearSelection: resetPage,
      })
    },
    reload: async () => {
      const state = store.getState()
      await dispatchRequest({
        filters: state.committedQuery,
        currentPage: state.currentPage,
        pageSize: state.pageSize,
        sortField: state.sortField,
        sortOrder: state.sortOrder,
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
        sortField: state.sortField,
        sortOrder: state.sortOrder,
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
        sortField: state.sortField,
        sortOrder: state.sortOrder,
        commitDraft: false,
        clearSelection: true,
      })
    },
    setSort: async (field, order) => {
      const nextSortOrder = isValidSortOrder(order) ? order : null
      const state = store.getState()

      if (state.sortField === field && state.sortOrder === nextSortOrder) {
        return
      }

      await dispatchRequest({
        filters: state.committedQuery,
        currentPage: 1,
        pageSize: state.pageSize,
        sortField: field,
        sortOrder: nextSortOrder,
        commitDraft: false,
        clearSelection: true,
      })
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
        state.committedQuery,
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

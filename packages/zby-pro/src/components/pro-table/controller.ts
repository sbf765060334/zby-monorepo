import type { Key } from 'react'
import { createStore } from 'zustand/vanilla'

import type {
  ProTableController,
  ProTableControllerConfig,
  ProTableControllerState,
  ProTableViewSorter,
} from './interface'
import { isSearchValueEqual } from './utils/search'

const CANCEL_REQUESTS = Symbol('ProTableCancelRequests')

type InternalControllerState<RecordType, Query, Summary> = ProTableControllerState<
  RecordType,
  Query,
  Summary
> & {
  selectedRowMap: Map<Key, RecordType>;
  requestSeq: number;
  queryRequest?: ProTableControllerConfig<RecordType, Query, Summary>['queryRequest'];
  summaryRequest?: ProTableControllerConfig<RecordType, Query, Summary>['summaryRequest'];
  rowKey?: ProTableControllerConfig<RecordType, Query, Summary>['rowKey'];
  pageKey: string;
  pageSizeKey: string;
  sortByKey: string;
  sortOrderKey: string;
}

type AbortableProTableController<RecordType, Query, Summary> = ProTableController<
  RecordType,
  Query,
  Summary
> & {
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

function getPageValue<Query>(query: Query, key: string, fallback: number) {
  const value = (query as Record<string, unknown>)?.[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function buildPagePatch(pageKey: string, pageSizeKey: string, current: number, pageSize: number) {
  return {
    [pageKey]: current,
    [pageSizeKey]: pageSize,
  }
}

function isValidSortOrder(order: unknown): order is ProTableViewSorter['order'] {
  return order === 'ascend' || order === 'descend'
}

function applySortParams<Query extends Record<string, unknown>>(
  query: Query,
  state: Pick<
    InternalControllerState<any, Query, any>,
    'sortByKey' | 'sortField' | 'sortOrder' | 'sortOrderKey'
  >,
): Query {
  const nextQuery = {
    ...(query as Record<string, unknown>),
  }

  if (state.sortField && isValidSortOrder(state.sortOrder)) {
    nextQuery[state.sortByKey] = state.sortField
    nextQuery[state.sortOrderKey] = state.sortOrder
  } else {
    delete nextQuery[state.sortByKey]
    delete nextQuery[state.sortOrderKey]
  }

  return nextQuery as Query
}

function omitSortParams<Query extends Record<string, unknown>>(
  query: Query,
  state: Pick<InternalControllerState<any, Query, any>, 'sortByKey' | 'sortOrderKey'>,
): Query {
  const nextQuery = {
    ...(query as Record<string, unknown>),
  }

  delete nextQuery[state.sortByKey]
  delete nextQuery[state.sortOrderKey]

  return nextQuery as Query
}

function collectSelectedRows<RecordType, Query, Summary>(
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
  const pageKey = config.pagination?.pageKey ?? 'page'
  const pageSizeKey = config.pagination?.pageSizeKey ?? 'pageSize'
  const sortByKey = config.sort?.sortByKey ?? 'sortBy'
  const sortOrderKey = config.sort?.sortOrderKey ?? 'sortOrder'
  const defaultCurrent = config.pagination?.defaultCurrent ?? 1
  const defaultPageSize = config.pagination?.defaultPageSize ?? 10
  const defaultQuery = mergeQueryPatch(
    {
      ...buildPagePatch(pageKey, pageSizeKey, defaultCurrent, defaultPageSize),
    } as Query,
    (config.defaultQuery ?? {}) as Partial<Query>,
  )

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
    pageKey,
    pageSizeKey,
    sortByKey,
    sortOrderKey,
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

  const performRequest = async (
    nextQuery: Query,
    options: { resetPage?: boolean; useCommittedQueryForPaging?: boolean } = {},
  ) => {
    const state = store.getState()
    const { queryRequest, summaryRequest } = state

    if (!queryRequest) {
      abortAllRequests()
      const resultQuery = cloneQuery(nextQuery)
      store.setState({
        query: resultQuery,
        committedQuery: cloneQuery(resultQuery),
        latestParams: applySortParams(resultQuery, state),
        currentPage: getPageValue(resultQuery, state.pageKey, defaultCurrent),
        pageSize: getPageValue(resultQuery, state.pageSizeKey, defaultPageSize),
      })
      return
    }

    abortListRequest()
    listAbortController = new AbortController()
    const listSignal = listAbortController.signal
    const requestSeq = state.requestSeq + 1
    const resultQuery = cloneQuery(nextQuery)
    const requestQuery = applySortParams(resultQuery, state)

    store.setState({
      loading: true,
      requested: true,
      requestReady: true,
      requestSeq,
      query: cloneQuery(resultQuery),
      committedQuery: cloneQuery(resultQuery),
      latestParams: cloneQuery(requestQuery),
      currentPage: getPageValue(resultQuery, state.pageKey, defaultCurrent),
      pageSize: getPageValue(resultQuery, state.pageSizeKey, defaultPageSize),
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
      summaryPromise = summaryRequest(requestQuery, { signal: summarySignal }).catch((error) => {
        if (summarySignal && isAbortError(error, summarySignal)) {
          return undefined
        }

        throw error
      })
      void summaryPromise.catch(() => undefined)
    }

    try {
      const listResult = await queryRequest(requestQuery, { signal: listSignal })

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
        currentPage: getPageValue(resultQuery, current.pageKey, current.currentPage),
        pageSize: getPageValue(resultQuery, current.pageSizeKey, current.pageSize),
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
    getState: () => {
      const state = store.getState()

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
    },
    subscribe: (listener) =>
      store.subscribe((state) => {
        listener({
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
        })
      }),
    configure: (nextConfig) => {
      store.setState((state) => {
        const nextDefaultQuery =
          nextConfig.defaultQuery === undefined
            ? state.defaultQuery
            : mergeQueryPatch(
                nextConfig.defaultQuery as Query,
                {
                  ...buildPagePatch(
                    state.pageKey,
                    state.pageSizeKey,
                    getPageValue(nextConfig.defaultQuery as Query, state.pageKey, defaultCurrent),
                    getPageValue(
                      nextConfig.defaultQuery as Query,
                      state.pageSizeKey,
                      defaultPageSize,
                    ),
                  ),
                } as Partial<Query>,
              )
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
        const nextQuery = omitSortParams(query, state)

        return {
          query: cloneQuery(nextQuery),
          committedQuery: committed ? cloneQuery(nextQuery) : state.committedQuery,
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
      const state = store.getState()
      const resetPage = options?.resetPage !== false
      const nextQuery = resetPage
        ? mergeQueryPatch(state.query, {
            [state.pageKey]: 1,
          } as Partial<Query>)
        : state.query

      if (resetPage) {
        store.setState((current) =>
          current.selectedRowKeys.length === 0 ? current : { selectedRowKeys: [] },
        )
      }

      await performRequest(nextQuery, { resetPage })
    },
    reload: async () => {
      const state = store.getState()
      const fallbackQuery = state.inquired ? state.committedQuery : state.query
      const nextQuery = mergeQueryPatch(fallbackQuery, {
        [state.pageKey]: getPageValue(state.query, state.pageKey, defaultCurrent),
        [state.pageSizeKey]: getPageValue(state.query, state.pageSizeKey, defaultPageSize),
      } as Partial<Query>)

      await performRequest(nextQuery, { resetPage: false, useCommittedQueryForPaging: true })
    },
    setPage: async (page) => {
      const state = store.getState()
      const nextQuery = mergeQueryPatch(state.inquired ? state.committedQuery : state.query, {
        [state.pageKey]: page,
        [state.pageSizeKey]: getPageValue(state.query, state.pageSizeKey, defaultPageSize),
      } as Partial<Query>)

      store.setState({ query: cloneQuery(nextQuery) })
      await performRequest(nextQuery, { resetPage: false, useCommittedQueryForPaging: true })
    },
    setPageSize: async (pageSize) => {
      const state = store.getState()
      const nextQuery = mergeQueryPatch(state.inquired ? state.committedQuery : state.query, {
        [state.pageKey]: 1,
        [state.pageSizeKey]: pageSize,
      } as Partial<Query>)

      store.setState((current) => ({
        query: cloneQuery(nextQuery),
        selectedRowKeys: current.selectedRowKeys.length === 0 ? current.selectedRowKeys : [],
      }))
      await performRequest(nextQuery, { resetPage: true })
    },
    setSort: async (field, order) => {
      const nextSortOrder = isValidSortOrder(order) ? order : null
      const state = store.getState()

      if (state.sortField === field && state.sortOrder === nextSortOrder) {
        return
      }

      store.setState({
        sortField: field,
        sortOrder: nextSortOrder,
      })

      await controller.submitQuery({ resetPage: true })
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
  };
  (controller as AbortableProTableController<RecordType, Query, Summary>)[CANCEL_REQUESTS] =
    abortAllRequests

  return controller
}

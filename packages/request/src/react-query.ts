import {
  QueryClient,
  queryOptions as tanstackQueryOptions,
  type DataTag,
  type DefinedInitialDataOptions,
  type DefaultError,
  type MutationOptions,
  type QueryClientConfig,
  type QueryKey,
  type UndefinedInitialDataOptions,
} from '@tanstack/react-query'
import { isApiError } from '@zby/request'
import {
  getMaxRetries,
  getOrCreateMutationLifecycle,
  getOrCreateSignalLifecycle,
  releaseMutationLifecycle,
  releaseSignalLifecycle,
  resolveWillRetry,
  runWithLifecycle,
  type RetryValue,
} from '@zby/request/internal'

export const DEFAULT_MAX_RETRIES = 2

export type RequestQueryClientConfig = QueryClientConfig

export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isApiError(error) && (error.businessError || error.sessionInvalid)) {
    return false
  }
  return failureCount < DEFAULT_MAX_RETRIES
}

export function createQueryClient(config: RequestQueryClientConfig = {}): QueryClient {
  return new QueryClient({
    ...config,
    defaultOptions: {
      ...config.defaultOptions,
      queries: {
        retry: shouldRetry,
        ...config.defaultOptions?.queries,
      },
      mutations: {
        retry: shouldRetry,
        ...config.defaultOptions?.mutations,
      },
    },
  })
}

export function queryOptions<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: UndefinedInitialDataOptions<TQueryFnData, TError, TData, TQueryKey>,
): UndefinedInitialDataOptions<TQueryFnData, TError, TData, TQueryKey> & {
  queryKey: DataTag<TQueryKey, TData>
}

export function queryOptions<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: DefinedInitialDataOptions<TQueryFnData, TError, TData, TQueryKey>,
): DefinedInitialDataOptions<TQueryFnData, TError, TData, TQueryKey> & {
  queryKey: DataTag<TQueryKey, TData>
}

export function queryOptions(options: unknown): unknown {
  return tanstackQueryOptions(wrapQueryOptions(options as QueryOptionsLike) as never)
}

export function mutationOptions<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
>(
  options: MutationOptions<TData, TError, TVariables, TContext>,
): MutationOptions<TData, TError, TVariables, TContext> {
  const retryValue = (options.retry as RetryValue | undefined) ?? shouldRetry
  const maxRetries = maxRetriesFor(retryValue)
  const mutationFn = options.mutationFn

  return {
    ...options,
    retry: (failureCount, error) => resolveWillRetry(retryValue, failureCount, error),
    mutationFn: mutationFn
      ? (variables, context) => {
          const lifecycle = getOrCreateMutationLifecycle(context, retryValue, maxRetries)
          return runWithLifecycle(lifecycle, () =>
            Promise.resolve(mutationFn(variables, context)).then((data) => {
              releaseMutationLifecycle(context)
              return data
            }))
        }
      : mutationFn,
  }
}

type QueryOptionsLike = {
  queryFn?: (context: { signal?: AbortSignal }) => unknown
  retry?: RetryValue
}

function wrapQueryOptions<TOptions extends QueryOptionsLike>(options: TOptions): TOptions {
  const retryValue = options.retry ?? shouldRetry
  const maxRetries = maxRetriesFor(retryValue)
  const queryFn = options.queryFn

  return {
    ...options,
    retry: (failureCount: number, error: unknown) => resolveWillRetry(retryValue, failureCount, error),
    queryFn: queryFn
      ? (context: { signal?: AbortSignal }) => {
          const lifecycle = getOrCreateSignalLifecycle(context.signal, retryValue, maxRetries)
          return runWithLifecycle(lifecycle, () =>
            Promise.resolve(queryFn(context)).then((data) => {
              releaseSignalLifecycle(context.signal)
              return data
            }))
        }
      : queryFn,
  }
}

function maxRetriesFor(retry: RetryValue): number {
  return retry === shouldRetry ? DEFAULT_MAX_RETRIES : getMaxRetries(retry)
}

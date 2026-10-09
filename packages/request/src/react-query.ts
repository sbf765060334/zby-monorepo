import {
  QueryClient,
  queryOptions as tanstackQueryOptions,
  type DataTag,
  type DefinedInitialDataOptions,
  type DefaultError,
  type MutationFunctionContext,
  type MutationOptions,
  type QueryClientConfig,
  type QueryKey,
  type UndefinedInitialDataOptions,
} from '@tanstack/react-query'
import { isApiError } from '@zby/request'
import {
  getMaxRetries,
  getOrCreateSignalLifecycle,
  releaseSignalLifecycle,
  resolveWillRetry,
  wasSignalObserved,
  type RetryValue,
} from '@zby/request/internal'

export const DEFAULT_MAX_RETRIES = 2

export type RequestQueryClientConfig = QueryClientConfig

export type RequestMutationContext = MutationFunctionContext & {
  signal: AbortSignal
}

const QUERY_SIGNAL_WARNING = '[@zby/request] 把 queryFn 收到的 signal 传给请求客户端，同一次查询的取消和重试才会作用在同一次请求上。'
const mutationSignals = new WeakMap<object, AbortSignal>()
const warnedSignals = new WeakSet<AbortSignal>()
let warnedMissingQuerySignal = false

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

/**
 * 同一次 fetch 的取消和重试共用 `queryFn` 收到的 `signal`。
 * 调用请求客户端时把这个 `signal` 传进去。
 */
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

/**
 * 同一次 `execute` 的重试共用 `context.signal`。
 * `mutationFn` 调用请求客户端时传入它；客户端再把它和超时信号合并。
 */
export function mutationOptions<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
>(
  options: Omit<MutationOptions<TData, TError, TVariables, TContext>, 'mutationFn'> & {
    mutationFn?: (variables: TVariables, context: RequestMutationContext) => Promise<TData>
  },
): MutationOptions<TData, TError, TVariables, TContext> {
  const retryValue = (options.retry as RetryValue | undefined) ?? shouldRetry
  const maxRetries = maxRetriesFor(retryValue)
  const mutationFn = options.mutationFn

  return {
    ...options,
    retry: (failureCount, error) => resolveWillRetry(retryValue, failureCount, error),
    mutationFn: mutationFn
      ? (variables, context) => {
          const signal = signalForMutation(context)
          getOrCreateSignalLifecycle(signal, retryValue, maxRetries)
          return Promise.resolve(mutationFn(variables, { ...context, signal })).then((data) => {
            mutationSignals.delete(context)
            releaseSignalLifecycle(signal)
            return data
          })
        }
      : undefined,
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
          const { signal } = context
          if (signal) getOrCreateSignalLifecycle(signal, retryValue, maxRetries)
          return Promise.resolve(queryFn(context)).then((data) => {
            releaseSignalLifecycle(signal)
            return data
          }).finally(() => {
            warnIfQuerySignalUnused(signal)
          })
        }
      : queryFn,
  }
}

function maxRetriesFor(retry: RetryValue): number {
  return retry === shouldRetry ? DEFAULT_MAX_RETRIES : getMaxRetries(retry)
}

function signalForMutation(context: object): AbortSignal {
  const current = mutationSignals.get(context)
  if (current) return current

  const signal = new AbortController().signal
  mutationSignals.set(context, signal)
  return signal
}

declare const process: { env: { NODE_ENV?: string } }

function warnIfQuerySignalUnused(signal: AbortSignal | undefined): void {
  if (process.env.NODE_ENV === 'production') return
  if (!signal) {
    if (warnedMissingQuerySignal) return
    warnedMissingQuerySignal = true
    console.warn(QUERY_SIGNAL_WARNING)
    return
  }
  if (wasSignalObserved(signal) || warnedSignals.has(signal)) return
  warnedSignals.add(signal)
  console.warn(QUERY_SIGNAL_WARNING)
}

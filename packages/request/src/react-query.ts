/**
 * TanStack Query 适配。
 *
 * createQueryClient 只负责默认重试策略。createRequestQuery 把同一次查询或 mutation 的
 * signal 绑到回调里的 request 上，取消和重试次数才会落在同一次请求上。
 * 回调里继续使用外部 apiClient 时，开发环境会警告一次。
 */
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
import { isApiError, type ApiClient, type MethodOptions, type RequestBody, type RequestOptions } from '@zby/request'
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
  request: ApiClient
}

const SIGNAL_WARNING = '[@zby/request] 使用 queryFn / mutationFn 收到的 request 发请求，同一次查询或 mutation 的取消和重试才会作用在同一次请求上。'
const mutationSignals = new WeakMap<object, AbortSignal>()
const warnedSignals = new WeakSet<AbortSignal>()
let warnedMissingSignal = false

/**
 * 默认重试。业务失败和登录失效不重试。
 * 网络错误、超时和其它非业务失败最多再试 2 次，加上第一次一共 3 次。
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isApiError(error) && (error.businessError || error.sessionInvalid)) {
    return false
  }
  return failureCount < DEFAULT_MAX_RETRIES
}

/** 创建带默认重试的 QueryClient。调用方自己的 retry 会覆盖这个默认值。 */
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

type WithBoundRequest<TOptions> = TOptions extends { queryFn?: infer TQueryFn }
  ? Omit<TOptions, 'queryFn'> & {
    queryFn?: TQueryFn extends (context: infer TContext) => infer TResult
      ? (context: TContext & { request: ApiClient }) => TResult
      : TQueryFn
  }
  : TOptions

export type RequestQuery = {
  queryOptions: {
    <
      TQueryFnData = unknown,
      TError = DefaultError,
      TData = TQueryFnData,
      TQueryKey extends QueryKey = QueryKey,
    >(
      options: WithBoundRequest<UndefinedInitialDataOptions<TQueryFnData, TError, TData, TQueryKey>>,
    ): UndefinedInitialDataOptions<TQueryFnData, TError, TData, TQueryKey> & {
      queryKey: DataTag<TQueryKey, TData>
    }
    <
      TQueryFnData = unknown,
      TError = DefaultError,
      TData = TQueryFnData,
      TQueryKey extends QueryKey = QueryKey,
    >(
      options: WithBoundRequest<DefinedInitialDataOptions<TQueryFnData, TError, TData, TQueryKey>>,
    ): DefinedInitialDataOptions<TQueryFnData, TError, TData, TQueryKey> & {
      queryKey: DataTag<TQueryKey, TData>
    }
  }
  mutationOptions: <
    TData = unknown,
    TError = Error,
    TVariables = void,
    TContext = unknown,
  >(
    options: Omit<MutationOptions<TData, TError, TVariables, TContext>, 'mutationFn'> & {
      mutationFn?: (variables: TVariables, context: RequestMutationContext) => Promise<TData>
    },
  ) => MutationOptions<TData, TError, TVariables, TContext>
}

/**
 * `queryFn` / `mutationFn` 收到的 `request` 已经带上这次的 `signal`。
 * 用它发请求时，取消和重试都落在同一次查询或 mutation 上。
 */
export function createRequestQuery(client: ApiClient): RequestQuery {
  return {
    queryOptions(options) {
      return tanstackQueryOptions(wrapQueryOptions(client, options as QueryOptionsLike) as never)
    },
    mutationOptions(options) {
      return bindMutationOptions(client, options)
    },
  }
}

type QueryOptionsLike = {
  queryFn?: (context: { signal?: AbortSignal, request: ApiClient }) => unknown
  retry?: RetryValue
}

function wrapQueryOptions(client: ApiClient, options: QueryOptionsLike) {
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
          const request = signal ? bindClient(client, signal) : client
          return Promise.resolve(queryFn({ ...context, request })).then((data) => {
            releaseSignalLifecycle(signal)
            return data
          }).finally(() => {
            warnIfSignalUnused(signal)
          })
        }
      : queryFn,
  }
}

function bindMutationOptions<
  TData,
  TError,
  TVariables,
  TContext,
>(
  client: ApiClient,
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
          const request = bindClient(client, signal)
          return Promise.resolve(mutationFn(variables, { ...context, signal, request })).then((data) => {
            mutationSignals.delete(context)
            releaseSignalLifecycle(signal)
            return data
          }).finally(() => {
            warnIfSignalUnused(signal)
          })
        }
      : undefined,
  }
}

/** 每个方法都带上同一次查询或 mutation 的 signal，调用方传入的 signal 不会替换它。 */
function bindClient(client: ApiClient, signal: AbortSignal): ApiClient {
  return {
    request: ((options: RequestOptions) => client.request({ ...options, signal })) as ApiClient['request'],
    requestData: (options) => client.requestData({ ...options, signal }),
    get: ((url: string, options?: MethodOptions) => client.get(url, { ...options, signal })) as ApiClient['get'],
    post: ((url: string, body?: RequestBody, options?: MethodOptions) => client.post(url, body, { ...options, signal })) as ApiClient['post'],
    put: ((url: string, body?: RequestBody, options?: MethodOptions) => client.put(url, body, { ...options, signal })) as ApiClient['put'],
    patch: ((url: string, body?: RequestBody, options?: MethodOptions) => client.patch(url, body, { ...options, signal })) as ApiClient['patch'],
    delete: ((url: string, options?: MethodOptions) => client.delete(url, { ...options, signal })) as ApiClient['delete'],
    getData: (url, options) => client.getData(url, { ...options, signal }),
    postData: (url, body, options) => client.postData(url, body, { ...options, signal }),
    putData: (url, body, options) => client.putData(url, body, { ...options, signal }),
    patchData: (url, body, options) => client.patchData(url, body, { ...options, signal }),
    deleteData: (url, options) => client.deleteData(url, { ...options, signal }),
  }
}

function maxRetriesFor(retry: RetryValue): number {
  return retry === shouldRetry ? DEFAULT_MAX_RETRIES : getMaxRetries(retry)
}

/**
 * TanStack 的 mutation 上下文没有 signal。这里为同一次 execute 生成一个，
 * 重试时复用，成功后丢掉。
 */
function signalForMutation(context: object): AbortSignal {
  const current = mutationSignals.get(context)
  if (current) return current

  const signal = new AbortController().signal
  mutationSignals.set(context, signal)
  return signal
}

declare const process: { env: { NODE_ENV?: string } }

/** 开发环境提示：回调里没有用收到的 request 发请求。生产环境不提示。 */
function warnIfSignalUnused(signal: AbortSignal | undefined): void {
  if (process.env.NODE_ENV === 'production') return
  if (!signal) {
    if (warnedMissingSignal) return
    warnedMissingSignal = true
    console.warn(SIGNAL_WARNING)
    return
  }
  if (wasSignalObserved(signal) || warnedSignals.has(signal)) return
  warnedSignals.add(signal)
  console.warn(SIGNAL_WARNING)
}

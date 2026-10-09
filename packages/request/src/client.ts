/**
 * 业务请求客户端。
 *
 * 一次请求先组好 URL、请求头和 body，再进入 try。组参阶段抛出的是原始错误，
 * 不会变成 ApiError，也不会进 onError。进入 try 之后的失败都会包装成 ApiError。
 *
 * 重试次数只认 options.signal 上登记的生命周期。直接调用 apiClient 时没有这次生命周期，
 * willRetry 为 false，失败会立刻走 onError。查询和 mutation 要使用回调里的 request。
 */
import {
  createErrorRetryContext,
  lookupSignalLifecycle,
} from '@zby/request/internal'

import { ApiError } from './error'
import { fetchTransport } from './transport'
import type {
  ApiClient,
  ApiReportPayload,
  ApiResponse,
  ClientConfig,
  ErrorRetryContext,
  FileResponse,
  HttpMethod,
  JsonMethodOptions,
  JsonRequestOptions,
  MethodOptions,
  RequestBody,
  RequestContext,
  RequestOptions,
} from './types'
import {
  fileNameFromContentDisposition,
  isApiResponse,
  isSessionInvalidResponse,
  isSuccessResponse,
  normalizeBody,
  normalizeMethod,
  resolveHeaders,
  resolveURL,
  selectData,
} from './utils'

const DEFAULT_TIMEOUT = 9000
const TIMEOUT_ERROR_CODE = 'TIMEOUT'

/** 创建一个请求客户端。全局提示放在 onError，单个请求用 silent 跳过提示。 */
export function createClient(config: ClientConfig = {}): ApiClient {
  const transport = config.transport ?? fetchTransport

  async function request<T = unknown>(options: RequestOptions): Promise<ApiResponse<T> | FileResponse> {
    // 先登记这次 signal。URL、headers、body 在 try 之外，失败不会进错误回调。
    const lifecycle = lookupSignalLifecycle(options.signal)
    const method = normalizeMethod(options.method)
    const begin = Date.now()
    const url = resolveURL(options.url, config.baseURL, options.params, config.paramsSerializer)
    const headers = await resolveHeaders(config.headers, options.headers)
    const body = method === 'GET' ? undefined : normalizeBody(options.body, headers)
    const timeout = options.timeout ?? config.timeout ?? DEFAULT_TIMEOUT
    const timeoutController = new AbortController()
    const timer = timeout > 0
      ? setTimeout(() => {
          timeoutController.abort(createTimeoutReason(timeout))
        }, timeout)
      : undefined
    const linked = timeout > 0
      ? linkAbortSignals(options.signal, timeoutController.signal)
      : { signal: options.signal, dispose: () => {} }

    try {
      const rawResponse = await transport({
        url,
        method,
        headers,
        body,
        credentials: options.credentials ?? config.credentials,
        signal: linked.signal,
        responseType: options.responseType,
      })
      const duration = Date.now() - begin
      const context: RequestContext = {
        url: rawResponse.url || url,
        method,
        begin,
        duration,
        status: rawResponse.status,
      }
      const responseBody = await readResponseBody(rawResponse.body, rawResponse.headers, options.responseType)

      // 文件响应。JSON 业务包已在 readResponseBody 里还原，不会走到这里。
      if (options.responseType === 'blob' && responseBody instanceof Blob) {
        if (!rawResponse.ok) throw createHttpError(responseBody, context)
        return {
          blob: responseBody,
          fileName: fileNameFromContentDisposition(rawResponse.headers.get('content-disposition')),
        }
      }

      if (!rawResponse.ok) {
        throw createHttpError(responseBody, context)
      }

      if (!isApiResponse(responseBody)) {
        throw new ApiError({
          message: 'Invalid API response',
          status: rawResponse.status,
          url: context.url,
          method,
          begin: context.begin,
          duration: context.duration,
        })
      }

      const response = responseBody as ApiResponse<T>
      if (isSuccessResponse(response, context, config)) {
        // 要文件却拿到成功的 JSON 业务包，按协议错误处理，不把 JSON 当文件返回。
        if (options.responseType === 'blob') {
          throw new ApiError({
            message: 'Expected a file response',
            response,
            errCode: response.errCode,
            errMessage: response.errMessage,
            traceId: response.traceId,
            status: context.status,
            url: context.url,
            method: context.method,
            begin: context.begin,
            duration: context.duration,
            businessError: false,
          })
        }
        return response
      }

      const sessionInvalid = isSessionInvalidResponse(response, context, config)
      throw createBusinessError(response, context, sessionInvalid)
    } catch (error) {
      // 调用方主动取消时原样抛出，不记超时，也不弹错误。
      if (options.signal?.aborted) {
        throw error
      }

      const apiError = error instanceof ApiError
        ? error
        : timeoutController.signal.aborted
          ? createTimeoutError(error, {
              url,
              method,
              begin,
              duration: Date.now() - begin,
              timeout,
            })
          : new ApiError({
              message: error instanceof Error ? error.message : 'API request failed',
              url,
              method,
              begin,
              duration: Date.now() - begin,
              cause: error,
            })

      notifyError(apiError, config, createErrorRetryContext(apiError, lifecycle), options.silent)
      throw apiError
    } finally {
      if (timer !== undefined) clearTimeout(timer)
      linked.dispose()
    }
  }

  function requestData<T = unknown>(options: JsonRequestOptions): Promise<T | T[] | undefined> {
    return request<T>(options).then((response) => selectResponseData(response as ApiResponse<T>))
  }

  function getData<T = unknown>(
    url: string,
    options?: JsonMethodOptions,
  ): Promise<T | T[] | undefined> {
    return methodRequest<T>('GET', url, options).then((response) => selectResponseData(response as ApiResponse<T>))
  }

  function postData<T = unknown>(
    url: string,
    body?: RequestBody,
    options?: JsonMethodOptions,
  ): Promise<T | T[] | undefined> {
    return methodRequest<T>('POST', url, body, options).then((response) => selectResponseData(response as ApiResponse<T>))
  }

  function putData<T = unknown>(
    url: string,
    body?: RequestBody,
    options?: JsonMethodOptions,
  ): Promise<T | T[] | undefined> {
    return methodRequest<T>('PUT', url, body, options).then((response) => selectResponseData(response as ApiResponse<T>))
  }

  function patchData<T = unknown>(
    url: string,
    body?: RequestBody,
    options?: JsonMethodOptions,
  ): Promise<T | T[] | undefined> {
    return methodRequest<T>('PATCH', url, body, options).then((response) => selectResponseData(response as ApiResponse<T>))
  }

  function deleteData<T = unknown>(
    url: string,
    options?: JsonMethodOptions,
  ): Promise<T | T[] | undefined> {
    return methodRequest<T>('DELETE', url, options).then((response) => selectResponseData(response as ApiResponse<T>))
  }

  function methodRequest<T = unknown>(
    method: HttpMethod,
    url: string,
    bodyOrOptions?: RequestBody | MethodOptions,
    options?: MethodOptions,
  ): Promise<ApiResponse<T> | FileResponse> {
    const requestOptions = method === 'GET' || method === 'DELETE'
      ? { ...(bodyOrOptions as MethodOptions | undefined), url, method }
      : { ...(options ?? {}), url, method, body: bodyOrOptions as RequestBody }
    return request<T>(requestOptions)
  }

  return {
    request: request as ApiClient['request'],
    requestData,
    get: ((url: string, options?: MethodOptions) => methodRequest('GET', url, options)) as ApiClient['get'],
    post: ((url: string, body?: RequestBody, options?: MethodOptions) => methodRequest('POST', url, body, options)) as ApiClient['post'],
    put: ((url: string, body?: RequestBody, options?: MethodOptions) => methodRequest('PUT', url, body, options)) as ApiClient['put'],
    patch: ((url: string, body?: RequestBody, options?: MethodOptions) => methodRequest('PATCH', url, body, options)) as ApiClient['patch'],
    delete: ((url: string, options?: MethodOptions) => methodRequest('DELETE', url, options)) as ApiClient['delete'],
    getData,
    postData,
    putData,
    patchData,
    deleteData,
  }
}

function selectResponseData<T>(response: ApiResponse<T>): T | T[] | undefined {
  return selectData<T>(response)
}

/**
 * 文件请求里如果 Content-Type 是 JSON，按业务包解析。
 * 这样下载接口返回 errCode 失败时，仍走业务错误和登录失效，而不是把错误 JSON 当成文件。
 */
async function readResponseBody(
  body: unknown,
  headers: Headers,
  responseType: RequestOptions['responseType'],
): Promise<unknown> {
  if (responseType !== 'blob' || !(body instanceof Blob)) return body

  const contentType = headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) return body

  const text = await body.text()
  return text ? JSON.parse(text) : undefined
}

function createTimeoutReason(timeout: number): unknown {
  if (typeof DOMException !== 'undefined') {
    return new DOMException(`Request timeout after ${timeout}ms`, 'TimeoutError')
  }

  const error = new Error(`Request timeout after ${timeout}ms`)
  error.name = 'TimeoutError'
  return error
}

function createTimeoutError(
  cause: unknown,
  context: RequestContext & { timeout: number },
): ApiError {
  const message = `Request timeout after ${context.timeout}ms`
  return new ApiError({
    message,
    errCode: TIMEOUT_ERROR_CODE,
    errMessage: message,
    url: context.url,
    method: context.method,
    begin: context.begin,
    duration: context.duration,
    businessError: false,
    timeout: true,
    cause,
  })
}

function createBusinessError<T>(
  response: ApiResponse<T>,
  context: RequestContext,
  sessionInvalid: boolean,
): ApiError<T> {
  return new ApiError({
    message: response.errMessage || 'Business request failed',
    response,
    errCode: response.errCode,
    errMessage: response.errMessage,
    traceId: response.traceId,
    status: context.status,
    url: context.url,
    method: context.method,
    begin: context.begin,
    duration: context.duration,
    sessionInvalid,
    businessError: !sessionInvalid,
  })
}

function createHttpError(body: unknown, context: RequestContext): ApiError {
  const response = isApiResponse(body) ? body : undefined
  return new ApiError({
    message: response?.errMessage || `HTTP request failed with status ${context.status}`,
    response,
    errCode: response?.errCode,
    errMessage: response?.errMessage,
    traceId: response?.traceId,
    status: context.status,
    url: context.url,
    method: context.method,
    begin: context.begin,
    duration: context.duration,
    businessError: false,
  })
}

/**
 * 统一分发失败回调。
 * 登录失效且不再重试时，只调用 onSessionInvalid，不调用 onError 和 onReport。
 * 登录失效但还会重试时，走 onAttemptError 和 onAttemptReport。默认的 shouldRetry 不会重试登录失效。
 * 其它失败先走 onAttemptError 和 onAttemptReport。还会重试就到此为止。
 * 最后一次失败再走 onError 和 onReport。silent 只跳过两个错误回调，上报和登录失效仍执行。
 */
function notifyError(
  error: ApiError,
  config: ClientConfig,
  retryContext: ErrorRetryContext,
  silent = false,
): void {
  if (error.sessionInvalid) {
    if (retryContext.willRetry) {
      const reportPayload = createReportPayload(error)
      if (!silent) config.onAttemptError?.(error, retryContext)
      config.onAttemptReport?.(reportPayload, retryContext)
      return
    }
    config.onSessionInvalid?.(error, retryContext)
    return
  }

  const reportPayload = createReportPayload(error)
  if (!silent) config.onAttemptError?.(error, retryContext)
  config.onAttemptReport?.(reportPayload, retryContext)

  if (retryContext.willRetry) return

  if (!silent) config.onError?.(error, retryContext)
  config.onReport?.(reportPayload, retryContext)
}

function createReportPayload(error: ApiError): ApiReportPayload {
  return {
    api: error.url ?? '',
    success: false,
    time: error.duration ?? 0,
    code: error.errCode ?? error.status ?? 'UNKNOWN',
    msg: error.errMessage ?? error.message,
    begin: error.begin ?? Date.now(),
    traceId: error.traceId ?? '',
    status: error.status,
  }
}

/**
 * 超时和调用方的取消共用一个 signal。
 * 生命周期仍挂在原来的 signal 上，超时合并发生在查完生命周期之后。
 */
function linkAbortSignals(
  userSignal: AbortSignal | undefined,
  timeoutSignal: AbortSignal,
): { signal: AbortSignal, dispose: () => void } {
  if (!userSignal) {
    return { signal: timeoutSignal, dispose: () => {} }
  }
  if (userSignal.aborted) {
    return { signal: userSignal, dispose: () => {} }
  }

  const anySignals = (AbortSignal as AbortSignalConstructor & {
    any?: (signals: AbortSignal[]) => AbortSignal
  }).any
  if (typeof anySignals === 'function') {
    return {
      signal: anySignals.call(AbortSignal, [userSignal, timeoutSignal]),
      dispose: () => {},
    }
  }

  const controller = new AbortController()
  const onAbort = () => {
    if (controller.signal.aborted) return
    const source = userSignal.aborted ? userSignal : timeoutSignal
    controller.abort(source.reason)
  }
  userSignal.addEventListener('abort', onAbort)
  timeoutSignal.addEventListener('abort', onAbort)
  return {
    signal: controller.signal,
    dispose: () => {
      userSignal.removeEventListener('abort', onAbort)
      timeoutSignal.removeEventListener('abort', onAbort)
    },
  }
}

type AbortSignalConstructor = typeof AbortSignal

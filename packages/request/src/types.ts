import type { ApiError } from './error'

export type SingleResponse<T = unknown> = {
  businessSuccess?: boolean
  data?: T
  errCode?: string
  errMessage?: string
  success?: boolean
  traceId?: string
}

export type MultiResponse<T = unknown> = {
  businessSuccess?: boolean
  data?: T[]
  errCode?: string
  errMessage?: string
  success?: boolean
  total?: number
  traceId?: string
}

export type ApiResponse<T = unknown> = (SingleResponse<T> & { total?: number }) | MultiResponse<T>

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export type RequestParams = Record<string, unknown> | URLSearchParams

export type RequestBody = BodyInit | Record<string, unknown> | unknown[] | null | undefined

export type RequestContext = {
  url: string
  method: HttpMethod
  begin: number
  duration: number
  status?: number
}

export type ApiReportPayload = {
  api: string
  success: boolean
  time: number
  code: string | number
  msg: string
  begin: number
  traceId: string
  status?: number
}

export type ErrorRetryContext = {
  attempt: number
  retryCount: number
  maxRetries: number
  maxAttempts: number
  willRetry: boolean
}

export type TransportRequest = {
  url: string
  method: HttpMethod
  headers?: HeadersInit
  body?: BodyInit | null
  credentials?: RequestCredentials
  signal?: AbortSignal
}

export type TransportResponse = {
  ok: boolean
  status: number
  url: string
  headers: Headers
  body: unknown
}

export type Transport = (request: TransportRequest) => Promise<TransportResponse>

export type ClientConfig = {
  baseURL?: string
  headers?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>)
  credentials?: RequestCredentials
  timeout?: number
  successCodes?: string[]
  sessionInvalidCodes?: string[]
  isSuccess?: (response: ApiResponse, context: RequestContext) => boolean
  isSessionInvalid?: (response: ApiResponse, context: RequestContext) => boolean
  onAttemptError?: (error: ApiError, context: ErrorRetryContext) => void
  onError?: (error: ApiError, context: ErrorRetryContext) => void
  onSessionInvalid?: (error: ApiError, context: ErrorRetryContext) => void
  onAttemptReport?: (payload: ApiReportPayload, context: ErrorRetryContext) => void
  onReport?: (payload: ApiReportPayload, context: ErrorRetryContext) => void
  transport?: Transport
  paramsSerializer?: (params: Record<string, unknown>) => string
}

export type RequestOptions = {
  url: string
  method?: HttpMethod
  params?: RequestParams
  body?: RequestBody
  headers?: HeadersInit
  credentials?: RequestCredentials
  timeout?: number
  signal?: AbortSignal
  /** 为 true 时不调用 onAttemptError / onError，错误仍然抛出 */
  silent?: boolean
}

export type MethodOptions = Omit<RequestOptions, 'url' | 'method' | 'body'> & {
  body?: RequestBody
}

export type ApiClient = {
  request: <T = unknown>(options: RequestOptions) => Promise<ApiResponse<T>>
  requestData: <T = unknown>(options: RequestOptions) => Promise<T | T[] | undefined>
  get: <T = unknown>(url: string, options?: MethodOptions) => Promise<ApiResponse<T>>
  post: <T = unknown>(url: string, body?: RequestBody, options?: MethodOptions) => Promise<ApiResponse<T>>
  put: <T = unknown>(url: string, body?: RequestBody, options?: MethodOptions) => Promise<ApiResponse<T>>
  patch: <T = unknown>(url: string, body?: RequestBody, options?: MethodOptions) => Promise<ApiResponse<T>>
  delete: <T = unknown>(url: string, options?: MethodOptions) => Promise<ApiResponse<T>>
  getData: <T = unknown>(url: string, options?: MethodOptions) => Promise<T | T[] | undefined>
  postData: <T = unknown>(url: string, body?: RequestBody, options?: MethodOptions) => Promise<T | T[] | undefined>
  putData: <T = unknown>(url: string, body?: RequestBody, options?: MethodOptions) => Promise<T | T[] | undefined>
  patchData: <T = unknown>(url: string, body?: RequestBody, options?: MethodOptions) => Promise<T | T[] | undefined>
  deleteData: <T = unknown>(url: string, options?: MethodOptions) => Promise<T | T[] | undefined>
}

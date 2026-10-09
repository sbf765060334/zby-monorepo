/**
 * 请求失败时抛出的错误。
 * `errMessage` 保留后端原文，可能是空字符串。
 * `message` 在 `errMessage` 为空时使用英文兜底，页面提示应读取 `errMessage`。
 */
import type { ApiResponse, HttpMethod } from './types'

export type ApiErrorOptions<T = unknown> = {
  message?: string
  response?: ApiResponse<T>
  errCode?: string
  errMessage?: string
  traceId?: string
  status?: number
  url?: string
  method?: HttpMethod
  begin?: number
  duration?: number
  sessionInvalid?: boolean
  businessError?: boolean
  timeout?: boolean
  cause?: unknown
}

export class ApiError<T = unknown> extends Error {
  response?: ApiResponse<T>
  errCode?: string
  errMessage?: string
  traceId?: string
  status?: number
  url?: string
  method?: HttpMethod
  begin?: number
  duration?: number
  sessionInvalid: boolean
  businessError: boolean
  timeout: boolean

  constructor(options: ApiErrorOptions<T> = {}) {
    super(options.message ?? options.errMessage ?? 'API request failed')
    this.name = 'ApiError'
    this.response = options.response
    this.errCode = options.errCode
    this.errMessage = options.errMessage
    this.traceId = options.traceId
    this.status = options.status
    this.url = options.url
    this.method = options.method
    this.begin = options.begin
    this.duration = options.duration
    this.sessionInvalid = options.sessionInvalid ?? false
    this.businessError = options.businessError ?? false
    this.timeout = options.timeout ?? false

    // 工程的 lib 是 ES2020，不能把 cause 传给 Error 构造函数。
    if (options.cause !== undefined) {
      Object.defineProperty(this, 'cause', {
        configurable: true,
        enumerable: false,
        value: options.cause,
        writable: true,
      })
    }
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export function isSessionInvalidError(error: unknown): error is ApiError {
  return isApiError(error) && error.sessionInvalid
}

/** 业务包判断。调用方用它区分后端业务失败和网络、超时等其它失败。 */
export function isBusinessError(error: unknown): error is ApiError {
  return isApiError(error) && error.businessError
}

export function isTimeoutError(error: unknown): error is ApiError {
  return isApiError(error) && error.timeout
}

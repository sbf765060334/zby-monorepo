/**
 * 业务响应和客户端公开类型。
 *
 * 普通接口的成功响应是 HTTP 200 加 `{ errCode: '0', errMessage, data }`。
 * `errCode` 不是成功码时抛 `ApiError`。登录失效码默认是 `100001`、`100002`。
 */
import type { ApiError } from './error'

/** 单条数据。`data` 是一个对象。 */
export type SingleResponse<T = unknown> = {
  businessSuccess?: boolean
  data?: T
  errCode?: string
  errMessage?: string
  success?: boolean
  traceId?: string
}

/** 列表数据。`data` 是数组，`total` 是总条数。 */
export type MultiResponse<T = unknown> = {
  businessSuccess?: boolean
  data?: T[]
  errCode?: string
  errMessage?: string
  success?: boolean
  total?: number
  traceId?: string
}

/** `get` / `post` 等方法成功时返回的完整业务包，不是只返回 `data`。 */
export type ApiResponse<T = unknown> = (SingleResponse<T> & { total?: number }) | MultiResponse<T>

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/**
 * 查询参数。普通对象里的嵌套对象会按 JSON 字符串写入查询串。
 * 索引用 `any`，这样没有索引签名的 interface 也能传入。
 */
export type RequestParams = Record<string, any> | URLSearchParams

/**
 * 请求体。
 * 普通对象、数组和业务 interface 会序列化成 JSON，并在缺少 `Content-Type` 时补上 `application/json`。
 * 索引用 `any`，这样没有索引签名的 interface 也能传入。`Record<string, unknown>` 接不住这种类型。
 * `FormData`、`Blob`、字符串等现成请求体原样发送，不改已有请求头。
 */
export type RequestBody = BodyInit | Record<string, any> | null | undefined

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

/** 一次失败的重试进度。传给错误回调和上报回调。 */
export type ErrorRetryContext = {
  /** 第几次请求，从 1 开始。 */
  attempt: number
  /** 已经失败的次数，从 0 开始。 */
  retryCount: number
  /** 允许的重试次数。自定义 `retry` 函数没有固定上限时是 `Infinity`。 */
  maxRetries: number
  /** `maxRetries + 1`。没有固定上限时是 `Infinity`。 */
  maxAttempts: number
  /** 这次失败之后还会不会再请求。 */
  willRetry: boolean
}

export type TransportRequest = {
  url: string
  method: HttpMethod
  headers?: HeadersInit
  body?: BodyInit | null
  credentials?: RequestCredentials
  signal?: AbortSignal
  responseType?: 'blob'
}

export type TransportResponse = {
  ok: boolean
  status: number
  url: string
  headers: Headers
  body: unknown
}

export type Transport = (request: TransportRequest) => Promise<TransportResponse>

/** `createClient` 的配置。回调在错误抛出之前执行。 */
export type ClientConfig = {
  baseURL?: string
  /**
   * 每个请求都会带上的头。
   * 不要在这里写死 `Content-Type: application/json`，否则 `FormData` 上传时浏览器无法补 boundary。
   * 普通对象的 `post` 会在缺少该头时自动补上 `application/json`。
   */
  headers?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>)
  credentials?: RequestCredentials
  /** 超时毫秒数，默认 9000。传 0 表示不设超时。 */
  timeout?: number
  /** 业务成功码，默认 `['0']`。 */
  successCodes?: string[]
  /** 登录失效码，默认 `['100001', '100002']`。 */
  sessionInvalidCodes?: string[]
  /** 自定义成功判断。提供后不再使用 `successCodes`。 */
  isSuccess?: (response: ApiResponse, context: RequestContext) => boolean
  /** 自定义登录失效判断。提供后不再使用 `sessionInvalidCodes`。 */
  isSessionInvalid?: (response: ApiResponse, context: RequestContext) => boolean
  /** 每一次还会继续的失败都会调用，包括还会重试的登录失效。不要在这里弹全局提示。 */
  onAttemptError?: (error: ApiError, context: ErrorRetryContext) => void
  /** 不会再重试时调用。全局提示放在这里。登录失效不进这个回调。 */
  onError?: (error: ApiError, context: ErrorRetryContext) => void
  /** 登录失效且不会再重试时调用。此时不调用 `onError` 和 `onReport`。 */
  onSessionInvalid?: (error: ApiError, context: ErrorRetryContext) => void
  /** 每一次失败的上报。不再重试的登录失效不进这个回调。 */
  onAttemptReport?: (payload: ApiReportPayload, context: ErrorRetryContext) => void
  /** 最终失败的上报。登录失效不进这个回调。 */
  onReport?: (payload: ApiReportPayload, context: ErrorRetryContext) => void
  /** 替换默认的 `fetch` 传输层，测试里用来注入假响应。 */
  transport?: Transport
  /** 自定义查询串序列化。不提供时，嵌套对象使用 `JSON.stringify`。 */
  paramsSerializer?: (params: Record<string, any>) => string
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
  /**
   * 为 true 时不调用 `onAttemptError` 和 `onError`。
   * 错误仍然抛出，登录失效和上报回调照常执行。
   */
  silent?: boolean
  /**
   * 传 `'blob'` 时按文件读取，返回 `{ blob, fileName }`。
   * `Content-Type` 含 `application/json` 时仍按业务包处理，失败不会被当成文件。
   */
  responseType?: 'blob'
}

/** `responseType: 'blob'` 且响应体是文件时的返回值。 */
export type FileResponse = {
  blob: Blob
  /** 从 `Content-Disposition` 解析出的文件名。服务端没给时没有这个值。 */
  fileName?: string
}

export type MethodOptions = Omit<RequestOptions, 'url' | 'method' | 'body'> & {
  body?: RequestBody
}

export type JsonMethodOptions = Omit<MethodOptions, 'responseType'>
export type JsonRequestOptions = Omit<RequestOptions, 'responseType'>
export type BlobMethodOptions = MethodOptions & { responseType: 'blob' }
export type BlobRequestOptions = RequestOptions & { responseType: 'blob' }

/**
 * 客户端实例。
 * `get` / `post` 等返回完整业务包。`*Data` 方法只返回其中的 `data`。
 * 传入 `responseType: 'blob'` 时，对应方法返回 `FileResponse`，`*Data` 方法不支持文件响应。
 */
export type ApiClient = {
  request: {
    (options: BlobRequestOptions): Promise<FileResponse>
    <T = unknown>(options: RequestOptions): Promise<ApiResponse<T>>
  }
  requestData: <T = unknown>(options: JsonRequestOptions) => Promise<T | T[] | undefined>
  get: {
    (url: string, options: BlobMethodOptions): Promise<FileResponse>
    <T = unknown>(url: string, options?: MethodOptions): Promise<ApiResponse<T>>
  }
  post: {
    (url: string, body: RequestBody | undefined, options: BlobMethodOptions): Promise<FileResponse>
    <T = unknown>(url: string, body?: RequestBody, options?: MethodOptions): Promise<ApiResponse<T>>
  }
  put: {
    (url: string, body: RequestBody | undefined, options: BlobMethodOptions): Promise<FileResponse>
    <T = unknown>(url: string, body?: RequestBody, options?: MethodOptions): Promise<ApiResponse<T>>
  }
  patch: {
    (url: string, body: RequestBody | undefined, options: BlobMethodOptions): Promise<FileResponse>
    <T = unknown>(url: string, body?: RequestBody, options?: MethodOptions): Promise<ApiResponse<T>>
  }
  delete: {
    (url: string, options: BlobMethodOptions): Promise<FileResponse>
    <T = unknown>(url: string, options?: MethodOptions): Promise<ApiResponse<T>>
  }
  getData: <T = unknown>(url: string, options?: JsonMethodOptions) => Promise<T | T[] | undefined>
  postData: <T = unknown>(url: string, body?: RequestBody, options?: JsonMethodOptions) => Promise<T | T[] | undefined>
  putData: <T = unknown>(url: string, body?: RequestBody, options?: JsonMethodOptions) => Promise<T | T[] | undefined>
  patchData: <T = unknown>(url: string, body?: RequestBody, options?: JsonMethodOptions) => Promise<T | T[] | undefined>
  deleteData: <T = unknown>(url: string, options?: JsonMethodOptions) => Promise<T | T[] | undefined>
}

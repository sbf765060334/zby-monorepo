import type {
  ApiResponse,
  ClientConfig,
  HttpMethod,
  RequestBody,
  RequestContext,
  RequestParams,
} from './types'

export const DEFAULT_SUCCESS_CODES = ['0']
export const DEFAULT_SESSION_INVALID_CODES = ['100001', '100002']

export function selectData<T>(response: ApiResponse<T>): T | T[] | undefined {
  return response.data as T | T[] | undefined
}

export function isApiResponse(value: unknown): value is ApiResponse {
  if (!value || typeof value !== 'object') return false
  return (
    'errCode' in value ||
    'errMessage' in value ||
    'success' in value ||
    'businessSuccess' in value ||
    'traceId' in value ||
    'total' in value ||
    'data' in value
  )
}

export function isSuccessResponse(
  response: ApiResponse,
  context: RequestContext,
  config: ClientConfig,
): boolean {
  if (config.isSuccess) return config.isSuccess(response, context)
  return (config.successCodes ?? DEFAULT_SUCCESS_CODES).includes(String(response.errCode))
}

export function isSessionInvalidResponse(
  response: ApiResponse,
  context: RequestContext,
  config: ClientConfig,
): boolean {
  if (config.isSessionInvalid) return config.isSessionInvalid(response, context)
  return (config.sessionInvalidCodes ?? DEFAULT_SESSION_INVALID_CODES).includes(
    String(response.errCode),
  )
}

export function resolveURL(
  url: string,
  baseURL: string | undefined,
  params: RequestParams | undefined,
  paramsSerializer: ClientConfig['paramsSerializer'],
): string {
  const nextUrl = joinBaseURL(baseURL, url)
  if (!params) return nextUrl

  const query = params instanceof URLSearchParams
    ? params.toString()
    : serializeParams(params, paramsSerializer)
  if (!query) return nextUrl

  return `${nextUrl}${nextUrl.includes('?') ? '&' : '?'}${query}`
}

export function joinBaseURL(baseURL: string | undefined, url: string): string {
  if (!baseURL || isAbsoluteURL(url)) return url
  return `${baseURL.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`
}

export function isAbsoluteURL(url: string): boolean {
  return /^[a-z][a-z\d+\-.]*:/i.test(url)
}

export function serializeParams(
  params: Record<string, unknown>,
  paramsSerializer: ClientConfig['paramsSerializer'],
): string {
  if (paramsSerializer) return paramsSerializer(params)

  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    appendParam(searchParams, key, value)
  })
  return searchParams.toString()
}

function appendParam(searchParams: URLSearchParams, key: string, value: unknown): void {
  if (value === undefined || value === null) return

  if (Array.isArray(value)) {
    value.forEach((item) => appendParam(searchParams, key, item))
    return
  }

  if (value instanceof Date) {
    searchParams.append(key, value.toISOString())
    return
  }

  if (typeof value === 'object') {
    searchParams.append(key, JSON.stringify(value))
    return
  }

  searchParams.append(key, String(value))
}

export async function resolveHeaders(
  configHeaders: ClientConfig['headers'],
  requestHeaders: HeadersInit | undefined,
): Promise<Headers> {
  const headers = new Headers(
    typeof configHeaders === 'function' ? await configHeaders() : configHeaders,
  )
  new Headers(requestHeaders).forEach((value, key) => {
    headers.set(key, value)
  })
  return headers
}

export function normalizeMethod(method: HttpMethod | undefined): HttpMethod {
  return method ?? 'GET'
}

export function normalizeBody(body: RequestBody, headers: Headers): BodyInit | null | undefined {
  if (body === undefined) return undefined
  if (body === null) return null
  if (isBodyInit(body)) return body

  if (!headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }
  return JSON.stringify(body)
}

function isBodyInit(body: RequestBody): body is BodyInit {
  return (
    typeof body === 'string' ||
    (typeof Blob !== 'undefined' && body instanceof Blob) ||
    (typeof FormData !== 'undefined' && body instanceof FormData) ||
    body instanceof URLSearchParams ||
    body instanceof ArrayBuffer ||
    ArrayBuffer.isView(body)
  )
}

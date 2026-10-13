import { describe, expect, it, vi } from 'vitest'

import {
  ApiError,
  createClient,
  isApiError,
  isBusinessError,
  isSessionInvalidError,
  isTimeoutError,
  selectData,
  type ErrorRetryContext,
  type Transport,
  type TransportRequest,
  type TransportResponse,
} from '../index'
import { getOrCreateSignalLifecycle } from '../retry-context'

function createTransport(
  resolver: (request: TransportRequest) => TransportResponse | Promise<TransportResponse>,
): Transport {
  return async (request) => resolver(request)
}

function createResponse(
  body: unknown,
  overrides: Partial<TransportResponse> = {},
): TransportResponse {
  return {
    ok: true,
    status: 200,
    url: 'https://example.com/api',
    headers: new Headers({ 'content-type': 'application/json' }),
    body,
    ...overrides,
  }
}

describe('@zby/request core', () => {
  it('accepts an interface as JSON body and query params', async () => {
    interface OrderQuery {
      id?: string
    }
    const query: OrderQuery = { id: '1' }
    const client = createClient({
      transport: createTransport(() => createResponse({ errCode: '0', data: query })),
    })

    await expect(client.post('/orders', query)).resolves.toMatchObject({ errCode: '0' })
    await expect(client.get('/orders', { params: query })).resolves.toMatchObject({ errCode: '0' })
  })

  it('returns full response by default and preserves pagination fields', async () => {
    const client = createClient({
      transport: createTransport(() =>
        createResponse({
          errCode: '0',
          errMessage: '',
          data: [{ id: 1 }],
          total: 12,
          traceId: 'trace-1',
        }),
      ),
    })

    const response = await client.get<{ id: number }>('/users')

    expect(response.data).toEqual([{ id: 1 }])
    expect('total' in response ? response.total : undefined).toBe(12)
    expect(response.traceId).toBe('trace-1')
  })

  it('getData returns response.data for simple endpoints', async () => {
    const client = createClient({
      transport: createTransport(() =>
        createResponse({
          errCode: '0',
          errMessage: '',
          data: { id: 1, name: 'demo' },
        }),
      ),
    })

    await expect(client.getData<{ id: number, name: string }>('/user')).resolves.toEqual({
      id: 1,
      name: 'demo',
    })
  })

  it('does not notify error callbacks or reports for successful requests', async () => {
    const onAttemptError = vi.fn()
    const onError = vi.fn()
    const onAttemptReport = vi.fn()
    const onReport = vi.fn()
    const client = createClient({
      onAttemptError,
      onError,
      onAttemptReport,
      onReport,
      transport: createTransport(() =>
        createResponse({
          errCode: '0',
          errMessage: '',
          data: { ok: true },
        }),
      ),
    })

    await expect(client.get('/ok')).resolves.toMatchObject({ data: { ok: true } })

    expect(onAttemptError).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
    expect(onAttemptReport).not.toHaveBeenCalled()
    expect(onReport).not.toHaveBeenCalled()
  })

  it('throws ApiError for business errors and reports final context', async () => {
    const onAttemptError = vi.fn()
    const onError = vi.fn()
    const onAttemptReport = vi.fn()
    const onReport = vi.fn()
    const client = createClient({
      onAttemptError,
      onError,
      onAttemptReport,
      onReport,
      transport: createTransport(() =>
        createResponse({
          errCode: '500',
          errMessage: '业务失败',
          data: null,
          traceId: 'trace-2',
        }),
      ),
    })

    await expect(client.post('/fail', { a: 1 })).rejects.toMatchObject({
      errCode: '500',
      errMessage: '业务失败',
      traceId: 'trace-2',
      businessError: true,
    })

    const expectedContext: ErrorRetryContext = {
      attempt: 1,
      retryCount: 0,
      maxRetries: 0,
      maxAttempts: 1,
      willRetry: false,
    }
    const error = onError.mock.calls[0][0] as ApiError
    expect(isApiError(error)).toBe(true)
    expect(isBusinessError(error)).toBe(true)
    expect(onAttemptError).toHaveBeenCalledWith(error, expectedContext)
    expect(onError).toHaveBeenCalledWith(error, expectedContext)
    expect(onAttemptReport).toHaveBeenCalledWith(
      expect.objectContaining({
        api: 'https://example.com/api',
        code: '500',
        traceId: 'trace-2',
        success: false,
      }),
      expectedContext,
    )
    expect(onReport).toHaveBeenCalledWith(
      expect.objectContaining({
        api: 'https://example.com/api',
        code: '500',
        traceId: 'trace-2',
        success: false,
      }),
      expectedContext,
    )
  })

  it('silent skips error callbacks but still rejects and reports', async () => {
    const onAttemptError = vi.fn()
    const onError = vi.fn()
    const onReport = vi.fn()
    const onSessionInvalid = vi.fn()
    const client = createClient({
      onAttemptError,
      onError,
      onReport,
      onSessionInvalid,
      transport: createTransport(() =>
        createResponse({
          errCode: '500',
          errMessage: '业务失败',
          data: null,
        }),
      ),
    })

    await expect(client.post('/fail', { a: 1 }, { silent: true })).rejects.toMatchObject({
      errCode: '500',
      errMessage: '业务失败',
      businessError: true,
    })
    expect(onAttemptError).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
    expect(onSessionInvalid).not.toHaveBeenCalled()
    expect(onReport).toHaveBeenCalledTimes(1)
  })

  it('silent still notifies session invalid', async () => {
    const onError = vi.fn()
    const onSessionInvalid = vi.fn()
    const client = createClient({
      onError,
      onSessionInvalid,
      transport: createTransport(() =>
        createResponse({
          errCode: '100001',
          errMessage: '登录失效',
          data: null,
        }),
      ),
    })

    await expect(client.get('/whoami', { silent: true })).rejects.toMatchObject({
      sessionInvalid: true,
    })
    expect(onSessionInvalid).toHaveBeenCalledTimes(1)
    expect(onError).not.toHaveBeenCalled()
  })

  it('notifies only attempt callbacks when retry context will retry', async () => {
    const controller = new AbortController()
    const onAttemptError = vi.fn()
    const onError = vi.fn()
    const onAttemptReport = vi.fn()
    const onReport = vi.fn()
    const client = createClient({
      onAttemptError,
      onError,
      onAttemptReport,
      onReport,
      transport: createTransport(() => Promise.reject(new Error('network'))),
    })

    getOrCreateSignalLifecycle(controller.signal, 1, 1)

    await expect(client.get('/retry', { signal: controller.signal })).rejects.toMatchObject({
      message: 'network',
    })

    const expectedContext: ErrorRetryContext = {
      attempt: 1,
      retryCount: 0,
      maxRetries: 1,
      maxAttempts: 2,
      willRetry: true,
    }
    expect(onAttemptError).toHaveBeenCalledWith(expect.any(ApiError), expectedContext)
    expect(onAttemptReport).toHaveBeenCalledWith(expect.any(Object), expectedContext)
    expect(onError).not.toHaveBeenCalled()
    expect(onReport).not.toHaveBeenCalled()
  })

  it('notifies final callbacks once when retry context is exhausted', async () => {
    const controller = new AbortController()
    const onAttemptError = vi.fn()
    const onError = vi.fn()
    const onAttemptReport = vi.fn()
    const onReport = vi.fn()
    const client = createClient({
      onAttemptError,
      onError,
      onAttemptReport,
      onReport,
      transport: createTransport(() => Promise.reject(new Error('network'))),
    })

    const lifecycle = getOrCreateSignalLifecycle(controller.signal, 1, 1)
    lifecycle.failureCount = 1

    await expect(client.get('/retry', { signal: controller.signal })).rejects.toMatchObject({
      message: 'network',
    })

    const expectedContext: ErrorRetryContext = {
      attempt: 2,
      retryCount: 1,
      maxRetries: 1,
      maxAttempts: 2,
      willRetry: false,
    }
    const error = onError.mock.calls[0][0] as ApiError
    expect(onAttemptError).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onAttemptError).toHaveBeenCalledWith(error, expectedContext)
    expect(onError).toHaveBeenCalledWith(error, expectedContext)
    expect(onAttemptReport).toHaveBeenCalledTimes(1)
    expect(onReport).toHaveBeenCalledTimes(1)
  })

  it('detects session invalid errors without treating them as generic business errors', async () => {
    const onSessionInvalid = vi.fn()
    const onError = vi.fn()
    const onReport = vi.fn()
    const onAttemptError = vi.fn()
    const client = createClient({
      onSessionInvalid,
      onError,
      onReport,
      onAttemptError,
      transport: createTransport(() =>
        createResponse({
          errCode: '100001',
          errMessage: '登录失效',
          data: null,
        }),
      ),
    })

    try {
      await client.get('/whoami')
      throw new Error('should not resolve')
    } catch (error) {
      expect(isSessionInvalidError(error)).toBe(true)
      expect(isBusinessError(error)).toBe(false)
    }
    expect(onSessionInvalid).toHaveBeenCalledTimes(1)
    expect(onError).not.toHaveBeenCalled()
    expect(onReport).not.toHaveBeenCalled()
    expect(onAttemptError).not.toHaveBeenCalled()
    expect(onSessionInvalid.mock.calls[0][1]).toMatchObject({
      attempt: 1,
      retryCount: 0,
      maxRetries: 0,
      maxAttempts: 1,
      willRetry: false,
    })
  })

  it('supports custom success codes', async () => {
    const client = createClient({
      successCodes: ['SUCCESS'],
      transport: createTransport(() =>
        createResponse({
          errCode: 'SUCCESS',
          errMessage: '',
          data: { ok: true },
        }),
      ),
    })

    await expect(client.get('/ok')).resolves.toMatchObject({
      errCode: 'SUCCESS',
      data: { ok: true },
    })
  })

  it('accepts API responses without data field', async () => {
    const client = createClient({
      transport: createTransport(() =>
        createResponse({
          errCode: '0',
          errMessage: '',
          traceId: 'trace-empty',
        }),
      ),
    })

    await expect(client.get('/empty')).resolves.toMatchObject({
      errCode: '0',
      traceId: 'trace-empty',
    })
    await expect(client.getData('/empty')).resolves.toBeUndefined()
  })

  it('passes params, headers, json body, credentials and signal to transport', async () => {
    const controller = new AbortController()
    const seen = vi.fn()
    const client = createClient({
      baseURL: 'https://example.com/api',
      credentials: 'include',
      headers: async () => ({ 'x-global': '1' }),
      transport: createTransport((request) => {
        seen(request)
        return createResponse({ errCode: '0', errMessage: '', data: true })
      }),
    })

    await client.post(
      '/users',
      { name: 'demo' },
      {
        params: { page: 1, tags: ['a', 'b'] },
        headers: { 'x-local': '2' },
        signal: controller.signal,
      },
    )

    const request = seen.mock.calls[0][0] as TransportRequest
    expect(request.url).toBe('https://example.com/api/users?page=1&tags=a&tags=b')
    expect(new Headers(request.headers).get('x-global')).toBe('1')
    expect(new Headers(request.headers).get('x-local')).toBe('2')
    expect(new Headers(request.headers).get('content-type')).toBe('application/json')
    expect(request.body).toBe(JSON.stringify({ name: 'demo' }))
    expect(request.credentials).toBe('include')
    expect(request.signal).toBeInstanceOf(AbortSignal)
  })

  it('serializes nested query objects as JSON', async () => {
    const seen = vi.fn()
    const client = createClient({
      transport: createTransport((request) => {
        seen(request)
        return createResponse({ errCode: '0', errMessage: '', data: true })
      }),
    })

    await client.get('/orders', {
      params: {
        page: 1,
        filter: { warehouseId: 'A1', ownerId: 'U2' },
        empty: null,
      },
    })

    const request = seen.mock.calls[0][0] as TransportRequest
    expect(request.url).toBe('/orders?page=1&filter=%7B%22warehouseId%22%3A%22A1%22%2C%22ownerId%22%3A%22U2%22%7D')
  })

  it('does not notify error reporters when external signal aborts the request', async () => {
    const controller = new AbortController()
    const onAttemptError = vi.fn()
    const onError = vi.fn()
    const onSessionInvalid = vi.fn()
    const onAttemptReport = vi.fn()
    const onReport = vi.fn()
    const client = createClient({
      onAttemptError,
      onError,
      onSessionInvalid,
      onAttemptReport,
      onReport,
      transport: createTransport(() => {
        controller.abort()
        return Promise.reject(new DOMException('Aborted', 'AbortError'))
      }),
    })

    await expect(client.get('/users', { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    })
    expect(onAttemptError).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
    expect(onSessionInvalid).not.toHaveBeenCalled()
    expect(onAttemptReport).not.toHaveBeenCalled()
    expect(onReport).not.toHaveBeenCalled()
  })

  it('does not report when the caller aborts with a custom reason', async () => {
    const controller = new AbortController()
    const onAttemptError = vi.fn()
    const onError = vi.fn()
    const onReport = vi.fn()
    const client = createClient({
      onAttemptError,
      onError,
      onReport,
      transport: createTransport(() => {
        const reason = new Error('stop')
        controller.abort(reason)
        return Promise.reject(reason)
      }),
    })

    await expect(client.get('/users', { signal: controller.signal })).rejects.toMatchObject({
      message: 'stop',
    })
    expect(onAttemptError).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
    expect(onReport).not.toHaveBeenCalled()
  })

  it('marks internal timeout errors and notifies error reporters', async () => {
    vi.useFakeTimers()
    const onError = vi.fn()
    const onReport = vi.fn()
    const client = createClient({
      timeout: 100,
      onError,
      onReport,
      transport: createTransport(
        (request) =>
          new Promise((_, reject) => {
            request.signal?.addEventListener(
              'abort',
              () => reject(request.signal?.reason ?? new DOMException('Aborted', 'AbortError')),
              { once: true },
            )
          }),
      ),
    })

    try {
      const request = expect(client.get('/slow')).rejects.toMatchObject({
        errCode: 'TIMEOUT',
        timeout: true,
        businessError: false,
      })
      await vi.advanceTimersByTimeAsync(100)
      await request
      const error = onError.mock.calls[0][0] as ApiError
      expect(isTimeoutError(error)).toBe(true)
      expect(error.message).toBe('Request timeout after 100ms')
      expect(onReport).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'TIMEOUT',
          msg: 'Request timeout after 100ms',
          success: false,
        }),
        expect.objectContaining({
          attempt: 1,
          retryCount: 0,
          willRetry: false,
        }),
      )
    } finally {
      vi.useRealTimers()
    }
  })

  it('throws ApiError for non-2xx responses', async () => {
    const client = createClient({
      transport: createTransport(() =>
        createResponse('server error', {
          ok: false,
          status: 500,
        }),
      ),
    })

    await expect(client.get('/500')).rejects.toMatchObject({
      status: 500,
      businessError: false,
    })
  })

  it('selectData returns response data', () => {
    expect(selectData({ errCode: '0', errMessage: '', data: [1, 2], total: 2 })).toEqual([1, 2])
  })

  it('returns a file for blob responses', async () => {
    const bytes = new Uint8Array([9, 8, 7])
    const client = createClient({
      transport: createTransport(() => ({
        ok: true,
        status: 200,
        url: 'https://example.com/orders/export',
        headers: new Headers({
          'content-type': 'application/octet-stream',
          'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent('订单.xlsx')}`,
        }),
        body: new Blob([bytes], { type: 'application/octet-stream' }),
      })),
    })

    const file = await client.get('/orders/export', { responseType: 'blob' })

    expect(file.fileName).toBe('订单.xlsx')
    expect(new Uint8Array(await file.blob.arrayBuffer())).toEqual(bytes)
  })

  it('treats a JSON blob response as a business error', async () => {
    const onError = vi.fn()
    const onSessionInvalid = vi.fn()
    const client = createClient({
      onError,
      onSessionInvalid,
      transport: createTransport(() => ({
        ok: true,
        status: 200,
        url: 'https://example.com/orders/export',
        headers: new Headers({ 'content-type': 'application/json' }),
        body: new Blob([JSON.stringify({
          errCode: '500',
          errMessage: '导出失败',
          data: null,
        })]),
      })),
    })

    await expect(client.post('/orders/export', { status: 'open' }, { responseType: 'blob' })).rejects.toMatchObject({
      errCode: '500',
      errMessage: '导出失败',
      businessError: true,
    })
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onSessionInvalid).not.toHaveBeenCalled()
  })

  it('treats a JSON blob session error as session invalid', async () => {
    const onError = vi.fn()
    const onSessionInvalid = vi.fn()
    const client = createClient({
      onError,
      onSessionInvalid,
      transport: createTransport(() => ({
        ok: true,
        status: 200,
        url: 'https://example.com/orders/export',
        headers: new Headers({ 'content-type': 'application/json' }),
        body: new Blob([JSON.stringify({
          errCode: '100001',
          errMessage: '登录失效',
          data: null,
        })]),
      })),
    })

    await expect(client.get('/orders/export', { responseType: 'blob' })).rejects.toMatchObject({
      sessionInvalid: true,
    })
    expect(onSessionInvalid).toHaveBeenCalledTimes(1)
    expect(onError).not.toHaveBeenCalled()
  })
})

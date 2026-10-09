import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import {
  ApiError,
  createClient,
  type ApiResponse,
  type ErrorRetryContext,
  type Transport,
  type TransportRequest,
  type TransportResponse,
} from '../index'
import { createQueryClient, mutationOptions, queryOptions, shouldRetry } from '../react-query'

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

function expectRetryContexts(callback: ReturnType<typeof vi.fn>, contexts: ErrorRetryContext[]) {
  expect(callback.mock.calls.map((call) => call[1])).toEqual(contexts)
}

describe('@zby/request react-query', () => {
  it('does not retry business or session errors', () => {
    expect(
      shouldRetry(
        0,
        new ApiError({
          businessError: true,
          errCode: '500',
        }),
      ),
    ).toBe(false)

    expect(
      shouldRetry(
        0,
        new ApiError({
          sessionInvalid: true,
          errCode: '100001',
        }),
      ),
    ).toBe(false)
  })

  it('retries network errors at most twice', () => {
    expect(shouldRetry(0, new Error('network'))).toBe(true)
    expect(shouldRetry(1, new Error('network'))).toBe(true)
    expect(shouldRetry(2, new Error('network'))).toBe(false)
  })

  it('creates a QueryClient with default retry strategy', () => {
    const client = createQueryClient()
    const defaults = client.getDefaultOptions()

    expect(defaults.queries?.retry).toBe(shouldRetry)
    expect(defaults.mutations?.retry).toBe(shouldRetry)
  })

  it('keeps queryOptions response and select type inference', () => {
    const options = queryOptions({
      queryKey: ['user', 'detail', '1'],
      queryFn: async (): Promise<ApiResponse<{ id: string }>> => ({
        errCode: '0',
        errMessage: '',
        data: { id: '1' },
      }),
      select: (response) => response.data,
    })

    const selected: { id: string } | { id: string }[] | undefined = options.select?.({
      errCode: '0',
      errMessage: '',
      data: { id: '1' },
    })

    expectTypeOf(options.queryFn).not.toBeAny()
    expect(selected).toEqual({ id: '1' })
  })

  it('notifies only attempt callbacks when a query retry succeeds', async () => {
    let callCount = 0
    const onAttemptError = vi.fn()
    const onError = vi.fn()
    const onAttemptReport = vi.fn()
    const onReport = vi.fn()
    const apiClient = createClient({
      onAttemptError,
      onError,
      onAttemptReport,
      onReport,
      transport: createTransport(() => {
        callCount += 1
        if (callCount === 1) {
          return Promise.reject(new Error('network'))
        }
        return createResponse({ errCode: '0', errMessage: '', data: { ok: true } })
      }),
    })
    const queryClient = createQueryClient()

    await expect(
      queryClient.fetchQuery(
        queryOptions({
          queryKey: ['retry-query-success'],
          retryDelay: 0,
          queryFn: ({ signal }) => apiClient.get('/retry-query-success', { signal }),
        }),
      ),
    ).resolves.toMatchObject({ data: { ok: true } })

    const expectedContext: ErrorRetryContext = {
      attempt: 1,
      retryCount: 0,
      maxRetries: 2,
      maxAttempts: 3,
      willRetry: true,
    }
    expectRetryContexts(onAttemptError, [expectedContext])
    expectRetryContexts(onAttemptReport, [expectedContext])
    expect(onError).not.toHaveBeenCalled()
    expect(onReport).not.toHaveBeenCalled()
  })

  it('notifies final callbacks once when a query exhausts retries', async () => {
    const onAttemptError = vi.fn()
    const onError = vi.fn()
    const onAttemptReport = vi.fn()
    const onReport = vi.fn()
    const apiClient = createClient({
      onAttemptError,
      onError,
      onAttemptReport,
      onReport,
      transport: createTransport(() => Promise.reject(new Error('network'))),
    })
    const queryClient = createQueryClient()

    await expect(
      queryClient.fetchQuery(
        queryOptions({
          queryKey: ['retry-query-fail'],
          retryDelay: 0,
          queryFn: async ({ signal }) => {
            await Promise.resolve()
            return apiClient.get('/retry-query-fail', { signal })
          },
        }),
      ),
    ).rejects.toMatchObject({ message: 'network' })

    const expectedContexts: ErrorRetryContext[] = [
      { attempt: 1, retryCount: 0, maxRetries: 2, maxAttempts: 3, willRetry: true },
      { attempt: 2, retryCount: 1, maxRetries: 2, maxAttempts: 3, willRetry: true },
      { attempt: 3, retryCount: 2, maxRetries: 2, maxAttempts: 3, willRetry: false },
    ]
    expectRetryContexts(onAttemptError, expectedContexts)
    expectRetryContexts(onAttemptReport, expectedContexts)
    expectRetryContexts(onError, [expectedContexts[2]])
    expectRetryContexts(onReport, [expectedContexts[2]])
  })

  it('keeps the attempt count when queryOptions is recreated for the same signal', async () => {
    const controller = new AbortController()
    const onAttemptError = vi.fn()
    const onError = vi.fn()
    const apiClient = createClient({
      onAttemptError,
      onError,
      transport: createTransport(() => Promise.reject(new Error('network'))),
    })
    const queryClient = createQueryClient()
    const context = {
      client: queryClient,
      queryKey: ['rerender'],
      signal: controller.signal,
      meta: undefined,
    }

    const run = () => {
      const options = queryOptions({
        queryKey: ['rerender'],
        queryFn: ({ signal }) => apiClient.get('/rerender', { signal }),
      })
      const queryFn = options.queryFn
      if (typeof queryFn !== 'function') {
        throw new TypeError('queryFn is missing')
      }
      return queryFn(context)
    }

    await expect(run()).rejects.toMatchObject({ message: 'network' })
    await expect(run()).rejects.toMatchObject({ message: 'network' })
    await expect(run()).rejects.toMatchObject({ message: 'network' })

    expect(onAttemptError.mock.calls.map((call) => call[1].attempt)).toEqual([1, 2, 3])
    expect(onAttemptError.mock.calls[0][1].maxRetries).toBe(2)
    expect(onAttemptError.mock.calls[2][1].willRetry).toBe(false)
    expect(onError).toHaveBeenCalledTimes(1)
  })

  it('notifies only attempt callbacks when a mutation retry succeeds', async () => {
    let callCount = 0
    const onAttemptError = vi.fn()
    const onError = vi.fn()
    const onAttemptReport = vi.fn()
    const onReport = vi.fn()
    const apiClient = createClient({
      onAttemptError,
      onError,
      onAttemptReport,
      onReport,
      transport: createTransport(() => {
        callCount += 1
        if (callCount === 1) {
          return Promise.reject(new Error('network'))
        }
        return createResponse({ errCode: '0', errMessage: '', data: { ok: true } })
      }),
    })
    const queryClient = createQueryClient()
    const mutation = queryClient.getMutationCache().build(
      queryClient,
      mutationOptions({
        retry: 1,
        retryDelay: 0,
        mutationFn: (_variables, context) => apiClient.post(
          '/retry-mutation-success',
          undefined,
          { signal: context.signal },
        ),
      }),
    )

    await expect(mutation.execute()).resolves.toMatchObject({ data: { ok: true } })

    const expectedContext: ErrorRetryContext = {
      attempt: 1,
      retryCount: 0,
      maxRetries: 1,
      maxAttempts: 2,
      willRetry: true,
    }
    expectRetryContexts(onAttemptError, [expectedContext])
    expectRetryContexts(onAttemptReport, [expectedContext])
    expect(onError).not.toHaveBeenCalled()
    expect(onReport).not.toHaveBeenCalled()
  })

  it('notifies final callbacks once when a mutation exhausts retries', async () => {
    const onAttemptError = vi.fn()
    const onError = vi.fn()
    const onAttemptReport = vi.fn()
    const onReport = vi.fn()
    const apiClient = createClient({
      onAttemptError,
      onError,
      onAttemptReport,
      onReport,
      transport: createTransport(() => Promise.reject(new Error('network'))),
    })
    const queryClient = createQueryClient()
    const mutation = queryClient.getMutationCache().build(
      queryClient,
      mutationOptions({
        retry: 1,
        retryDelay: 0,
        mutationFn: async (_variables, context) => {
          await Promise.resolve()
          return apiClient.post('/retry-mutation-fail', undefined, { signal: context.signal })
        },
      }),
    )

    await expect(mutation.execute()).rejects.toMatchObject({ message: 'network' })

    const expectedContexts: ErrorRetryContext[] = [
      { attempt: 1, retryCount: 0, maxRetries: 1, maxAttempts: 2, willRetry: true },
      { attempt: 2, retryCount: 1, maxRetries: 1, maxAttempts: 2, willRetry: false },
    ]
    expectRetryContexts(onAttemptError, expectedContexts)
    expectRetryContexts(onAttemptReport, expectedContexts)
    expectRetryContexts(onError, [expectedContexts[1]])
    expectRetryContexts(onReport, [expectedContexts[1]])
  })

  it('forwards mutation context into mutationFn', async () => {
    const mutationFn = vi.fn(async (_variables: { id: number }) => ({
      errCode: '0',
      errMessage: '',
      data: true,
    }))
    const queryClient = createQueryClient()
    const mutation = queryClient.getMutationCache().build(
      queryClient,
      mutationOptions({ mutationFn }),
    )

    await mutation.execute({ id: 1 })

    expect(mutationFn).toHaveBeenCalledWith(
      { id: 1 },
      expect.objectContaining({
        client: queryClient,
        signal: expect.any(AbortSignal),
      }),
    )
  })

  it('does not mix retry context across concurrent mutations', async () => {
    let releaseSlow: () => void = () => {}
    let releaseFast: () => void = () => {}
    let markBothStarted: () => void = () => {}
    const slowGate = new Promise<void>((resolve) => {
      releaseSlow = resolve
    })
    const fastGate = new Promise<void>((resolve) => {
      releaseFast = resolve
    })
    const bothStarted = new Promise<void>((resolve) => {
      markBothStarted = resolve
    })
    let started = 0
    const onError = vi.fn()
    const apiClient = createClient({
      onError,
      transport: createTransport((request) => {
        started += 1
        if (started === 2) markBothStarted()
        const gate = request.url.endsWith('/slow') ? slowGate : fastGate
        const message = request.url.endsWith('/slow') ? 'slow-fail' : 'fast-fail'
        return gate.then(() => Promise.reject(new Error(message)))
      }),
    })
    const queryClient = createQueryClient()
    const slow = queryClient.getMutationCache().build(
      queryClient,
      mutationOptions({
        retry: 0,
        mutationFn: (_variables, context) => apiClient.post('/slow', undefined, { signal: context.signal }),
      }),
    )
    const fast = queryClient.getMutationCache().build(
      queryClient,
      mutationOptions({
        retry: 4,
        retryDelay: 0,
        mutationFn: (_variables, context) => apiClient.post('/fast', undefined, { signal: context.signal }),
      }),
    )

    const slowPromise = slow.execute(undefined)
    const fastPromise = fast.execute(undefined)
    await bothStarted
    releaseSlow()

    await expect(slowPromise).rejects.toMatchObject({ message: 'slow-fail' })
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError.mock.calls[0][0].message).toBe('slow-fail')
    expect(onError.mock.calls[0][1]).toMatchObject({ willRetry: false, attempt: 1 })

    releaseFast()
    await expect(fastPromise).rejects.toMatchObject({ message: 'fast-fail' })
    expect(onError).toHaveBeenCalledTimes(2)
  })

  it('warns once when a query does not pass its signal to the client', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const onError = vi.fn()
    const apiClient = createClient({
      onError,
      transport: createTransport(() => Promise.reject(new Error('network'))),
    })
    const queryClient = createQueryClient()

    await expect(
      queryClient.fetchQuery(
        queryOptions({
          queryKey: ['missing-signal'],
          retryDelay: 0,
          queryFn: () => apiClient.get('/missing-signal'),
        }),
      ),
    ).rejects.toMatchObject({ message: 'network' })

    expect(onError).toHaveBeenCalledTimes(3)
    expect(onError.mock.calls.map((call) => call[1].willRetry)).toEqual([false, false, false])
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('signal')
    warn.mockRestore()
  })

  it('reuses one mutation signal across retries after an await', async () => {
    const signals: AbortSignal[] = []
    const onError = vi.fn()
    const apiClient = createClient({
      onError,
      transport: createTransport(() => Promise.reject(new Error('network'))),
    })
    const queryClient = createQueryClient()
    const mutation = queryClient.getMutationCache().build(
      queryClient,
      mutationOptions({
        retry: 1,
        retryDelay: 0,
        mutationFn: async (_variables, context) => {
          signals.push(context.signal)
          await Promise.resolve()
          return apiClient.post('/shared-signal', undefined, { signal: context.signal })
        },
      }),
    )

    await expect(mutation.execute()).rejects.toMatchObject({ message: 'network' })

    expect(signals).toHaveLength(2)
    expect(signals[0]).toBe(signals[1])
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError.mock.calls[0]?.[1]).toMatchObject({ attempt: 2, willRetry: false })
  })

  it('reports every mutation attempt when signal is omitted', async () => {
    const onError = vi.fn()
    const apiClient = createClient({
      onError,
      transport: createTransport(() => Promise.reject(new Error('network'))),
    })
    const queryClient = createQueryClient()
    const mutation = queryClient.getMutationCache().build(
      queryClient,
      mutationOptions({
        retry: 1,
        retryDelay: 0,
        mutationFn: async () => {
          await Promise.resolve()
          return apiClient.post('/omitted-signal')
        },
      }),
    )

    await expect(mutation.execute()).rejects.toMatchObject({ message: 'network' })

    expect(onError).toHaveBeenCalledTimes(2)
    expect(onError.mock.calls.map((call) => call[1].willRetry)).toEqual([false, false])
  })
})

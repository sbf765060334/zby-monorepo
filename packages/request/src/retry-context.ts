import type { ErrorRetryContext } from './types'

export type RetryValue = boolean | number | ((failureCount: number, error: unknown) => boolean)

export type RetryLifecycle = {
  failureCount: number
  retry: RetryValue
  maxRetries: number
}

const signalLifecycles = new WeakMap<AbortSignal, RetryLifecycle>()
const mutationLifecycles = new WeakMap<object, RetryLifecycle>()

let activeLifecycle: RetryLifecycle | undefined

export function getMaxRetries(retry: RetryValue): number {
  if (retry === true) return Infinity
  if (typeof retry === 'number') return Math.max(0, retry)
  if (typeof retry === 'function') return Infinity
  return 0
}

export function resolveWillRetry(retry: RetryValue, failureCount: number, error: unknown): boolean {
  if (retry === true) return true
  if (typeof retry === 'number') return failureCount < retry
  if (typeof retry === 'function') return retry(failureCount, error)
  return false
}

export function createLifecycle(retry: RetryValue, maxRetries: number): RetryLifecycle {
  return {
    failureCount: 0,
    retry,
    maxRetries,
  }
}

export function getOrCreateSignalLifecycle(
  signal: AbortSignal | undefined,
  retry: RetryValue,
  maxRetries: number,
): RetryLifecycle {
  if (signal) {
    const existing = signalLifecycles.get(signal)
    if (existing) return existing
  }

  const lifecycle = createLifecycle(retry, maxRetries)
  if (signal) signalLifecycles.set(signal, lifecycle)
  return lifecycle
}

export function lookupSignalLifecycle(signal: AbortSignal | undefined): RetryLifecycle | undefined {
  if (!signal) return undefined
  return signalLifecycles.get(signal)
}

export function releaseSignalLifecycle(signal: AbortSignal | undefined): void {
  if (!signal) return
  signalLifecycles.delete(signal)
}

export function getOrCreateMutationLifecycle(
  context: object | undefined,
  retry: RetryValue,
  maxRetries: number,
): RetryLifecycle {
  if (context) {
    const existing = mutationLifecycles.get(context)
    if (existing) return existing
  }

  const lifecycle = createLifecycle(retry, maxRetries)
  if (context) mutationLifecycles.set(context, lifecycle)
  return lifecycle
}

export function releaseMutationLifecycle(context: object | undefined): void {
  if (!context) return
  mutationLifecycles.delete(context)
}

export function peekActiveLifecycle(): RetryLifecycle | undefined {
  return activeLifecycle
}

/**
 * 同一次 TanStack fetch 的重试共享 AbortSignal，同一次 mutation 共享 context。
 * 状态挂在这两个对象上，避免全局栈把并发请求的重试次数串在一起。
 * 调用请求客户端如果发生在本次同步调用栈里，还会读到 activeLifecycle。
 */
export function runWithLifecycle<T>(lifecycle: RetryLifecycle, run: () => T): T {
  const previous = activeLifecycle
  activeLifecycle = lifecycle
  try {
    return run()
  } finally {
    activeLifecycle = previous
  }
}

export function withRetryLifecycle<T>(
  lifecycle: RetryLifecycle,
  signal: AbortSignal | undefined,
  run: () => T,
): T {
  if (signal && !signalLifecycles.has(signal)) {
    signalLifecycles.set(signal, lifecycle)
  }
  const active = (signal ? signalLifecycles.get(signal) : undefined) ?? lifecycle
  return runWithLifecycle(active, run)
}

export function createErrorRetryContext(
  error: unknown,
  lifecycle?: RetryLifecycle,
): ErrorRetryContext {
  const failureCount = lifecycle?.failureCount ?? 0
  const retry = lifecycle?.retry ?? false
  const willRetry = resolveWillRetry(retry, failureCount, error)
  const maxRetries = lifecycle?.maxRetries ?? getMaxRetries(retry)

  if (lifecycle) {
    lifecycle.failureCount = willRetry ? failureCount + 1 : 0
  }

  return {
    attempt: failureCount + 1,
    retryCount: failureCount,
    maxRetries,
    maxAttempts: Number.isFinite(maxRetries) ? maxRetries + 1 : Infinity,
    willRetry,
  }
}

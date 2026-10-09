import type { ErrorRetryContext } from './types'

export type RetryValue = boolean | number | ((failureCount: number, error: unknown) => boolean)

export type RetryLifecycle = {
  failureCount: number
  retry: RetryValue
  maxRetries: number
}

const signalLifecycles = new WeakMap<AbortSignal, RetryLifecycle>()
const observedSignals = new WeakSet<AbortSignal>()

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

function createLifecycle(retry: RetryValue, maxRetries: number): RetryLifecycle {
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
  observedSignals.add(signal)
  return signalLifecycles.get(signal)
}

export function wasSignalObserved(signal: AbortSignal | undefined): boolean {
  return signal ? observedSignals.has(signal) : false
}

export function releaseSignalLifecycle(signal: AbortSignal | undefined): void {
  if (!signal) return
  signalLifecycles.delete(signal)
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

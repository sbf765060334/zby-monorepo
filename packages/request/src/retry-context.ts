/**
 * 重试进度挂在 `AbortSignal` 上，同一次查询或 mutation 的各次重试共用这个对象。
 * 不使用全局变量。并发请求各自持有自己的 signal，次数不会串在一起。
 * 自定义 `retry` 函数没有固定上限，`maxRetries` 记为 `Infinity`；是否重试仍看函数返回值。
 */
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

/** 请求客户端读到这个 signal 时记一笔，供开发环境判断回调有没有使用绑定后的客户端。 */
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

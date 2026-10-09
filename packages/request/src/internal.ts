/**
 * 供 `@zby/request` 和 `@zby/request/react-query` 共享同一份重试状态。
 * 业务代码不要导入这个入口。
 */
export {
  createErrorRetryContext,
  getMaxRetries,
  getOrCreateSignalLifecycle,
  lookupSignalLifecycle,
  releaseSignalLifecycle,
  resolveWillRetry,
  wasSignalObserved,
} from './retry-context'

export type { RetryLifecycle, RetryValue } from './retry-context'

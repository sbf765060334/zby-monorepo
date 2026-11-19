import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'

import type { ProTableController, ProTableQueryRecord, ProTableReadyInfo } from '../interface'

type UseProTableReadyParams<RecordType, Query extends ProTableQueryRecord, Summary> = {
  controller: ProTableController<RecordType, Query, Summary>
  initializationKey: object
  ready: boolean
  restoreActiveView: () => Promise<void>
  onReady?: (info: ProTableReadyInfo<RecordType, Query, Summary>) => void
}

const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

export function useProTableReady<RecordType, Query extends ProTableQueryRecord, Summary>({
  controller,
  initializationKey,
  ready,
  restoreActiveView,
  onReady,
}: UseProTableReadyParams<RecordType, Query, Summary>) {
  const onReadyRef = useRef(onReady)
  const notifiedRef = useRef(new WeakSet<object>())
  const requestedRef = useRef(new WeakSet<object>())

  useBrowserLayoutEffect(() => {
    // 只读取已提交的回调；函数引用变化不构成一轮新的初始化。
    onReadyRef.current = onReady
  }, [onReady])

  useEffect(() => {
    if (!ready || notifiedRef.current.has(initializationKey)) return
    notifiedRef.current.add(initializationKey)

    const latestParams = controller.getState().latestParams
    const unsubscribe = controller.subscribe((state) => {
      // 即使同步请求立刻失败，也能从请求开始时的状态更新识别它，避免自动补查重复请求。
      if (state.loading && state.latestParams !== latestParams) {
        requestedRef.current.add(initializationKey)
      }
    })
    try {
      onReadyRef.current?.({ controller, restoreActiveView })
    } finally {
      // onReady 是通知，不等待业务 Promise；只识别回调同步发起的请求。
      unsubscribe()
    }
  }, [controller, initializationKey, ready, restoreActiveView])

  return useCallback(
    () => notifiedRef.current.has(initializationKey) && !requestedRef.current.has(initializationKey),
    [initializationKey],
  )
}

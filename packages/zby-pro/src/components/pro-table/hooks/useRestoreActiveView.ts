import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'

const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

type UseRestoreActiveViewParams = {
  ready: boolean
  viewsEnabled: boolean
  restore: () => void
}

export function useRestoreActiveView(params: UseRestoreActiveViewParams) {
  const contextRef = useRef<UseRestoreActiveViewParams | null>(null)

  useBrowserLayoutEffect(() => {
    // ref 与 onReady 共用同一入口，只读取已提交且仍挂载的组件上下文。
    contextRef.current = params
    return () => {
      contextRef.current = null
    }
  })

  return useCallback(async () => {
    const context = contextRef.current
    if (!context?.ready) throw new Error('ProTable is not ready to restore a view.')
    if (!context.viewsEnabled) throw new Error('ProTable views are not enabled.')
    context.restore()
  }, [])
}

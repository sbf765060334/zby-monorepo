import { useEffect, useRef } from 'react'

import { ignoreProTableRequestError } from '../controller'
import type { ProTableController, ProTableQueryRecord } from '../interface'
import { shallow, useControllerSelector } from './useStoreSelector'

type UseAutoRequestParams<RecordType, Query extends ProTableQueryRecord, Summary> = {
  autoRequest: boolean
  controller: ProTableController<RecordType, Query, Summary>
  ready: boolean
  requestKey?: object
  refetch?: boolean
  canRequest?: () => boolean
}

export function useAutoRequest<RecordType, Query extends ProTableQueryRecord, Summary>({
  autoRequest,
  controller,
  ready,
  requestKey,
  refetch = false,
  canRequest,
}: UseAutoRequestParams<RecordType, Query, Summary>) {
  const startedRef = useRef<object | null>(null)
  const refetchDecisionRef = useRef<{ key: object; enabled: boolean } | null>(null)
  const requestIdentity = requestKey ?? controller
  const requestState = useControllerSelector(
    controller,
    (state) => ({
      loading: state.loading,
      requested: state.requested,
      requestReady: state.requestReady,
    }),
    shallow,
  )

  useEffect(() => {
    if (!ready || canRequest?.() === false) return
    if (refetchDecisionRef.current?.key !== requestIdentity) {
      // 补查只在这轮就绪时决定；当时关闭自动查询，之后开启不能重放一条旧补查。
      refetchDecisionRef.current = { key: requestIdentity, enabled: autoRequest && refetch }
    }
    const shouldRefetch = refetchDecisionRef.current.enabled
    // onReady 可在前面的 effect 中同步提交查询，这里必须读取最新状态，不能用渲染时的旧快照。
    const current = controller.getState()
    if (
      !autoRequest ||
      startedRef.current === requestIdentity ||
      (current.loading && !shouldRefetch) ||
      (!shouldRefetch && current.requested !== false) ||
      current.requestReady !== true
    ) {
      return
    }

    startedRef.current = requestIdentity
    ignoreProTableRequestError(controller.submitQuery({ resetPage: true }))
  }, [
    autoRequest,
    canRequest,
    controller,
    ready,
    refetch,
    requestIdentity,
    requestState.loading,
    requestState.requestReady,
    requestState.requested,
  ])
}

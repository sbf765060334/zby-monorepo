import { useEffect, useRef } from 'react'

import { ignoreProTableRequestError } from '../controller'
import type { ProTableController } from '../interface'
import { shallow, useControllerSelector } from './useStoreSelector'

type UseAutoRequestParams<RecordType, Query extends Record<string, unknown>, Summary> = {
  autoRequest: boolean
  controller: ProTableController<RecordType, Query, Summary>
  ready: boolean
}

export function useAutoRequest<RecordType, Query extends Record<string, unknown>, Summary>({
  autoRequest,
  controller,
  ready,
}: UseAutoRequestParams<RecordType, Query, Summary>) {
  const startedRef = useRef(false)
  const previousControllerRef = useRef(controller)
  const requestState = useControllerSelector(
    controller,
    (state) => ({
      loading: state.loading,
      requested: state.requested,
      requestReady: state.requestReady,
    }),
    shallow,
  )

  if (previousControllerRef.current !== controller) {
    previousControllerRef.current = controller
    startedRef.current = false
  }

  useEffect(() => {
    if (
      !autoRequest ||
      !ready ||
      startedRef.current ||
      requestState.loading ||
      requestState.requested !== false ||
      requestState.requestReady !== true
    ) {
      return
    }

    startedRef.current = true
    ignoreProTableRequestError(controller.submitQuery({ resetPage: true }))
  }, [
    autoRequest,
    controller,
    ready,
    requestState.loading,
    requestState.requestReady,
    requestState.requested,
  ])
}

import * as React from 'react'

import {
  cancelProTableControllerRequests,
  createProTableController,
} from '../controller'
import type {
  ProTableController,
  ProTableControllerConfig,
} from '../interface'

export interface UseProTableControllerOptions<RecordType, Query extends Record<string, unknown>, Summary> {
  controller?: ProTableController<RecordType, Query, Summary>
  config: ProTableControllerConfig<RecordType, Query, Summary>
  onReady?: (controller: ProTableController<RecordType, Query, Summary>) => void
}

export function useProTableController<
  RecordType,
  Query extends Record<string, unknown>,
  Summary,
>({
  controller: controllerProp,
  config,
  onReady,
}: UseProTableControllerOptions<RecordType, Query, Summary>) {
  const [internalController] = React.useState<
    ProTableController<RecordType, Query, Summary> | null
  >(() =>
    controllerProp
      ? null
      : createProTableController<RecordType, Query, Summary>(config),
  )
  const controller = controllerProp ?? internalController!

  React.useEffect(() => {
    onReady?.(controller)
  }, [controller, onReady])

  React.useEffect(() => {
    if (controllerProp) return

    controller.configure(config)
  }, [config, controller, controllerProp])

  React.useEffect(
    () => () => {
      if (!controllerProp) cancelProTableControllerRequests(controller)
    },
    [controller, controllerProp],
  )

  return controller
}

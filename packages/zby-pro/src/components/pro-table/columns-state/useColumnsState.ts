import { useCallback, useEffect, useMemo, useRef } from 'react'

import type { ProTableColumnPreference, ProTableColumnsStateConfig } from '../interface'
import type { ProTableViewStore } from '../store'
import type { ProTableColumnDefinition } from '../utils/columns'
import { resolveColumnPreferences } from '../utils/field-config'

type UseColumnsStateParams = {
  columnSetting: false | ProTableColumnsStateConfig
  preferencesEnabled: boolean
  viewStore: ProTableViewStore
  columnDefinitions: ProTableColumnDefinition[]
  viewInitializationReady: boolean
}

function isFieldPreferenceEqual(left: ProTableColumnPreference, right: ProTableColumnPreference) {
  return (
    left.key === right.key &&
    left.visible === right.visible &&
    left.order === right.order &&
    (left.pin ?? null) === (right.pin ?? null) &&
    left.width === right.width
  )
}

function isFieldPreferencesEqual(left: ProTableColumnPreference[], right: ProTableColumnPreference[]) {
  return (
    left.length === right.length &&
    left.every((item, index) => isFieldPreferenceEqual(item, right[index]))
  )
}

export function createColumnSchemaSignature(definitions: ProTableColumnDefinition[]) {
  return JSON.stringify(
    definitions.map((definition) => ({
      key: definition.key,
      capabilities: {
        visibility: definition.capabilities?.visibility ?? true,
        pinning: definition.capabilities?.pinning ?? true,
        resizing: definition.capabilities?.resizing ?? true,
      },
      defaultPreference: {
        visible: definition.defaultPreference?.visible ?? true,
        order: definition.defaultPreference?.order,
        pin: definition.defaultPreference?.pin ?? null,
        width: definition.defaultPreference?.width,
      },
      fixed: definition.meta && 'fixed' in definition.meta ? definition.meta.fixed : undefined,
    })),
  )
}

export function reconcileColumnPreferences(
  definitions: ProTableColumnDefinition[],
  current: ProTableColumnPreference[],
  policy: ProTableColumnsStateConfig['newColumnPolicy'],
) {
  return resolveColumnPreferences(definitions, {
    current,
    policy,
  })
}

export function useColumnsState({
  columnSetting,
  preferencesEnabled,
  viewStore,
  columnDefinitions,
  viewInitializationReady,
}: UseColumnsStateParams) {
  const newColumnPolicy = columnSetting ? columnSetting.newColumnPolicy : undefined
  const columnSchemaSignature = useMemo(
    () => createColumnSchemaSignature(columnDefinitions),
    [columnDefinitions],
  )
  const lastColumnSchemaSignatureRef = useRef<string | null>(null)

  useEffect(() => {
    if (!viewInitializationReady) {
      return
    }

    const actions = viewStore.getState()

    if (!preferencesEnabled) {
      if (!actions.columnsReady) {
        actions.setColumnsReady(true)
      }
      return
    }

    const shouldReconcile = lastColumnSchemaSignatureRef.current !== columnSchemaSignature
    lastColumnSchemaSignatureRef.current = columnSchemaSignature

    if (!shouldReconcile) {
      if (!actions.columnsReady) {
        actions.setColumnsReady(true)
      }
      return
    }

    const nextPreferences = reconcileColumnPreferences(
      columnDefinitions,
      actions.mergedColumnsPreferences,
      newColumnPolicy,
    )

    if (!isFieldPreferencesEqual(actions.mergedColumnsPreferences, nextPreferences)) {
      actions.setMergedColumnsPreferences(nextPreferences)
    }

    if (!actions.columnsReady) {
      actions.setColumnsReady(true)
    }
  }, [
    columnDefinitions,
    columnSchemaSignature,
    newColumnPolicy,
    preferencesEnabled,
    viewInitializationReady,
    viewStore,
  ])

  const applyColumnsState = useCallback(
    async (items: ProTableColumnPreference[]) => {
      const actions = viewStore.getState()
      actions.setMergedColumnsPreferences(
        reconcileColumnPreferences(columnDefinitions, items, newColumnPolicy),
      )
      actions.setColumnsModalOpen(false)
    },
    [columnDefinitions, newColumnPolicy, viewStore],
  )

  return {
    applyColumnsState,
  }
}

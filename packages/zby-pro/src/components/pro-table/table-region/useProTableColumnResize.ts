import { useCallback, useMemo, useRef, useState } from 'react'

import type { TableColumnsType, TableColumnType } from '@zby/ui'

import type {
  ProTableColumnResizeConfig,
  ProTableColumnResizeInfo,
  ProTableColumnPreference,
  ProTableColumnType,
  ProTableColumnWidthMap,
  ProTableProps,
} from '../interface'
import type { ProTableViewStore } from '../store'
import { extractColumnKey, flattenColumnLeaves } from '../utils'
import type { ProTableColumnDefinition } from '../utils/columns'
import { updateColumnPreference } from '../utils/field-config'

const DEFAULT_RESIZE_WIDTH = 160

function normalizeColumnResizeConfig<RecordType>(
  columnResize: boolean | ProTableColumnResizeConfig<RecordType> | undefined,
): ProTableColumnResizeConfig<RecordType> | null {
  if (!columnResize) {
    return null
  }
  return columnResize === true ? {} : columnResize
}

function getFiniteWidth(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined
}

function parsePixelWidth(value: unknown) {
  const numberValue = getFiniteWidth(value)
  if (numberValue !== undefined) {
    return numberValue
  }
  if (typeof value === 'string') {
    const matched = value.trim().match(/^(\d+(?:\.\d+)?)px$/)
    if (matched) {
      return Number(matched[1])
    }
  }
  return undefined
}

function buildColumnMap<RecordType>(columns: ProTableColumnType<RecordType>[] | undefined) {
  const map = new Map<string, ProTableColumnType<RecordType>>()
  flattenColumnLeaves(columns).forEach((column) => {
    const key = extractColumnKey(column)
    if (key) {
      map.set(key, column)
    }
  })
  return map
}

type TableColumnWithChildren<RecordType> = TableColumnsType<RecordType>[number] & {
  children?: TableColumnsType<RecordType>
}

function flattenTableColumnLeaves<RecordType>(
  columns: TableColumnsType<RecordType>,
): TableColumnType<RecordType>[] {
  const leaves: TableColumnType<RecordType>[] = []
  const visit = (items: TableColumnsType<RecordType>) => {
    items.forEach((column) => {
      const columnWithChildren = column as TableColumnWithChildren<RecordType>
      if (Array.isArray(columnWithChildren.children)) {
        visit(columnWithChildren.children)
        return
      }
      leaves.push(column as TableColumnType<RecordType>)
    })
  }
  visit(columns)
  return leaves
}

function buildPreferenceMap(preferences: ProTableColumnPreference[]) {
  return new Map(preferences.map((preference) => [preference.key, preference]))
}

function createWidthSignature(widths: ProTableColumnWidthMap | undefined) {
  return Object.entries(widths ?? {})
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, width]) => `${key}:${width}`)
    .join('|')
}

export function useProTableColumnResize<
  RecordType,
  Query extends Record<string, unknown>,
  Summary,
>({
  columns,
  visibleColumns,
  columnDefinitions,
  columnResize,
  mergedColumnsPreferences,
  viewStore,
  defaultPersist,
}: {
  columns: ProTableProps<RecordType, Query, Summary>['columns']
  visibleColumns: TableColumnsType<RecordType>
  columnDefinitions: ProTableColumnDefinition[]
  columnResize?: ProTableProps<RecordType, Query, Summary>['columnResize']
  mergedColumnsPreferences: ProTableColumnPreference[]
  viewStore: ProTableViewStore
  defaultPersist: boolean
}) {
  const columnResizeConfig = useMemo(
    () => normalizeColumnResizeConfig(columnResize),
    [columnResize],
  )
  const columnResizeEnabled = Boolean(columnResizeConfig)
  const sourceColumnMap = useMemo(() => buildColumnMap(columns), [columns])
  const preferenceMap = useMemo(
    () => buildPreferenceMap(mergedColumnsPreferences),
    [mergedColumnsPreferences],
  )
  const resizeDefaultWidths = useMemo<ProTableColumnWidthMap | undefined>(() => {
    if (!columnResizeConfig) {
      return undefined
    }
    const nextWidths: ProTableColumnWidthMap = {}
    flattenTableColumnLeaves(visibleColumns).forEach((column) => {
      const key = extractColumnKey(column as ProTableColumnType<RecordType>)
      if (!key) {
        return
      }
      const sourceColumn = sourceColumnMap.get(key) ?? (column as ProTableColumnType<RecordType>)
      const preference = preferenceMap.get(key)
      const fieldDefault = sourceColumn.fieldConfig
        ? sourceColumn.fieldConfig.defaultPreference?.width
        : undefined
      const width =
        getFiniteWidth(columnResizeConfig.widths?.[key]) ??
        getFiniteWidth(preference?.width) ??
        getFiniteWidth(columnResizeConfig.defaultWidths?.[key]) ??
        parsePixelWidth(column.width) ??
        parsePixelWidth(sourceColumn.width) ??
        getFiniteWidth(fieldDefault) ??
        getFiniteWidth(columnResizeConfig.defaultWidth) ??
        DEFAULT_RESIZE_WIDTH
      nextWidths[key] = width
    })
    return nextWidths
  }, [columnResizeConfig, preferenceMap, sourceColumnMap, visibleColumns])
  const resizeDefaultWidthsSignature = useMemo(
    () => createWidthSignature(resizeDefaultWidths),
    [resizeDefaultWidths],
  )
  const lastResizeDefaultWidthsSignatureRef = useRef<string | null>(null)
  const resizeBaselineVersionRef = useRef(0)
  const [uncontrolledResizeState, setUncontrolledResizeState] = useState<{
    baselineVersion: number
    widths: ProTableColumnWidthMap
  } | null>(null)

  if (lastResizeDefaultWidthsSignatureRef.current !== resizeDefaultWidthsSignature) {
    lastResizeDefaultWidthsSignatureRef.current = resizeDefaultWidthsSignature
    resizeBaselineVersionRef.current += 1
  }

  const hasControlledWidths = Boolean(columnResizeConfig?.widths)
  const resizeWidths = useMemo<ProTableColumnWidthMap | undefined>(() => {
    if (!columnResizeConfig || !resizeDefaultWidths) {
      return undefined
    }
    if (columnResizeConfig.widths) {
      return columnResizeConfig.widths
    }
    if (uncontrolledResizeState?.baselineVersion === resizeBaselineVersionRef.current) {
      return uncontrolledResizeState.widths
    }
    return resizeDefaultWidths
  }, [columnResizeConfig, resizeDefaultWidths, uncontrolledResizeState])
  const resizedVisibleColumns = useMemo(() => {
    if (!columnResizeConfig || !resizeDefaultWidths) {
      return visibleColumns
    }
    const resizeColumn = (
      column: TableColumnsType<RecordType>[number],
    ): TableColumnsType<RecordType>[number] => {
      const columnWithChildren = column as TableColumnWithChildren<RecordType>
      if (Array.isArray(columnWithChildren.children)) {
        return {
          ...column,
          children: columnWithChildren.children.map((child) => resizeColumn(child)),
        } as TableColumnsType<RecordType>[number]
      }
      const key = extractColumnKey(column as ProTableColumnType<RecordType>)
      if (!key) {
        return column
      }
      const sourceColumn = sourceColumnMap.get(key) ?? (column as ProTableColumnType<RecordType>)
      const fieldConfig = sourceColumn.fieldConfig
      const resizingEnabled = fieldConfig ? fieldConfig.capabilities?.resizing !== false : true
      const resizable = column.resizable ?? resizingEnabled
      return {
        ...column,
        key,
        width: resizeWidths?.[key] ?? resizeDefaultWidths[key],
        resizable,
      } as TableColumnsType<RecordType>[number]
    }
    return visibleColumns.map((column) => resizeColumn(column))
  }, [columnResizeConfig, resizeDefaultWidths, resizeWidths, sourceColumnMap, visibleColumns])

  const updateColumnWidthPreference = useCallback(
    (info: ProTableColumnResizeInfo<RecordType>) => {
      const actions = viewStore.getState()
      const keyText =
        extractColumnKey(info.column as ProTableColumnType<RecordType>) ?? String(info.key)
      const width = getFiniteWidth(info.width)
      if (
        !actions.columnsReady ||
        width === undefined ||
        !columnDefinitions.some((definition) => definition.key === keyText) ||
        !actions.mergedColumnsPreferences.some((preference) => preference.key === keyText)
      ) {
        return
      }
      actions.setMergedColumnsPreferences(
        updateColumnPreference(actions.mergedColumnsPreferences, keyText, { width }),
      )
    },
    [columnDefinitions, viewStore],
  )

  const mergedColumnResize = useMemo(() => {
    if (!columnResizeConfig) {
      return undefined
    }
    const persist = columnResizeConfig.persist ?? defaultPersist
    return {
      defaultWidth: columnResizeConfig.defaultWidth,
      minWidth: columnResizeConfig.minWidth,
      maxWidth: columnResizeConfig.maxWidth,
      widths: resizeWidths,
      defaultWidths: resizeDefaultWidths,
      onWidthsChange: (widths: ProTableColumnWidthMap, info: ProTableColumnResizeInfo<RecordType>) => {
        if (!hasControlledWidths) {
          setUncontrolledResizeState({
            baselineVersion: resizeBaselineVersionRef.current,
            widths,
          })
        }
        columnResizeConfig.onWidthsChange?.(widths, info)
      },
      onResize: (info: ProTableColumnResizeInfo<RecordType>) => {
        columnResizeConfig.onResize?.(info)
      },
      onResizeEnd: (info: ProTableColumnResizeInfo<RecordType>) => {
        if (persist) {
          updateColumnWidthPreference(info)
        }
        columnResizeConfig.onResizeEnd?.(info)
      },
    }
  }, [
    columnResizeConfig,
    defaultPersist,
    hasControlledWidths,
    resizeDefaultWidths,
    resizeWidths,
    updateColumnWidthPreference,
  ])

  return {
    columnResizeEnabled,
    columnResize: mergedColumnResize,
    columns: resizedVisibleColumns,
  }
}

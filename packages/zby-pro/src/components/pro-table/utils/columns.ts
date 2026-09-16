import type { ReactNode } from 'react'
import type { TableColumnsType, TableColumnType } from '@zby/ui'

import type {
  ProTableColumnType,
  ProTableColumnPreference,
} from '../interface'
import {
  formatColumnValue,
  type ProTableColumnValueMessages,
} from './column-value'

export { formatColumnValue }
export type { ProTableColumnValueMessages }

export interface ProTableColumnDefinitionMeta {
  title?: ReactNode
  fixed?: TableColumnType<any>['fixed']
  columnPath: string[]
}

export interface ProTableColumnDefinition {
  key: string
  label: ReactNode
  capabilities?: {
    visibility?: boolean
    pinning?: boolean
    resizing?: boolean
  }
  defaultPreference?: {
    visible?: boolean
    order?: number
    pin?: 'left' | 'right' | null
    width?: number
  }
  meta?: ProTableColumnDefinitionMeta
}

export function extractColumnKey<RecordType>(column: ProTableColumnType<RecordType>) {
  const { dataIndex } = column

  if (typeof dataIndex === 'string' || typeof dataIndex === 'number') return String(dataIndex)
  if (
    Array.isArray(dataIndex) &&
    dataIndex.every((item) => typeof item === 'string' || typeof item === 'number')
  ) {
    return dataIndex.join('.')
  }
  if (typeof column.key === 'string' || typeof column.key === 'number') return String(column.key)
  return null
}

function defaultPin(fixed: TableColumnType<any>['fixed']) {
  if (fixed === true || fixed === 'left' || fixed === 'start') return 'left' as const
  if (fixed === 'right' || fixed === 'end') return 'right' as const
  return null
}

type FlatColumn<RecordType> = ProTableColumnType<RecordType> & {
  __proTableKey: string
  __proTablePath: string[]
}

export function flattenColumnLeaves<RecordType>(
  columns: ProTableColumnType<RecordType>[] | undefined,
): FlatColumn<RecordType>[] {
  const leaves: FlatColumn<RecordType>[] = []
  const visit = (items: ProTableColumnType<RecordType>[] | undefined, path: string[]) => {
    ;(items ?? []).forEach((column, index) => {
      if (!column) return
      const key = extractColumnKey(column)
      const nextPath = path.concat(key ?? String(index))
      if (Array.isArray(column.children)) {
        visit(column.children, nextPath)
        return
      }
      if (key) {
        leaves.push({
          ...column,
          __proTableKey: key,
          __proTablePath: nextPath,
        })
      }
    })
  }
  visit(columns, [])
  return leaves
}

export function buildColumnDefinitions<RecordType>(
  columns: ProTableColumnType<RecordType>[] | undefined,
): ProTableColumnDefinition[] {
  return flattenColumnLeaves(columns)
    .filter((column) => column.fieldConfig !== false)
    .map((column, index) => {
      const fieldConfig = column.fieldConfig || {}
      return {
        key: column.__proTableKey,
        label: column.label ?? (typeof column.title === 'function' ? column.__proTableKey : column.title) ?? column.__proTableKey,
        capabilities: {
          visibility: fieldConfig.capabilities?.visibility ?? true,
          pinning: fieldConfig.capabilities?.pinning ?? true,
          resizing: fieldConfig.capabilities?.resizing ?? true,
        },
        defaultPreference: {
          visible: fieldConfig.defaultPreference?.visible ?? true,
          order: fieldConfig.defaultPreference?.order ?? index,
          pin: fieldConfig.defaultPreference?.pin ?? defaultPin(column.fixed),
          width: fieldConfig.defaultPreference?.width,
        },
        meta: {
          ...fieldConfig.meta,
          title: typeof column.title === 'function' ? undefined : column.title,
          fixed: column.fixed,
          columnPath: column.__proTablePath,
        },
      }
    })
}

function normalizeColumn<RecordType>(
  column: ProTableColumnType<RecordType>,
  messages?: ProTableColumnValueMessages,
  columnEmptyText?: ReactNode | false,
): TableColumnsType<RecordType>[number] {
  const {
    children,
    fieldConfig: _fieldConfig,
    label: _label,
    valueType: _valueType,
    dataRenderType: _dataRenderType,
    fieldProps: _fieldProps,
    valueEnum: _valueEnum,
    emptyText: _emptyText,
    renderText,
    ...rest
  } = column
  if (Array.isArray(children)) {
    return {
      ...rest,
      children: children.map((child) =>
        normalizeColumn(child, messages, columnEmptyText),
      ),
    } as TableColumnsType<RecordType>[number]
  }
  if (!rest.render && !renderText) {
    return {
      ...rest,
      renderText: (value: unknown, record: RecordType, index: number) =>
        formatColumnValue(
          value,
          {
            ...column,
            fieldProps:
              typeof column.fieldProps === 'function'
                ? column.fieldProps(value, record, index)
                : column.fieldProps,
          },
          index,
          { emptyText: columnEmptyText, messages },
        ),
    } as TableColumnsType<RecordType>[number]
  }
  return { ...rest, renderText } as TableColumnsType<RecordType>[number]
}

export function normalizeTableColumns<RecordType>(
  columns: ProTableColumnType<RecordType>[] | undefined,
  messages?: ProTableColumnValueMessages,
  columnEmptyText?: ReactNode | false,
): TableColumnsType<RecordType> {
  return (columns ?? []).map((column) =>
    normalizeColumn(column, messages, columnEmptyText),
  )
}

function peelTrailingLockedColumns<RecordType>(
  original: ProTableColumnType<RecordType>[] | undefined,
  rendered: TableColumnsType<RecordType>,
) {
  const trailing: TableColumnsType<RecordType> = []
  const head = rendered.slice()
  const source = original ?? []

  for (let index = source.length - 1; index >= 0; index -= 1) {
    if (source[index]?.fieldConfig !== false) break
    const column = head.pop()
    if (column) trailing.unshift(column)
  }

  return { head, trailing }
}

export function applyColumnPreferences<RecordType>(
  columns: ProTableColumnType<RecordType>[] | undefined,
  definitions: ProTableColumnDefinition[],
  preferences: ProTableColumnPreference[],
  messages?: ProTableColumnValueMessages,
  columnEmptyText?: ReactNode | false,
): TableColumnsType<RecordType> {
  const definitionMap = new Map(definitions.map((definition) => [definition.key, definition]))
  const preferenceMap = new Map(preferences.map((item) => [item.key, item]))
  const sourceMap = new Map(flattenColumnLeaves(columns).map((column) => [column.__proTableKey, column]))

  const buildPreferredColumn = (preference: ProTableColumnPreference) => {
    const definition = definitionMap.get(preference.key)
    const column = sourceMap.get(preference.key)
    if (!definition || !column) return null
    return {
      ...normalizeColumn(column, messages, columnEmptyText),
      fixed: preference.pin ?? undefined,
      title: definition.meta?.title ?? column.title,
    } as TableColumnsType<RecordType>[number]
  }

  const applyLevel = (items: ProTableColumnType<RecordType>[] | undefined) => {
    const hoistedLeft: ProTableColumnPreference[] = []
    const hoistedRight: ProTableColumnPreference[] = []
    const unpinnedColumns = (items ?? [])
      .filter((column) => !Array.isArray(column.children) && column.fieldConfig !== false)
      .map((column) => {
        const key = extractColumnKey(column)
        const preference = key ? preferenceMap.get(key) : undefined
        return key && preference?.visible && !preference.pin && definitionMap.has(key)
          ? preference
          : null
      })
      .filter((item): item is ProTableColumnPreference => Boolean(item))
      .sort((left, right) => left.order - right.order)
      .map(buildPreferredColumn)
      .filter((column): column is TableColumnsType<RecordType>[number] => Boolean(column))

    let unpinnedIndex = 0
    const nextColumns = (items ?? []).reduce<TableColumnsType<RecordType>>((result, column) => {
      if (Array.isArray(column.children)) {
        const nested = applyLevel(column.children)
        hoistedLeft.push(...nested.hoistedLeft)
        hoistedRight.push(...nested.hoistedRight)
        if (nested.columns.length > 0) {
          result.push({
            ...normalizeColumn(column, messages, columnEmptyText),
            children: nested.columns,
          } as TableColumnsType<RecordType>[number])
        }
        return result
      }
      if (column.fieldConfig === false) {
        result.push(normalizeColumn(column, messages, columnEmptyText))
        return result
      }
      const key = extractColumnKey(column)
      if (!key || !definitionMap.has(key)) {
        result.push(normalizeColumn(column, messages, columnEmptyText))
        return result
      }
      const preference = preferenceMap.get(key)
      if (preference?.pin === 'left') {
        if (preference.visible) hoistedLeft.push(preference)
        return result
      }
      if (preference?.pin === 'right') {
        if (preference.visible) hoistedRight.push(preference)
        return result
      }
      const nextColumn = unpinnedColumns[unpinnedIndex]
      unpinnedIndex += 1
      if (nextColumn) result.push(nextColumn)
      return result
    }, [])

    return {
      columns: nextColumns,
      hoistedLeft,
      hoistedRight,
    }
  }

  const applied = applyLevel(columns)
  const leftColumns = applied.hoistedLeft
    .sort((left, right) => left.order - right.order)
    .map(buildPreferredColumn)
    .filter((column): column is TableColumnsType<RecordType>[number] => Boolean(column))
  const rightColumns = applied.hoistedRight
    .sort((left, right) => left.order - right.order)
    .map(buildPreferredColumn)
    .filter((column): column is TableColumnsType<RecordType>[number] => Boolean(column))
  const { head, trailing } = peelTrailingLockedColumns(columns, applied.columns)

  return [...leftColumns, ...head, ...rightColumns, ...trailing]
}

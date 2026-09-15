import * as React from 'react'
import type { ReactNode } from 'react'
import type { TableColumnsType, TableColumnType } from '@zby/ui'

import type {
  ProTableColumnType,
  ProTableColumnValueEnum,
  ProTableColumnValueEnumItem,
  ProTableColumnPreference,
} from '../interface'

export type ProTableColumnValueMessages = {
  booleanTrue?: string
  booleanFalse?: string
}

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

function enumText(valueEnum: ProTableColumnValueEnum | undefined, value: unknown): ReactNode {
  if (!valueEnum) return value as ReactNode
  const item: ProTableColumnValueEnumItem | undefined =
    valueEnum instanceof Map
      ? valueEnum.get(value) ?? valueEnum.get(String(value))
      : valueEnum[String(value)]
  if (item === undefined || item === null) return value as ReactNode
  if (typeof item === 'object' && !React.isValidElement(item) && 'text' in item) {
    return item.text ?? (value as ReactNode)
  }
  return item as ReactNode
}

function formatValue(
  value: unknown,
  column: ProTableColumnType<any>,
  index = 0,
  messages?: ProTableColumnValueMessages,
): ReactNode {
  const valueType = typeof column.valueType === 'object' ? column.valueType.type : column.valueType ?? column.dataRenderType
  const typeConfig = typeof column.valueType === 'object' ? column.valueType : {}
  const fieldProps = (column.fieldProps ?? {}) as Record<string, any>
  if (value === undefined || value === null || value === '') return ''
  const text = enumText(column.valueEnum, value)
  if (valueType === 'tag') {
    const key = String(value)
    const props = typeof column.fieldProps === 'function' ? column.fieldProps(value, {}, 0) : column.fieldProps
    const enumItem = column.valueEnum instanceof Map ? column.valueEnum.get(value) : column.valueEnum?.[key]
    const enumColor = enumItem && typeof enumItem === 'object' && !React.isValidElement(enumItem) && 'color' in enumItem ? enumItem.color : undefined
    return React.createElement('span', {
      ...props,
      style: { display: 'inline-block', padding: '0 6px', borderRadius: 4, background: column.tagColorEnum?.[key] ?? column.tagColorEnum?.__default ?? enumColor, ...((props as any)?.style ?? {}) },
    }, text)
  }
  if (valueType === 'money' && typeof value === 'number') {
    const precision = typeConfig.precision ?? fieldProps.precision
    const formatted = value.toLocaleString(typeConfig.locale ?? fieldProps.locale, {
      style: typeConfig.showSymbol === false || fieldProps.showSymbol === false ? 'decimal' : 'currency',
      currency: typeConfig.currency ?? fieldProps.currency ?? 'CNY',
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    })
    return typeConfig.showSymbol === false || fieldProps.showSymbol === false
      ? formatted
      : fieldProps.customSymbol
        ? `${fieldProps.customSymbol}${formatted.replace(/^[^\d-]+/u, '')}`
        : formatted
  }
  if (valueType === 'percent' && typeof value === 'number') {
    const precision = typeConfig.precision ?? fieldProps.precision
    return `${precision === undefined ? value : value.toFixed(precision)}%`
  }
  if (valueType === 'digit' && typeof value === 'number') {
    const precision = typeConfig.precision ?? fieldProps.precision
    return value.toLocaleString(typeConfig.locale ?? fieldProps.locale, {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    })
  }
  if (valueType === 'boolean' && typeof value === 'boolean') {
    return value ? (messages?.booleanTrue ?? '是') : (messages?.booleanFalse ?? '否')
  }
  if (valueType === 'index' || valueType === 'indexBorder') return index + 1
  if (valueType === 'progress' && typeof value === 'number') {
    const percent = Math.max(0, Math.min(100, value))
    return React.createElement('span', { style: { display: 'inline-block', minWidth: 80 } }, `${percent}%`)
  }
  if (valueType === 'avatar' || valueType === 'image') {
    return React.createElement('img', { src: String(value), alt: '', style: { maxWidth: 32, maxHeight: 32, objectFit: 'cover', borderRadius: valueType === 'avatar' ? '50%' : undefined } })
  }
  if (valueType === 'code') return React.createElement('code', null, String(value))
  if (valueType === 'jsonCode') {
    let json = String(value)
    try {
      json = JSON.stringify(value, null, 2)
    } catch {
      /* fall back to string */
    }
    return React.createElement('pre', { style: { margin: 0 } }, json)
  }
  if (valueType === 'textarea') return React.createElement('span', { style: { whiteSpace: 'pre-wrap' } }, String(value))
  if (valueType === 'date' || valueType === 'dateTime' || valueType === 'week' || valueType === 'month' || valueType === 'year') {
    const date = new Date(String(value))
    if (!Number.isNaN(date.valueOf())) {
      if (valueType === 'month') return date.toISOString().slice(0, 7)
      if (valueType === 'year') return date.toISOString().slice(0, 4)
      if (valueType === 'week') {
        const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
        const week = Math.ceil((((date.getTime() - start.getTime()) / 86400000) + start.getUTCDay() + 1) / 7)
        return `${date.toISOString().slice(0, 4)}-W${String(week).padStart(2, '0')}`
      }
      return valueType === 'date' ? date.toISOString().slice(0, 10) : date.toISOString().replace('T', ' ').slice(0, 19)
    }
  }
  return text
}

function normalizeColumn<RecordType>(
  column: ProTableColumnType<RecordType>,
  messages?: ProTableColumnValueMessages,
): TableColumnsType<RecordType>[number] {
  const { children, fieldConfig: _fieldConfig, label: _label, valueType: _valueType, dataRenderType: _dataRenderType, fieldProps: _fieldProps, valueEnum: _valueEnum, tagColorEnum: _tagColorEnum, renderText, ...rest } = column
  if (Array.isArray(children)) {
    return { ...rest, children: children.map((child) => normalizeColumn(child, messages)) } as TableColumnsType<RecordType>[number]
  }
  if (!rest.render && !renderText && (column.valueType || column.dataRenderType || column.valueEnum || column.tagColorEnum || column.fieldProps)) {
    return { ...rest, renderText: (value: unknown, record: RecordType, index: number) => formatValue(value, { ...column, fieldProps: typeof column.fieldProps === 'function' ? column.fieldProps(value, record, index) : column.fieldProps }, index, messages) } as TableColumnsType<RecordType>[number]
  }
  return { ...rest, renderText } as TableColumnsType<RecordType>[number]
}

export function normalizeTableColumns<RecordType>(
  columns: ProTableColumnType<RecordType>[] | undefined,
  messages?: ProTableColumnValueMessages,
): TableColumnsType<RecordType> {
  return (columns ?? []).map((column) => normalizeColumn(column, messages))
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
): TableColumnsType<RecordType> {
  const definitionMap = new Map(definitions.map((definition) => [definition.key, definition]))
  const preferenceMap = new Map(preferences.map((item) => [item.key, item]))
  const sourceMap = new Map(flattenColumnLeaves(columns).map((column) => [column.__proTableKey, column]))

  const buildPreferredColumn = (preference: ProTableColumnPreference) => {
    const definition = definitionMap.get(preference.key)
    const column = sourceMap.get(preference.key)
    if (!definition || !column) return null
    return {
      ...normalizeColumn(column, messages),
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
            ...normalizeColumn(column, messages),
            children: nested.columns,
          } as TableColumnsType<RecordType>[number])
        }
        return result
      }
      if (column.fieldConfig === false) {
        result.push(normalizeColumn(column, messages))
        return result
      }
      const key = extractColumnKey(column)
      if (!key || !definitionMap.has(key)) {
        result.push(normalizeColumn(column, messages))
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

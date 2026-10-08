import * as React from 'react'
import type { ReactNode } from 'react'
import { Badge, Progress, Space, Tag } from 'antd'
import type { BadgeProps } from 'antd'
import dayjs from 'dayjs'
import advancedFormat from 'dayjs/plugin/advancedFormat'
import isoWeek from 'dayjs/plugin/isoWeek'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import 'dayjs/locale/en'
import 'dayjs/locale/zh-cn'

import type {
  ProTableColumnType,
  ProTableColumnValueEnum,
  ProTableColumnValueEnumItem,
  ProTableColumnValueType,
} from '../interface'

export type ProTableColumnValueMessages = {
  booleanTrue?: string
  booleanFalse?: string
}

dayjs.extend(isoWeek)
dayjs.extend(weekOfYear)
dayjs.extend(advancedFormat)

const DEFAULT_EMPTY_TEXT = '-'
const BADGE_STATUS = new Set(['success', 'error', 'default', 'processing', 'warning'])

type ColumnValueTypeName = ProTableColumnValueType | 'dateWeek' | 'dateMonth' | 'dateYear'

type ObjectValueTypeConfig = {
  type?: ColumnValueTypeName
  currency?: string
  locale?: string
  precision?: number
  showSymbol?: boolean | ((value: unknown) => boolean)
  showColor?: boolean
  moneySymbol?: boolean
  status?: 'normal' | 'active' | 'success' | 'exception'
}

export type FormatColumnValueOptions = {
  emptyText?: ReactNode | false
  messages?: ProTableColumnValueMessages
  getIndexPage?: () => {
    currentPage: number
    pageSize: number
    paginated: boolean
  }
}

function isEmptyCellValue(value: unknown) {
  return value === undefined || value === null || value === ''
}

function resolveEmptyText(
  column: ProTableColumnType<any>,
  options?: FormatColumnValueOptions,
) {
  if (column.emptyText !== undefined) {
    return column.emptyText
  }
  if (options?.emptyText !== undefined) {
    return options.emptyText
  }
  return DEFAULT_EMPTY_TEXT
}

function normalizeValueTypeName(
  valueType: ProTableColumnType<any>['valueType'],
  dataRenderType?: ProTableColumnValueType,
): ColumnValueTypeName | undefined {
  const next = typeof valueType === 'object' ? valueType.type : (valueType ?? dataRenderType)
  if (next === 'week') return 'dateWeek'
  if (next === 'month') return 'dateMonth'
  if (next === 'year') return 'dateYear'
  return next
}

function getObjectValueTypeConfig(
  valueType: ProTableColumnType<any>['valueType'],
): ObjectValueTypeConfig {
  return typeof valueType === 'object' ? valueType : {}
}

function resolveFieldProps(
  fieldProps: ProTableColumnType<any>['fieldProps'],
): Record<string, any> {
  if (!fieldProps || typeof fieldProps === 'function') {
    return {}
  }
  return fieldProps as Record<string, any>
}

function toFiniteNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const next = Number(value.replace(/%/g, ''))
    return Number.isFinite(next) ? next : null
  }
  return null
}

function getEnumItem(
  valueEnum: ProTableColumnValueEnum | undefined,
  value: unknown,
): ProTableColumnValueEnumItem | undefined {
  if (!valueEnum) {
    return undefined
  }
  if (valueEnum instanceof Map) {
    return valueEnum.get(value) ?? valueEnum.get(String(value))
  }
  return valueEnum[value as string] ?? valueEnum[String(value)]
}

function isEnumObject(
  item: ProTableColumnValueEnumItem | undefined,
): item is Exclude<ProTableColumnValueEnumItem, ReactNode> {
  return Boolean(
    item &&
      typeof item === 'object' &&
      !Array.isArray(item) &&
      !React.isValidElement(item) &&
      ('text' in item || 'status' in item || 'color' in item),
  )
}

function getRawFallback(value: unknown): ReactNode {
  if (value && typeof value === 'object' && 'label' in value) {
    const labeled = value as { label?: ReactNode }
    return labeled.label ?? (value as unknown as ReactNode)
  }
  return value as ReactNode
}

function getEnumText(
  item: ProTableColumnValueEnumItem | undefined,
  value: unknown,
): ReactNode {
  if (item === undefined || item === null) {
    return getRawFallback(value)
  }
  if (isEnumObject(item)) {
    return item.text ?? (value as ReactNode)
  }
  return item
}

function isBadgeStatus(status: string): status is NonNullable<BadgeProps['status']> {
  return BADGE_STATUS.has(status)
}

function renderEnumDisplay(
  item: ProTableColumnValueEnumItem | undefined,
  value: unknown,
): ReactNode {
  if (!isEnumObject(item)) {
    return getEnumText(item, value)
  }

  const text = item.text ?? (value as ReactNode)
  if (item.status && isBadgeStatus(item.status)) {
    return <Badge status={item.status} text={text} />
  }
  if (item.color) {
    return <Badge color={item.color} text={text} />
  }
  return text
}

function toDayjsLocale(locale?: string) {
  if (!locale) {
    return 'zh-cn'
  }
  return locale.toLowerCase().startsWith('zh') ? 'zh-cn' : 'en'
}

function formatDateValue(value: unknown, template: string, locale?: string) {
  const parsed = dayjs(value as string | number | Date).locale(toDayjsLocale(locale))
  if (!parsed.isValid()) {
    return null
  }
  return parsed.format(template)
}

function formatMoneyValue(
  value: number,
  typeConfig: ObjectValueTypeConfig,
  fieldProps: Record<string, any>,
) {
  const precision = typeConfig.precision ?? fieldProps.precision ?? 2
  const locale = typeConfig.locale ?? fieldProps.locale ?? 'zh-CN'
  const customSymbol = fieldProps.customSymbol
  const showSymbol =
    typeConfig.moneySymbol !== false &&
    typeConfig.showSymbol !== false &&
    fieldProps.moneySymbol !== false &&
    fieldProps.showSymbol !== false
  const grouped = value.toLocaleString(locale, {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  })

  if (customSymbol) {
    return `${customSymbol}${grouped}`
  }
  if (!showSymbol) {
    return grouped
  }
  return value.toLocaleString(locale, {
    style: 'currency',
    currency: typeConfig.currency ?? fieldProps.currency ?? 'CNY',
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  })
}

function formatPercentValue(
  value: number,
  typeConfig: ObjectValueTypeConfig,
  fieldProps: Record<string, any>,
) {
  const precision = typeConfig.precision ?? fieldProps.precision ?? 2
  const showColor = typeConfig.showColor ?? fieldProps.showColor
  const showSymbolProp = fieldProps.showSymbol ?? typeConfig.showSymbol
  const showSymbol =
    typeof showSymbolProp === 'function' ? showSymbolProp(value) : showSymbolProp
  const prefix = fieldProps.prefix
  const suffix = fieldProps.suffix ?? '%'
  const color = showColor
    ? value === 0
      ? '#595959'
      : value > 0
        ? '#ff4d4f'
        : '#52c41a'
    : undefined
  const symbol = showSymbol || value < 0 ? (value > 0 ? '+' : value < 0 ? '-' : null) : null

  return (
    <span style={color ? { color } : undefined}>
      {prefix}
      {symbol ? `${symbol} ` : null}
      {precision >= 0 ? Math.abs(value).toFixed(precision) : Math.abs(value)}
      {suffix}
    </span>
  )
}

function getProgressStatus(value: number): 'success' | 'exception' | 'normal' | 'active' {
  if (value === 100) return 'success'
  if (value < 0) return 'exception'
  if (value < 100) return 'active'
  return 'normal'
}

function renderIndex(index: number, options?: FormatColumnValueOptions) {
  const page = options?.getIndexPage?.()
  const offset =
    page?.paginated === true
      ? Math.max(page.currentPage - 1, 0) * Math.max(page.pageSize, 0)
      : 0
  return `#${offset + index + 1}`
}

export function formatColumnValue(
  value: unknown,
  column: ProTableColumnType<any>,
  index = 0,
  options?: FormatColumnValueOptions,
): ReactNode {
  const valueType = normalizeValueTypeName(column.valueType, column.dataRenderType)
  const emptyText = resolveEmptyText(column, options)
  if (
    emptyText !== false &&
    isEmptyCellValue(value) &&
    valueType !== 'index'
  ) {
    return emptyText
  }

  const typeConfig = getObjectValueTypeConfig(column.valueType)
  const fieldProps = resolveFieldProps(column.fieldProps)
  const enumItem = getEnumItem(column.valueEnum, value)

  if (valueType === 'tag') {
    const color =
      fieldProps.color ??
      (isEnumObject(enumItem) ? enumItem.color : undefined) ??
      'default'
    const { color: _color, ...tagProps } = fieldProps
    return (
      <Tag {...tagProps} color={color}>
        {getEnumText(enumItem, value)}
      </Tag>
    )
  }

  if (valueType === 'money') {
    const amount = toFiniteNumber(value)
    if (amount === null) {
      return emptyText === false ? (value as ReactNode) : emptyText
    }
    return formatMoneyValue(amount, typeConfig, fieldProps)
  }

  if (valueType === 'percent') {
    const amount = toFiniteNumber(value)
    if (amount === null) {
      return emptyText === false ? (value as ReactNode) : emptyText
    }
    return formatPercentValue(amount, typeConfig, fieldProps)
  }

  if (valueType === 'digit') {
    if (fieldProps.stringMode) {
      return String(value)
    }
    const amount = toFiniteNumber(value)
    if (amount === null) {
      return emptyText === false ? (value as ReactNode) : emptyText
    }
    const precision = typeConfig.precision ?? fieldProps.precision
    const formatted = amount.toLocaleString(typeConfig.locale ?? fieldProps.locale, {
      ...(precision === undefined
        ? {}
        : {
            minimumFractionDigits: precision,
            maximumFractionDigits: precision,
          }),
      ...fieldProps.intlProps,
    })
    return fieldProps.formatter?.(formatted) ?? formatted
  }

  if (valueType === 'boolean') {
    if (typeof value !== 'boolean') {
      return emptyText === false ? (value as ReactNode) : emptyText
    }
    return value
      ? (options?.messages?.booleanTrue ?? '是')
      : (options?.messages?.booleanFalse ?? '否')
  }

  if (valueType === 'index') {
    if (!isEmptyCellValue(value)) {
      return value as ReactNode
    }
    return renderIndex(index, options)
  }

  if (valueType === 'progress') {
    const amount = toFiniteNumber(value)
    if (amount === null) {
      return emptyText === false ? (value as ReactNode) : emptyText
    }
    return (
      <Progress
        size="small"
        style={{ minWidth: 100, maxWidth: 320 }}
        percent={amount}
        status={typeConfig.status ?? getProgressStatus(amount)}
        {...fieldProps}
      />
    )
  }

  if (valueType === 'code') {
    return <code>{String(value)}</code>
  }

  if (valueType === 'jsonCode') {
    let json = String(value)
    try {
      json = JSON.stringify(value, null, 2)
    } catch {
      /* fall back to string */
    }
    return <pre style={{ margin: 0 }}>{json}</pre>
  }

  if (valueType === 'textarea') {
    return <span style={{ whiteSpace: 'pre-wrap' }}>{String(value)}</span>
  }

  if (
    valueType === 'date' ||
    valueType === 'dateTime' ||
    valueType === 'dateWeek' ||
    valueType === 'dateMonth' ||
    valueType === 'dateYear'
  ) {
    const template =
      valueType === 'dateTime'
        ? 'YYYY-MM-DD HH:mm:ss'
        : valueType === 'dateWeek'
          ? 'gggg-wo'
          : valueType === 'dateMonth'
            ? 'YYYY-MM'
            : valueType === 'dateYear'
              ? 'YYYY'
              : 'YYYY-MM-DD'
    const formatted = formatDateValue(value, fieldProps.format ?? template, options?.locale)
    if (formatted === null) {
      return emptyText === false ? String(value) : emptyText
    }
    return formatted
  }

  if (valueType === 'text' || !valueType) {
    if (column.valueEnum) {
      if (Array.isArray(value)) {
        return (
          <Space size={2} wrap>
            {value.map((entry, entryIndex) => (
              <React.Fragment key={entryIndex}>
                {renderEnumDisplay(getEnumItem(column.valueEnum, entry), entry)}
              </React.Fragment>
            ))}
          </Space>
        )
      }
      return renderEnumDisplay(enumItem, value)
    }
  }

  return value as ReactNode
}

import type { ReactNode } from 'react'
import dayjs from 'dayjs'

import type { ProTableFilter } from '../interface'

function getTimeMs(value: unknown) {
  if (value instanceof Date) {
    const time = value.getTime()
    return Number.isNaN(time) ? undefined : time
  }

  if (dayjs.isDayjs(value) && value.isValid()) {
    return value.valueOf()
  }

  return undefined
}

function parseDateStringMs(value: string) {
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.valueOf() : undefined
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  if (value instanceof Date || dayjs.isDayjs(value)) {
    return false
  }
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

export function isSearchValueEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
      return false
    }

    return left.every((item, index) => isSearchValueEqual(item, right[index]))
  }

  const leftTime = getTimeMs(left)
  const rightTime = getTimeMs(right)
  if (leftTime !== undefined && rightTime !== undefined) {
    return leftTime === rightTime
  }
  if (leftTime !== undefined && typeof right === 'string') {
    const parsed = parseDateStringMs(right)
    return parsed !== undefined && leftTime === parsed
  }
  if (rightTime !== undefined && typeof left === 'string') {
    const parsed = parseDateStringMs(left)
    return parsed !== undefined && rightTime === parsed
  }

  if (isPlainObject(left) && isPlainObject(right)) {
    const leftKeys = Object.keys(left)
    const rightKeys = Object.keys(right)
    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every(
        (key) =>
          // eslint-disable-next-line e18e/prefer-object-has-own -- current TS lib target does not expose Object.hasOwn
          Object.prototype.hasOwnProperty.call(right, key) &&
          isSearchValueEqual(left[key], right[key]),
      )
    )
  }

  return false
}

export function pickSearchQuery<Query extends Record<string, unknown>>(
  query: Partial<Query>,
  filters: Array<{ key: Extract<keyof Query, string> }>,
  defaultQuery?: Partial<Query>,
): Partial<Query> {
  return filters.reduce<Partial<Query>>((acc, filter) => {
    const value = query[filter.key]
    if (!hasSearchFieldValue(value)) {
      return acc
    }
    if (defaultQuery && isSearchValueEqual(value, defaultQuery[filter.key])) {
      return acc
    }
    acc[filter.key] = value
    return acc
  }, {})
}

export function mergeSearchQuery<Query extends Record<string, unknown>>(
  defaultQuery: Query,
  snapshotQuery?: Partial<Query> | null,
): Query {
  const next = { ...(defaultQuery as Record<string, unknown>) }

  Object.entries(snapshotQuery ?? {}).forEach(([key, value]) => {
    if (hasSearchFieldValue(value)) {
      next[key] = value
    }
  })

  return next as Query
}

export function mergeViewQueryWithOverlay<Query extends Record<string, unknown>>(
  defaultQuery: Query,
  viewQuery?: Partial<Query> | null,
  overlay?: Partial<Query> | null,
): Query {
  const base = mergeSearchQuery(defaultQuery, viewQuery)
  if (!overlay) {
    return base
  }

  const next = { ...(base as Record<string, unknown>) }
  Object.keys(overlay as Record<string, unknown>).forEach((key) => {
    next[key] = (overlay as Record<string, unknown>)[key]
  })
  return next as Query
}

export function hasSearchFieldValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.some((item) => item != null && item !== '')
  }

  return value != null && value !== ''
}

export function hasSearchTagText(text: ReactNode) {
  if (Array.isArray(text)) {
    return text.length > 0
  }

  return text !== null && text !== undefined && text !== '' && text !== false
}

export function resolveSearchTagText<Query extends Record<string, unknown>>(
  field: ProTableFilter<Query>,
  value: unknown,
  query: Query,
): ReactNode {
  if (typeof field.tagTextFormatter === 'function') {
    return field.tagTextFormatter(value as never, query)
  }

  if (Array.isArray(value)) {
    return value.filter((item) => item !== undefined && item !== null && item !== '').join(' / ')
  }

  if (value === null || value === undefined || value === '') {
    return ''
  }

  return String(value)
}

export type ActiveSearchTagItem = {
  key: string
  label: ReactNode
  text: ReactNode
  action: 'remove' | 'reset' | null
  nextValue: unknown
}

export function collectActiveSearchTagItems<Query extends Record<string, unknown>>(
  filters: ProTableFilter<Query>[],
  query: Query,
  defaultQuery?: Query,
): ActiveSearchTagItem[] {
  return filters.flatMap((field) => {
    const value = (query as Record<string, unknown>)[String(field.key)]

    if (typeof field.tagVisible === 'function' && !field.tagVisible(value as never, query)) {
      return []
    }

    const text = resolveSearchTagText(field, value, query)
    if (!hasSearchTagText(text)) {
      return []
    }

    const defaultValue = defaultQuery
      ? (defaultQuery as Record<string, unknown>)[String(field.key)]
      : undefined
    const hasDefault = hasSearchFieldValue(defaultValue)
    const action = hasDefault
      ? isSearchValueEqual(value, defaultValue)
        ? null
        : 'reset'
      : 'remove'

    return [
      {
        key: String(field.key),
        label: field.label,
        text,
        action,
        nextValue: action === 'reset' ? defaultValue : undefined,
      },
    ]
  })
}

export function countModifiedSearchFields<Query extends Record<string, unknown>>(
  filters: ProTableFilter<Query>[],
  query: Query,
  defaultQuery?: Query,
): number {
  return collectActiveSearchTagItems(filters, query, defaultQuery).reduce(
    (count, item) => (item.action === null ? count : count + 1),
    0,
  )
}

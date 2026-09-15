import type { ReactNode } from 'react'

import type { ProTableSearchConfig, ProTableSearchField } from '../interface'

export function flattenSearchFields<
  Query,
  RecordType = Record<string, unknown>,
  Summary = unknown,
>(config: ProTableSearchConfig<Query, RecordType, Summary>) {
  const grouped = config.groups?.flatMap((group) => group.fields ?? []) ?? []
  const direct = config.fields ?? []
  const quick = (config.quickFields ?? []).map((item) => {
    if (typeof item === 'string') {
      return { key: item, label: item, quick: true } as ProTableSearchField<Query, RecordType, Summary>
    }
    return {
      key: item.key,
      label: item.label === false ? item.key : item.label ?? item.key,
      placeholder: item.placeholder,
      quick: true,
    } as ProTableSearchField<Query, RecordType, Summary>
  })

  return [...grouped, ...direct, ...quick].filter((field, index, list) => {
    if (!field || field.hidden) return false
    return list.findIndex((candidate) => candidate && String(candidate.key) === String(field.key)) === index
  }) as ProTableSearchField<Query, RecordType, Summary>[]
}

const hasOwnProperty = Object.prototype.hasOwnProperty

export function resolveSearchResetTarget<Query>(
  field: ProTableSearchField<Query>,
  query: Query,
  defaultQuery?: Query,
) {
  if (hasOwnProperty.call(field, 'resetValue')) {
    return {
      hasExplicitTarget: true,
      value: typeof field.resetValue === 'function' ? field.resetValue(query) : field.resetValue,
    }
  }

  const fieldKey = String(field.key)
  if (
    defaultQuery &&
    typeof defaultQuery === 'object' &&
    hasOwnProperty.call(defaultQuery, fieldKey)
  ) {
    return {
      hasExplicitTarget: true,
      value: (defaultQuery as Record<string, unknown>)[fieldKey],
    }
  }

  return {
    hasExplicitTarget: false,
    value: undefined,
  }
}

export function resolveSearchResetValue<Query>(
  field: ProTableSearchField<Query>,
  query: Query,
  defaultQuery?: Query,
) {
  return resolveSearchResetTarget(field, query, defaultQuery).value
}

export function resolveSearchTagText<Query>(
  field: ProTableSearchField<Query>,
  value: unknown,
  query: Query,
): ReactNode {
  if (typeof field.getTagText === 'function') {
    return field.getTagText(value, query)
  }

  if (Array.isArray(value)) {
    return value.filter((item) => item !== undefined && item !== null && item !== '').join(' / ')
  }

  if (value === null || value === undefined || value === '') {
    return ''
  }

  return String(value)
}

export function hasSearchTagText(text: ReactNode) {
  if (Array.isArray(text)) {
    return text.length > 0
  }

  return text !== null && text !== undefined && text !== '' && text !== false
}

export type ActiveSearchTagItem = {
  key: string
  label: ReactNode
  text: ReactNode
  action: 'remove' | 'reset' | null
  nextValue: unknown
}

export function buildSearchSnapshotFields<Query extends Record<string, unknown>>(
  fields: ProTableSearchField<Query, any, any>[],
) {
  return fields
}

export function collectActiveSearchTagItems<Query extends Record<string, unknown>>(
  fields: ProTableSearchField<Query>[],
  committedQuery: Query,
  defaultQuery?: Query,
): ActiveSearchTagItem[] {
  return fields.flatMap((field) => {
    const value = committedQuery[String(field.key)]

    if (typeof field.shouldShowTag === 'function' && !field.shouldShowTag(value, committedQuery)) {
      return []
    }

    const text = resolveSearchTagText(field, value, committedQuery)
    if (!hasSearchTagText(text)) {
      return []
    }

    const resetTarget = resolveSearchResetTarget(field, committedQuery, defaultQuery)
    const action =
      field.allowEmpty === false
        ? resetTarget.hasExplicitTarget && !isSearchValueEqual(value, resetTarget.value)
          ? 'reset'
          : null
        : 'remove'

    return [
      {
        key: String(field.key),
        label: field.label,
        text,
        action,
        nextValue: action === 'reset' ? resetTarget.value : undefined,
      },
    ]
  })
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

  const leftValue =
    left &&
    typeof left === 'object' &&
    typeof (left as { valueOf?: () => unknown }).valueOf === 'function'
      ? (left as { valueOf: () => unknown }).valueOf()
      : left
  const rightValue =
    right &&
    typeof right === 'object' &&
    typeof (right as { valueOf?: () => unknown }).valueOf === 'function'
      ? (right as { valueOf: () => unknown }).valueOf()
      : right

  return Object.is(leftValue, rightValue)
}

export function pickSearchQuery<Query extends Record<string, unknown>>(
  query: Partial<Query>,
  fields: ProTableSearchField<Query, any, any>[],
) {
  return fields.reduce<Partial<Query>>((acc, field) => {
    const key = String(field.key) as keyof Query
    ;(acc as Record<string, unknown>)[String(key)] = query[key]
    return acc
  }, {} as Partial<Query>)
}

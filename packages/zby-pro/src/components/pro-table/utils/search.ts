import type { ProTableSearchField } from '../interface'

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

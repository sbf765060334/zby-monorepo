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
  filters: Array<{ key: Extract<keyof Query, string> }>,
): Partial<Query> {
  return filters.reduce<Partial<Query>>((acc, filter) => {
    acc[filter.key] = query[filter.key]
    return acc
  }, {})
}

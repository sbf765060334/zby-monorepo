import type { ProTableFilter, ProTableFilterPreference } from '../interface'

function sortByOrder(items: ProTableFilterPreference[]) {
  return items.slice().sort((left, right) => left.order - right.order)
}

function normalizePreferenceOrder(items: ProTableFilterPreference[]) {
  return items.map((item, index) => ({ ...item, order: index }))
}

export function cloneFilterPreferences(items: ProTableFilterPreference[]) {
  return items.map((item) => ({ ...item }))
}

export function buildDefaultFilterPreferences(
  filters: Array<{ key: string; hidden?: boolean }>,
): ProTableFilterPreference[] {
  return groupFilterPreferencesByPlacement(
    filters.map((filter, index) => ({
      key: String(filter.key),
      placement: filter.hidden ? 'more' : 'row',
      order: index,
    })),
  )
}

function getSchemaIndexes(filters: Array<{ key: string }>) {
  return new Map(filters.map((filter, index) => [String(filter.key), index]))
}

function insertByDefaultOrder(
  defaults: ProTableFilterPreference[],
  current: ProTableFilterPreference[],
  defaultIndexes: Map<string, number>,
) {
  const next = current.slice()

  defaults.forEach((item) => {
    if (next.some((currentItem) => currentItem.key === item.key)) {
      return
    }

    const defaultIndex = defaultIndexes.get(item.key) ?? Number.MAX_SAFE_INTEGER
    const insertIndex = next.findIndex(
      (currentItem) =>
        (defaultIndexes.get(currentItem.key) ?? Number.MAX_SAFE_INTEGER) > defaultIndex,
    )

    if (insertIndex === -1) {
      next.push(item)
    } else {
      next.splice(insertIndex, 0, item)
    }
  })

  return normalizePreferenceOrder(next)
}

export function resolveFilterPreferences(
  filters: Array<{ key: string; hidden?: boolean }>,
  current?: ProTableFilterPreference[],
) {
  const defaults = buildDefaultFilterPreferences(filters)
  const definitionKeys = new Set(defaults.map((item) => item.key))
  const persisted = sortByOrder(current ?? []).filter((item) => definitionKeys.has(item.key))

  if (persisted.length === 0) {
    return defaults
  }

  return groupFilterPreferencesByPlacement(
    insertByDefaultOrder(defaults, persisted, getSchemaIndexes(filters)),
  )
}

export function isFilterPreferenceEqual(
  left: ProTableFilterPreference,
  right: ProTableFilterPreference,
) {
  return (
    left.key === right.key &&
    left.placement === right.placement &&
    left.order === right.order
  )
}

export function isFilterPreferencesEqual(
  left: ProTableFilterPreference[],
  right: ProTableFilterPreference[],
) {
  return (
    left.length === right.length &&
    left.every((preference, index) => isFilterPreferenceEqual(preference, right[index]))
  )
}

export function splitFiltersByPreference<Query extends Record<string, unknown>>(
  filters: ProTableFilter<Query>[],
  preferences: ProTableFilterPreference[],
) {
  const filterMap = new Map(filters.map((filter) => [String(filter.key), filter]))
  const ordered = sortByOrder(
    preferences.length > 0 ? preferences : buildDefaultFilterPreferences(filters),
  )
  const row: Array<ProTableFilter<Query>> = []
  const more: Array<ProTableFilter<Query>> = []

  for (const preference of ordered) {
    const filter = filterMap.get(preference.key)
    if (!filter) {
      continue
    }
    if (preference.placement === 'more') {
      more.push(filter)
    } else {
      row.push(filter)
    }
  }

  return { row, more }
}

export function updateFilterPreference(
  items: ProTableFilterPreference[],
  key: string,
  patch: Partial<ProTableFilterPreference>,
) {
  if (patch.placement && typeof patch.order !== 'number') {
    return setFilterPlacement(items, key, patch.placement)
  }

  return groupFilterPreferencesByPlacement(
    sortByOrder(items).map((item, index) => ({
      ...item,
      ...(item.key === key ? patch : {}),
      order: item.key === key && typeof patch.order === 'number' ? patch.order : index,
    })),
  )
}

export function groupFilterPreferencesByPlacement(items: ProTableFilterPreference[]) {
  const ordered = sortByOrder(items)
  return normalizePreferenceOrder([
    ...ordered.filter((item) => item.placement === 'row'),
    ...ordered.filter((item) => item.placement === 'more'),
  ])
}

export function setFilterPlacement(
  items: ProTableFilterPreference[],
  key: string,
  placement: ProTableFilterPreference['placement'],
) {
  return setFilterPlacements(items, [key], placement)
}

export function setFilterPlacements(
  items: ProTableFilterPreference[],
  keys: string[],
  placement: ProTableFilterPreference['placement'],
) {
  const keySet = new Set(keys)
  const grouped = groupFilterPreferencesByPlacement(items)
  const unchangedRow = grouped.filter(
    (item) => item.placement === 'row' && !keySet.has(item.key),
  )
  const unchangedMore = grouped.filter(
    (item) => item.placement === 'more' && !keySet.has(item.key),
  )
  const moved = grouped
    .filter((item) => keySet.has(item.key))
    .map((item) => ({ ...item, placement }))

  if (placement === 'row') {
    return normalizePreferenceOrder([...unchangedRow, ...moved, ...unchangedMore])
  }

  return normalizePreferenceOrder([...unchangedRow, ...unchangedMore, ...moved])
}

export function getFilterReorderRejection(
  activeKey: string,
  overKey: string,
  items: readonly ProTableFilterPreference[],
) {
  if (activeKey === overKey) {
    return null
  }

  const active = items.find((item) => item.key === activeKey)
  const over = items.find((item) => item.key === overKey)
  if (!active || !over) {
    return null
  }
  if (active.placement !== over.placement) {
    return 'crossPlacement' as const
  }
  return null
}

export function sortRowFilterPreferences(items: ProTableFilterPreference[]) {
  return groupFilterPreferencesByPlacement(items).filter((item) => item.placement === 'row')
}

export function replaceGroupedFilterOrder(
  items: ProTableFilterPreference[],
  orderedKeys: string[],
) {
  const itemMap = new Map(items.map((item) => [item.key, item]))
  const next = orderedKeys
    .map((key) => itemMap.get(key))
    .filter((item): item is ProTableFilterPreference => Boolean(item))
  const seen = new Set(next.map((item) => item.key))

  sortByOrder(items).forEach((item) => {
    if (!seen.has(item.key)) {
      next.push(item)
    }
  })

  return groupFilterPreferencesByPlacement(normalizePreferenceOrder(next))
}

export function replaceRowFilterOrder(
  items: ProTableFilterPreference[],
  orderedRowKeys: string[],
) {
  const moreKeys = groupFilterPreferencesByPlacement(items)
    .filter((item) => item.placement === 'more')
    .map((item) => item.key)
  return replaceGroupedFilterOrder(items, [...orderedRowKeys, ...moreKeys])
}

export function moveGroupedFilterToTop(items: ProTableFilterPreference[], key: string) {
  const grouped = groupFilterPreferencesByPlacement(items)
  const target = grouped.find((item) => item.key === key)
  if (!target) {
    return grouped
  }

  const row = grouped.filter((item) => item.placement === 'row' && item.key !== key)
  const more = grouped.filter((item) => item.placement === 'more' && item.key !== key)

  if (target.placement === 'row') {
    return normalizePreferenceOrder([target, ...row, ...more])
  }

  return normalizePreferenceOrder([...row, target, ...more])
}

export function moveRowFilterToTop(items: ProTableFilterPreference[], key: string) {
  return moveGroupedFilterToTop(items, key)
}

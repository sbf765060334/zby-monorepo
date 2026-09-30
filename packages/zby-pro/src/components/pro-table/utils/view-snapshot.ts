import type {
  ProTableFilter,
  ProTableViewSnapshot,
  ProTableViewSorter,
  ProTableColumnPreference,
  ProTableFilterPreference,
} from '../interface'
import type { ProTableColumnDefinition } from './columns'
import { resolveColumnPreferences, cloneColumnPreferences } from './field-config'
import {
  cloneFilterPreferences,
  isFilterPreferenceEqual,
  resolveFilterPreferences,
} from './filter-config'
import { hasSearchFieldValue, isSearchValueEqual, pickSearchQuery } from './search'
import { isSorterListEqual, isValidSortOrder } from './sort'

function coerceSorterList(
  sorter: ProTableViewSnapshot<any>['sorter'] | { field?: unknown; order?: unknown } | null | undefined,
): ProTableViewSorter[] {
  if (sorter == null) {
    return []
  }
  if (Array.isArray(sorter)) {
    return sorter
  }
  if (typeof sorter === 'object') {
    return [sorter as ProTableViewSorter]
  }
  return []
}

function normalizeViewSorter(
  sorter: ProTableViewSnapshot<any>['sorter'] | { field?: unknown; order?: unknown } | null | undefined,
  columnDefinitions: ProTableColumnDefinition[],
): ProTableViewSorter[] | null {
  const items = coerceSorterList(sorter).filter(
    (item): item is ProTableViewSorter =>
      typeof item.field === 'string' &&
      item.field !== '' &&
      isValidSortOrder(item.order) &&
      columnDefinitions.some((definition) => definition.key === item.field),
  )
  return items.length > 0 ? items : null
}

export function buildViewSnapshot<Query extends Record<string, unknown>>(
  query: Partial<Query>,
  filters: ProTableFilter<Query>[],
  columnDefinitions: ProTableColumnDefinition[],
  columnPreferences: ProTableColumnPreference[],
  sorter?: ProTableViewSorter[] | null,
  filterPreferences: ProTableFilterPreference[] = [],
  defaultQuery?: Partial<Query>,
) {
  return {
    query: pickSearchQuery(query, filters, defaultQuery),
    columnPreferences: cloneColumnPreferences(
      resolveColumnPreferences(columnDefinitions, {
        current: columnPreferences,
      }),
    ),
    filterPreferences: cloneFilterPreferences(
      resolveFilterPreferences(filters, filterPreferences),
    ),
    sorter: normalizeViewSorter(sorter, columnDefinitions),
  } satisfies ProTableViewSnapshot<Query>
}

export function normalizeViewSnapshot<Query extends Record<string, unknown>>(
  snapshot: ProTableViewSnapshot<Query> | null | undefined,
  filters: ProTableFilter<Query>[],
  columnDefinitions: ProTableColumnDefinition[],
  newColumnPolicy?: 'prepend' | 'append' | 'default-order',
  defaultQuery?: Partial<Query>,
) {
  return {
    query: pickSearchQuery(snapshot?.query ?? {}, filters, defaultQuery),
    columnPreferences: resolveColumnPreferences(columnDefinitions, {
      current: snapshot?.columnPreferences,
      policy: newColumnPolicy,
    }),
    filterPreferences: resolveFilterPreferences(filters, snapshot?.filterPreferences),
    sorter: normalizeViewSorter(snapshot?.sorter, columnDefinitions),
  } satisfies ProTableViewSnapshot<Query>
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

export function isViewSnapshotEqual<Query extends Record<string, unknown>>(
  left: ProTableViewSnapshot<Query>,
  right: ProTableViewSnapshot<Query>,
) {
  if (!isSorterListEqual(left.sorter ?? [], right.sorter ?? [])) {
    return false
  }
  if (left.columnPreferences.length !== right.columnPreferences.length) {
    return false
  }
  if (
    left.columnPreferences.some(
      (item, index) => !isFieldPreferenceEqual(item, right.columnPreferences[index]),
    )
  ) {
    return false
  }
  const leftFilterPreferences = left.filterPreferences ?? []
  const rightFilterPreferences = right.filterPreferences ?? []
  if (leftFilterPreferences.length !== rightFilterPreferences.length) {
    return false
  }
  if (
    leftFilterPreferences.some(
      (item, index) => !isFilterPreferenceEqual(item, rightFilterPreferences[index]),
    )
  ) {
    return false
  }
  const leftQuery = (left.query ?? {}) as Record<string, unknown>
  const rightQuery = (right.query ?? {}) as Record<string, unknown>
  const queryKeys = new Set([
    ...Object.keys(leftQuery).filter((key) => hasSearchFieldValue(leftQuery[key])),
    ...Object.keys(rightQuery).filter((key) => hasSearchFieldValue(rightQuery[key])),
  ])
  for (const key of queryKeys) {
    if (!isSearchValueEqual(leftQuery[key], rightQuery[key])) {
      return false
    }
  }
  return true
}

import type { ProTableColumnType, ProTableViewSorter } from '../interface'
import { extractColumnKey, flattenColumnLeaves } from './columns'

type SortOrder = ProTableViewSorter['order']
type CompareFn<RecordType> = (a: RecordType, b: RecordType, order?: SortOrder) => number

type TableSorterInput = {
  column?: {
    key?: unknown
    dataIndex?: unknown
    sorter?: unknown
  }
  field?: unknown
  columnKey?: unknown
  order?: unknown
}

export function isValidSortOrder(order: unknown): order is ProTableViewSorter['order'] {
  return order === 'ascend' || order === 'descend'
}

export function cloneSort(sort: readonly ProTableViewSorter[]): ProTableViewSorter[] {
  return sort.map((item) => ({ field: item.field, order: item.order }))
}

export function isSorterListEqual(
  left: readonly ProTableViewSorter[],
  right: readonly ProTableViewSorter[],
) {
  return (
    left.length === right.length &&
    left.every((item, index) => item.field === right[index]?.field && item.order === right[index]?.order)
  )
}

function getColumnMultiplePriority(column: TableSorterInput['column']): number {
  const sorter = column?.sorter
  if (
    sorter &&
    typeof sorter === 'object' &&
    !Array.isArray(sorter) &&
    'multiple' in sorter &&
    typeof (sorter as { multiple?: unknown }).multiple === 'number'
  ) {
    return (sorter as { multiple: number }).multiple
  }
  return 0
}

export function resolveSorterField(sorter: TableSorterInput): string | undefined {
  if (sorter.column) {
    const columnKey = extractColumnKey(sorter.column)
    if (columnKey) {
      return columnKey
    }
  }

  if (
    Array.isArray(sorter.field) &&
    sorter.field.every((item) => typeof item === 'string' || typeof item === 'number')
  ) {
    return sorter.field.join('.')
  }

  if (typeof sorter.field === 'string' || typeof sorter.field === 'number') {
    return String(sorter.field)
  }

  if (typeof sorter.columnKey === 'string' || typeof sorter.columnKey === 'number') {
    return String(sorter.columnKey)
  }

  return undefined
}

export function toProTableSorters(
  sorter: TableSorterInput | TableSorterInput[] | null | undefined,
): ProTableViewSorter[] {
  if (sorter == null) {
    return []
  }

  const list = Array.isArray(sorter) ? sorter : [sorter]
  const ranked = list.flatMap((item) => {
    const field = resolveSorterField(item)
    if (!field || !isValidSortOrder(item.order)) {
      return []
    }
    return [
      {
        field,
        order: item.order,
        priority: getColumnMultiplePriority(item.column),
      },
    ]
  })

  ranked.sort((left, right) => right.priority - left.priority)
  return ranked.map(({ field, order }) => ({ field, order }))
}

export function normalizeSortItems(
  items: readonly ProTableViewSorter[],
): ProTableViewSorter[] {
  return items.filter(
    (item): item is ProTableViewSorter =>
      typeof item.field === 'string' && item.field !== '' && isValidSortOrder(item.order),
  )
}

export function hasColumnCompare(sorter: unknown): boolean {
  if (typeof sorter === 'function') {
    return true
  }

  return Boolean(
    sorter &&
      typeof sorter === 'object' &&
      !Array.isArray(sorter) &&
      typeof (sorter as { compare?: unknown }).compare === 'function',
  )
}

export function collectLocalSortFields<RecordType>(
  columns: ProTableColumnType<RecordType>[] | undefined,
): string[] {
  return flattenColumnLeaves(columns).flatMap((column) =>
    hasColumnCompare(column.sorter) ? [column.__proTableKey] : [],
  )
}

export function toRequestSort(
  sort: readonly ProTableViewSorter[],
  localSortFields: readonly string[],
): ProTableViewSorter[] {
  if (localSortFields.length === 0) {
    return cloneSort(sort)
  }

  const localFields = new Set(localSortFields)
  return cloneSort(sort.filter((item) => !localFields.has(item.field)))
}

export function toDisplaySorter(sorter: unknown) {
  if (!hasColumnCompare(sorter)) {
    return sorter
  }
  if (typeof sorter === 'function') {
    return true
  }
  const multiple = (sorter as { multiple?: unknown }).multiple
  return typeof multiple === 'number' ? { multiple } : true
}

function getByPath(record: unknown, field: string): unknown {
  return field.split('.').reduce<unknown>((current, key) => {
    if (current == null || typeof current !== 'object') {
      return undefined
    }
    return (current as Record<string, unknown>)[key]
  }, record)
}

function compareValues(left: unknown, right: unknown): number {
  if (Object.is(left, right)) {
    return 0
  }
  if (left == null) {
    return -1
  }
  if (right == null) {
    return 1
  }
  if (typeof left === 'number' && typeof right === 'number') {
    if (Number.isNaN(left) && Number.isNaN(right)) {
      return 0
    }
    if (Number.isNaN(left)) {
      return -1
    }
    if (Number.isNaN(right)) {
      return 1
    }
    return left - right
  }
  if (left instanceof Date && right instanceof Date) {
    return left.getTime() - right.getTime()
  }
  return String(left).localeCompare(String(right), undefined, { numeric: true })
}

function resolveColumnCompare<RecordType>(
  column: ProTableColumnType<RecordType> | undefined,
  field: string,
): CompareFn<RecordType> {
  const sorter = column?.sorter
  if (typeof sorter === 'function') {
    return sorter as CompareFn<RecordType>
  }
  if (
    sorter &&
    typeof sorter === 'object' &&
    typeof (sorter as { compare?: unknown }).compare === 'function'
  ) {
    return (sorter as { compare: CompareFn<RecordType> }).compare
  }
  return (left, right) =>
    compareValues(getByPath(left, field), getByPath(right, field))
}

export function sortCurrentPageRows<RecordType>(
  rows: readonly RecordType[],
  sort: readonly ProTableViewSorter[],
  columns: ProTableColumnType<RecordType>[] | undefined,
  childrenColumnName = 'children',
): RecordType[] {
  if (rows.length === 0 || sort.length === 0) {
    return rows as RecordType[]
  }

  const columnsByField = new Map(
    flattenColumnLeaves(columns).map((column) => [column.__proTableKey, column]),
  )
  const hasLocalSort = sort.some((item) =>
    hasColumnCompare(columnsByField.get(item.field)?.sorter),
  )
  if (!hasLocalSort) {
    return rows as RecordType[]
  }

  const compareByField = new Map<string, CompareFn<RecordType>>()
  const compareOf = (field: string) => {
    const cached = compareByField.get(field)
    if (cached) {
      return cached
    }
    const compare = resolveColumnCompare(columnsByField.get(field), field)
    compareByField.set(field, compare)
    return compare
  }

  const sortRows = (data: readonly RecordType[]): RecordType[] => {
    const nextRows = data.slice().sort((left, right) => {
      for (const item of sort) {
        const compareResult = compareOf(item.field)(left, right, item.order)
        if (compareResult !== 0) {
          return item.order === 'ascend' ? compareResult : -compareResult
        }
      }
      return 0
    })

    return nextRows.map((record) => {
      const nested = (record as Record<string, unknown>)[childrenColumnName]
      if (!Array.isArray(nested) || nested.length === 0) {
        return record
      }
      return {
        ...record,
        [childrenColumnName]: sortRows(nested as RecordType[]),
      }
    })
  }

  return sortRows(rows)
}

import { describe, expect, it } from 'vitest'

import type { ProTableColumnType } from '../../interface'
import {
  applyColumnPreferences,
  applyVisibleColumnPin,
  buildColumnDefinitions,
  buildDefaultColumnPreferences,
  moveVisibleColumnToTop,
  normalizeTableColumns,
} from '..'

describe('normalizeTableColumns empty text', () => {
  it('renders "-" for undefined, null and empty string', () => {
    const [column] = normalizeTableColumns([{ dataIndex: 'name', title: '名称' }]) as Array<{
      renderText?: (value: unknown, record: Record<string, unknown>, index: number) => unknown
    }>

    expect(column.renderText?.(undefined, {}, 0)).toBe('-')
    expect(column.renderText?.(null, {}, 0)).toBe('-')
    expect(column.renderText?.('', {}, 0)).toBe('-')
    expect(column.renderText?.(0, {}, 0)).toBe(0)
    expect(column.renderText?.(false, {}, 0)).toBe(false)
  })

  it('lets column.emptyText override the table-level columnEmptyText', () => {
    const [column] = normalizeTableColumns(
      [{ dataIndex: 'name', title: '名称', emptyText: '无' }],
      undefined,
      '空',
    ) as Array<{
      renderText?: (value: unknown, record: Record<string, unknown>, index: number) => unknown
    }>

    expect(column.renderText?.(undefined, {}, 0)).toBe('无')
  })

  it('keeps empty values when columnEmptyText is false', () => {
    const [column] = normalizeTableColumns(
      [{ dataIndex: 'name', title: '名称' }],
      undefined,
      false,
    ) as Array<{
      renderText?: (value: unknown, record: Record<string, unknown>, index: number) => unknown
    }>

    expect(column.renderText?.(undefined, {}, 0)).toBeUndefined()
    expect(column.renderText?.('', {}, 0)).toBe('')
  })
})

type Row = {
  id: string
  owner: string
  warehouse: string
  route: string
  destination: string
  createdAt: string
}

type ColumnNode = {
  key?: string | number
  dataIndex?: unknown
  title?: unknown
  fixed?: unknown
  children?: ColumnNode[]
}

function leafKeys(columns: ColumnNode[]): unknown[] {
  return columns.flatMap((column) => {
    if (Array.isArray(column.children) && column.children.length > 0) {
      return leafKeys(column.children)
    }
    return [column.key ?? column.dataIndex]
  })
}

function groupLeafKeys(columns: ColumnNode[], title: string) {
  const group = columns.find((column) => column.title === title)
  return group?.children ? leafKeys(group.children) : undefined
}

function createGroupedColumns(): ProTableColumnType<Row>[] {
  return [
    { dataIndex: 'id', title: 'ID', fixed: 'left' },
    { dataIndex: 'owner', title: '负责人' },
    {
      title: '物流信息',
      children: [
        { dataIndex: 'warehouse', title: '仓库' },
        { dataIndex: 'route', title: '线路' },
        { dataIndex: 'destination', title: '目的地' },
      ],
    },
    { dataIndex: 'createdAt', title: '创建时间' },
    { key: 'actions', title: '操作', fieldConfig: false, fixed: 'right' },
  ]
}

describe('applyVisibleColumnPin', () => {
  it('reorders like pin-top: left pins stay first, right pins move last', () => {
    const columns = createGroupedColumns()
    const defaults = buildDefaultColumnPreferences(buildColumnDefinitions(columns))

    const pinnedRight = applyVisibleColumnPin(defaults, 'destination', 'right')
    expect(pinnedRight.map((item) => item.key)).toEqual([
      'id',
      'owner',
      'warehouse',
      'route',
      'createdAt',
      'destination',
    ])
    expect(pinnedRight.find((item) => item.key === 'destination')?.pin).toBe('right')

    const pinnedLeft = applyVisibleColumnPin(defaults, 'destination', 'left')
    expect(pinnedLeft.map((item) => item.key)).toEqual([
      'id',
      'destination',
      'owner',
      'warehouse',
      'route',
      'createdAt',
    ])
    expect(pinnedLeft.find((item) => item.key === 'destination')?.pin).toBe('left')
  })
})

describe('applyColumnPreferences', () => {
  it('hoists a grouped column to the right edge when pinned right', () => {
    const columns = createGroupedColumns()
    const definitions = buildColumnDefinitions(columns)
    const nextColumns = applyColumnPreferences(
      columns,
      definitions,
      applyVisibleColumnPin(buildDefaultColumnPreferences(definitions), 'destination', 'right'),
    ) as ColumnNode[]

    expect(leafKeys(nextColumns)).toEqual([
      'id',
      'owner',
      'warehouse',
      'route',
      'createdAt',
      'destination',
      'actions',
    ])
    expect(groupLeafKeys(nextColumns, '物流信息')).toEqual(['warehouse', 'route'])
    expect(nextColumns.at(-2)).toMatchObject({ dataIndex: 'destination', fixed: 'right' })
    expect(nextColumns.at(-1)).toMatchObject({ key: 'actions', fixed: 'right' })
  })

  it('hoists a grouped column next to existing left pins when pinned left', () => {
    const columns = createGroupedColumns()
    const definitions = buildColumnDefinitions(columns)
    const nextColumns = applyColumnPreferences(
      columns,
      definitions,
      applyVisibleColumnPin(buildDefaultColumnPreferences(definitions), 'destination', 'left'),
    ) as ColumnNode[]

    expect(leafKeys(nextColumns)).toEqual([
      'id',
      'destination',
      'owner',
      'warehouse',
      'route',
      'createdAt',
      'actions',
    ])
    expect(groupLeafKeys(nextColumns, '物流信息')).toEqual(['warehouse', 'route'])
    expect(nextColumns[1]).toMatchObject({ dataIndex: 'destination', fixed: 'left' })
  })

  it('keeps pin-top reordering for unpinned root columns', () => {
    const columns = createGroupedColumns()
    const definitions = buildColumnDefinitions(columns)
    const nextColumns = applyColumnPreferences(
      columns,
      definitions,
      moveVisibleColumnToTop(buildDefaultColumnPreferences(definitions), 'createdAt'),
    ) as ColumnNode[]

    expect(leafKeys(nextColumns)).toEqual([
      'id',
      'createdAt',
      'warehouse',
      'route',
      'destination',
      'owner',
      'actions',
    ])
  })

  it('keeps fieldConfig=false columns at their original structural position', () => {
    const columns: ProTableColumnType[] = [
      { dataIndex: 'name', title: '名称' },
      { key: 'actions', title: '操作', fieldConfig: false },
      { dataIndex: 'status', title: '状态' },
      { dataIndex: 'owner', title: '负责人' },
    ]
    const definitions = buildColumnDefinitions(columns)
    const nextColumns = applyColumnPreferences(columns, definitions, [
      { key: 'owner', visible: true, order: 0, pin: null },
      { key: 'status', visible: true, order: 1, pin: null },
      { key: 'name', visible: true, order: 2, pin: null },
    ]) as ColumnNode[]

    expect(leafKeys(nextColumns)).toEqual(['owner', 'actions', 'status', 'name'])
  })
})

import { describe, expect, it } from 'vitest'

import {
  collectColumnSizingLeaves,
  resolveColumnWidths,
} from '../hooks/useColumnSizing'
import type { TableColumnsType } from '../interface'

interface RowData {
  id: number
  name: string
  remark: string
}

describe('Table column sizing', () => {
  it('keeps an unspecified column width unresolved instead of inventing a default', () => {
    const columns: TableColumnsType<RowData> = [
      { key: 'id', dataIndex: 'id' },
      { key: 'name', dataIndex: 'name', width: 160 },
    ]
    const leaves = collectColumnSizingLeaves(columns, new Map())
    const result = resolveColumnWidths(leaves, 400)

    expect(leaves[0].baseWidth).toBeUndefined()
    expect(result.widths.has('id')).toBe(false)
    expect(result.widths.get('name')).toBe(160)
    expect(result.complete).toBe(false)
  })

  it('distributes remaining width by flex without creating a filler column', () => {
    const columns: TableColumnsType<RowData> = [
      { key: 'id', dataIndex: 'id', width: 200 },
      { key: 'name', dataIndex: 'name', width: 100, flex: 2 },
      { key: 'remark', dataIndex: 'remark', width: 100, flex: 1 },
    ]
    const leaves = collectColumnSizingLeaves(columns, new Map())
    const result = resolveColumnWidths(leaves, 700)

    expect(result.totalWidth).toBeCloseTo(700)
    expect(result.widths.get('id')).toBe(200)
    expect(result.widths.get('name')).toBeCloseTo(300)
    expect(result.widths.get('remark')).toBeCloseTo(200)
    expect(result.widths.has('filler')).toBe(false)
  })

  it('removes a manually resized flex column from remaining-space allocation', () => {
    const columns: TableColumnsType<RowData> = [
      { key: 'id', dataIndex: 'id', width: 200 },
      { key: 'name', dataIndex: 'name', width: 200, flex: 1 },
      { key: 'remark', dataIndex: 'remark', width: 100, flex: 1 },
    ]
    const leaves = collectColumnSizingLeaves(
      columns,
      new Map([['name', 200]]),
    )
    const result = resolveColumnWidths(leaves, 700)

    expect(leaves.find((leaf) => leaf.key === 'name')?.flex).toBe(0)
    expect(result.widths.get('name')).toBe(200)
    expect(result.widths.get('remark')).toBe(300)
    expect(result.totalWidth).toBe(700)
  })

  it('respects maxWidth and reports an impossible remainder', () => {
    const columns: TableColumnsType<RowData> = [
      { key: 'id', dataIndex: 'id', width: 100, maxWidth: 150, flex: 1 },
      { key: 'name', dataIndex: 'name', width: 100, maxWidth: 150, flex: 1 },
    ]
    const leaves = collectColumnSizingLeaves(columns, new Map())
    const result = resolveColumnWidths(leaves, 500)

    expect(result.totalWidth).toBe(300)
    expect(result.unresolvedWidth).toBe(200)
  })

  it('reports filler space instead of stretching an ordinary column', () => {
    const columns: TableColumnsType<RowData> = [
      { key: 'id', dataIndex: 'id', width: 100 },
      { key: 'name', dataIndex: 'name', width: 100 },
    ]
    const leaves = collectColumnSizingLeaves(columns, new Map())
    const result = resolveColumnWidths(leaves, 400)

    expect(result.widths.get('id')).toBe(100)
    expect(result.widths.get('name')).toBe(100)
    expect(result.totalWidth).toBe(200)
    expect(result.unresolvedWidth).toBe(200)
  })

  it('leaves a remainder after explicit flex columns reach maxWidth', () => {
    const columns: TableColumnsType<RowData> = [
      { key: 'id', dataIndex: 'id', width: 100, maxWidth: 180 },
      { key: 'name', dataIndex: 'name', width: 100, maxWidth: 150, flex: 1 },
      { key: 'remark', dataIndex: 'remark', width: 100, maxWidth: 220 },
    ]
    const leaves = collectColumnSizingLeaves(columns, new Map())
    const result = resolveColumnWidths(leaves, 500)

    expect(result.widths.get('name')).toBe(150)
    expect(result.widths.get('remark')).toBe(100)
    expect(result.widths.get('id')).toBe(100)
    expect(result.totalWidth).toBe(350)
    expect(result.unresolvedWidth).toBe(150)
  })

  it('preserves configured widths when they slightly exceed the viewport', () => {
    const columns: TableColumnsType<RowData> = [
      { key: 'id', dataIndex: 'id', width: 200.25 },
      { key: 'name', dataIndex: 'name', width: 300.25 },
    ]
    const leaves = collectColumnSizingLeaves(columns, new Map())
    const result = resolveColumnWidths(leaves, 500)

    expect(result.complete).toBe(true)
    expect(result.totalWidth).toBe(500.5)
    expect(result.widths.get('name')).toBe(300.25)
  })
})

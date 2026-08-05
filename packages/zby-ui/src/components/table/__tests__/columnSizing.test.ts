import { describe, expect, it } from 'vitest'

import {
  collectColumnSizingLeaves,
  resolveColumnWidths,
} from '../columnSizing'
import type { TableColumnsType } from '../types'

interface RowData {
  id: number
  name: string
  remark: string
}

describe('Table column sizing', () => {
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
    const leaves = collectColumnSizingLeaves(columns, new Map())
    const result = resolveColumnWidths(leaves, 700, new Set(['name']))

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

  it('uses the last ordinary leaf as an implicit flex column', () => {
    const columns: TableColumnsType<RowData> = [
      { key: 'id', dataIndex: 'id', width: 100 },
      { key: 'name', dataIndex: 'name', width: 100 },
    ]
    const leaves = collectColumnSizingLeaves(columns, new Map())
    const result = resolveColumnWidths(leaves, 400)

    expect(result.widths.get('id')).toBe(100)
    expect(result.widths.get('name')).toBe(300)
  })
})

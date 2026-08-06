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

  it('keeps business widths fixed and reports the remaining filler width', () => {
    const columns: TableColumnsType<RowData> = [
      { key: 'id', dataIndex: 'id', width: 200 },
      { key: 'name', dataIndex: 'name', width: 100 },
      { key: 'remark', dataIndex: 'remark', width: 100 },
    ]
    const result = resolveColumnWidths(
      collectColumnSizingLeaves(columns, new Map()),
      700,
    )

    expect(result.widths.get('id')).toBe(200)
    expect(result.widths.get('name')).toBe(100)
    expect(result.widths.get('remark')).toBe(100)
    expect(result.totalWidth).toBe(400)
    expect(result.unresolvedWidth).toBe(300)
  })

  it('uses only the committed width for the resized column', () => {
    const columns: TableColumnsType<RowData> = [
      { key: 'id', dataIndex: 'id', width: 200 },
      { key: 'name', dataIndex: 'name', width: 200 },
      { key: 'remark', dataIndex: 'remark', width: 100 },
    ]
    const result = resolveColumnWidths(
      collectColumnSizingLeaves(columns, new Map([['name', 260]])),
      700,
    )

    expect(result.widths.get('id')).toBe(200)
    expect(result.widths.get('name')).toBe(260)
    expect(result.widths.get('remark')).toBe(100)
    expect(result.unresolvedWidth).toBe(140)
  })

  it('clamps configured and committed widths to minWidth and maxWidth', () => {
    const columns: TableColumnsType<RowData> = [
      { key: 'id', dataIndex: 'id', width: 80, minWidth: 100 },
      { key: 'name', dataIndex: 'name', width: 200, maxWidth: 150 },
      { key: 'remark', dataIndex: 'remark', width: 100, maxWidth: 180 },
    ]
    const result = resolveColumnWidths(
      collectColumnSizingLeaves(
        columns,
        new Map([['remark', 240]]),
      ),
      500,
    )

    expect(result.widths.get('id')).toBe(100)
    expect(result.widths.get('name')).toBe(150)
    expect(result.widths.get('remark')).toBe(180)
    expect(result.unresolvedWidth).toBe(70)
  })

  it('can measure the native AntD path without applying resize constraints', () => {
    const columns: TableColumnsType<RowData> = [
      { key: 'id', dataIndex: 'id', width: 80, minWidth: 120 },
      { key: 'name', dataIndex: 'name', width: 200, maxWidth: 150 },
    ]
    const leaves = collectColumnSizingLeaves(
      columns,
      new Map(),
      new Map(),
      [],
      false,
    )

    expect(leaves.map((leaf) => leaf.baseWidth)).toEqual([80, 200])
    expect(leaves.map((leaf) => leaf.minWidth)).toEqual([0, 0])
    expect(leaves.map((leaf) => leaf.maxWidth)).toEqual([
      Number.POSITIVE_INFINITY,
      Number.POSITIVE_INFINITY,
    ])
  })

  it('keeps widths larger than the viewport and reports no filler', () => {
    const columns: TableColumnsType<RowData> = [
      { key: 'id', dataIndex: 'id', width: 350 },
      { key: 'name', dataIndex: 'name', width: 300 },
    ]
    const result = resolveColumnWidths(
      collectColumnSizingLeaves(columns, new Map()),
      500,
    )

    expect(result.totalWidth).toBe(650)
    expect(result.unresolvedWidth).toBe(0)
  })

  it('preserves fractional configured widths when they slightly exceed the viewport', () => {
    const columns: TableColumnsType<RowData> = [
      { key: 'id', dataIndex: 'id', width: 200.25 },
      { key: 'name', dataIndex: 'name', width: 300.25 },
    ]
    const result = resolveColumnWidths(
      collectColumnSizingLeaves(columns, new Map()),
      500,
    )

    expect(result.complete).toBe(true)
    expect(result.totalWidth).toBe(500.5)
    expect(result.widths.get('name')).toBe(300.25)
    expect(result.unresolvedWidth).toBe(0)
  })
})

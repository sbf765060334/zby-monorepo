import { describe, expect, it } from 'vitest'

import {
  collectColumnSizingLeaves,
  resolveColumnLayout,
  resolveColumnWidths,
} from '../RcTableInner/hooks/useColumnSizing'
import type { ColumnsType } from '../RcTableInner/interface'

interface RowData {
  id: number
  name: string
  remark: string
}

describe('Table column sizing', () => {
  it('uses the deterministic resize default for an unspecified column', () => {
    const columns: ColumnsType<RowData> = [
      { key: 'id', dataIndex: 'id' },
      { key: 'name', dataIndex: 'name', width: 160 },
    ]
    const leaves = collectColumnSizingLeaves(columns, new Map())
    const result = resolveColumnWidths(leaves, 400)

    expect(leaves[0].baseWidth).toBe(160)
    expect(result.widths.get('id')).toBe(160)
    expect(result.widths.get('name')).toBe(160)
    expect(result.complete).toBe(true)
  })

  it('keeps business widths fixed and reports the remaining filler width', () => {
    const columns: ColumnsType<RowData> = [
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
    const columns: ColumnsType<RowData> = [
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
    const columns: ColumnsType<RowData> = [
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
    const columns: ColumnsType<RowData> = [
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
    const columns: ColumnsType<RowData> = [
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

  it('normalizes configured and committed widths to integer CSS pixels', () => {
    const columns: ColumnsType<RowData> = [
      { key: 'id', dataIndex: 'id', width: 200.25 },
      { key: 'name', dataIndex: 'name', width: 300.6 },
    ]
    const result = resolveColumnWidths(
      collectColumnSizingLeaves(columns, new Map([['id', 201.4]])),
      500,
    )

    expect(result.complete).toBe(true)
    expect(result.totalWidth).toBe(502)
    expect(result.widths.get('id')).toBe(201)
    expect(result.widths.get('name')).toBe(301)
    expect(result.unresolvedWidth).toBe(0)
  })

  it('derives filler, fit tolerance, and overflow from one layout state', () => {
    expect(resolveColumnLayout(498, 500)).toEqual({
      mode: 'fill',
      fillerWidth: 2,
      scrollX: 500,
      hasHorizontalOverflow: false,
    })
    expect(resolveColumnLayout(499, 500).mode).toBe('fit')
    expect(resolveColumnLayout(500, 500).mode).toBe('fit')
    expect(resolveColumnLayout(501, 500).mode).toBe('fit')
    expect(resolveColumnLayout(502, 500)).toEqual({
      mode: 'overflow',
      fillerWidth: 0,
      scrollX: 502,
      hasHorizontalOverflow: true,
    })
  })
})

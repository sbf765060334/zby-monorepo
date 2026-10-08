// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { ProTableColumnType } from '../../interface'
import { createProTableViewStore } from '../../store'
import {
  buildColumnDefinitions,
  buildDefaultColumnPreferences,
  buildViewSnapshot,
  isViewSnapshotEqual,
} from '../../utils'
import { useProTableColumnResize } from '../useProTableColumnResize'

type Row = { name: string }

describe('useProTableColumnResize persist', () => {
  it('writes the dragged width into column preferences so the view snapshot becomes dirty', () => {
    const columns = [{ dataIndex: 'name', title: '名称', width: 120 }]
    const columnDefinitions = buildColumnDefinitions(columns)
    const viewStore = createProTableViewStore()
    const initialPreferences = buildDefaultColumnPreferences(columnDefinitions)
    viewStore.getState().setMergedColumnsPreferences(initialPreferences)
    viewStore.getState().setColumnsReady(true)

    const { result } = renderHook(() =>
      useProTableColumnResize<Row, Record<string, never>, unknown>({
        columns,
        visibleColumns: columns,
        columnDefinitions,
        columnResize: true,
        mergedColumnsPreferences: viewStore.getState().mergedColumnsPreferences,
        viewStore,
        defaultPersist: true,
      }),
    )

    const baselineSnapshot = buildViewSnapshot(
      {},
      [],
      columnDefinitions,
      viewStore.getState().mergedColumnsPreferences,
    )

    act(() => {
      result.current.columnResize?.onResizeEnd?.({
        key: 'name',
        width: 180,
        previousWidth: 120,
        delta: 60,
        widths: { name: 180 },
        column: columns[0],
        nativeEvent: new PointerEvent('pointerup'),
      })
    })

    const nextPreferences = viewStore.getState().mergedColumnsPreferences
    expect(nextPreferences.find((preference) => preference.key === 'name')?.width).toBe(180)
    expect(
      isViewSnapshotEqual(
        baselineSnapshot,
        buildViewSnapshot({}, [], columnDefinitions, nextPreferences),
      ),
    ).toBe(false)
  })

  it('maps the resized column by dataIndex when Table reports a different key', () => {
    const columns = [{ key: 'displayName', dataIndex: 'name', title: '名称', width: 120 }]
    const columnDefinitions = buildColumnDefinitions(columns)
    const viewStore = createProTableViewStore()
    viewStore.getState().setMergedColumnsPreferences(buildDefaultColumnPreferences(columnDefinitions))
    viewStore.getState().setColumnsReady(true)

    const { result } = renderHook(() =>
      useProTableColumnResize<Row, Record<string, never>, unknown>({
        columns,
        visibleColumns: columns,
        columnDefinitions,
        columnResize: true,
        mergedColumnsPreferences: viewStore.getState().mergedColumnsPreferences,
        viewStore,
        defaultPersist: true,
      }),
    )

    act(() => {
      result.current.columnResize?.onResizeEnd?.({
        key: 'key-0',
        width: 200,
        previousWidth: 120,
        delta: 80,
        widths: { 'key-0': 200 },
        column: columns[0],
        nativeEvent: new PointerEvent('pointerup'),
      })
    })

    expect(viewStore.getState().mergedColumnsPreferences.find((preference) => preference.key === 'name')?.width).toBe(
      200,
    )
  })
})

describe('useProTableColumnResize resizable', () => {
  function renderResize(columns: ProTableColumnType<Row>[]) {
    const columnDefinitions = buildColumnDefinitions(columns)
    const viewStore = createProTableViewStore()
    viewStore.getState().setMergedColumnsPreferences(buildDefaultColumnPreferences(columnDefinitions))
    viewStore.getState().setColumnsReady(true)

    return renderHook(() =>
      useProTableColumnResize<Row, Record<string, never>, unknown>({
        columns,
        visibleColumns: columns,
        columnDefinitions,
        columnResize: true,
        mergedColumnsPreferences: viewStore.getState().mergedColumnsPreferences,
        viewStore,
        defaultPersist: true,
      }),
    )
  }

  function resizableOf(
    result: { current: { columns: Array<{ key?: string; resizable?: boolean }> } },
    key: string,
  ) {
    return result.current.columns.find((column) => column.key === key)?.resizable
  }

  it('does not treat action-named columns as non-resizable by default', () => {
    const { result } = renderResize([
      { key: 'actions', title: '操作', width: 64 },
      { key: 'operator', title: '操作人', width: 100 },
    ])

    expect(resizableOf(result, 'actions')).toBe(true)
    expect(resizableOf(result, 'operator')).toBe(true)
  })

  it('honors column.resizable and fieldConfig.capabilities.resizing', () => {
    const { result } = renderResize([
      { key: 'actions', title: '操作', width: 64, resizable: false },
      {
        key: 'name',
        title: '名称',
        width: 120,
        fieldConfig: { capabilities: { resizing: false } },
      },
    ])

    expect(resizableOf(result, 'actions')).toBe(false)
    expect(resizableOf(result, 'name')).toBe(false)
  })
})

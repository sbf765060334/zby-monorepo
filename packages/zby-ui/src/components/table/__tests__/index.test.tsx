// @vitest-environment jsdom

import { cleanup, fireEvent, render } from '@testing-library/react'
import * as React from 'react'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import Table from '../index'

const OriginalResizeObserver = globalThis.ResizeObserver
const originalMatchMedia = window.matchMedia
const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverMock)
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
  HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
    const width = this.classList.contains('ant-table-wrapper-zby') ? 600 : 150
    return {
      x: 0,
      y: 0,
      width,
      height: 40,
      top: 0,
      left: 0,
      right: width,
      bottom: 40,
      toJSON: () => ({}),
    }
  }
})

afterAll(() => {
  vi.stubGlobal('ResizeObserver', OriginalResizeObserver)
  window.matchMedia = originalMatchMedia
  HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect
})

afterEach(() => cleanup())

interface RowData {
  id: number
  name: string
}

const data: RowData[] = [
  { id: 1, name: 'Alpha' },
  { id: 2, name: 'Beta' },
]

const columns = [
  { key: 'id', dataIndex: 'id' as const, title: 'ID', width: 120 },
  {
    key: 'name',
    dataIndex: 'name' as const,
    title: 'Name',
    width: 160,
    flex: 1,
  },
]

describe('Table', () => {
  it('uses rowHighlight object presence to toggle the current row', () => {
    const onChange = vi.fn()
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        columns={columns}
        dataSource={data}
        rowHighlight={{ onChange }}
      />,
    )
    const rows = container.querySelectorAll('.ant-table-tbody .ant-table-row')

    fireEvent.click(rows[0])
    expect(rows[0].classList.contains('ant-table-row-current')).toBe(true)
    expect(rows[0].getAttribute('aria-current')).toBe('true')
    expect(onChange).toHaveBeenLastCalledWith(1, data[0])

    fireEvent.click(rows[0])
    expect(rows[0].classList.contains('ant-table-row-current')).toBe(false)
    expect(onChange).toHaveBeenLastCalledWith(null, null)
  })

  it('does not change controlled highlight until the key prop changes', () => {
    const onChange = vi.fn()
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        columns={columns}
        dataSource={data}
        rowHighlight={{ currentRowKey: 1, onChange }}
      />,
    )
    const rows = container.querySelectorAll('.ant-table-tbody .ant-table-row')

    fireEvent.click(rows[1])

    expect(rows[0].classList.contains('ant-table-row-current')).toBe(true)
    expect(rows[1].classList.contains('ant-table-row-current')).toBe(false)
    expect(onChange).toHaveBeenCalledWith(2, data[1])
  })

  it('sizes the injected selection column without forcing a split header', () => {
    const onChange = vi.fn()
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        rowSelection={{ onChange }}
        columns={columns}
        dataSource={data}
      />,
    )

    const selectionCol = container.querySelector('.ant-table-content col')

    expect(selectionCol?.getAttribute('style')).toMatch(/width:\s*\d+px/)
    expect(container.querySelector('.ant-table-selection-column')).not.toBeNull()
    expect(container.querySelector('.ant-table-header')).toBeNull()
    expect(container.querySelector('.ant-table-cell-scrollbar')).toBeNull()

    fireEvent.click(
      container.querySelector<HTMLInputElement>(
        '.ant-table-tbody .ant-table-row .ant-checkbox-input',
      )!,
    )
    expect(onChange.mock.calls[0][0]).toEqual([1])
  })

  it('preserves AntD auto layout when columns and scroll are unspecified', () => {
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        columns={[
          { key: 'id', dataIndex: 'id', title: 'ID' },
          { key: 'name', dataIndex: 'name', title: 'Name' },
        ]}
        dataSource={data}
      />,
    )

    const table = container.querySelector<HTMLTableElement>(
      '.ant-table-content table',
    )!
    const headerCells = container.querySelectorAll('.ant-table-thead th')

    expect(container.querySelector('.ant-scroll-area-viewport')).toBeNull()
    expect(container.querySelector('.ant-table-header')).toBeNull()
    expect(table.style.width).toBe('')
    expect(table.style.tableLayout).toBe('auto')
    expect(headerCells[0].getAttribute('style') ?? '').not.toMatch(/120px/)
    expect(headerCells[1].getAttribute('style') ?? '').not.toMatch(/120px/)
  })

  it('uses a vertical-only ScrollArea when only scroll.y is configured', () => {
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        scroll={{ y: 200 }}
        columns={columns}
        dataSource={data}
      />,
    )

    const viewport = container.querySelector<HTMLElement>(
      '.ant-scroll-area-viewport',
    )!

    expect(viewport).not.toBeNull()
    expect(viewport.style.overflowX).toBe('hidden')
    expect(viewport.style.overflowY).toBe('auto')
  })

  it('measures auto-sized columns before entering the fill viewport', () => {
    const { container } = render(
      <div style={{ height: 300 }}>
        <Table<RowData>
          rowKey="id"
          pagination={false}
          heightMode="fill"
          columns={[
            { key: 'id', dataIndex: 'id', title: 'ID' },
            { key: 'name', dataIndex: 'name', title: 'Name' },
          ]}
          dataSource={data}
        />
      </div>,
    )

    const headerCells = container.querySelectorAll<HTMLElement>(
      '.ant-table-thead th',
    )

    expect(container.querySelector('.ant-scroll-area-viewport')).not.toBeNull()
    expect(headerCells[0].style.width).toBe('150px')
    expect(headerCells[1].style.width).toBe('450px')
    expect([...headerCells].some((cell) => cell.style.width === '120px')).toBe(false)
  })

  it('keeps the forked sorter pipeline working', () => {
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        columns={[
          columns[0],
          {
            ...columns[1],
            sorter: (left, right) => left.name.localeCompare(right.name),
          },
        ]}
        dataSource={[data[1], data[0]]}
      />,
    )

    fireEvent.click(container.querySelector('.ant-table-column-sorters')!)

    const rows = container.querySelectorAll('.ant-table-tbody .ant-table-row')
    expect(rows[0].textContent).toContain('Alpha')
    expect(rows[1].textContent).toContain('Beta')
  })

  it('keeps the forked controlled filter pipeline working', () => {
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        columns={[
          columns[0],
          {
            ...columns[1],
            filters: [{ text: 'Alpha', value: 'Alpha' }],
            filteredValue: ['Alpha'],
            onFilter: (value, record) => record.name === value,
          },
        ]}
        dataSource={data}
      />,
    )

    const rows = container.querySelectorAll('.ant-table-tbody .ant-table-row')
    expect(rows).toHaveLength(1)
    expect(rows[0].textContent).toContain('Alpha')
  })

  it('keeps the forked pagination pipeline working', () => {
    const paginatedData = Array.from({ length: 12 }, (_, index) => ({
      id: index + 1,
      name: `Row ${index + 1}`,
    }))
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        pagination={{ pageSize: 5 }}
        columns={columns}
        dataSource={paginatedData}
      />,
    )

    fireEvent.click(container.querySelector('.ant-pagination-item-2')!)

    const rows = container.querySelectorAll('.ant-table-tbody .ant-table-row')
    expect(rows).toHaveLength(5)
    expect(rows[0].textContent).toContain('Row 6')
  })

  it('moves only the guide during drag and commits a clamped width on pointerup', () => {
    const onColumnWidthChange = vi.fn()
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        enableColumnResizing
        onColumnWidthChange={onColumnWidthChange}
        columns={[
          {
            key: 'id',
            dataIndex: 'id',
            title: 'ID',
            width: 150,
            minWidth: 100,
            maxWidth: 200,
          },
          columns[1],
        ]}
        dataSource={data}
      />,
    )
    const handle = container.querySelector<HTMLElement>(
      '.ant-table-zby-resize-handle',
    )!
    const guide = container.querySelector<HTMLElement>(
      '.ant-table-zby-resize-guide',
    )!

    fireEvent.pointerDown(handle, { clientX: 150 })
    fireEvent.pointerMove(document, { clientX: 20 })

    expect(guide.style.display).toBe('block')
    expect(onColumnWidthChange).not.toHaveBeenCalled()

    fireEvent.pointerUp(document, { clientX: 20 })

    expect(guide.style.display).toBe('none')
    expect(onColumnWidthChange).toHaveBeenCalledTimes(1)
    expect(onColumnWidthChange.mock.calls[0][0]).toMatchObject({
      columnKey: 'id',
      width: 100,
    })
  })

  it('uses the shared ScrollArea viewport in fill and virtual modes', () => {
    const largeData = Array.from({ length: 100 }, (_, index) => ({
      id: index,
      name: `Row ${index}`,
    }))
    const { container } = render(
      <div style={{ height: 300 }}>
        <Table<RowData>
          rowKey="id"
          pagination={false}
          heightMode="fill"
          virtual
          scroll={{ y: 200 }}
          columns={columns}
          dataSource={largeData}
        />
      </div>,
    )

    expect(container.querySelector('.ant-table-wrapper-zby-fill')).not.toBeNull()
    expect(container.querySelector('.ant-scroll-area-viewport')).not.toBeNull()
    expect(container.querySelector('.ant-table-tbody-virtual-holder')).not.toBeNull()
    expect(container.querySelectorAll('.ant-table-row').length).toBeLessThan(100)
    expect(container.querySelector('[class*="virtual-scrollbar"]')).toBeNull()
  })
})

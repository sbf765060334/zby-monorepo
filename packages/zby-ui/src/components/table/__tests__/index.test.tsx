// @vitest-environment jsdom

import { act, cleanup, fireEvent, render } from '@testing-library/react'
import * as React from 'react'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import Table from '../index'

const OriginalResizeObserver = globalThis.ResizeObserver
const originalMatchMedia = window.matchMedia
const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect

class ResizeObserverMock {
  constructor(_callback: ResizeObserverCallback) {}

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
    const width =
      this.classList.contains('ant-table-wrapper-zby') ||
      this.classList.contains('ant-table') ||
      this.classList.contains('ant-scroll-area-viewport')
        ? 600
        : 150
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

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

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

  it('forces fixed layout when column resizing is enabled', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { container } = render(
      <>
        <div data-layout-mode="default">
          <Table<RowData>
            rowKey="id"
            pagination={false}
            enableColumnResizing
            columns={columns}
            dataSource={data}
          />
        </div>
        <div data-layout-mode="fixed">
          <Table<RowData>
            rowKey="id"
            pagination={false}
            tableLayout="fixed"
            enableColumnResizing
            columns={columns}
            dataSource={data}
          />
        </div>
      </>,
    )

    for (const mode of ['default', 'fixed']) {
      const tables = container.querySelectorAll<HTMLTableElement>(
        `[data-layout-mode="${mode}"] table`,
      )
      expect(tables.length).toBeGreaterThan(0)
      expect([...tables].every((table) => table.style.tableLayout === 'fixed')).toBe(true)
    }
    expect(consoleError.mock.calls.flat().join(' ')).not.toContain(
      '`tableLayout="auto"` is ignored',
    )
  })

  it('ignores auto layout and warns when column resizing is enabled', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        tableLayout="auto"
        enableColumnResizing
        columns={columns}
        dataSource={data}
      />,
    )
    const tables = container.querySelectorAll<HTMLTableElement>('table')
    const warningText = consoleError.mock.calls.flat().join(' ')

    expect(tables.length).toBeGreaterThan(0)
    expect([...tables].every((table) => table.style.tableLayout === 'fixed')).toBe(true)
    expect(warningText).toContain('`tableLayout="auto"` is ignored')
    expect(warningText).toContain('`tableLayout="fixed"`')
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

  it('does not inject enhanced sizing when resizing is disabled', () => {
    const { container } = render(
      <div style={{ height: 300 }}>
        <Table<RowData>
          rowKey="id"
          pagination={false}
          heightMode="fill"
          columns={[
            { key: 'id', dataIndex: 'id', title: 'ID', minWidth: 200 },
            { key: 'name', dataIndex: 'name', title: 'Name', maxWidth: 80 },
          ]}
          dataSource={data}
        />
      </div>,
    )

    expect(container.querySelector('.ant-scroll-area-viewport')).not.toBeNull()
    expect(container.querySelector('.ant-table-zby-filler-cell')).toBeNull()
    expect(container.querySelector('.ant-table-zby-resize-handle')).toBeNull()
    expect(
      container.querySelector('.ant-table-zby-resize-end-gutter-cell'),
    ).toBeNull()
    const headers = container.querySelectorAll<HTMLElement>(
      '.ant-table-thead [data-zby-column-key]',
    )
    expect([...headers].map((cell) => cell.style.width)).toEqual([
      '150px',
      '150px',
    ])
  })

  it('scopes resize-only cell clipping without adding divider hover styles', () => {
    const { container } = render(
      <>
        <div data-table-mode="plain">
          <Table<RowData>
            rowKey="id"
            pagination={false}
            columns={columns}
            dataSource={data}
          />
        </div>
        <div data-table-mode="resizable">
          <Table<RowData>
            rowKey="id"
            pagination={false}
            enableColumnResizing
            columns={[{ ...columns[0], resizable: false }, columns[1]]}
            dataSource={data}
          />
        </div>
        <div data-table-mode="bordered-resizable">
          <Table<RowData>
            rowKey="id"
            bordered
            pagination={false}
            enableColumnResizing
            columns={columns}
            dataSource={data}
          />
        </div>
      </>,
    )
    const getTable = (mode: string) =>
      container.querySelector<HTMLElement>(
        `[data-table-mode="${mode}"] .ant-table`,
      )!
    const styleText = [...document.querySelectorAll('style')]
      .map((style) => style.textContent ?? '')
      .join('')
      .replace(/\s/g, '')

    expect(
      getTable('plain').classList.contains(
        'ant-table-zby-column-resizing',
      ),
    ).toBe(false)
    expect(
      getTable('resizable').classList.contains(
        'ant-table-zby-column-resizing',
      ),
    ).toBe(true)
    expect(
      getTable('bordered-resizable').classList.contains(
        'ant-table-zby-column-resizing',
      ),
    ).toBe(true)
    expect(styleText).not.toContain('ant-table-zby-resize-divider-hover')
    expect(
      getTable('resizable').querySelector(
        'th[data-zby-column-key="id"] .ant-table-zby-resize-handle',
      ),
    ).toBeNull()
    expect(
      getTable('resizable').querySelector(
        'th[data-zby-column-key="name"] .ant-table-zby-resize-handle',
      ),
    ).not.toBeNull()
    expect(styleText).toMatch(
      /ant-table-zby-column-resizing.*ant-table-tbody>tr>td\.ant-table-cell:not\(\.ant-table-cell-fix\).*overflow:hidden/,
    )
    expect(styleText).toMatch(
      /ant-table-zby-column-resizing.*ant-table-tbody-virtual.*ant-table-cell:not\(\.ant-table-cell-fix\).*overflow:hidden/,
    )
    expect(styleText).not.toContain('ant-table-zby-resize-guide')
  })

  it('uses deterministic default widths before adding filler in resizing mode', () => {
    const { container } = render(
      <div style={{ height: 300 }}>
        <Table<RowData>
          rowKey="id"
          pagination={false}
          heightMode="fill"
          enableColumnResizing
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
    const fillerCell = container.querySelector<HTMLElement>(
      '.ant-table-thead .ant-table-zby-filler-cell',
    )!

    expect(container.querySelector('.ant-scroll-area-viewport')).not.toBeNull()
    expect(headerCells[0].style.width).toBe('160px')
    expect(headerCells[1].style.width).toBe('160px')
    expect(fillerCell.style.width).toBe('280px')
  })

  it('places filler after ordinary columns when there is no fixed-end column', () => {
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        enableColumnResizing
        columns={columns}
        dataSource={data}
      />,
    )
    const headers = [
      ...container.querySelectorAll<HTMLElement>('.ant-table-thead tr:last-child th'),
    ]

    expect(headers.map((cell) =>
      cell.dataset.zbyColumnKey ??
      (cell.classList.contains('ant-table-zby-filler-cell')
        ? 'filler'
        : ''),
    )).toEqual(['id', 'name', 'filler'])

    const filler = container.querySelector<HTMLElement>(
      '.ant-table-thead .ant-table-zby-filler-cell',
    )!
    expect(filler.style.width).toBe('320px')
    expect(filler.querySelector('.ant-table-zby-resize-handle')).toBeNull()
    expect(
      container.querySelector('.ant-table-zby-resize-end-gutter-cell'),
    ).toBeNull()
  })

  it('keeps bordered filler and body dividers inside the shared ScrollArea', () => {
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        bordered
        pagination={false}
        enableColumnResizing
        columns={columns}
        dataSource={data}
      />,
    )
    const styleText = [...document.querySelectorAll('style')]
      .map((style) => style.textContent ?? '')
      .join('')
      .replace(/\s/g, '')

    expect(container.querySelector('.ant-table-bordered')).not.toBeNull()
    expect(
      container.querySelector(
        '.ant-table-tbody .ant-table-zby-filler-cell.ant-table-cell',
      ),
    ).not.toBeNull()
    expect(styleText).toMatch(
      /ant-table-zby-scroll-body.*ant-scroll-area-content>table>tbody>tr>td\{border-inline-end:/,
    )
  })

  it('uses the standard header divider for a filler between columns', () => {
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        enableColumnResizing
        columns={columns}
        dataSource={data}
      />,
    )
    const filler = container.querySelector<HTMLElement>(
      '.ant-table-thead .ant-table-zby-filler-cell',
    )!
    const styleText = [...document.querySelectorAll('style')]
      .map((style) => style.textContent ?? '')
      .join('')
      .replace(/\s/g, '')

    expect(filler).not.toBeNull()
    expect(filler.querySelector('.ant-table-zby-resize-handle')).toBeNull()
    expect(styleText).toMatch(/th:not\(:last-child\).*::?before/)
    expect(styleText).not.toMatch(/ant-table-zby-filler-cell::?before/)
  })

  it('omits filler in overflow while keeping the final handle inside its header', () => {
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        bordered
        pagination={false}
        enableColumnResizing
        columns={[
          { key: 'id', dataIndex: 'id', title: 'ID', width: 350 },
          { key: 'name', dataIndex: 'name', title: 'Name', width: 300 },
        ]}
        dataSource={data}
      />,
    )
    const lastHandle = container.querySelector<HTMLElement>(
      'th[data-zby-column-key="name"] .ant-table-zby-resize-handle',
    )!
    const styleText = [...document.querySelectorAll('style')]
      .map((style) => style.textContent ?? '')
      .join('')
      .replace(/\s/g, '')

    expect(container.querySelector('.ant-table-zby-filler-cell')).toBeNull()
    expect(
      container.querySelector('.ant-table-zby-resize-end-gutter-cell'),
    ).toBeNull()
    expect(styleText).toMatch(
      /ant-table-zby-resize-handle\{[^}]*inset-inline-end:0[^}]*width:8px/,
    )
    expect(lastHandle).not.toBeNull()
  })

  it('does not let numeric scroll.x stretch filler in resizing mode', () => {
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        enableColumnResizing
        scroll={{ x: 1000 }}
        columns={columns}
        dataSource={data}
      />,
    )
    const filler = container.querySelector<HTMLElement>(
      '.ant-table-thead .ant-table-zby-filler-cell',
    )!
    const bodyTable = container.querySelector<HTMLTableElement>(
      '.ant-table-zby-scroll-body table',
    )!

    expect(filler.style.width).toBe('320px')
    expect(bodyTable.style.width).toBe('600px')
  })

  it('normalizes fractional business widths before applying fit tolerance', () => {
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        enableColumnResizing
        columns={[
          { key: 'id', dataIndex: 'id', title: 'ID', width: 298.6 },
          { key: 'name', dataIndex: 'name', title: 'Name', width: 300 },
        ]}
        dataSource={data}
      />,
    )
    const idHeader = container.querySelector<HTMLElement>(
      'th[data-zby-column-key="id"]',
    )!
    expect(idHeader.style.width).toBe('299px')
    expect(container.querySelector('.ant-table-zby-filler-cell')).toBeNull()
  })

  it('omits filler and scrolls when business widths exceed the viewport', () => {
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        enableColumnResizing
        columns={[
          { key: 'id', dataIndex: 'id', title: 'ID', width: 350 },
          { key: 'name', dataIndex: 'name', title: 'Name', width: 300 },
        ]}
        dataSource={data}
      />,
    )
    const viewport = container.querySelector<HTMLElement>(
      '.ant-scroll-area-viewport',
    )!
    const bodyTable = container.querySelector<HTMLTableElement>(
      '.ant-table-zby-scroll-body table',
    )!

    expect(container.querySelector('.ant-table-zby-filler-cell')).toBeNull()
    expect(viewport.style.overflowX).toBe('auto')
    expect(bodyTable.style.width).toBe('650px')
  })

  it('places filler between fixed-start and fixed-end business columns', () => {
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        enableColumnResizing
        rowSelection={{}}
        columns={[
          { key: 'id', dataIndex: 'id', title: 'ID', width: 100, fixed: 'start' },
          { key: 'name', dataIndex: 'name', title: 'Name', width: 100 },
          {
            key: 'action',
            title: 'Action',
            width: 100,
            fixed: 'end',
            render: () => 'Open',
          },
        ]}
        dataSource={data}
      />,
    )
    const headers = [
      ...container.querySelectorAll<HTMLElement>('.ant-table-thead tr:last-child th'),
    ]

    expect(headers.map((cell) => {
      if (cell.dataset.zbyColumnKey) return cell.dataset.zbyColumnKey
      if (cell.classList.contains('ant-table-selection-column')) return 'selection'
      if (cell.classList.contains('ant-table-zby-filler-cell')) return 'filler'
      return ''
    })).toEqual([
      'selection',
      'id',
      'name',
      'filler',
      'action',
    ])

    const action = container.querySelector<HTMLElement>(
      'th[data-zby-column-key="action"]',
    )!
    expect(container.querySelector('.ant-table-cell-scrollbar')).toBeNull()
    expect(action.style.insetInlineEnd).toBe('0px')
    expect(container.querySelector('.ant-table-zby-resize-end-gutter-cell')).toBeNull()
    expect(
      container.querySelector(
        '.ant-table-selection-column .ant-table-zby-resize-handle',
      ),
    ).toBeNull()
    expect(container.querySelectorAll('.ant-table-zby-resize-handle')).toHaveLength(3)
  })

  it('measures internal expand columns without making them resizable', () => {
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        enableColumnResizing
        expandable={{ expandedRowRender: (record) => record.name }}
        columns={columns}
        dataSource={data}
      />,
    )
    const expandHeader = container.querySelector<HTMLElement>(
      '.ant-table-thead .ant-table-row-expand-icon-cell',
    )!

    expect(expandHeader.dataset.zbyInternalColumnKey).toBeDefined()
    expect(expandHeader.dataset.zbyColumnKey).toBeUndefined()
    expect(
      expandHeader.querySelector('.ant-table-zby-resize-handle'),
    ).toBeNull()
    expect(container.querySelectorAll('.ant-table-zby-resize-handle')).toHaveLength(2)
  })

  it('keeps filler outside a fixed-end column group', () => {
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        enableColumnResizing
        columns={[
          {
            key: 'info',
            title: 'Info',
            children: [
              { key: 'id', dataIndex: 'id', title: 'ID', width: 100 },
              { key: 'name', dataIndex: 'name', title: 'Name', width: 100 },
            ],
          },
          {
            key: 'actions',
            title: 'Actions',
            fixed: 'right',
            children: [
              { key: 'action', title: 'Action', width: 100, render: () => 'Open' },
            ],
          },
        ]}
        dataSource={data}
      />,
    )
    const firstHeaderRow = [
      ...container.querySelectorAll<HTMLElement>('.ant-table-thead tr:first-child th'),
    ]
    const filler = container.querySelector<HTMLElement>(
      '.ant-table-thead .ant-table-zby-filler-cell',
    )!

    expect(firstHeaderRow.map((cell) =>
      cell === filler
        ? 'filler'
        : cell.textContent,
    )).toEqual(['Info', 'filler', 'Actions'])
    expect(filler.closest('tr')).toBe(firstHeaderRow[0].closest('tr'))
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

  it('syncs a clamped width while dragging without rendering a guide', () => {
    let frameCallback: FrameRequestCallback | undefined
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frameCallback = callback
      return 1
    })
    const flushFrame = () => {
      const callback = frameCallback
      frameCallback = undefined
      act(() => callback?.(0))
    }
    const onColumnWidthChange = vi.fn()
    const LiveResizableTable = () => {
      const [, setLastWidth] = React.useState(0)
      return (
        <Table<RowData>
          rowKey="id"
          pagination={false}
          enableColumnResizing
          onColumnWidthChange={(info) => {
            onColumnWidthChange(info)
            setLastWidth(info.width)
          }}
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
        />
      )
    }
    const { container } = render(
      <LiveResizableTable />,
    )
    const handle = container.querySelector<HTMLElement>(
      '.ant-table-zby-resize-handle',
    )!
    const setPointerCapture = vi.fn()
    const releasePointerCapture = vi.fn()
    Object.defineProperties(handle, {
      setPointerCapture: { configurable: true, value: setPointerCapture },
      hasPointerCapture: {
        configurable: true,
        value: vi.fn(() => true),
      },
      releasePointerCapture: {
        configurable: true,
        value: releasePointerCapture,
      },
    })

    fireEvent.pointerDown(handle, { clientX: 150, pointerId: 7 })
    fireEvent.pointerMove(document, { clientX: 400 })
    flushFrame()

    expect(
      container.querySelector<HTMLElement>('th[data-zby-column-key="id"]')!
        .style.width,
    ).toBe('200px')
    expect(onColumnWidthChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ columnKey: 'id', width: 200 }),
    )
    expect(
      container.querySelector<HTMLElement>('.ant-table-zby-resize-handle'),
    ).toBe(handle)

    fireEvent.pointerMove(document, { clientX: 20 })
    flushFrame()

    expect(
      container.querySelector<HTMLElement>('th[data-zby-column-key="id"]')!
        .style.width,
    ).toBe('100px')
    expect(onColumnWidthChange).toHaveBeenCalledTimes(2)
    expect(onColumnWidthChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ columnKey: 'id', width: 100 }),
    )
    expect(container.querySelector('.ant-table-zby-resize-guide')).toBeNull()

    fireEvent.pointerUp(document, { clientX: 20 })

    expect(setPointerCapture).toHaveBeenCalledWith(7)
    expect(releasePointerCapture).toHaveBeenCalledWith(7)
    expect(onColumnWidthChange).toHaveBeenCalledTimes(2)
  })

  it('does not commit when the resize handle is clicked without moving', () => {
    const onColumnWidthChange = vi.fn()
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        enableColumnResizing
        onColumnWidthChange={onColumnWidthChange}
        columns={columns}
        dataSource={data}
      />,
    )
    const handle = container.querySelector<HTMLElement>(
      '.ant-table-zby-resize-handle',
    )!

    fireEvent.pointerDown(handle, { clientX: 150 })
    fireEvent.pointerUp(document, { clientX: 150 })

    expect(onColumnWidthChange).not.toHaveBeenCalled()
  })

  it('keeps a fixed-right header and body aligned when that column consumes the filler', () => {
    const onColumnWidthChange = vi.fn()
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        bordered
        pagination={false}
        enableColumnResizing
        scroll={{ y: 200 }}
        onColumnWidthChange={onColumnWidthChange}
        columns={[
          { key: 'id', dataIndex: 'id', title: 'ID', width: 120 },
          {
            key: 'name',
            dataIndex: 'name',
            title: 'Name',
            width: 160,
            fixed: 'right',
          },
        ]}
        dataSource={data}
      />,
    )
    const handles = container.querySelectorAll<HTMLElement>(
      '.ant-table-zby-resize-handle',
    )
    const styleText = [...document.querySelectorAll('style')]
      .map((style) => style.textContent ?? '')
      .join('')
      .replace(/\s/g, '')

    expect(handles).toHaveLength(2)
    expect(styleText).toMatch(
      /ant-table-cell-fix-end-shadow::?after\{border-inline-end:/,
    )
    const initialHeaders = [
      ...container.querySelectorAll<HTMLElement>('.ant-table-thead tr:last-child th'),
    ]
    expect(initialHeaders.map((cell) =>
      cell.dataset.zbyColumnKey ??
      (cell.classList.contains('ant-table-zby-filler-cell')
        ? 'filler'
        : ''),
    )).toEqual(['id', 'filler', 'name'])

    fireEvent.pointerDown(handles[1], { clientX: 280 })
    fireEvent.pointerMove(document, { clientX: 600 })
    fireEvent.pointerUp(document, { clientX: 600 })

    const bodyWidths = [
      ...container.querySelectorAll<HTMLElement>(
        '.ant-table-zby-scroll-body col',
      ),
    ].map((col) => col.style.width)
    const headerWidths = [
      ...container.querySelectorAll<HTMLElement>('.ant-table-header col'),
    ].slice(0, bodyWidths.length).map((col) => col.style.width)
    const lastHeader = container.querySelector<HTMLElement>(
      'th[data-zby-column-key="name"]',
    )!

    expect(headerWidths).toEqual(bodyWidths)
    expect(bodyWidths).toEqual(['120px', '480px'])
    expect(getComputedStyle(lastHeader).position).toBe('sticky')
    expect(lastHeader.style.insetInlineEnd).toBe('0px')
    expect(lastHeader.querySelector('.ant-table-zby-resize-handle')).not.toBeNull()
    expect(onColumnWidthChange).toHaveBeenCalledWith(
      expect.objectContaining({ columnKey: 'name', width: 480 }),
    )
  })

  it('clears fixed-column shadows when resizing removes horizontal overflow', () => {
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        enableColumnResizing
        columns={[
          {
            key: 'id',
            dataIndex: 'id',
            title: 'ID',
            width: 120,
            fixed: 'left',
          },
          {
            key: 'name',
            dataIndex: 'name',
            title: 'Name',
            width: 500,
          },
          {
            key: 'action',
            title: 'Action',
            width: 100,
            fixed: 'right',
            render: () => 'Open',
          },
        ]}
        dataSource={data}
      />,
    )
    const viewport = container.querySelector<HTMLElement>(
      '.ant-scroll-area-viewport',
    )!
    let storedScrollLeft = 80
    const hasVisibleFiller = () =>
      Number.parseFloat(
        container.querySelector<HTMLElement>(
          '.ant-table-thead .ant-table-zby-filler-cell',
        )?.style.width ?? '0',
      ) > 0.01

    Object.defineProperties(viewport, {
      clientWidth: { configurable: true, get: () => 600 },
      scrollWidth: {
        configurable: true,
        get: () => hasVisibleFiller() ? 600 : 720,
      },
      scrollLeft: {
        configurable: true,
        get: () => hasVisibleFiller() ? 0 : storedScrollLeft,
        set: (value: number) => {
          storedScrollLeft = value
        },
      },
    })

    fireEvent.scroll(viewport)
    expect(
      container.querySelector('.ant-table-cell-fix-start-shadow-show'),
    ).not.toBeNull()
    expect(
      container.querySelector('.ant-table-cell-fix-end-shadow-show'),
    ).not.toBeNull()

    const handle = container.querySelector<HTMLElement>(
      'th[data-zby-column-key="name"] .ant-table-zby-resize-handle',
    )!
    fireEvent.pointerDown(handle, { clientX: 500 })
    fireEvent.pointerMove(document, { clientX: 200 })
    fireEvent.pointerUp(document, { clientX: 200 })

    expect(hasVisibleFiller()).toBe(true)
    expect(viewport.scrollLeft).toBe(0)
    expect(
      container.querySelector('.ant-table-cell-fix-start-shadow-show'),
    ).toBeNull()
    expect(
      container.querySelector('.ant-table-cell-fix-end-shadow-show'),
    ).toBeNull()
  })

  it('does not read or write persisted widths in boolean resizing mode', () => {
    const persistedKey = 'zby-ui:table:column-widths:boolean-mode'
    const persistedValue = JSON.stringify({
      version: 1,
      widths: { id: 190 },
    })
    window.localStorage.setItem(persistedKey, persistedValue)
    const getItem = vi.spyOn(Storage.prototype, 'getItem')
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        enableColumnResizing
        columns={columns}
        dataSource={data}
      />,
    )
    const idHeader = container.querySelector<HTMLElement>(
      'th[data-zby-column-key="id"]',
    )!
    const handle = idHeader.querySelector<HTMLElement>(
      '.ant-table-zby-resize-handle',
    )!

    expect(idHeader.style.width).toBe('120px')

    fireEvent.pointerDown(handle, { clientX: 120 })
    fireEvent.pointerMove(document, { clientX: 150 })
    fireEvent.pointerUp(document, { clientX: 150 })

    expect(getItem).not.toHaveBeenCalled()
    expect(setItem).not.toHaveBeenCalled()
  })

  it('resizes repeatedly by keyboard without persistence', () => {
    const onColumnWidthChange = vi.fn()
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        enableColumnResizing
        onColumnWidthChange={onColumnWidthChange}
        columns={columns}
        dataSource={data}
      />,
    )
    const getHandle = () => container.querySelector<HTMLElement>(
      '.ant-table-zby-resize-handle',
    )!

    fireEvent.keyDown(getHandle(), { key: 'ArrowRight' })
    fireEvent.keyDown(getHandle(), { key: 'ArrowRight' })
    fireEvent.keyDown(getHandle(), { key: 'ArrowRight' })

    expect(onColumnWidthChange).toHaveBeenCalledTimes(3)
    expect(
      container.querySelector<HTMLElement>('th[data-zby-column-key="id"]')!
        .style.width,
    ).toBe('150px')
  })

  it('forwards the supported ScrollArea visibility settings', () => {
    const { container } = render(
      <div style={{ height: 300 }}>
        <Table<RowData>
          rowKey="id"
          pagination={false}
          heightMode="fill"
          scrollAreaProps={{
            scrollbar: 'always',
            scrollHideDelay: 300,
          }}
          columns={columns}
          dataSource={data}
        />
      </div>,
    )

    expect(
      container.querySelector('.ant-scroll-area-track-vertical'),
    ).not.toBeNull()
  })

  it('keeps shared scroll tracks above fixed columns', () => {
    const { container } = render(
      <div style={{ height: 300 }}>
        <Table<RowData>
          rowKey="id"
          pagination={false}
          heightMode="fill"
          enableColumnResizing
          scrollAreaProps={{ scrollbar: 'always' }}
          columns={[
            {
              key: 'id',
              dataIndex: 'id',
              title: 'ID',
              width: 120,
              fixed: 'left',
            },
            {
              key: 'name',
              dataIndex: 'name',
              title: 'Name',
              width: 400,
            },
            {
              key: 'actions',
              title: 'Actions',
              width: 160,
              fixed: 'right',
            },
          ]}
          dataSource={data}
        />
      </div>,
    )

    const horizontalTrack = container.querySelector<HTMLElement>(
      '.ant-scroll-area-track-horizontal',
    )!
    const verticalTrack = container.querySelector<HTMLElement>(
      '.ant-scroll-area-track-vertical',
    )!

    expect(Number(horizontalTrack.style.zIndex)).toBeGreaterThan(1)
    expect(Number(verticalTrack.style.zIndex)).toBeGreaterThan(1)
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

  it('uses the same resized widths for the header and virtual fixed cells', () => {
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
          enableColumnResizing
          scroll={{ y: 200 }}
          columns={[
            { key: 'id', dataIndex: 'id', title: 'ID', width: 120 },
            {
              key: 'name',
              dataIndex: 'name',
              title: 'Name',
              width: 160,
              fixed: 'right',
            },
          ]}
          dataSource={largeData}
        />
      </div>,
    )
    const headerWidths = [
      ...container.querySelectorAll<HTMLElement>('.ant-table-header col'),
    ].slice(0, 3).map((col) => col.style.width)
    const firstVirtualRow = container.querySelector<HTMLElement>(
      '.ant-table-tbody-virtual .ant-table-row',
    )!
    const bodyCells = [
      ...firstVirtualRow.querySelectorAll<HTMLElement>('.ant-table-cell'),
    ]

    expect(headerWidths).toEqual(['120px', '320px', '160px'])
    expect(bodyCells.map((cell) => cell.style.width)).toEqual([
      '120px',
      '320px',
      '160px',
    ])
    expect(bodyCells[2].style.insetInlineEnd).toBe('0px')
    expect(
      container.querySelector<HTMLElement>('.ant-table-tbody-virtual-holder')!
        .style.width,
    ).toBe('600px')
  })
})

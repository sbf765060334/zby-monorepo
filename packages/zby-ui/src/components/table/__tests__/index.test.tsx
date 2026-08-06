// @vitest-environment jsdom

import { act, cleanup, fireEvent, render } from '@testing-library/react'
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
    const headers = container.querySelectorAll<HTMLElement>(
      '.ant-table-thead [data-zby-column-key]',
    )
    expect([...headers].map((cell) => cell.style.width)).toEqual([
      '150px',
      '150px',
    ])
  })

  it('measures auto-sized columns before adding filler in resizing mode', () => {
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
    expect(headerCells[0].style.width).toBe('150px')
    expect(headerCells[1].style.width).toBe('150px')
    expect(fillerCell.style.width).toBe('300px')
    expect([...headerCells].some((cell) => cell.style.width === '120px')).toBe(false)
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
      (cell.classList.contains('ant-table-zby-filler-cell') ? 'filler' : ''),
    )).toEqual(['id', 'name', 'filler'])
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

  it('removes filler and scrolls when business widths exceed the viewport', () => {
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
    })).toEqual(['selection', 'id', 'name', 'filler', 'action'])
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
      cell === filler ? 'filler' : cell.textContent,
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

    expect(handles).toHaveLength(2)
    const initialHeaders = [
      ...container.querySelectorAll<HTMLElement>('.ant-table-thead tr:last-child th'),
    ]
    expect(initialHeaders.map((cell) =>
      cell.dataset.zbyColumnKey ??
      (cell.classList.contains('ant-table-zby-filler-cell') ? 'filler' : ''),
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
    expect(lastHeader.querySelector('.ant-table-zby-resize-handle')).not.toBeNull()
    expect(onColumnWidthChange).toHaveBeenCalledWith(
      expect.objectContaining({ columnKey: 'name', width: 480 }),
    )
  })

  it('does not read or write persisted widths in boolean resizing mode', () => {
    const persistedKey = 'zby-ui:table:column-widths:boolean-mode'
    const persistedValue = JSON.stringify({
      version: 1,
      widths: { id: 190 },
    })
    window.localStorage.setItem(persistedKey, persistedValue)
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

    expect(window.localStorage.getItem(persistedKey)).toBe(persistedValue)
  })

  it('persists committed widths and clamps them when restoring', () => {
    const storageKey = 'resizable-orders'
    const persistedKey = `zby-ui:table:column-widths:${storageKey}`
    const firstRender = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        scroll={{ y: 200 }}
        enableColumnResizing={{ storageKey }}
        columns={[
          {
            key: 'id',
            dataIndex: 'id',
            title: 'ID',
            width: 150,
            maxWidth: 200,
          },
          { key: 'name', dataIndex: 'name', title: 'Name', width: 160 },
        ]}
        dataSource={data}
      />,
    )
    const handle = firstRender.container.querySelector<HTMLElement>(
      '.ant-table-zby-resize-handle',
    )!

    fireEvent.pointerDown(handle, { clientX: 150 })
    fireEvent.pointerMove(document, { clientX: 180 })
    fireEvent.pointerUp(document, { clientX: 180 })

    expect(JSON.parse(window.localStorage.getItem(persistedKey)!)).toEqual({
      version: 1,
      widths: { id: 180 },
    })

    firstRender.unmount()
    const onColumnWidthChange = vi.fn()
    const secondRender = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        scroll={{ y: 200 }}
        enableColumnResizing={{ storageKey }}
        onColumnWidthChange={onColumnWidthChange}
        columns={[
          {
            key: 'id',
            dataIndex: 'id',
            title: 'ID',
            width: 150,
            maxWidth: 160,
          },
          { key: 'name', dataIndex: 'name', title: 'Name', width: 160 },
        ]}
        dataSource={data}
      />,
    )
    const restoredHeader = secondRender.container.querySelector<HTMLElement>(
      'th[data-zby-column-key="id"]',
    )!

    expect(restoredHeader.style.width).toBe('160px')
    expect(onColumnWidthChange).not.toHaveBeenCalled()
  })

  it('coalesces repeated keyboard resizing into one storage write', () => {
    vi.useFakeTimers()
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const onColumnWidthChange = vi.fn()
    const storageKey = 'keyboard-resizing'
    const persistedKey = `zby-ui:table:column-widths:${storageKey}`
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        enableColumnResizing={{ storageKey }}
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
    expect(setItem).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(199))
    expect(setItem).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(1))
    expect(setItem).toHaveBeenCalledTimes(1)
    expect(JSON.parse(window.localStorage.getItem(persistedKey)!)).toEqual({
      version: 1,
      widths: { id: 150 },
    })
  })

  it('persists a __proto__ column key as ordinary data', () => {
    const storageKey = 'prototype-column-key'
    const persistedKey = `zby-ui:table:column-widths:${storageKey}`
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        enableColumnResizing={{ storageKey }}
        columns={[
          {
            key: '__proto__',
            dataIndex: 'id',
            title: 'ID',
            width: 120,
          },
          { key: 'name', dataIndex: 'name', title: 'Name', width: 160 },
        ]}
        dataSource={data}
      />,
    )
    const handle = container.querySelector<HTMLElement>(
      '.ant-table-zby-resize-handle',
    )!

    fireEvent.pointerDown(handle, { clientX: 120 })
    fireEvent.pointerMove(document, { clientX: 140 })
    fireEvent.pointerUp(document, { clientX: 140 })

    const persisted = JSON.parse(window.localStorage.getItem(persistedKey)!)
    expect(Object.entries(persisted.widths)).toContainEqual([
      '__proto__',
      140,
    ])
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
})

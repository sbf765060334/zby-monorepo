// @vitest-environment jsdom

import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { ZbyIntlProvider } from '@zby/intl'
import ConfigProvider from 'antd/es/config-provider'
import * as React from 'react'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import Table from '../index'
import { zbyUiLocales } from '../../../locales'

const OriginalResizeObserver = globalThis.ResizeObserver
const originalMatchMedia = window.matchMedia
const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect
const resizeObserverCallbacks = new Set<ResizeObserverCallback>()

class ResizeObserverMock {
  private readonly callback: ResizeObserverCallback

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
    resizeObserverCallbacks.add(callback)
  }

  observe() {}
  unobserve() {}
  disconnect() {
    resizeObserverCallbacks.delete(this.callback)
  }
}

function setElementSize(
  element: Element | null,
  property: 'clientHeight' | 'clientWidth' | 'offsetHeight' | 'offsetWidth',
  value: number,
) {
  if (!element) throw new Error(`Expected an element for ${property}`)
  Object.defineProperty(element, property, { configurable: true, value })
}

function flushResizeObservers() {
  act(() => {
    resizeObserverCallbacks.forEach((callback) =>
      callback([], {} as ResizeObserver),
    )
  })
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
    if (this.dataset.tableColumnWidthMeasure !== undefined) {
      const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
      const remWidth = this.style.width.match(/^(\d+(?:\.\d+)?)rem$/)
      const width = remWidth ? Number(remWidth[1]) * rootFontSize : Number.parseFloat(this.style.width)
      return {
        x: 0,
        y: 0,
        width,
        height: 0,
        top: 0,
        left: 0,
        right: width,
        bottom: 0,
        toJSON: () => ({}),
      }
    }

    const width =
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
  resizeObserverCallbacks.clear()
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
  it('enhances column title, display text, copyable and multi-line ellipsis', () => {
    const renderText = vi.fn((value: unknown) => `Name: ${String(value)}`)
    const { container } = render(
      <ZbyIntlProvider locale="zh-CN" resources={zbyUiLocales}>
        <Table<RowData>
          rowKey="id"
          pagination={false}
          columns={[
            {
              dataIndex: 'name',
              title: 'Name',
              tooltip: 'Name details',
              renderText,
              copyable: true,
              ellipsis: { rows: 2 },
            },
          ]}
          dataSource={data.slice(0, 1)}
        />
      </ZbyIntlProvider>,
    )

    expect(container.querySelector('.ant-table-column-title-tooltip')).not.toBeNull()
    const bodyCell = container.querySelector('.ant-table-tbody .ant-table-cell')
    expect(bodyCell?.textContent).toContain('Name: Alpha')
    expect(container.querySelector('.ant-table-cell-action-text')).not.toBeNull()
    expect(container.querySelector('[data-action-text-copy]')).not.toBeNull()
    expect(
      bodyCell?.classList.contains('ant-table-cell-with-action-text'),
    ).toBe(true)
    expect(renderText).toHaveBeenCalledWith('Alpha', data[0], 0)
  })

  it('keeps the default selection width on the AntD token path without a split header', () => {
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

    expect(selectionCol?.getAttribute('style')).toBeNull()
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

  it('preserves AntD string selection widths and explicit rowSelection overrides', () => {
    const { container, rerender } = render(
      <ConfigProvider theme={{ components: { Table: { selectionColumnWidth: '4rem' } } }}>
        <Table<RowData>
          rowKey="id"
          pagination={false}
          rowSelection={{}}
          columns={columns}
          dataSource={data}
        />
      </ConfigProvider>,
    )

    expect(container.querySelector<HTMLElement>('.ant-table-content col')?.style.width).toBe(
      '4rem',
    )

    rerender(
      <ConfigProvider theme={{ components: { Table: { selectionColumnWidth: '4rem' } } }}>
        <Table<RowData>
          rowKey="id"
          pagination={false}
          rowSelection={{ columnWidth: '5rem' }}
          columns={columns}
          dataSource={data}
        />
      </ConfigProvider>,
    )

    expect(container.querySelector<HTMLElement>('.ant-table-content col')?.style.width).toBe(
      '5rem',
    )
  })

  it('measures non-pixel selection widths for the internal columnResize layout', () => {
    const { container } = render(
      <ConfigProvider theme={{ components: { Table: { selectionColumnWidth: '4rem' } } }}>
        <Table<RowData>
          rowKey="id"
          pagination={false}
          rowSelection={{}}
          columnResize
          scroll={{ y: 120 }}
          columns={columns}
          dataSource={data}
        />
      </ConfigProvider>,
    )

    const headerTable = container.querySelector<HTMLElement>('.ant-table-header table')
    const bodyTable = container.querySelector<HTMLElement>('.ant-table-body table')

    expect(headerTable?.querySelector<HTMLElement>('col')?.style.width).toBe('64px')
    expect(bodyTable?.querySelector<HTMLElement>('col')?.style.width).toBe('64px')
    expect(headerTable?.style.minWidth).toBe('')
    expect(bodyTable?.style.minWidth).toBe('')
    expect(container.querySelector('.ant-table-selection-column')).not.toBeNull()
  })

  it('only wraps a split header table when AntD aria propagation is required', () => {
    const HeaderTable = React.forwardRef<
      HTMLTableElement,
      React.TableHTMLAttributes<HTMLTableElement>
    >((props, ref) => <table {...props} ref={ref} data-custom-header-table="" />)
    const { container, rerender } = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        scroll={{ y: 120 }}
        components={{ header: { table: HeaderTable } }}
        columns={columns}
        dataSource={data}
      />,
    )

    const headerTable = container.querySelector<HTMLElement>('.ant-table-header table')
    expect(headerTable?.dataset.customHeaderTable).toBe('')
    expect(headerTable?.style.minWidth).toBe('100%')

    rerender(
      <Table<RowData>
        aria-label="Orders"
        rowKey="id"
        pagination={false}
        scroll={{ y: 120 }}
        components={{ header: { table: HeaderTable } }}
        columns={columns}
        dataSource={data}
      />,
    )

    expect(container.querySelector('.ant-table-header table')?.getAttribute('aria-label')).toBe(
      'Orders',
    )
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

  it('uses Shuzhi column resize widths and lifecycle callbacks', () => {
    const onWidthsChange = vi.fn()
    const onResizeEnd = vi.fn()
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        columnResize={{
          defaultWidths: { id: 120, name: 160 },
          onWidthsChange,
          onResizeEnd,
        }}
        columns={columns}
        dataSource={data}
      />,
    )

    const cols = container.querySelectorAll<HTMLElement>('col')
    expect(cols[0].style.width).toBe('120px')
    expect(cols[1].style.width).toBe('160px')

    const handle = container.querySelector<HTMLElement>(
      '.ant-table-cell-resize-handle',
    )!
    fireEvent.pointerDown(handle, { clientX: 100, pointerId: 1 })
    fireEvent.pointerMove(document, { clientX: 140, pointerId: 1 })
    fireEvent.pointerUp(document, { clientX: 140, pointerId: 1 })

    expect(container.querySelectorAll<HTMLElement>('col')[0].style.width).toBe(
      '160px',
    )
    expect(onWidthsChange).toHaveBeenLastCalledWith(
      { id: 160, name: 160 },
      expect.objectContaining({
        key: 'id',
        width: 160,
        previousWidth: 120,
        delta: 40,
      }),
    )
    expect(onResizeEnd).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'id', width: 160 }),
    )
  })

  it('keeps Shuzhi fixed-holder sizing and omits empty scrollbar columns', () => {
    const offsetWidth = vi
      .spyOn(HTMLElement.prototype, 'offsetWidth', 'get')
      .mockImplementation(function getOffsetWidth(this: HTMLElement) {
        return this.classList.contains('ant-table-body') ? 600 : 150
      })
    const clientWidth = vi
      .spyOn(HTMLElement.prototype, 'clientWidth', 'get')
      .mockImplementation(function getClientWidth(this: HTMLElement) {
        return this.classList.contains('ant-table-body') ? 583 : 150
      })

    const resized = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        columnResize
        scroll={{ y: 120 }}
        columns={columns}
        dataSource={data}
      />,
    )

    expect(
      resized.container.querySelector<HTMLElement>('.ant-table-header table')?.style.minWidth,
    ).toBe('')
    expect(
      resized.container.querySelector<HTMLElement>('.ant-table-body table')?.style.minWidth,
    ).toBe('')
    resized.unmount()

    const empty = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        scroll={{ x: 600, y: 120 }}
        columns={columns}
        dataSource={[]}
      />,
    )

    expect(empty.container.querySelector('.ant-table-header .ant-table-cell-scrollbar')).toBeNull()
    offsetWidth.mockRestore()
    clientWidth.mockRestore()
  })

  it('passes the default content heightMode to semantic callbacks', () => {
    const classNames = vi.fn(({ props }: { props: { heightMode?: string } }) => ({
      root: `height-mode-${props.heightMode}`,
    }))
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        classNames={classNames}
        columns={columns}
        dataSource={data}
      />,
    )

    expect(classNames).toHaveBeenCalledWith(
      expect.objectContaining({ props: expect.objectContaining({ heightMode: 'content' }) }),
    )
    expect(container.querySelector('.height-mode-content')).not.toBeNull()
  })

  it('keeps controlled Shuzhi widths authoritative', () => {
    const ControlledTable = () => {
      const [widths, setWidths] = React.useState({ id: 120, name: 160 })

      return (
        <Table<RowData>
          rowKey="id"
          pagination={false}
          columnResize={{
            widths,
            onWidthsChange: () => setWidths({ id: 200, name: 180 }),
          }}
          columns={columns}
          dataSource={data}
        />
      )
    }

    const { container } = render(<ControlledTable />)
    const handle = container.querySelector<HTMLElement>(
      '.ant-table-cell-resize-handle',
    )!

    fireEvent.pointerDown(handle, { clientX: 100, pointerId: 1 })
    fireEvent.pointerMove(document, { clientX: 140, pointerId: 1 })
    fireEvent.pointerUp(document, { clientX: 140, pointerId: 1 })

    const cols = container.querySelectorAll<HTMLElement>('col')
    expect(cols[0].style.width).toBe('200px')
    expect(cols[1].style.width).toBe('180px')
  })

  it('does not expose resize handles for unstable positional keys', () => {
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        columnResize
        columns={[
          { title: 'Computed', render: (_, record) => record.name },
          { title: 'Name', dataIndex: 'name' },
        ]}
        dataSource={data}
      />,
    )

    expect(
      container.querySelectorAll('.ant-table-cell-resize-handle'),
    ).toHaveLength(1)
  })

  it('inserts the resize filler before a fixed-end column', () => {
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        columnResize={{ defaultWidths: { id: 120, name: 80 } }}
        columns={[
          { dataIndex: 'id', title: 'ID' },
          {
            dataIndex: 'name',
            title: 'Name',
            fixed: 'right',
            resizable: false,
          },
        ]}
        dataSource={data}
      />,
    )

    const cols = container.querySelectorAll<HTMLElement>('col')
    expect(cols).toHaveLength(3)
    expect(cols[0].style.width).toBe('120px')
    expect(cols[1].style.width).toBe('400px')
    expect(cols[2].style.width).toBe('80px')
    expect(
      container.querySelectorAll('.ant-table-cell-resize-filler'),
    ).toHaveLength(3)
  })

  it('derives a non-virtual fill body height from the owned layout nodes', () => {
    vi.useFakeTimers()
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        heightMode="fill"
        columns={columns}
        dataSource={data}
        pagination={{ pageSize: 1 }}
      />,
    )

    const wrapper = container.querySelector('.ant-table-wrapper')
    const pagination = container.querySelector<HTMLElement>(
      '.ant-table-pagination',
    )!

    setElementSize(wrapper, 'clientHeight', 480)
    setElementSize(pagination, 'offsetHeight', 40)
    pagination.style.marginTop = '16px'
    pagination.style.marginBottom = '16px'

    flushResizeObservers()
    act(() => vi.runOnlyPendingTimers())

    const header = container.querySelector('.ant-table-header')
    setElementSize(header, 'offsetHeight', 56)
    flushResizeObservers()
    act(() => vi.runOnlyPendingTimers())

    const body = container.querySelector<HTMLElement>('.ant-table-body')
    expect(wrapper?.classList.contains('ant-table-wrapper-fill')).toBe(true)
    expect(container.querySelector('.ant-table')?.classList.contains('ant-table-fill')).toBe(true)
    expect(body?.style.height).toBe('352px')
  })

  it('passes the measured fill height to rc-table VirtualList', () => {
    vi.useFakeTimers()
    const virtualData = Array.from({ length: 100 }, (_, index) => ({
      id: index,
      name: `Row ${index}`,
    }))
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        heightMode="fill"
        virtual
        columns={columns}
        dataSource={virtualData}
        pagination={false}
        scroll={{ x: 600 }}
      />,
    )

    const wrapper = container.querySelector('.ant-table-wrapper')
    setElementSize(wrapper, 'clientHeight', 320)

    flushResizeObservers()
    act(() => vi.runOnlyPendingTimers())

    const header = container.querySelector('.ant-table-header')
    setElementSize(header, 'offsetHeight', 56)
    flushResizeObservers()
    act(() => vi.runOnlyPendingTimers())

    expect(
      container.querySelector<HTMLElement>('.ant-table-tbody-virtual-holder')
        ?.style
        .height,
    ).toBe('264px')
  })

  it('uses ZBY ScrollArea for Shuzhi non-virtual scrolling semantics', () => {
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        scroll={{ x: 600, y: 120 }}
        columns={columns}
        dataSource={data}
      />,
    )

    const scrollArea = container.querySelector(
      '.ant-table-body-scroll-area.ant-scroll-area',
    )
    const viewport = container.querySelector<HTMLElement>('.ant-table-body')!

    expect(scrollArea).not.toBeNull()
    expect(viewport.classList.contains('ant-scroll-area-viewport')).toBe(true)
  })

  it('keeps bordered cell dividers and radius through the ZBY ScrollArea wrappers', () => {
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        bordered
        pagination={false}
        columnResize
        columns={columns}
        dataSource={data}
      />,
    )

    const scrollArea = container.querySelector<HTMLElement>(
      '.ant-table-content-scroll-area',
    )!
    const viewport = scrollArea.querySelector<HTMLElement>('.ant-table-content')!
    const bodyCell = scrollArea.querySelector<HTMLElement>('.ant-table-tbody td')!

    expect(viewport.querySelector('.ant-scroll-area-content')).not.toBeNull()
    expect(bodyCell.closest('.ant-scroll-area-content')).not.toBeNull()
    expect(bodyCell.classList.contains('ant-table-cell')).toBe(true)
    expect(scrollArea.classList.contains('ant-scroll-area')).toBe(true)
    expect(viewport.classList.contains('ant-scroll-area-viewport')).toBe(true)
  })

  it('keeps virtual tables on rc-table 1.10.4 VirtualList semantics', () => {
    const virtualData = Array.from({ length: 100 }, (_, index) => ({
      id: index,
      name: `Row ${index}`,
    }))
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        virtual
        scroll={{ x: 600, y: 120 }}
        columns={columns}
        dataSource={virtualData}
      />,
    )

    expect(container.querySelector('.ant-table-tbody-virtual')).not.toBeNull()
    expect(
      container.querySelector('.ant-table-content-scroll-area'),
    ).toBeNull()
    expect(container.querySelectorAll('.ant-table-row').length).toBeLessThan(
      virtualData.length,
    )
  })

  it('keeps virtual rowSpan origins mounted outside the visible range', () => {
    const virtualData = Array.from({ length: 30 }, (_, index) => ({
      id: index,
      name: index === 0 ? 'Merged group' : `Row ${index}`,
    }))
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        virtual
        scroll={{ x: 240, y: 120 }}
        columns={[
          {
            key: 'name',
            dataIndex: 'name',
            title: 'Name',
            width: 240,
            onCell: (_, index) => ({
              rowSpan: index === 0 ? 10 : index! < 10 ? 0 : 1,
            }),
          },
        ]}
        dataSource={virtualData}
      />,
    )

    const holder = container.querySelector<HTMLElement>(
      '.ant-table-tbody-virtual-holder',
    )!
    act(() => {
      holder.scrollTop = 240
      fireEvent.scroll(holder)
    })

    expect(container.querySelector('.ant-table-tbody-virtual')).not.toBeNull()
    expect(container.textContent).toContain('Merged group')
  })
})

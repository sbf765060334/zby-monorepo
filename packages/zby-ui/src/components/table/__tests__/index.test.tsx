// @vitest-environment jsdom

import { _rs } from '@rc-component/resize-observer'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { ZbyIntlProvider } from '@zby/intl'
import ConfigProvider from 'antd/es/config-provider'
import * as React from 'react'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import Table, { type ColumnResizeWidths } from '../index'
import { zbyUiIntlResources } from '../../../locale/intl-resources'

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

function mockTableBoxWidth(width: number) {
  return vi
    .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    .mockImplementation(function getBoundingClientRect(this: HTMLElement) {
      if (this.dataset.tableColumnWidthMeasure !== undefined) {
        return originalGetBoundingClientRect.call(this)
      }

      const isTableBox =
        this.classList.contains('ant-table') ||
        this.classList.contains('ant-table-content')
      const boxWidth = isTableBox ? width : 150

      return {
        x: 0,
        y: 0,
        width: boxWidth,
        height: 40,
        top: 0,
        left: 0,
        right: boxWidth,
        bottom: 40,
        toJSON: () => ({}),
      }
    })
}

async function flushObservedTableResize(container: HTMLElement) {
  const targets = [
    container.querySelector('.ant-table'),
    container.querySelector('.ant-table-content'),
  ].filter((element): element is HTMLElement => element instanceof HTMLElement)

  if (!_rs) {
    throw new Error('expected @rc-component/resize-observer _rs in tests')
  }

  await act(async () => {
    _rs(targets.map((target) => ({ target }) as unknown as ResizeObserverEntry))
    await Promise.resolve()
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

    const width = this.classList.contains('ant-table') ? 600 : 150
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

function mockScrollbarProbe() {
  const computedStyle = window.getComputedStyle.bind(window)
  const offsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth')!.get!
  const clientWidth = Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth')!.get!
  vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudoElement) => {
    const computed = computedStyle(element, pseudoElement)
    if (pseudoElement || !(element instanceof HTMLElement) || !element.style.scrollbarWidth) {
      return computed
    }
    return new Proxy(computed, {
      get(target, property, receiver) {
        if (property === 'scrollbarWidth') {
          return element.style.scrollbarWidth
        }
        const value = Reflect.get(target, property, receiver)
        return typeof value === 'function' ? value.bind(target) : value
      },
    })
  })
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function getOffsetWidth(
    this: HTMLElement,
  ) {
    if (this.id.startsWith('rc-scrollbar-measure-')) {
      return 100
    }
    return offsetWidth.call(this)
  })
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function getClientWidth(
    this: HTMLElement,
  ) {
    if (this.id.startsWith('rc-scrollbar-measure-')) {
      return this.style.scrollbarWidth === 'thin' ? 92 : 83
    }
    return clientWidth.call(this)
  })
}

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
  it('enables uncontrolled current-row highlighting with a boolean', () => {
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        columns={columns}
        dataSource={data}
        rowHighlight
      />,
    )
    const rows = container.querySelectorAll('.ant-table-tbody .ant-table-row')

    fireEvent.click(rows[0])
    expect(rows[0].classList.contains('ant-table-row-current')).toBe(true)
    expect(rows[0].getAttribute('aria-current')).toBe('true')
    fireEvent.click(rows[0])
    expect(rows[0].classList.contains('ant-table-row-current')).toBe(false)
    expect(rows[0].getAttribute('aria-current')).toBeNull()
  })

  it('keeps controlled current-row state authoritative', () => {
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

  it('runs the user row click first and respects preventDefault', () => {
    const onClick = vi.fn((event: React.MouseEvent<HTMLElement>) => {
      event.preventDefault()
    })
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        columns={columns}
        dataSource={data}
        onRow={() => ({ onClick })}
        rowHighlight
      />,
    )
    const firstRow = container.querySelector('.ant-table-tbody .ant-table-row')!

    fireEvent.click(firstRow)

    expect(onClick).toHaveBeenCalledOnce()
    expect(firstRow.classList.contains('ant-table-row-current')).toBe(false)
  })

  it('does not toggle row highlight from interactive cell content', () => {
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        rowHighlight
        columns={[
          ...columns,
          {
            key: 'action',
            title: 'Action',
            render: () => (
              <>
                <button type="button">Edit</button>
                <a href="#row-link">Link</a>
                <div role="combobox">Combo</div>
                <div data-row-click-ignore>Custom</div>
              </>
            ),
          },
        ]}
        dataSource={data}
      />,
    )
    const rows = container.querySelectorAll('.ant-table-tbody .ant-table-row')
    const firstRow = rows[0]
    const secondRow = rows[1]

    fireEvent.click(firstRow.querySelector('button')!)
    fireEvent.click(firstRow.querySelector('a')!)
    fireEvent.click(firstRow.querySelector('[role="combobox"]')!)
    fireEvent.click(firstRow.querySelector('[data-row-click-ignore]')!)
    expect(firstRow.classList.contains('ant-table-row-current')).toBe(false)

    fireEvent.click(firstRow.querySelector('td')!)
    expect(firstRow.classList.contains('ant-table-row-current')).toBe(true)

    fireEvent.click(secondRow.querySelector('button')!)
    expect(firstRow.classList.contains('ant-table-row-current')).toBe(true)
    expect(secondRow.classList.contains('ant-table-row-current')).toBe(false)
  })

  it('ignores ConfigProvider-prefixed antd composite roots when highlighting', () => {
    const { container } = render(
      <ConfigProvider prefixCls="zby">
        <Table<RowData>
          rowKey="id"
          pagination={false}
          rowHighlight
          columns={[
            ...columns,
            {
              key: 'select',
              title: 'Select',
              render: () => <div className="zby-select">Sel</div>,
            },
          ]}
          dataSource={data}
        />
      </ConfigProvider>,
    )
    const firstRow = container.querySelector('.zby-table-tbody .zby-table-row')!

    fireEvent.click(firstRow.querySelector('.zby-select')!)
    expect(firstRow.classList.contains('zby-table-row-current')).toBe(false)

    fireEvent.click(firstRow.querySelector('td')!)
    expect(firstRow.classList.contains('zby-table-row-current')).toBe(true)
  })

  it('keeps current-row highlighting independent from rowSelection', () => {
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        columns={columns}
        dataSource={data}
        rowSelection={{ defaultSelectedRowKeys: [2] }}
        rowHighlight
      />,
    )
    const rows = container.querySelectorAll('.ant-table-tbody .ant-table-row')

    fireEvent.click(rows[0])

    expect(rows[0].classList.contains('ant-table-row-current')).toBe(true)
    expect(rows[0].classList.contains('ant-table-row-selected')).toBe(false)
    expect(rows[1].classList.contains('ant-table-row-selected')).toBe(true)
    expect(rows[1].classList.contains('ant-table-row-current')).toBe(false)
  })

  it('keeps current-row highlighting available in virtual tables', () => {
    const virtualData = Array.from({ length: 30 }, (_, index) => ({
      id: index + 1,
      name: `Row ${index + 1}`,
    }))
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        virtual
        scroll={{ x: 280, y: 120 }}
        columns={columns}
        dataSource={virtualData}
        rowHighlight
      />,
    )

    const firstRow = container.querySelector('.ant-table-tbody-virtual .ant-table-row')!
    fireEvent.click(firstRow)
    expect(firstRow.classList.contains('ant-table-row-current')).toBe(true)
    expect(firstRow.getAttribute('aria-current')).toBe('true')

    fireEvent.click(firstRow)
    expect(firstRow.classList.contains('ant-table-row-current')).toBe(false)
  })

  it('enhances column title, display text, copyable and multi-line ellipsis', () => {
    const renderText = vi.fn((value: unknown) => `Name: ${String(value)}`)
    const { container } = render(
      <ZbyIntlProvider locale="zh-CN" resources={zbyUiIntlResources}>
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
    const headerCell = container.querySelector('.ant-table-thead .ant-table-cell')
    expect(headerCell?.classList.contains('ant-table-cell-ellipsis')).toBe(true)
    expect(bodyCell?.classList.contains('ant-table-cell-ellipsis')).toBe(false)
    expect(bodyCell?.getAttribute('title')).toBeNull()
  })

  it('uses ActionText for body ellipsis and native header ellipsis', () => {
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        columns={[{ dataIndex: 'name', title: 'Name', ellipsis: true }]}
        dataSource={data.slice(0, 1)}
      />,
    )

    const headerCell = container.querySelector('.ant-table-thead .ant-table-cell')
    const bodyCell = container.querySelector('.ant-table-tbody .ant-table-cell')

    expect(headerCell?.classList.contains('ant-table-cell-ellipsis')).toBe(true)
    expect(headerCell?.getAttribute('title')).toBe('Name')
    expect(bodyCell?.classList.contains('ant-table-cell-ellipsis')).toBe(false)
    expect(bodyCell?.getAttribute('title')).toBeNull()
    expect(bodyCell?.querySelector('.ant-table-cell-action-text')).not.toBeNull()
    expect(bodyCell?.classList.contains('ant-table-cell-with-action-text')).toBe(true)
  })

  it('skips body ActionText and native body ellipsis when a custom render is set', () => {
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        columns={[
          {
            dataIndex: 'name',
            title: 'Name',
            ellipsis: true,
            copyable: true,
            render: () => <span data-custom-cell="">Custom</span>,
          },
        ]}
        dataSource={data.slice(0, 1)}
      />,
    )

    const headerCell = container.querySelector('.ant-table-thead .ant-table-cell')
    const bodyCell = container.querySelector('.ant-table-tbody .ant-table-cell')

    expect(headerCell?.classList.contains('ant-table-cell-ellipsis')).toBe(true)
    expect(bodyCell?.querySelector('[data-custom-cell]')).not.toBeNull()
    expect(bodyCell?.querySelector('.ant-table-cell-action-text')).toBeNull()
    expect(bodyCell?.classList.contains('ant-table-cell-ellipsis')).toBe(false)
    expect(bodyCell?.classList.contains('ant-table-cell-with-action-text')).toBe(false)
    expect(bodyCell?.getAttribute('title')).toBeNull()
  })

  it('keeps virtual body cells off the native ellipsis path', () => {
    const virtualData = Array.from({ length: 8 }, (_, index) => ({
      id: index + 1,
      name: `Row ${index + 1} with a long name`,
    }))
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        virtual
        scroll={{ x: 280, y: 120 }}
        columns={[{ dataIndex: 'name', title: 'Name', width: 200, ellipsis: true }]}
        dataSource={virtualData}
      />,
    )

    const headerCell = container.querySelector('.ant-table-thead .ant-table-cell')
    const bodyCell = container.querySelector('.ant-table-tbody-virtual .ant-table-cell')

    expect(headerCell?.classList.contains('ant-table-cell-ellipsis')).toBe(true)
    expect(bodyCell?.classList.contains('ant-table-cell-ellipsis')).toBe(false)
    expect(bodyCell?.getAttribute('title')).toBeNull()
    expect(bodyCell?.querySelector('.ant-table-cell-action-text')).not.toBeNull()
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

  it('uses the AntD control height for selection width with columnResize', () => {
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        rowSelection={{}}
        columnResize
        scroll={{ y: 120 }}
        columns={columns}
        dataSource={data}
      />,
    )

    const headerTable = container.querySelector<HTMLElement>('.ant-table-header table')
    const bodyTable = container.querySelector<HTMLElement>('.ant-table-body table')

    expect(headerTable?.querySelector<HTMLElement>('col')?.style.width).toBe('32px')
    expect(bodyTable?.querySelector<HTMLElement>('col')?.style.width).toBe('32px')
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
    expect(bodyTable?.style.minWidth).toBe('100%')
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
    const resizeInfo = onResizeEnd.mock.calls[0][0]
    expect(resizeInfo.column).toEqual(
      expect.objectContaining({ key: 'id', title: 'ID', width: 120 }),
    )
    expect(resizeInfo.column).not.toHaveProperty(
      'RC_TABLE_INTERNAL_COLUMN_RESIZE_META',
    )
  })

  it('does not emit resize callbacks when the handle is clicked without dragging', () => {
    const onResize = vi.fn()
    const onWidthsChange = vi.fn()
    const onResizeEnd = vi.fn()
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        columnResize={{
          defaultWidths: { id: 120, name: 160 },
          onResize,
          onWidthsChange,
          onResizeEnd,
        }}
        columns={columns}
        dataSource={data}
      />,
    )

    const handle = container.querySelector<HTMLElement>(
      '.ant-table-cell-resize-handle',
    )!
    fireEvent.pointerDown(handle, { clientX: 100, pointerId: 1 })
    fireEvent.pointerUp(document, { clientX: 100, pointerId: 1 })

    expect(container.querySelectorAll<HTMLElement>('col')[0].style.width).toBe(
      '120px',
    )
    expect(onResize).not.toHaveBeenCalled()
    expect(onWidthsChange).not.toHaveBeenCalled()
    expect(onResizeEnd).not.toHaveBeenCalled()
  })

  it('emits onResizeEnd after a drag even if pointerup repeats the last width', () => {
    const rafQueue: FrameRequestCallback[] = []
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      rafQueue.push(callback)
      return rafQueue.length
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
      rafQueue[id - 1] = () => {}
    })

    const onResizeEnd = vi.fn()
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        columnResize={{
          defaultWidths: { id: 120, name: 160 },
          onResizeEnd,
        }}
        columns={columns}
        dataSource={data}
      />,
    )

    const handle = container.querySelector<HTMLElement>(
      '.ant-table-cell-resize-handle',
    )!
    fireEvent.pointerDown(handle, { clientX: 100, pointerId: 1 })
    fireEvent.pointerMove(document, { clientX: 140, pointerId: 1 })
    act(() => {
      const callbacks = rafQueue.splice(0)
      callbacks.forEach((callback) => callback(0))
    })
    fireEvent.pointerUp(document, { clientX: 140, pointerId: 1 })

    expect(onResizeEnd).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'id', width: 160 }),
    )
  })

  it('emits onResizeEnd when controlled widths rerender before pointerup', () => {
    const rafQueue: FrameRequestCallback[] = []
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      rafQueue.push(callback)
      return rafQueue.length
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
      rafQueue[id - 1] = () => {}
    })

    const onResizeEnd = vi.fn()
    function Demo() {
      const [widths, setWidths] = React.useState<ColumnResizeWidths>({ id: 120, name: 160 })
      return (
        <Table<RowData>
          rowKey="id"
          pagination={false}
          columnResize={{
            widths,
            onWidthsChange: (next) => setWidths(next),
            onResizeEnd,
          }}
          columns={columns}
          dataSource={data}
        />
      )
    }

    const { container } = render(<Demo />)
    const handle = container.querySelector<HTMLElement>(
      '.ant-table-cell-resize-handle',
    )!
    fireEvent.pointerDown(handle, { clientX: 100, pointerId: 1 })
    fireEvent.pointerMove(document, { clientX: 140, pointerId: 1 })
    act(() => {
      const callbacks = rafQueue.splice(0)
      callbacks.forEach((callback) => callback(0))
    })
    fireEvent.pointerUp(document, { clientX: 140, pointerId: 1 })

    expect(onResizeEnd).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'id', width: 160 }),
    )
  })

  it('warns when a column has no stable key or dataIndex under columnResize', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        columnResize
        columns={[
          { title: 'No identity', width: 120 },
          { key: 'name', dataIndex: 'name', title: 'Name', width: 160 },
        ]}
        dataSource={data}
      />,
    )

    const headerCells = container.querySelectorAll('.ant-table-thead th')
    expect(headerCells[0].querySelector('.ant-table-cell-resize-handle')).toBeNull()
    expect(headerCells[1].querySelector('.ant-table-cell-resize-handle')).not.toBeNull()
    expect(
      errorSpy.mock.calls.some((args) =>
        args.some((arg) =>
          String(arg).includes(
            'stable `key` or stringifiable `dataIndex`',
          ),
        ),
      ),
    ).toBe(true)
    errorSpy.mockRestore()
  })

  it('inverts column resize drag delta under RTL', () => {
    const onWidthsChange = vi.fn()
    const { container } = render(
      <ConfigProvider direction="rtl">
        <Table<RowData>
          rowKey="id"
          pagination={false}
          columnResize={{
            defaultWidths: { id: 120, name: 160 },
            onWidthsChange,
          }}
          columns={columns}
          dataSource={data}
        />
      </ConfigProvider>,
    )

    const handle = container.querySelector<HTMLElement>(
      '.ant-table-cell-resize-handle',
    )!
    fireEvent.pointerDown(handle, { clientX: 140, pointerId: 1 })
    fireEvent.pointerMove(document, { clientX: 100, pointerId: 1 })
    fireEvent.pointerUp(document, { clientX: 100, pointerId: 1 })

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
    ).toBe('100%')
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

  it('passes height to semantic callbacks and applies it to the root', () => {
    const classNames = vi.fn(({ props }: { props: { height?: React.CSSProperties['height'] } }) => ({
      root: props.height === undefined ? 'natural-height' : 'explicit-height',
    }))
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        height="calc(100% - 24px)"
        classNames={classNames}
        columns={columns}
        dataSource={data}
      />,
    )

    expect(classNames).toHaveBeenCalledWith(
      expect.objectContaining({
        props: expect.objectContaining({ height: 'calc(100% - 24px)' }),
      }),
    )
    expect(container.querySelector<HTMLElement>('.explicit-height')?.style.height).toBe(
      'calc(100% - 24px)',
    )
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

  it('keeps the column resize filler when an ancestor is display none', async () => {
    const { container, rerender } = render(
      <div>
        <Table<RowData>
          rowKey="id"
          pagination={false}
          columnResize={{ defaultWidths: { id: 120, name: 160 } }}
          columns={columns}
          dataSource={data}
        />
      </div>,
    )

    expect(container.querySelectorAll<HTMLElement>('col')).toHaveLength(3)
    expect(container.querySelector<HTMLElement>('col:nth-child(3)')?.style.width).toBe(
      '320px',
    )

    rerender(
      <div style={{ display: 'none' }}>
        <Table<RowData>
          rowKey="id"
          pagination={false}
          columnResize={{ defaultWidths: { id: 120, name: 160 } }}
          columns={columns}
          dataSource={data}
        />
      </div>,
    )

    const table = container.querySelector<HTMLElement>('.ant-table')
    const content = container.querySelector<HTMLElement>('.ant-table-content')
    setElementSize(table, 'offsetWidth', 0)
    setElementSize(content, 'offsetWidth', 0)
    setElementSize(content, 'clientWidth', 0)
    mockTableBoxWidth(0)
    await flushObservedTableResize(container)

    expect(container.querySelectorAll<HTMLElement>('col')).toHaveLength(3)
    expect(container.querySelector<HTMLElement>('col:nth-child(3)')?.style.width).toBe(
      '320px',
    )
  })

  it('applies the post-hide viewport in the same update after the table is shown again', async () => {
    const { container, rerender } = render(
      <div>
        <Table<RowData>
          rowKey="id"
          pagination={false}
          columnResize={{ defaultWidths: { id: 120, name: 160 } }}
          columns={columns}
          dataSource={data}
        />
      </div>,
    )

    rerender(
      <div style={{ display: 'none' }}>
        <Table<RowData>
          rowKey="id"
          pagination={false}
          columnResize={{ defaultWidths: { id: 120, name: 160 } }}
          columns={columns}
          dataSource={data}
        />
      </div>,
    )
    mockTableBoxWidth(0)
    await flushObservedTableResize(container)

    rerender(
      <div>
        <Table<RowData>
          rowKey="id"
          pagination={false}
          columnResize={{ defaultWidths: { id: 120, name: 160 } }}
          columns={columns}
          dataSource={data}
        />
      </div>,
    )
    mockTableBoxWidth(800)
    const table = container.querySelector<HTMLElement>('.ant-table')
    const content = container.querySelector<HTMLElement>('.ant-table-content')
    setElementSize(table, 'offsetWidth', 800)
    setElementSize(content, 'offsetWidth', 800)
    setElementSize(content, 'clientWidth', 800)
    await flushObservedTableResize(container)

    expect(container.querySelectorAll<HTMLElement>('col')).toHaveLength(3)
    expect(container.querySelector<HTMLElement>('col:nth-child(3)')?.style.width).toBe(
      '520px',
    )
  })

  it('applies a new viewport after hide even if no hidden resize event was delivered', async () => {
    const { container, rerender } = render(
      <div>
        <Table<RowData>
          rowKey="id"
          pagination={false}
          columnResize={{ defaultWidths: { id: 120, name: 160 } }}
          columns={columns}
          dataSource={data}
        />
      </div>,
    )

    rerender(
      <div style={{ display: 'none' }}>
        <Table<RowData>
          rowKey="id"
          pagination={false}
          columnResize={{ defaultWidths: { id: 120, name: 160 } }}
          columns={columns}
          dataSource={data}
        />
      </div>,
    )

    rerender(
      <div>
        <Table<RowData>
          rowKey="id"
          pagination={false}
          columnResize={{ defaultWidths: { id: 120, name: 160 } }}
          columns={columns}
          dataSource={data}
        />
      </div>,
    )
    mockTableBoxWidth(800)
    const table = container.querySelector<HTMLElement>('.ant-table')
    const content = container.querySelector<HTMLElement>('.ant-table-content')
    setElementSize(table, 'offsetWidth', 800)
    setElementSize(content, 'offsetWidth', 800)
    setElementSize(content, 'clientWidth', 800)
    await flushObservedTableResize(container)

    expect(container.querySelectorAll<HTMLElement>('col')).toHaveLength(3)
    expect(container.querySelector<HTMLElement>('col:nth-child(3)')?.style.width).toBe(
      '520px',
    )
  })

  it('applies a new viewport after ancestor display is restored without a resize event', async () => {
    const { container, rerender } = render(
      <div>
        <Table<RowData>
          rowKey="id"
          pagination={false}
          columnResize={{ defaultWidths: { id: 120, name: 160 } }}
          columns={columns}
          dataSource={data}
        />
      </div>,
    )

    rerender(
      <div style={{ display: 'none' }}>
        <Table<RowData>
          rowKey="id"
          pagination={false}
          columnResize={{ defaultWidths: { id: 120, name: 160 } }}
          columns={columns}
          dataSource={data}
        />
      </div>,
    )

    mockTableBoxWidth(800)
    const table = container.querySelector<HTMLElement>('.ant-table')
    const content = container.querySelector<HTMLElement>('.ant-table-content')
    setElementSize(table, 'offsetWidth', 800)
    setElementSize(content, 'offsetWidth', 800)
    setElementSize(content, 'clientWidth', 800)

    rerender(
      <div>
        <Table<RowData>
          rowKey="id"
          pagination={false}
          columnResize={{ defaultWidths: { id: 120, name: 160 } }}
          columns={columns}
          dataSource={data}
        />
      </div>,
    )

    await act(async () => {
      await Promise.resolve()
    })

    expect(container.querySelectorAll<HTMLElement>('col')).toHaveLength(3)
    expect(container.querySelector<HTMLElement>('col:nth-child(3)')?.style.width).toBe(
      '520px',
    )
  })

  it('still removes the column resize filler when a visible viewport shrinks below the column sum', async () => {
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        columnResize={{ defaultWidths: { id: 120, name: 160 } }}
        columns={columns}
        dataSource={data}
      />,
    )

    expect(container.querySelectorAll<HTMLElement>('col')).toHaveLength(3)

    mockTableBoxWidth(200)
    const table = container.querySelector<HTMLElement>('.ant-table')
    const content = container.querySelector<HTMLElement>('.ant-table-content')
    setElementSize(table, 'offsetWidth', 200)
    setElementSize(content, 'offsetWidth', 200)
    setElementSize(content, 'clientWidth', 200)
    await flushObservedTableResize(container)

    expect(container.querySelector('.ant-table-cell-resize-filler')).toBeNull()
    expect(container.querySelectorAll<HTMLElement>('col')).toHaveLength(2)
  })

  it('derives a non-virtual fill body height from the owned layout nodes', () => {
    vi.useFakeTimers()
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        height={480}
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
    expect((wrapper as HTMLElement | null)?.style.height).toBe('480px')
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
        height="100%"
        virtual
        columns={columns}
        dataSource={virtualData}
        pagination={false}
        scroll={{ x: 600 }}
      />,
    )

    const wrapper = container.querySelector('.ant-table-wrapper')
    expect((wrapper as HTMLElement | null)?.style.height).toBe('100%')
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

  it('does not fall back to a 500px virtual body before fill height is measured', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const virtualData = Array.from({ length: 100 }, (_, index) => ({
      id: index,
      name: `Row ${index}`,
    }))
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        height="100%"
        virtual
        columns={columns}
        dataSource={virtualData}
        pagination={false}
        scroll={{ x: 600 }}
      />,
    )

    const holder = container.querySelector<HTMLElement>(
      '.ant-table-tbody-virtual-holder',
    )

    expect(holder).not.toBeNull()
    expect(holder?.style.height).not.toBe('500px')
    expect(
      errorSpy.mock.calls
        .flat()
        .map((item) => String(item))
        .join('\n'),
    ).not.toContain('`scroll.y` in virtual table must be number')
  })

  it('keeps the last valid fill height when the root collapses to 0', () => {
    vi.useFakeTimers()
    const virtualData = Array.from({ length: 100 }, (_, index) => ({
      id: index,
      name: `Row ${index}`,
    }))
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        height={320}
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

    const holder = container.querySelector<HTMLElement>(
      '.ant-table-tbody-virtual-holder',
    )!
    expect(holder.style.height).toBe('264px')

    setElementSize(wrapper, 'clientHeight', 0)
    flushResizeObservers()
    act(() => vi.runOnlyPendingTimers())

    expect(holder.style.height).toBe('264px')
  })

  it('uses the AntD 6.6.4 native body for non-virtual scrolling', () => {
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        scroll={{ x: 600, y: 120 }}
        columns={columns}
        dataSource={data}
      />,
    )

    const body = container.querySelector<HTMLElement>('.ant-table-body')!

    expect(container.querySelector('.ant-table-body-scroll-area')).toBeNull()
    expect(container.querySelector('.ant-scroll-area')).toBeNull()
    expect(body.parentElement?.classList.contains('ant-table-container')).toBe(true)
    expect(body.style.overflowX).toBe('auto')
    expect(body.style.overflowY).toBe('scroll')
    expect(body.style.maxHeight).toBe('120px')
  })

  it('uses the measured thin scrollbar for the native body and header gutter', () => {
    mockScrollbarProbe()

    const { container, rerender } = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        scroll={{ x: 600, y: 120 }}
        columns={columns}
        dataSource={data}
      />,
    )

    const body = () => container.querySelector<HTMLElement>('.ant-table-body')!

    expect(body().style.scrollbarWidth).toBe('')
    expect(container.querySelectorAll('.ant-table-cell-scrollbar')).toHaveLength(1)

    rerender(
      <Table<RowData>
        thinScrollbar
        rowKey="id"
        pagination={false}
        scroll={{ x: 600, y: 120 }}
        columns={columns}
        dataSource={data}
      />,
    )

    expect(body().style.scrollbarWidth).toBe('thin')
    expect(container.querySelectorAll('.ant-table-cell-scrollbar')).toHaveLength(1)
  })

  it('thins the horizontal scrollbar on the native content node', () => {
    const { container } = render(
      <Table<RowData>
        thinScrollbar
        rowKey="id"
        pagination={false}
        scroll={{ x: 600 }}
        columns={columns}
        dataSource={data}
      />,
    )

    expect(container.querySelector<HTMLElement>('.ant-table-content')?.style.scrollbarWidth).toBe(
      'thin',
    )
    expect(container.querySelector('.ant-table-body')).toBeNull()
  })

  it('sizes the sticky horizontal bar from the measured thin scrollbar', async () => {
    mockScrollbarProbe()
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function getOffsetHeight(
      this: HTMLElement,
    ) {
      if (this.id.startsWith('rc-scrollbar-measure-')) {
        return 100
      }
      return this.classList.contains('ant-table-body') ? 4000 : 40
    })
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function getScrollWidth(
      this: HTMLElement,
    ) {
      return this.classList.contains('ant-table-body') ? 800 : 0
    })
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function getClientWidth(
      this: HTMLElement,
    ) {
      if (this.id.startsWith('rc-scrollbar-measure-')) {
        return this.style.scrollbarWidth === 'thin' ? 92 : 83
      }
      return this.classList.contains('ant-table-body') ? 200 : 150
    })
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function getRect(
      this: HTMLElement,
    ) {
      if (this.classList.contains('ant-table-body')) {
        return {
          x: 0,
          y: 100,
          width: 600,
          height: 4000,
          top: 100,
          left: 0,
          right: 600,
          bottom: 4100,
          toJSON: () => ({}),
        }
      }
      return {
        x: 0,
        y: 0,
        width: 150,
        height: 40,
        top: 0,
        left: 0,
        right: 150,
        bottom: 40,
        toJSON: () => ({}),
      }
    })

    const { container, rerender } = render(
      <Table<RowData>
        sticky
        rowKey="id"
        pagination={false}
        scroll={{ x: 800, y: 120 }}
        columns={columns}
        dataSource={data}
      />,
    )

    const flushFrame = async () => {
      await act(async () => {
        await new Promise((resolve) => {
          requestAnimationFrame(() => resolve(undefined))
        })
      })
    }

    await flushFrame()

    const track = () => container.querySelector<HTMLElement>('.ant-table-sticky-scroll')
    const thumb = () => container.querySelector<HTMLElement>('.ant-table-sticky-scroll-bar')

    expect(track()?.style.getPropertyPriority('height')).toBe('')

    rerender(
      <Table<RowData>
        thinScrollbar
        sticky
        rowKey="id"
        pagination={false}
        scroll={{ x: 800, y: 120 }}
        columns={columns}
        dataSource={data}
      />,
    )
    await flushFrame()

    expect(track()?.style.height).toBe('8px')
    expect(track()?.style.getPropertyPriority('height')).toBe('important')
    expect(thumb()?.style.height).toBe('8px')
  })

  it('keeps column resize on the same measured gutter as a normal thin table', () => {
    mockScrollbarProbe()

    const { container, rerender } = render(
      <Table<RowData>
        rowKey="id"
        pagination={false}
        columnResize
        scroll={{ y: 120 }}
        columns={columns}
        dataSource={data}
      />,
    )

    const gutterWidth = () => {
      const cols = container.querySelectorAll<HTMLElement>('.ant-table-header col')
      return cols[cols.length - 1]?.style.width
    }

    expect(container.querySelector<HTMLElement>('.ant-table-body')?.style.scrollbarWidth).toBe('')
    expect(gutterWidth()).toBe('17px')

    rerender(
      <Table<RowData>
        thinScrollbar
        rowKey="id"
        pagination={false}
        columnResize
        scroll={{ y: 120 }}
        columns={columns}
        dataSource={data}
      />,
    )

    expect(container.querySelector<HTMLElement>('.ant-table-body')?.style.scrollbarWidth).toBe(
      'thin',
    )
    expect(gutterWidth()).toBe('8px')
  })

  it('ignores thinScrollbar on virtual tables', () => {
    const virtualData = Array.from({ length: 20 }, (_, index) => ({
      id: index,
      name: `Row ${index}`,
    }))
    const { container } = render(
      <Table<RowData>
        thinScrollbar
        virtual
        rowKey="id"
        pagination={false}
        scroll={{ x: 600, y: 120 }}
        columns={columns}
        dataSource={virtualData}
      />,
    )

    const holder = container.querySelector<HTMLElement>('.ant-table-tbody-virtual-holder')
    expect(holder).not.toBeNull()
    expect(holder?.style.scrollbarWidth ?? '').toBe('')
    expect(container.querySelector('.ant-table-cell-scrollbar')).toBeNull()
    expect(container.querySelector<HTMLElement>('.ant-table-body')?.style.scrollbarWidth ?? '').toBe(
      '',
    )
    expect(
      container.querySelector<HTMLElement>('.ant-table-tbody-virtual-scrollbar')?.style.scrollbarWidth ??
        '',
    ).toBe('')
  })

  it('keeps column resize and row highlight on the native AntD content node', () => {
    const { container } = render(
      <Table<RowData>
        rowKey="id"
        bordered
        pagination={false}
        columnResize
        rowHighlight
        columns={columns}
        dataSource={data}
      />,
    )

    const content = container.querySelector<HTMLElement>('.ant-table-content')!
    const bodyCell = content.querySelector<HTMLElement>('.ant-table-tbody td')!
    const highlightedRow = content.querySelector<HTMLElement>('[data-row-key="1"]')!

    expect(container.querySelector('.ant-table-content-scroll-area')).toBeNull()
    expect(content.parentElement?.classList.contains('ant-table-container')).toBe(true)
    expect(content.style.overflowX).toBe('auto')
    expect(content.querySelector('table')?.style.minWidth).toBe('100%')
    expect(bodyCell.classList.contains('ant-table-cell')).toBe(true)
    expect(container.querySelector('.ant-table-cell-resize-handle')).not.toBeNull()
    fireEvent.click(highlightedRow)
    expect(highlightedRow.classList.contains('ant-table-row-current')).toBe(true)
  })

  it('keeps virtual tables on rc-table 1.11.1 VirtualList semantics', () => {
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

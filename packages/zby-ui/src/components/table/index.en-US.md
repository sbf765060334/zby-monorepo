---
category: Components
group: Data Display
title: Table
description: Ant Design 6.6.4 and rc-table 1.11.1 with Shuzhi Table extension semantics.
---

## Baseline

Table preserves the upstream behavior and fixes from Ant Design 6.6.4 and `@rc-component/table@1.11.1`, then adds Shuzhi column enhancement, column resizing, fill height, and virtual `rowSpan` semantics.

- Normal scroll tables use the native AntD 6.6.4/rc-table 1.11.1 scroll container.
- Virtual tables retain the rc-table 1.11.1 VirtualList viewport, scrollbar, `scrollTo`, and row measurement model.
- Columns are not virtualized horizontally.
- Without an extension enabled, layout and scrolling stay on the AntD 6.6.4 path.

## Column Enhancement

```tsx
import { Table } from '@zby/ui'
import type { TableColumnsType } from '@zby/ui'

const columns: TableColumnsType<Order> = [
  {
    title: 'Order',
    dataIndex: 'orderNo',
    tooltip: 'Unique order identifier',
    renderText: (value) => `Order: ${value}`,
    copyable: true,
    ellipsis: { rows: 2 },
  },
]
```

When a column has no explicit `render`, Table applies the Shuzhi behavior:

- `tooltip` adds a Tooltip to the header title;
- `renderText` transforms the displayed value;
- `copyable` uses ActionText and reveals its action on table-row hover;
- `ellipsis.rows` and `ellipsis.tooltip` use ActionText multi-line ellipsis.

An explicit `render` always wins. In that case `renderText` is not called and Table does not wrap the result in ActionText.

## Fill Height

```tsx
<div style={{ height: 480, minHeight: 0 }}>
  <Table<Order>
    rowKey="id"
    height="100%"
    columns={columns}
    dataSource={data}
    pagination={{ pageSize: 20 }}
  />
</div>
```

`height` accepts the same numeric and string values as CSS `height`, including `480`, `100%`, `50vh`, and `calc(100vh - 64px)`. When provided, Table applies the value to its root and observes the actual root, header, title, footer, fixed summary, and pagination heights to derive body `scroll.y`. A supplied `scroll.y` is ignored and produces a development warning. Without `height`, native AntD height and `scroll.y` behavior is preserved.

Percentage values and expressions based on percentages require a calculable parent height. Nested flex or grid layouts commonly also require `minHeight: 0`.

## Column Resizing

```tsx
import type { ColumnResizeWidths } from '@zby/ui'

const [widths, setWidths] = useState<ColumnResizeWidths>({
  orderNo: 180,
  customer: 160,
})

<Table<Order>
  rowKey="id"
  columnResize={{
    widths,
    onWidthsChange: setWidths,
    onResizeEnd: (info) => console.log(info.key, info.width),
  }}
  columns={[
    { key: 'orderNo', dataIndex: 'orderNo', width: 180, minWidth: 140 },
    { key: 'customer', dataIndex: 'customer', width: 160, maxWidth: 360 },
  ]}
  dataSource={data}
/>
```

`columnResize` accepts `boolean | ColumnResizeConfig<T>`. When enabled:

- The default column width is 160px and the default minimum is 80px.
- Numbers and `px` strings are normalized to integer pixels.
- The selection column follows `rowSelection.columnWidth` or the Table token and defaults to `controlHeight`. The expand column falls back to 48px without an explicit width. Neither can be resized.
- Only leaves with a stable `key` or stringifiable `dataIndex` expose a handle.
- `resizable={false}` disables an individual leaf.
- Dragging changes only the active leaf and reports through `onResize`, `onWidthsChange`, and `onResizeEnd`.
- A filler represents unused viewport width. It is inserted before the first fixed-end leaf.
- When business columns overflow, the filler is removed and horizontal scrolling is enabled.

### ColumnResizeConfig

| Field | Type | Description |
| --- | --- | --- |
| defaultWidth | `number` | Default width for a column without one |
| minWidth | `number` | Global minimum resize width |
| maxWidth | `number` | Global maximum resize width |
| widths | `ColumnResizeWidths` | Controlled width map |
| defaultWidths | `ColumnResizeWidths` | Initial uncontrolled width map |
| onWidthsChange | `(widths, info) => void` | Width-map change callback |
| onResize | `(info) => void` | Called during dragging |
| onResizeEnd | `(info) => void` | Called when dragging ends |

`ColumnResizeInfo<T>` contains `key`, `width`, `previousWidth`, `delta`, `widths`, `column`, and `nativeEvent`.

## Virtual Tables

```tsx
<Table<Order>
  rowKey="id"
  virtual
  scroll={{ x: 1280, y: 480 }}
  columns={columns}
  dataSource={largeData}
  pagination={false}
/>
```

Virtual mode uses rc-table 1.11.1 VirtualList, rendering rows around the viewport and measuring their actual heights. Shuzhi compensation keeps a `rowSpan` origin rendered after it leaves the normal visible range and clamps spans that extend beyond the data tail.

`height` can be combined with `virtual`; the measured remaining height is passed to VirtualList as numeric `scroll.y`. A virtual table without `height` should provide numeric `scroll.y` as required by AntD.

Table does not interpret KeepAlive, Tabs, or other application activity state and does not cache the last valid height. When an ancestor uses `display: none`, the browser reports an actual height of zero and Table derives a zero body height. Applications that need to preserve virtual scrolling must choose a layout-preserving hiding strategy, or omit `height` and control a stable `scroll.y` themselves.

## Additional Table Props

All other props follow AntD 6.6.4 Table.

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| height | `React.CSSProperties['height']` | - | Total Table height; derives body height and ignores `scroll.y` when provided |
| columnResize | `boolean | ColumnResizeConfig<T>` | `false` | Enable the Shuzhi numeric width model |
| rowHighlight | `boolean | TableRowHighlight<T>` | `false` | Enable ZBY current-row highlighting; click again to clear |

`rowHighlight` is a ZBY extension independent of AntD `rowSelection`. Pass `true` for uncontrolled highlighting. Passing an object selects controlled mode and requires `currentRowKey`; `onChange` receives the current key and record, or `(null, null)` when cleared. The application's `onRow().onClick` runs first and can cancel the highlight change with `event.preventDefault()`.

## Column Extensions

| Field | Type | Description |
| --- | --- | --- |
| tooltip | `ReactNode | TooltipProps` | Header title tooltip |
| renderText | `(value, record, index) => ReactNode` | Transform text when no explicit render exists |
| copyable | `TableColumnCopyable<T>` | Add a copy action when no explicit render exists; see below |
| ellipsis | `boolean | { showTitle?, rows?, tooltip? }` | Native single-line or ActionText multi-line ellipsis |
| minWidth | `number` | Auto-layout minimum; resize lower bound in resize mode |
| maxWidth | `number` | Resize upper bound |
| resizable | `boolean` | Whether the current leaf is resizable |

### copyable

```ts
type TableColumnCopyText<RecordType> =
  | string
  | number
  | ((
      value: unknown,
      record: RecordType,
      index: number,
    ) => string | number | null | undefined)

type TableColumnCopyable<RecordType> =
  | boolean
  | {
      text?: TableColumnCopyText<RecordType>
      onCopy?: (event?: React.MouseEvent<HTMLButtonElement>) => void
      icon?: React.ReactNode
      tooltips?: string | readonly [string?, string?] | false
      format?: 'text/plain' | 'text/html'
      tabIndex?: number
    }
```

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| text | `string | number | (value, record, index) => string | number | null | undefined` | Displayed cell text | Copy content; the function receives the raw value, current record, and row index during cell rendering |
| onCopy | `(event?) => void` | - | Called after the browser successfully writes to the clipboard |
| icon | `ReactNode` | Built-in copy and success icons | One icon, or two icons representing the states before and after copying |
| tooltips | `string | [before?, after?] | false` | Built-in before/after messages | One message, two messages for before and after copying, or `false` to disable messages |
| format | `'text/plain' | 'text/html'` | `'text/plain'` | Clipboard data format |
| tabIndex | `number` | - | Keyboard Tab order for the copy button |

```tsx
const columns: TableColumnsType<Order> = [
  {
    title: 'Order',
    dataIndex: 'orderNo',
    // Copy the displayed text after renderText has transformed it
    copyable: true,
  },
  {
    title: 'Fixed content',
    dataIndex: 'status',
    copyable: { text: 'Approved' },
  },
  {
    title: 'Amount',
    dataIndex: 'amount',
    copyable: {
      text: (value, record, index) => `${index + 1}-${record.currency} ${value}`,
      tooltips: ['Copy amount', 'Copied'],
      onCopy: () => console.log('Amount copied'),
    },
  },
]
```

With `copyable={true}`, the default copy content is the displayed value after `renderText` processing. Object form without `text` uses the same default. The `value` received by a `text` function is the raw cell value addressed by `dataIndex`, not the `renderText` result. Returning `null` or `undefined` falls back to ActionText's default content extraction.

When a column provides an explicit `render`, Table does not wrap its result in ActionText and `copyable` has no effect. Use `ActionText` directly when a custom render result needs a copy action.

Public types include `TableColumnCopyable`, `TableColumnCopyText`, `ColumnResizeConfig`, `ColumnResizeInfo`, and `ColumnResizeWidths`.

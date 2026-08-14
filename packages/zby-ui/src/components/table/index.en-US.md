---
category: Components
group: Data Display
title: Table
description: Ant Design 6.5.3 and rc-table 1.10.4 with Shuzhi Table extension semantics.
---

## Baseline

Table preserves the upstream behavior and fixes from Ant Design 6.5.3 and `@rc-component/table@1.10.4`, then adds Shuzhi column enhancement, column resizing, fill height, and virtual `rowSpan` semantics.

- Normal scroll tables use the native AntD 6.5.3/rc-table 1.10.4 scroll container.
- Virtual tables retain the rc-table 1.10.4 VirtualList viewport, scrollbar, `scrollTo`, and row measurement model.
- Columns are not virtualized horizontally.
- Without an extension enabled, layout and scrolling stay on the AntD 6.5.3 path.

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
    heightMode="fill"
    columns={columns}
    dataSource={data}
    pagination={{ pageSize: 20 }}
  />
</div>
```

`heightMode` is `content | fill` and defaults to `content`. Fill mode observes the root, header, title, footer, fixed summary, and pagination, then derives body `scroll.y` from the remaining height. A supplied `scroll.y` is ignored and produces a development warning.

The parent must provide a calculable height. Nested flex or grid layouts commonly also require `minHeight: 0`.

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
- Selection and expand columns are fixed at 48px and cannot be resized.
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

Virtual mode uses rc-table 1.10.4 VirtualList, rendering rows around the viewport and measuring their actual heights. Shuzhi compensation keeps a `rowSpan` origin rendered after it leaves the normal visible range and clamps spans that extend beyond the data tail.

`heightMode="fill"` can be combined with `virtual`; the measured remaining height is passed to VirtualList. A non-fill virtual table should provide numeric `scroll.y`.

When a fill table is inside KeepAlive, Tabs, or another container that hides its layout, pass the container activity state through `layoutActive`. While `false`, Table pauses fill measurement and keeps the last valid height; switching back to `true` schedules a fresh measurement. The default is `true`.

## Additional Table Props

All other props follow AntD 6.5.3 Table.

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| heightMode | `content | fill` | `content` | Use content height or fill the parent |
| layoutActive | `boolean` | `true` | Control fill layout measurement and freeze the last valid height while inactive |
| columnResize | `boolean | ColumnResizeConfig<T>` | `false` | Enable the Shuzhi numeric width model |
| rowHighlight | `boolean | TableRowHighlight<T>` | `false` | Enable ZBY current-row highlighting; click again to clear |

`rowHighlight` is a ZBY extension independent of AntD `rowSelection`. Pass `true` for uncontrolled highlighting. Passing an object selects controlled mode and requires `currentRowKey`; `onChange` receives the current key and record, or `(null, null)` when cleared. The application's `onRow().onClick` runs first and can cancel the highlight change with `event.preventDefault()`.

## Column Extensions

| Field | Type | Description |
| --- | --- | --- |
| tooltip | `ReactNode | TooltipProps` | Header title tooltip |
| renderText | `(value, record, index) => ReactNode` | Transform text when no explicit render exists |
| copyable | `boolean | object` | Add a copy action when no explicit render exists |
| ellipsis | `boolean | { showTitle?, rows?, tooltip? }` | Native single-line or ActionText multi-line ellipsis |
| minWidth | `number` | Auto-layout minimum; resize lower bound in resize mode |
| maxWidth | `number` | Resize upper bound |
| resizable | `boolean` | Whether the current leaf is resizable |

Public resize types are `ColumnResizeConfig`, `ColumnResizeInfo`, and `ColumnResizeWidths`.

---
category: Components
group: Data Display
title: Table
description: A source-level fork of Ant Design 6.5.3 Table with fill height, live column resizing, current-row highlighting, and vertical virtualization.
---

## When To Use

Table keeps the upper-level features of antd 6.5.3 Table, including custom cells, sorting, filtering, pagination, expansion, selection, and fixed columns. Use this fork when you also need:

- A table that consumes the remaining parent height while preserving the full header, body, and pagination layout for short data sets;
- Column resizing constrained by `minWidth` and `maxWidth`;
- Fixed-width resizing with explicit filler space and horizontal overflow;
- Click-to-toggle current-row highlighting for data investigation;
- Vertical row virtualization with a visible scrollbar, fill layout, and normal horizontal scrolling.

This version does not include ActionText and does not virtualize columns. Tables with explicit scrolling, fill layout, virtualization, or column resizing share one native viewport and the zby ScrollArea visual treatment. A basic table without scrolling preserves the upstream AntD auto-layout path. `scrollAreaProps` exposes only the supported visibility strategy and hide delay, not arbitrary internal ScrollArea props.

## Usage

### Custom cells

```tsx
import { Table } from '@zby/ui'
import type { TableColumnsType } from '@zby/ui'
import { Tag } from 'antd'

interface Order {
  id: number
  orderNo: string
  status: 'pending' | 'done'
  amount: number
}

const columns: TableColumnsType<Order> = [
  { title: 'Order', dataIndex: 'orderNo', width: 180 },
  {
    title: 'Status',
    dataIndex: 'status',
    width: 120,
    render: (status) => <Tag color={status === 'done' ? 'success' : 'warning'}>{status}</Tag>,
  },
  {
    title: 'Amount',
    dataIndex: 'amount',
    width: 140,
    align: 'right',
    render: (amount) => `$ ${amount.toLocaleString()}`,
    onCell: (record) => ({ title: record.orderNo }),
  },
]

export default () => (
  <Table<Order> rowKey="id" columns={columns} dataSource={data} />
)
```

Columns retain antd features such as `render`, `onCell`, `shouldCellUpdate`, `ellipsis`, sorting, and filtering. No additional formatter protocol is introduced; render any React node directly.

### Filling the parent

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

`heightMode="fill"` makes the Table root, antd wrapper, loading container, body, and pagination participate in one vertical flex layout. The body absorbs remaining height and pagination stays at the bottom. Short data sets leave real body space instead of inserting fake rows.

The parent must provide a calculable height. Add `minHeight: 0` where needed in nested flex or grid layouts so the browser can create an internal scrolling region.

### Fixed-width column resizing

```tsx
const columns: TableColumnsType<Order> = [
  {
    key: 'orderNo',
    title: 'Order',
    dataIndex: 'orderNo',
    width: 180,
    minWidth: 140,
    maxWidth: 260,
  },
  {
    key: 'customer',
    title: 'Customer',
    dataIndex: 'customer',
    width: 160,
    minWidth: 120,
    maxWidth: 360,
  },
]

<Table<Order>
  rowKey="id"
  enableColumnResizing
  columns={columns}
  dataSource={data}
  onColumnWidthChange={({ columnKey, width }) => console.log(columnKey, width)}
/>
```

Dragging updates the real column width in animation-frame batches, so the table stays in sync with the pointer. The width is always clamped to `minWidth`/`maxWidth`. The separator also supports arrow keys: 10px per press, or 1px while Shift is held.

With resizing enabled, every business leaf uses an integer pixel width. An ordinary column without an explicit width defaults to `160px`. Resizing changes only the active leaf; other business columns never grow or shrink to compensate. When the business total is at least `2px` narrower than the viewport, Table inserts a non-resizable filler column for the remainder. A difference within `±1px` is treated as fitted, and the table scrolls horizontally when the business total is at least `2px` wider than the viewport.

Resizing mode does not insert a layout gutter after the final business column. The final handle uses a transparent hit area inside its header cell. The filler is mounted only while remaining space exists, uses Table's standard header divider, and never renders a resize handle. It is removed from the column structure in fitted and overflow states. With fixed-end columns, the top sticky boundary cell owns the fixed-region border instead of relying on a filler border that could be covered.

With `enableColumnResizing`, Table forces `tableLayout="fixed"` and normalizes business widths to integer pixels before layout, so the header, body, filler, and scrolling use the same numeric model. An explicit `tableLayout="auto"` is ignored with a development warning. Without resizing, Table does not resolve enhanced widths or insert a filler; column sizing and `tableLayout` remain on the AntD 6.5.3 path.

### Toggle current-row highlighting

```tsx
<Table<Order>
  rowKey="id"
  columns={columns}
  dataSource={data}
  rowHighlight={{
    defaultCurrentRowKey: 2,
    onChange: (key, row) => console.log(key, row),
  }}
/>
```

Following the antd `rowSelection` configuration-object pattern, the presence of `rowHighlight` enables the feature. Clicking the current row clears it and calls `onChange(null, null)`.

For controlled state:

```tsx
const [currentRowKey, setCurrentRowKey] = useState<React.Key | null>(null)

<Table<Order>
  rowKey="id"
  rowHighlight={{
    currentRowKey,
    onChange: (key) => setCurrentRowKey(key),
  }}
  rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
  columns={columns}
  dataSource={data}
/>
```

Current-row highlighting and `rowSelection` are independent and can coexist. The application's `onRow().onClick` runs first; calling `event.preventDefault()` there cancels the highlight change.

### Vertical virtualization

```tsx
<div style={{ height: 560, minHeight: 0 }}>
  <Table<Order>
    rowKey="id"
    heightMode="fill"
    virtual
    scroll={{ x: 1280 }}
    columns={wideColumns}
    dataSource={largeData}
    pagination={false}
  />
</div>
```

Virtual mode renders rows around the viewport and measures actual row heights. It shares the same viewport and scrollbar implementation as normal mode and does not mount a VirtualList scrollbar.

Horizontal movement remains available as normal browser `scrollLeft` on that viewport; columns are not virtualized. On the native sizing path, a numeric `scroll.x` matching the desired wide-table width is recommended. With resizing enabled, the sum of current business-column widths determines overflow and numeric `scroll.x` does not stretch the filler. For a non-fill virtual table, provide `scroll.y`; otherwise the internal default is 500px.

## Additional Table Props

All other properties come from antd 6.5.3 `TableProps`.

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| heightMode | Height strategy; fill consumes a parent with a definite height | `auto \| fill` | `auto` |
| scrollAreaProps | Safe display settings for the internal ScrollArea | `TableScrollAreaProps` | - |
| enableColumnResizing | Enable live column resizing and force `tableLayout="fixed"` | `boolean` | `false` |
| onColumnWidthChange | Called while pointer or keyboard resizing changes a column width | `(info: TableColumnWidthChangeInfo<T>) => void` | - |
| rowHighlight | Current-row configuration; presence enables the behavior | `TableRowHighlight<T>` | - |

`heightMode="fill"` only makes the table consume the parent's remaining height. It does not isolate vertical scrolling: when the body has no overflow or reaches a vertical boundary, wheel input can continue to an outer page scroller.

### TableScrollAreaProps

Table exposes only ScrollArea settings that cannot break header synchronization or virtualization. Direction, viewport refs, `onScroll`, and content sizing remain internally controlled. These settings apply when Table mounts the shared ScrollArea: `heightMode="fill"`, virtual tables, or tables with `scroll.x`/`scroll.y`.

| Field | Description | Type | Default |
| --- | --- | --- | --- |
| scrollbar | Scrollbar implementation and visibility strategy | `ScrollAreaScrollbar` | `hover` |
| scrollHideDelay | Delay before hover or scrolling scrollbars hide after interaction, in ms | `number` | `200` |

### TableRowHighlight

| Field | Description | Type | Default |
| --- | --- | --- | --- |
| currentRowKey | Controlled current key; `null` means no current row | `React.Key \| null` | - |
| defaultCurrentRowKey | Initial key in uncontrolled mode | `React.Key \| null` | `null` |
| onChange | Called when the current row changes or is cleared | `(key: React.Key \| null, row: T \| null) => void` | - |

### TableColumnWidthChangeInfo

| Field | Description | Type |
| --- | --- | --- |
| columnKey | Key of the resized leaf column | `React.Key` |
| width | Committed pixel width after min/max clamping | `number` |
| column | Original column configuration | `TableColumnType<T> \| TableColumnGroupType<T>` |

## Column Extensions

`TableColumnType` and `TableColumnGroupType` add these fields to the antd column configuration:

| Field | Description | Type | Default |
| --- | --- | --- | --- |
| width | Optional base width in pixels; when omitted, basic tables preserve AntD auto sizing | `number` | - |
| minWidth | Minimum resized width in pixels | `number` | `50` |
| maxWidth | Maximum resized width in pixels | `number` | `Infinity` |
| resizable | Whether this leaf can resize when global resizing is enabled | `boolean` | `true` |

Column groups do not receive resize handles; sizing operates on visible leaf columns. The internal filler is never placed after fixed-end columns and exists only while the remaining space is greater than `1px`.

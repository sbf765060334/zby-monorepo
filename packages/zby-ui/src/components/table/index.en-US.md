---
category: Components
group: Data Display
title: Table
description: A controlled fork of antd Table with fill height, commit-on-release resizing, current-row highlighting, and vertical virtualization.
---

## When To Use

Table keeps the upper-level features of antd 6.5.3 Table, including custom cells, sorting, filtering, pagination, expansion, selection, and fixed columns. Use this fork when you also need:

- A table that consumes the remaining parent height while preserving the full header, body, and pagination layout for short data sets;
- Column resizing constrained by `minWidth` and `maxWidth`;
- Data Grid-style columns that absorb unused container width without a synthetic filler column;
- Click-to-toggle current-row highlighting for data investigation;
- Vertical row virtualization with a visible scrollbar, fill layout, and normal horizontal scrolling.

This version does not include ActionText and does not virtualize columns. Virtual and non-virtual bodies share one native scroll viewport and the zby ScrollArea visual treatment. Table intentionally exposes no scrollbar styling props.

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

### Resizing and flex columns

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
    flex: 1,
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

Dragging moves only a dashed guide. The real width is committed once on pointer release and is always clamped to `minWidth`/`maxWidth`. The separator also supports arrow keys: 10px per press, or 1px while Shift is held.

`flex` follows the fixed-width-plus-remaining-space model used by mainstream Data Grids:

- Start with the base width of every visible leaf column;
- Distribute remaining container width among unmodified flex columns by weight;
- If no explicit flex column exists, use the last eligible regular column as an implicit flex column;
- Remove a manually resized flex column from the flex pool so it does not snap back after release;
- Never create filler `<th>` or `<td>` elements.

If every expandable column reaches `maxWidth`, strict maximums and full container coverage cannot both be satisfied. The component preserves column constraints and leaves the mathematically unavoidable body space.

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

Horizontal movement remains available as normal browser `scrollLeft` on that viewport; columns are not virtualized. A numeric `scroll.x` matching the desired wide-table width is recommended. For a non-fill virtual table, provide `scroll.y`; otherwise the internal default is 500px.

## Additional Table Props

All other properties come from antd 6.5.3 `TableProps`.

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| heightMode | Height strategy; fill consumes a parent with a definite height | `auto \| fill` | `auto` |
| enableColumnResizing | Show resize handles on eligible leaf columns | `boolean` | `false` |
| onColumnWidthChange | Called once after pointer release or a keyboard resize | `(info: TableColumnWidthChangeInfo<T>) => void` | - |
| rowHighlight | Current-row configuration; presence enables the behavior | `TableRowHighlight<T>` | - |

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
| width | Base width in pixels | `number` | `120` |
| minWidth | Minimum committed width in pixels | `number` | `50` |
| maxWidth | Maximum committed width in pixels | `number` | `Infinity` |
| flex | Weight used to receive remaining container width; non-positive values are ignored | `number` | - |
| resizable | Whether this leaf can resize when global resizing is enabled | `boolean` | `true` |

Fixed columns do not participate in flex growth. Column groups do not receive resize handles; sizing operates on visible leaf columns.

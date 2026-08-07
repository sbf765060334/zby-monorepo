---
category: Components
group: 数据展示
title: Table
subtitle: 表格
description: 基于 Ant Design 6.5.3 Table 源码 fork，增加高度填充、提交式列宽拖拽、行高亮和纵向虚拟化。
---

## 何时使用

Table 保留 antd 6.5.3 Table 的列渲染、排序、筛选、分页、展开、选择和固定列等上层能力，并补充以下数据密集场景：

- 表格需要填满页面剩余高度，数据较少时也要保持完整的表头、表体和分页布局；
- 用户需要拖动表头调整列宽，并通过 `minWidth`、`maxWidth` 约束可调范围；
- 开启列宽拖拽后，业务列保持固定像素宽度，剩余空间由明确的 filler 表示；
- 追查数据时，需要点击一行标记为当前行，再次点击同一行取消；
- 大数据表需要纵向虚拟化，同时保留可见滚动条、fill 布局和普通横向滚动。

本次实现不包含 ActionText，也不进行横向列虚拟化。显式滚动、fill、虚拟模式或列宽拖拽复用组件内部的同一个原生滚动 viewport，滚动条视觉由 zby ScrollArea 统一提供；未配置滚动的基础表格保留 AntD 上游自动布局路径。`scrollAreaProps` 只暴露支持的可见策略和隐藏延迟，不透传任意内部 ScrollArea 属性。

## 怎么使用

### 基本用法与自定义单元格

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
  { title: '订单号', dataIndex: 'orderNo', width: 180 },
  {
    title: '状态',
    dataIndex: 'status',
    width: 120,
    render: (status) => <Tag color={status === 'done' ? 'success' : 'warning'}>{status}</Tag>,
  },
  {
    title: '金额',
    dataIndex: 'amount',
    width: 140,
    align: 'right',
    render: (amount) => `¥ ${amount.toLocaleString()}`,
    onCell: (record) => ({ title: record.orderNo }),
  },
]

export default () => (
  <Table<Order>
    rowKey="id"
    columns={columns}
    dataSource={data}
  />
)
```

列仍支持 antd 的 `render`、`onCell`、`shouldCellUpdate`、`ellipsis`、排序和筛选等能力。Table 不额外定义格式化协议，业务可以直接返回任意 React 节点。

### 填满父容器

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

`heightMode="fill"` 会让 Table、antd wrapper、loading container、表体和分页共同参与纵向 flex 布局。表体吸收剩余高度，分页保持在容器底部；只有几行数据时不会插入伪数据行，而是保留真实空白表体区域。

父级必须提供可计算的高度，并在嵌套 flex/grid 布局中按需设置 `minHeight: 0`。否则浏览器无法确定“剩余高度”，组件也无法产生内部滚动区域。

### 固定列宽拖拽

```tsx
const columns: TableColumnsType<Order> = [
  {
    key: 'orderNo',
    title: '订单号',
    dataIndex: 'orderNo',
    width: 180,
    minWidth: 140,
    maxWidth: 260,
  },
  {
    key: 'customer',
    title: '客户',
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
  onColumnWidthChange={({ columnKey, width }) => {
    console.log(columnKey, width)
  }}
/>
```

拖动期间只移动贯穿表格的虚线 guide，不修改真实列宽；松开指针后一次性提交最终宽度。拖动值始终被限制在 `minWidth` 和 `maxWidth` 之间。拖拽手柄也支持键盘左右键：默认每次 10px，按住 Shift 时每次 1px。

开启列宽拖拽后，每个业务叶子列都保持真实的像素宽度。拖动只修改当前列，其他业务列不会跟着补偿。业务列总宽小于视口时，Table 用一个不可拖拽的 filler 列表示剩余空间；没有尾部固定列时 filler 位于业务列最后，存在尾部固定列时 filler 位于第一个尾部固定列之前。业务列总宽超过视口时 filler 收缩为 0，表格产生横向滚动。

开启列宽拖拽时，Table 不再为最右侧业务列生成占布局宽度的 gutter。末列手柄使用单元格内侧的透明命中区；`bordered` 模式直接复用表格外边框，零宽 filler 前的独立表头分割线会隐藏。Table 始终保留同一个 filler 节点：存在剩余空间时它承载空白，没有剩余空间时宽度收缩为 0，跨越横向溢出临界点不会替换表头列结构。存在尾部固定列时，filler 仍位于固定列之前，最右侧固定列直接贴合表格边框。

开启 `enableColumnResizing` 时，Table 强制使用 `tableLayout="fixed"`，保证提交宽度、表头、表体、filler 与滚动范围使用同一套数值模型；显式传入 `tableLayout="auto"` 会被忽略，并在开发环境给出警告。未开启时，Table 不进入增强列宽解析、不生成 filler，也不读取持久化列宽，继续使用 AntD 6.5.3 的原生列宽和 `tableLayout` 路径。

### 点击当前行，再次点击取消

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

`rowHighlight` 参考 antd `rowSelection` 的配置对象模式：对象存在即启用，不需要额外的布尔总开关。点击当前行会清除高亮，并以 `(null, null)` 调用 `onChange`。

受控模式使用 `currentRowKey`：

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

当前行高亮与 `rowSelection` 是两套独立状态，可以同时使用。业务 `onRow().onClick` 会先执行；如果该回调调用 `event.preventDefault()`，本次高亮切换会被取消。

### 纵向虚拟化

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

虚拟模式只渲染可视区附近的行，并对实际行高进行测量。它与非虚拟模式使用同一个滚动 viewport 和同一套滚动条，不挂载 VirtualList 自己的滚动条。

横向滚动保留，但它是浏览器在同一 viewport 上执行的普通 `scrollLeft`，不会虚拟化列。原生列宽路径下，`scroll.x` 建议传入与宽表目标宽度一致的数字；开启列宽拖拽后，是否溢出由已提交的业务列总宽决定，数字 `scroll.x` 不会拉宽 filler。非 fill 虚拟表建议提供 `scroll.y`；未提供时默认使用 500px 的内部高度。

## Table 新增 Props

除下表字段外，其余属性继承 antd 6.5.3 `TableProps`。

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| heightMode | 表格高度策略；fill 会填满具有确定高度的父级 | `auto \| fill` | `auto` |
| scrollAreaProps | 内部 ScrollArea 的安全展示配置 | `TableScrollAreaProps` | - |
| enableColumnResizing | 是否允许调整列宽；对象形式会按 storageKey 持久化；开启后强制使用 `tableLayout="fixed"` | `boolean \| TableColumnResizingConfig` | `false` |
| onColumnWidthChange | 指针松开或键盘调整后触发一次 | `(info: TableColumnWidthChangeInfo<T>) => void` | - |
| rowHighlight | 当前行高亮配置；对象存在即启用 | `TableRowHighlight<T>` | - |

`heightMode="fill"` 只决定表格填满父级剩余高度，不隔离纵向滚动。表体没有溢出或已经到达纵向边界时，滚轮可以继续滚动外层页面。

### TableScrollAreaProps

Table 只开放不会破坏表头同步和虚拟滚动的 ScrollArea 配置。`direction`、viewport ref、`onScroll` 和内容尺寸仍由 Table 内部管理。该配置在 Table 挂载共享 ScrollArea 时生效，包括 `heightMode="fill"`、虚拟表格以及设置了 `scroll.x`/`scroll.y` 的表格。

| 字段 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| scrollbar | 滚动条实现与展示策略 | `ScrollAreaScrollbar` | `hover` |
| scrollHideDelay | hover 或 scrolling 滚动条停止交互后的隐藏延迟，单位 ms | `number` | `200` |

### TableColumnResizingConfig

```tsx
<Table enableColumnResizing />

<Table
  enableColumnResizing={{ storageKey: 'transport-order-list' }}
/>
```

布尔形式只在组件内存中保存本次调整。对象形式会把已提交的业务叶子列宽度保存到 `zby-ui:table:column-widths:${storageKey}`；鼠标拖拽在松手时立即写入，连续键盘调整会合并并在停止 200ms 后写入。恢复时会忽略不存在的列、无效数据以及内部辅助列，并重新应用当前列的 min/max 限制。建议为需要持久化的业务列提供稳定的 `column.key`。

### TableRowHighlight

| 字段 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| currentRowKey | 受控的当前行 key；`null` 表示没有高亮行 | `React.Key \| null` | - |
| defaultCurrentRowKey | 非受控模式的初始当前行 key | `React.Key \| null` | `null` |
| onChange | 当前行改变或清除时触发 | `(key: React.Key \| null, row: T \| null) => void` | - |

### TableColumnWidthChangeInfo

| 字段 | 说明 | 类型 |
| --- | --- | --- |
| columnKey | 被调整叶子列的 key | `React.Key` |
| width | 经过 min/max 限制后的提交宽度，单位 px | `number` |
| column | 原始列配置对象 | `TableColumnType<T> \| TableColumnGroupType<T>` |

## 列扩展字段

`TableColumnType` 和 `TableColumnGroupType` 在 antd 列配置上增加以下字段：

| 字段 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| width | 可选基础列宽，单位 px；省略时基础表格保留 AntD 自动列宽 | `number` | - |
| minWidth | 最小提交宽度，单位 px | `number` | `50` |
| maxWidth | 最大提交宽度，单位 px | `number` | `Infinity` |
| resizable | 在全局开启调整后，是否允许当前叶子列调整 | `boolean` | `true` |

列组自身不显示拖拽手柄，拖拽以可见叶子列为单位。filler 不参与持久化，也不会出现在尾部固定列之后；没有剩余空间时仍保留同一个零宽 filler 节点，以稳定表头和滚动布局。

---
category: Components
group: 数据展示
title: Table
subtitle: 表格
description: 以 Ant Design 6.5.3 和 rc-table 1.10.4 为底座，提供 Shuzhi Table 的扩展语义。
---

## 实现基线

Table 保留 Ant Design 6.5.3 与 `@rc-component/table@1.10.4` 的上游行为和修复，并迁移 Shuzhi 的列增强、列宽拖拽、高度填充及虚拟 `rowSpan` 语义。

- 普通滚动表格按 Shuzhi 的挂载条件使用 ZBY ScrollArea。
- 虚拟表格保留 rc-table 1.10.4 的 VirtualList viewport、滚动条、`scrollTo` 与行测量模型。
- 不进行横向列虚拟化。
- 未开启扩展能力时，列布局与滚动行为继续使用 AntD 6.5.3 基线。

## 列增强

```tsx
import { Table } from '@zby/ui'
import type { TableColumnsType } from '@zby/ui'

const columns: TableColumnsType<Order> = [
  {
    title: '订单号',
    dataIndex: 'orderNo',
    tooltip: '业务系统中的唯一订单标识',
    renderText: (value) => `单号：${value}`,
    copyable: true,
    ellipsis: { rows: 2 },
  },
]
```

未提供 `render` 时，Table 会按 Shuzhi 语义处理：

- `tooltip`：为表头增加 Tooltip；
- `renderText`：转换显示文本；
- `copyable`：使用 ActionText 提供复制操作，操作在表格行 hover 时显示；
- `ellipsis.rows` 与 `ellipsis.tooltip`：使用 ActionText 的多行省略和提示。

显式 `render` 始终优先，存在 `render` 时不会执行 `renderText`，也不会自动包裹 ActionText。

## 高度填充

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

`heightMode` 为 `content | fill`，默认 `content`。在 `fill` 模式下，Table 观察自身容器、表头、标题、页脚、固定汇总和分页高度，自动计算 body 的 `scroll.y`。传入的 `scroll.y` 会被忽略并在开发环境给出警告。

父容器必须具有可计算高度；嵌套 flex/grid 容器通常还需要 `minHeight: 0`。

## 列宽拖拽

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

`columnResize` 为 `boolean | ColumnResizeConfig<T>`。开启后：

- 默认列宽为 160px，默认最小宽度为 80px；
- 数字和 `px` 字符串会归一为整数像素；
- selection 与 expand 列固定使用 48px，且不可拖拽；
- 只有具有稳定 `key` 或可字符串化 `dataIndex` 的叶子列显示手柄；
- `resizable={false}` 禁止单列拖拽；
- 拖动只改变当前列，通过 `onResize`、`onWidthsChange` 和 `onResizeEnd` 通知；
- 业务列总宽小于 viewport 时插入 filler；存在 fixed-end 列时 filler 位于第一个 fixed-end 叶子列之前；
- 业务列溢出时移除 filler 并启用横向滚动。

### ColumnResizeConfig

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| defaultWidth | `number` | 未声明列宽时的默认宽度 |
| minWidth | `number` | 全局最小拖拽宽度 |
| maxWidth | `number` | 全局最大拖拽宽度 |
| widths | `ColumnResizeWidths` | 受控宽度映射 |
| defaultWidths | `ColumnResizeWidths` | 非受控初始宽度映射 |
| onWidthsChange | `(widths, info) => void` | 宽度映射变化 |
| onResize | `(info) => void` | 拖动期间触发 |
| onResizeEnd | `(info) => void` | 拖动结束触发 |

`ColumnResizeInfo<T>` 包含 `key`、`width`、`previousWidth`、`delta`、`widths`、`column` 和 `nativeEvent`。

## 虚拟表格

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

虚拟模式使用 rc-table 1.10.4 的 VirtualList，只渲染可视区附近的行并测量实际行高。Shuzhi 的补偿逻辑会在合并起始行滚出可视区时继续渲染 `rowSpan` origin，也会在跨度超出数据尾部时按现有数据范围计算高度。

`heightMode="fill"` 与 `virtual` 可以组合，测得的剩余高度会传给 VirtualList。非 fill 虚拟表格应提供数值 `scroll.y`。

## 新增 Table Props

其余属性遵循 AntD 6.5.3 Table。

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| heightMode | `content | fill` | `content` | 内容高度或填满父容器 |
| columnResize | `boolean | ColumnResizeConfig<T>` | `false` | 开启 Shuzhi 列宽模型 |

## 列扩展字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| tooltip | `ReactNode | TooltipProps` | 表头提示 |
| renderText | `(value, record, index) => ReactNode` | 无显式 render 时转换显示文本 |
| copyable | `boolean | object` | 无显式 render 时提供复制操作 |
| ellipsis | `boolean | { showTitle?, rows?, tooltip? }` | 原生单行或 ActionText 多行省略 |
| minWidth | `number` | 普通 auto 布局最小宽度；resize 模式下为拖拽下限 |
| maxWidth | `number` | resize 模式下的拖拽上限 |
| resizable | `boolean` | 是否允许当前叶子列拖拽 |

公开类型包括 `ColumnResizeConfig`、`ColumnResizeInfo` 和 `ColumnResizeWidths`。

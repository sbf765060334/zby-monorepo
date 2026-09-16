---
category: Components
group: 数据展示
title: Table
subtitle: 表格
description: 以 Ant Design 6.6.4 和 rc-table 1.11.1 为底座，提供 Shuzhi Table 的扩展语义。
---

## 实现基线

Table 保留 Ant Design 6.6.4 与 `@rc-component/table@1.11.1` 的上游行为和修复，并迁移 Shuzhi 的列增强、列宽拖拽、高度填充及虚拟 `rowSpan` 语义。

- 普通滚动表格使用 AntD 6.6.4/rc-table 1.11.1 原生滚动容器。
- 虚拟表格保留 rc-table 1.11.1 的 VirtualList viewport、滚动条、`scrollTo` 与行测量模型。
- 不进行横向列虚拟化。
- 未开启扩展能力时，列布局与滚动行为继续使用 AntD 6.6.4 基线。

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
    height="100%"
    columns={columns}
    dataSource={data}
    pagination={{ pageSize: 20 }}
  />
</div>
```

`height` 接受与 CSS `height` 相同的数字或字符串值，例如 `480`、`100%`、`50vh` 和 `calc(100vh - 64px)`。传入后，Table 将该值应用到根节点，并观察根节点、表头、标题、页脚、固定汇总和分页的实际高度，自动计算 body 的 `scroll.y`。同时传入的 `scroll.y` 会被忽略并在开发环境给出警告。不传 `height` 时完全保留 AntD 原生高度与 `scroll.y` 语义。

百分比及依赖百分比的表达式要求父容器具有可计算高度；嵌套 flex/grid 容器通常还需要 `minHeight: 0`。

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
- selection 列遵循 `rowSelection.columnWidth` 或 Table token，默认使用 `controlHeight`；expand 列缺少明确宽度时使用 48px 兜底；两者均不可拖拽；
- 只有具有稳定 `key` 或可字符串化 `dataIndex` 的叶子列显示手柄；
- `resizable={false}` 禁止单列拖拽；
- 拖动只改变当前列，通过 `onResize`、`onWidthsChange` 和 `onResizeEnd` 通知；RTL 下拖动手柄会按文字方向取反，向手柄外侧拖动加宽；
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

虚拟模式使用 rc-table 1.11.1 的 VirtualList，只渲染可视区附近的行并测量实际行高。跨可视区的 `rowSpan` 补偿只读取 `columns.onCell().rowSpan`：单元格文案用 `render`，合并信息必须放在 `onCell`。起始行滚出可视区后仍会保留 origin，跨度超出数据尾部时按现有数据范围计算高度。

```tsx
{
  title: '批次',
  onCell: (_, index) => ({
    rowSpan: index % 12 === 0 ? 12 : 0,
  }),
  render: (_, __, index) => `批次 ${Math.floor(index / 12) + 1}`,
}
```

`render` 返回 `{ children, props: { rowSpan } }` 是 Ant Design 已废弃的写法。可见行仍可能合并，但补偿逻辑不会读取这份 `rowSpan`，起始行滚出后 origin 不会保留。

`height` 与 `virtual` 可以组合，测得的剩余高度会作为数值 `scroll.y` 传给 VirtualList。不传 `height` 的虚拟表格应遵循 AntD 语义提供数值 `scroll.y`。

Table 不识别 KeepAlive、Tabs 或其他业务激活状态，也不会缓存最后一次有效高度。祖先节点使用 `display: none` 时，浏览器测得的实际高度为 0，Table 会同步将 body 高度计算为 0；需要保持虚拟滚动高度时，应由业务层调整隐藏策略，或不传 `height` 并控制稳定的 `scroll.y`。

## 新增 Table Props

其余属性遵循 AntD 6.6.4 Table。

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| height | `React.CSSProperties['height']` | - | Table 总高度；传入后自动计算 body 高度并忽略 `scroll.y` |
| columnResize | `boolean | ColumnResizeConfig<T>` | `false` | 开启 Shuzhi 列宽模型 |
| rowHighlight | `boolean | TableRowHighlight<T>` | `false` | 开启 ZBY 当前行高亮；再次点击当前行取消 |

`rowHighlight` 是 ZBY 扩展，与 AntD `rowSelection` 相互独立。传入 `true` 时启用非受控高亮；传入对象时为受控模式，必须提供 `currentRowKey`，变化时 `onChange` 收到当前 key 和记录，清除时收到 `(null, null)`。业务 `onRow().onClick` 会先执行，调用 `event.preventDefault()` 可取消本次高亮切换。

## 列扩展字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| tooltip | `ReactNode | TooltipProps` | 表头提示 |
| renderText | `(value, record, index) => ReactNode` | 无显式 render 时转换显示文本 |
| copyable | `TableColumnCopyable<T>` | 无显式 render 时提供复制操作，详见下文 |
| ellipsis | `boolean | { showTitle?, rows?, tooltip? }` | 原生单行或 ActionText 多行省略 |
| minWidth | `number` | 普通 auto 布局最小宽度；resize 模式下为拖拽下限 |
| maxWidth | `number` | resize 模式下的拖拽上限 |
| resizable | `boolean` | 是否允许当前叶子列拖拽 |

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

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| text | `string | number | (value, record, index) => string | number | null | undefined` | 单元格显示文本 | 指定复制内容；函数在单元格渲染时接收原始值、当前行记录和行索引 |
| onCopy | `(event?) => void` | - | 浏览器成功写入剪贴板后触发 |
| icon | `ReactNode` | 内置复制图标和成功图标 | 单个图标，或依次表示复制前、复制后的两个图标 |
| tooltips | `string | [before?, after?] | false` | 内置复制前、复制后提示 | 单个提示，或复制前、复制后的两个提示；`false` 关闭提示 |
| format | `'text/plain' | 'text/html'` | `'text/plain'` | 写入剪贴板的数据格式 |
| tabIndex | `number` | - | 复制按钮的键盘 Tab 顺序 |

```tsx
const columns: TableColumnsType<Order> = [
  {
    title: '订单号',
    dataIndex: 'orderNo',
    // 复制当前单元格经过 renderText 处理后的显示文本
    copyable: true,
  },
  {
    title: '固定内容',
    dataIndex: 'status',
    copyable: { text: '已审核' },
  },
  {
    title: '金额',
    dataIndex: 'amount',
    copyable: {
      text: (value, record, index) => `${index + 1}-${record.currency} ${value}`,
      tooltips: ['复制金额', '已复制'],
      onCopy: () => console.log('金额已复制'),
    },
  },
]
```

`copyable={true}` 默认复制 `renderText` 处理后的显示内容。对象形式未提供 `text` 时也使用该默认内容。`text` 函数中的 `value` 是 `dataIndex` 对应的原始单元格值，而不是 `renderText` 的结果；返回 `null` 或 `undefined` 时回退到 ActionText 的默认内容提取逻辑。

显式提供列 `render` 时，Table 不会自动包裹 ActionText，因此 `copyable` 不生效。如需在自定义渲染结果中提供复制操作，请直接使用 `ActionText`。

公开类型包括 `TableColumnCopyable`、`TableColumnCopyText`、`ColumnResizeConfig`、`ColumnResizeInfo` 和 `ColumnResizeWidths`。

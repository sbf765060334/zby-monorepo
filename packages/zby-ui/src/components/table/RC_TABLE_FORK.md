# RcTableInner 补丁清单

底座：`@rc-component/table@1.11.1` 的上游 `src/`（不是 npm 的 `es/` / `lib/`）。

**隔离：** 只给 `@zby/ui` 的 Table 用。不要用 pnpm override 去顶替 npm 的 `@rc-component/table`，antd 官方 Table 必须继续走原厂包。

下次升级：用新版 `src/` 覆盖本目录，再按下面清单把补丁贴回去。未列出的文件应与上游一致，不要顺手改。

## 新增文件

| 文件 | 作用 |
| --- | --- |
| `hooks/useColumnResize.tsx` | 列宽状态、filler 列、`minWidth` / `maxWidth` / `resizable`、受控 `widths`、`onResize` / `onWidthsChange` / `onResizeEnd`；宽度未变化时不更新状态、不触发上述回调 |

## 改过的上游文件

### 列宽拖拽（主补丁）

| 文件 | 贴回去时要对上的点 |
| --- | --- |
| `interface.ts` | `ColumnResizeConfig` / `ColumnResizeInfo` / `ColumnResizeWidths`；`INTERNAL_COLUMN_RESIZE_META` / `INTERNAL_COLUMN_RESIZE_FILLER`；列上的 `resizable` / `minWidth` / `maxWidth` |
| `index.ts` | 导出上述 resize 类型 |
| `Table.tsx` | 接收 `columnResize`；走 `useColumnResize` 覆盖 columns / flattenColumns / scrollX；开启后关掉上游 `measureColumnWidth`；给滚动 body 包 `ResizeObserver`；context 里提供 `onColumnResize` / `onColumnResizeDrag` / `onColumnResizeEnd`；`FixedHolder` 传入 `columnResize` |
| `context/TableContext.tsx` | `onColumnResizeDrag`、`onColumnResizeEnd` |
| `Cell/index.tsx` | 仅 **header** 读 resize meta 并渲染手柄；同时支持 pointer 与 mouse；`getDraggedColumnWidth` 在 `direction === 'rtl'` 时取反位移；filler 列 class；给 Cell 传入完整 `column`（body 也要，filler 样式才找得到） |
| `FixedHolder/index.tsx` | `columnResize` 为 true 时不要给 table 设 `minWidth: 100%` |
| `VirtualTable/index.tsx` | 开了 `columnResize` 时，非数字 `scroll.x` 不再警告（拖拽自己算横向滚动） |
| `hooks/useColumns/index.tsx` | `flatColumns` 改为 export，给 `useColumnResize` 用 |

拖拽相关、但与 1.11.1 **相同、不必改** 的文件：`Body/index.tsx`、`Body/MeasureRow.tsx`、`Body/MeasureCell.tsx`、`VirtualTable/BodyGrid.tsx`（上游已有测量用的 `onColumnResize`）。

### 表体省略（ZBY 语义，配合外层 ActionText）

表头继续走上游原生 ellipsis（`Header/HeaderRow.tsx` **不要改**，保持 `ellipsis={column.ellipsis}`）。

| 文件 | 贴回去时要对上的点 |
| --- | --- |
| `Body/BodyRow.tsx` | **不要**传 `ellipsis={column.ellipsis}`；**要**传 `column={column}`（filler / resize meta） |
| `VirtualTable/VirtualCell.tsx` | 同上：不传 body ellipsis，传 `column` |

## 当前行为备忘（不是漏补丁）

- 没有稳定 `key` / `dataIndex` 的列（合成 key）默认不能拖，见 `useColumnResize` 里的 `SYNTHETIC_KEY_PATTERN`。
- 虚拟 `rowSpan` 补偿只认 `column.onCell().rowSpan`。这是 1.11.1 原行为，本层没有再补 `render` 返回值那条路径。

# Table 上游与增强清单

外层底座：Ant Design Table **6.6.4**（`components/table`，不含 demo / 官方单测）。

内层底座见 [RC_TABLE_FORK.md](./RC_TABLE_FORK.md)。ZBY Table 画表走 `./RcTableInner`，不是 npm `@rc-component/table`。

下次升级：用新版 antd Table 覆盖外层源码 → 做「机械改写」→ 再按功能清单把增强打回去。

## 机械改写（每次覆盖源码后必做，不是功能）

- `@rc-component/table` → `./RcTableInner`
- antd 内部工具：`../_util/...` → `antd/es/_util/...`（以及 `antd/es/button` 等同类路径）
- 跟仓库 eslint：无分号、单引号（`RcTableInner` 除外，继续跟上游风格）
- `util.ts`：`@rc-component/util` 的 `isNonNullable` 在 1.12.0 不存在，用本地小函数
- `hooks/useFilter/FilterDropdown.tsx`：`OverrideProvider` 运行时有、d.ts 没有，保留 `// @ts-expect-error -- upstream declaration mismatch`

## 新增文件（覆盖上游时不要删）

| 文件 | 功能 |
| --- | --- |
| `hooks/useColumnEnhance.tsx` | 列增强：表头 `tooltip`；`renderText`；无自定义 `render` 时用 ActionText 做 `copyable` / 表体 `ellipsis` |
| `hooks/useTableFillLayout.ts` | `height` 填充：只观察外壳（根、表头、标题、页脚、汇总、分页），不观察被写高度的 body；祖先隐藏量到 0 时保留上次有效高度 |
| `hooks/useRowHighlight.ts` | `rowHighlight` 当前行；点击落在可交互节点（含 ConfigProvider 前缀下的 Select / Picker / Dropdown / InputNumber）或 `[data-row-click-ignore]` 内不切换 |

## 按功能改过的上游文件

### 1. 列增强

| 位置 | 要保留的行为 |
| --- | --- |
| `interface.ts` | 列字段 `tooltip` / `renderText` / `copyable`；`ellipsis` 可带 `showTitle` / `rows` / `tooltip` |
| `InternalTable.tsx` | `useColumnEnhance`；`transformColumns` 顺序必须是 **enhance → sorter → filter → selection → title** |
| `style/ellipsis.ts` | `.cell-action-text` 的 maxWidth / 换行（表体不再依赖 `td.cell-ellipsis`） |
| `index.tsx` | 如需再导出 `TableColumnCopyable` 等类型 |

语义（改外层时不要回退）：

- 表头 ellipsis：antd 原生 CSS + `title`（有 sorter/filter 时限制与 antd 相同）
- 表体 ellipsis / copyable：无自定义 `render` 时由 ActionText 托管，`td` 不写原生 `title`、不加 `ant-table-cell-ellipsis`
- 有自定义 `render`：表体不包 ActionText，`copyable` / 表体 ellipsis 都不生效；表头只要列上有 `ellipsis` 仍走原生
- `ellipsis.showTitle === false` 只关表体溢出提示

### 2. 高度填充 `height`

| 位置 | 要保留的行为 |
| --- | --- |
| `InternalTable.tsx` | `height` 写到根节点；`fillEnabled` 时忽略传入的 `scroll.y` 并 warning；class `ant-table-fill` / wrapper-fill；虚拟时 `scroll.y` 用 `mergedScrollY ?? 0`，避免首帧非数字被 rc-table 当成 500 |
| `style/index.ts` | `&-wrapper-fill` 与 `.ant-table-fill` 的 flex 撑满 |

### 3. 当前行 `rowHighlight`

| 位置 | 要保留的行为 |
| --- | --- |
| `interface.ts` | `TableRowHighlight` |
| `InternalTable.tsx` | 接入 `useRowHighlight`，合并 `onRow` / `rowClassName` |
| `style/selection.ts` | `.ant-table-row-current` 背景与 hover |

`true` 为非受控；对象为受控，必须带 `currentRowKey`。业务 `onRow().onClick` 先执行，`preventDefault` 可取消本次切换。

### 4. 列宽拖拽接线（实现在 RcTableInner，外层只接线 + 样式）

| 位置 | 要保留的行为 |
| --- | --- |
| `InternalTable.tsx` | `columnResize` 原样传给内层；开启时强制 `tableLayout: 'fixed'`，忽略 `tableLayout="auto"`；必要时补 `scroll` 对象 |
| `style/index.ts` | `.ant-table-cell-resize-handle`（`inset-inline-end`，RTL 才能落在起始侧）、`-active`、`-resizable` 的 padding、`-resize-filler` |

列上的 `minWidth` / `maxWidth` / `resizable` 类型来自 RcTableInner 的 `ColumnType`。

## 公开 API（升级后应对一下导出）

`TableProps`：`height`、`columnResize`、`rowHighlight`。

`index.tsx` 现导出：`ColumnResizeConfig` / `ColumnResizeInfo` / `ColumnResizeWidths`、`TableColumnCopyable` / `TableColumnCopyText`、`TableRowHighlight`、`TableRef`。

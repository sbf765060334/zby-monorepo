# @zby/pro

## 2.0.3

### Patch Changes

- Updated dependencies
  - @zby/ui@0.5.0

## 2.0.2

### Patch Changes

- interface.ts：columnEmptyText 改为传给 Table，列 emptyText 继承 Table
- table-region/TableRegion.tsx：把 columnEmptyText 传给 Table
- utils/columns.ts：列 emptyText 保留在传给 Table 的列定义上
- `utils/__tests__/columns.test.ts`：断言列 emptyText 仍留在列定义上
- Updated dependencies
  - @zby/ui@0.4.0

## 2.0.1

### Patch Changes

- Updated dependencies
  - @zby/router-core@0.2.0

## 2.0.0

### Major Changes

- ProModal.tsx：去掉内部 ScrollArea，内容直接交给 Modal，由内容区 CSS 滚动
- interface.ts：删除 scrollAreaProps，保留 bodyHeightMode 和 viewportMaxHeight
- pro-modal/style/index.ts：内容区改回 overflow auto，fill 模式用 flex-basis 0 传递剩余高度
- ProModal.test.tsx：去掉 ScrollArea 断言，改为检查内容直接位于 modal body
- pro-table/style/index.ts：筛选面板按 1fr 铺满 fill 内容区
- pro-view-management/style/index.ts：去掉视图列表自己的 overflow，改由弹窗内容区滚动
- `pro-view-management/__tests__/index.test.tsx`：断言列表样式不再包含 overflow-y:auto

## 1.0.1

### Patch Changes

- pro-modal/style/index.ts：fill 模式把确定高度传过 ScrollArea，两种模式都把内容宽度限制在 viewport 内
- Updated dependencies
  - @zby/ui@0.3.3

## 1.0.0

### Major Changes

- IconDrawerMenu.tsx：一级菜单停留阈值改为 100ms，短暂掠过不切换 Drawer
- styles/index.ts：页签未固定图标在移入 100ms 后才露出，页签变色和点击仍立即生效
- ProModal.tsx：内容区改由 ScrollArea 滚动，并支持 viewportMaxHeight
- interface.ts：bodyHeightMode 的 height 改为 fill，新增 scrollAreaProps 和 viewportMaxHeight
- style/index.ts：弹窗滚动交给 ScrollArea，fill 模式撑满视口预算
- ColumnSettings.tsx：列设置弹窗改用 fill
- TableSettings.tsx：表格设置弹窗改用 fill
- ViewManagementModal.tsx：视图管理弹窗改用 fill

## 0.3.12

### Patch Changes

- 页签文案禁止选中

## 0.3.11

### Patch Changes

- ProLayoutContentContainer.showBreadcrumb 改为 hideBreadcrumb

## 0.3.10

### Patch Changes

- Updated dependencies
  - @zby/ui@0.3.2

## 0.3.9

### Patch Changes

- ProLayout 优化调整

## 0.3.8

### Patch Changes

- 给容器组件增加了最小宽度

## 0.3.7

### Patch Changes

- 移出更多按钮上的 title

## 0.3.6

### Patch Changes

- Updated dependencies
  - @zby/ui@0.3.1

## 0.3.5

### Patch Changes

- ProTable 导出 useControllerSelector 和 shallow

## 0.3.4

### Patch Changes

- 去掉 ProTableActions 暴露按钮的左右内边距

## 0.3.3

### Patch Changes

- ProTableActions 增加 showAll

## 0.3.2

### Patch Changes

- 修改 ProTableActions 的 hidden 为 show

## 0.3.1

### Patch Changes

- 新增 layout.header

## 0.3.0

### Minor Changes

- 移除 ZbyConfigProvider。应用根节点改由 ReactRouterProLayout 包裹 ConfigProvider、App 和 ZbyIntlProvider；不用布局的页面自行组合这三层。

### Patch Changes

- Updated dependencies
  - @zby/ui@0.3.0

## 0.2.12

### Patch Changes

- 移出 tag、progress、code、jsonCode 列值类型

## 0.2.11

### Patch Changes

- Updated dependencies
  - @zby/ui@0.2.5

## 0.2.10

### Patch Changes

- Updated dependencies
  - @zby/ui@0.2.4

## 0.2.9

### Patch Changes

- Updated dependencies
  - @zby/ui@0.2.3

## 0.2.8

### Patch Changes

- Updated dependencies
  - @zby/ui@0.2.2

## 0.2.7

### Patch Changes

- 修改页签圆角

## 0.2.6

### Patch Changes

- 修改时间控件宽度计算异常问题

## 0.2.5

### Patch Changes

- 允许没有索引签名的 interface 作为 ProTable 的 Query。已声明的查询字段类型保持不变。

## 0.2.4

### Patch Changes

- Updated dependencies
  - @zby/ui@0.2.1

## 0.2.3

### Patch Changes

- Updated dependencies
  - @zby/router-core@0.1.1

## 0.2.2

### Patch Changes

- 1. 修复筛选区长内容撑出页面，以及日期时间框预选时宽度不更新的问题。2. ：允许没有索引签名的 interface 作为请求体和查询参数。

## 0.2.1

### Patch Changes

- 修复个性化预设锁定明暗主题的问题。

## 0.2.0

### Minor Changes

- 新增越南语和缅甸语，主题配置里的预设按钮改为自动换行

### Patch Changes

- Updated dependencies
  - @zby/ui@0.2.0

# @zby/ui

## 0.4.0

### Minor Changes

- interface.ts：列增加 emptyText，表格增加 columnEmptyText，默认显示 -
- InternalTable.tsx：接入 columnEmptyText，并避免把该属性传给底层表格
- useColumnEnhance.tsx：空单元格显示空值文案；选择列和展开列保持原引用
- index.zh-CN.md：说明单元格空值文案
- index.en-US.md：说明单元格空值文案
- `__tests__/index.test.tsx`：覆盖默认 -、列级覆盖和 false 保留原值

## 0.3.3

### Patch Changes

- ScrollArea.tsx：scrollbar 默认值改为 always
- scroll-area/__tests__/index.test.tsx：默认滚动条断言改为 always
- scroll-area/index.zh-CN.md：文档默认值改为 always
- scroll-area/index.en-US.md：文档默认值改为 always

## 0.3.2

### Patch Changes

- --- │ │ "@zby/ui": patch │ │ --- │ │ │ │ ActionText 增加 type="primary"，文案使用主题色。ellipsis.rows 大于 1 时按行数省略，无 href 的可点击文本同样生效。 │ │ │ │ Table 列 ellipsis.rows 大于 1 时，表体按行数省略并保留原生 title。表头仍是单行。列上有自定义 render 时，表体省略不 │ │ 生效。

## 0.3.1

### Patch Changes

- 表格空白列也支持悬浮和点击变色了

## 0.3.0

### Minor Changes

- 移除 ZbyConfigProvider。应用根节点改由 ReactRouterProLayout 包裹 ConfigProvider、App 和 ZbyIntlProvider；不用布局的页面自行组合这三层。

## 0.2.5

### Patch Changes

- ActionText 改为原生单行省略和自定义操作，支持 type、strong；Table 去掉 shuzhi 前缀悬停名，并给单元格补上与表格背景相同的背景色，避免长内容溢出覆盖后面内容

## 0.2.4

### Patch Changes

- 单元格增加底色

## 0.2.3

### Patch Changes

- 增加 ActionText 语义色和加粗文本能力

## 0.2.2

### Patch Changes

- ：ActionText 改为原生单行省略和自定义操作，并让表格行悬停类名跟随 prefix。

## 0.2.1

### Patch Changes

- 优化 Table 单元格渲染逻辑

## 0.2.0

### Minor Changes

- 新增越南语和缅甸语，主题配置里的预设按钮改为自动换行

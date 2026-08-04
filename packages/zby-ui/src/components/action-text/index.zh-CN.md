---
category: Components
group: 通用
title: ActionText
subtitle: 操作文本
description: 展示文本并在末尾承载轻量操作。
---

## 何时使用

用于表格单元格、列表项、描述项等数据展示场景，需要展示文本、自动省略、hover 提示完整内容，并在文本后放置复制、编辑、查看等轻量操作。

## 基本用法

```tsx
import { EditOutlined } from '@ant-design/icons'
import { ActionText } from '@zby/ui'

export default () => (
  <ActionText
    copyable
    ellipsis={{ rows: 2, tooltip: true }}
    actions={[{ key: 'edit', icon: <EditOutlined />, label: '编辑' }]}
  >
    一段可能需要省略并带有轻量操作的文本
  </ActionText>
)
```

## API

除下表属性外，还支持原生 `div` 属性。

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| actions | 文本后的操作项 | `ActionTextAction[]` | - |
| actionsVisibleOn | 操作项展示时机 | `self-hover \| always` | `self-hover` |
| clickable | 文本点击下钻配置 | `boolean \| ActionTextClickableConfig` | - |
| copyable | 内置复制配置，交互与 antd Typography 保持一致 | `boolean \| ActionTextCopyConfig` | - |
| editable | 内置 Popover 表单编辑配置 | `boolean \| ActionTextEditableConfig` | - |
| ellipsis | 文本省略配置，内部复用 antd Typography.Paragraph | `boolean \| ActionTextEllipsisConfig` | `true` |
| classNames | 语义节点 className，可传对象或回调 | `ActionTextClassNamesType` | - |
| styles | 语义节点内联样式，可传对象或回调 | `ActionTextStylesType` | - |

操作按钮使用 `ActionIcon`，尺寸固定为 `small`，并继承 antd 的主题、CSS Variables、RTL 与前缀配置。

### 语义节点

| 名称 | 说明 |
| --- | --- |
| root | ActionText 根节点 |
| text | 文本与省略节点 |
| actions | 操作列表容器 |
| action | 每个 ActionIcon |

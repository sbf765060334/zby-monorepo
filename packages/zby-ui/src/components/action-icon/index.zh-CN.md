---
category: Components
group: 通用
title: ActionIcon
description: 轻量的纯图标操作触发器。
---

## 何时使用

- 只需要表达一个图标操作，不希望使用普通按钮的视觉重量时；
- 需要选中态、危险态、禁用态，或需要使用 `Badge` 包裹展示数量时；
- 表格操作列、工具栏等需要紧凑图标操作的场景。

图标节点会设置 `aria-hidden`，因此纯图标操作应通过 `aria-label` 提供可访问名称。

## 基本用法

```tsx
import { SearchOutlined } from '@ant-design/icons'
import { ActionIcon } from '@zby/ui'

export default () => (
  <ActionIcon
    icon={<SearchOutlined />}
    aria-label="搜索"
    color="primary"
    variant="filled"
  />
)
```

## API

除下表属性外，还支持除 `children`、`color`、`type` 以外的原生 button 属性。组件固定渲染 `type="button"`。

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| children | 未传 `icon` 时作为图标内容 | `ReactNode` | - |
| classNames | 语义节点 className，可传对象或接收归一化 props 的回调 | `ActionIconClassNamesType` | - |
| color | 颜色，跟随 antd Button color | `default \| primary \| danger \| PresetColor` | - |
| danger | 使用危险色反馈；显式 `color` 优先 | `boolean` | `false` |
| disabled | 禁用状态；未传时继承 `ConfigProvider` | `boolean` | - |
| icon | 图标节点，优先级高于 `children` | `ReactNode` | - |
| selected | 选中状态，同时设置 `aria-pressed` | `boolean` | `false` |
| shape | 图标按钮形状 | `square \| circle` | `square` |
| size | 尺寸；外框和图标都使用字号、行高及间距 Token 逐级放大；`medium` 为兼容别名 | `small \| middle \| medium \| large` | 继承 `ConfigProvider` |
| styles | 语义节点内联样式，可传对象或接收归一化 props 的回调 | `ActionIconStylesType` | - |
| variant | 外观变体；`inline` 为紧凑行内模式 | `outlined \| dashed \| solid \| filled \| text \| link \| inline` | - |

### 语义节点

| 名称 | 说明 |
| --- | --- |
| root | 原生 button 根节点 |
| icon | 包裹图标内容的 span |

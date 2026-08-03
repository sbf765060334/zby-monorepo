---
category: Components
group: 通用
title: ActionReveal
subtitle: 动作展开
description: 点击动作图标后，将图标切换为行内内容并展开。
---

## 何时使用

用于工具栏内的轻量行内展开场景，例如点击搜索图标后展开搜索框，或点击筛选图标后展开筛选输入。

## 基本用法

```tsx
import { SearchOutlined } from '@ant-design/icons'
import { ActionReveal } from '@zby/ui'
import { Input, type InputRef } from 'antd'
import type { Ref } from 'react'

export default () => (
  <ActionReveal
    triggerIcon={<SearchOutlined />}
    actionIconProps={{ 'aria-label': '打开搜索' }}
    width={180}
    content={({ contentProps }) => (
      <Input
        ref={contentProps.ref as Ref<InputRef>}
        className={contentProps.className}
        style={contentProps.style}
        onBlur={contentProps.onBlur}
        prefix={<SearchOutlined />}
        placeholder="搜索"
      />
    )}
  />
)
```

## API

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| actionIconProps | 透传给关闭态 `antd Button` 的属性；按钮 `type` 默认为 `text` | `Partial<ButtonProps>` | - |
| autoFocus | 展开后是否聚焦内容 ref | `boolean` | `true` |
| className | 展开态内容根节点的 className | `string` | - |
| classNames | 语义节点的 className，可传对象或接收归一化 props 的回调 | `ActionRevealClassNamesType` | - |
| collapsedWidth | 展开动画起点宽度；未传时使用实际按钮宽度 | `number \| string` | - |
| collapseOnBlur | 内容失焦后是否收起 | `boolean` | `true` |
| content | 展开态内容渲染函数 | `ActionRevealContentRender` | - |
| defaultOpen | 默认是否展开 | `boolean` | `false` |
| disabled | 是否禁用关闭态按钮；未传时继承 `ConfigProvider` | `boolean` | - |
| hidden | 是否隐藏当前渲染的触发按钮或内容 | `boolean` | - |
| onOpenChange | 请求切换展开状态时触发 | `(open: boolean) => void` | - |
| open | 受控展开状态 | `boolean` | - |
| prefixCls | 自定义 CSS 类名前缀 | `string` | 继承 `ConfigProvider` |
| rootClassName | 展开态内容根节点的额外 className | `string` | - |
| size | 关闭态按钮尺寸；未传时继承 `ConfigProvider` | `small \| middle \| large` | - |
| style | 展开态内容根节点的内联样式 | `CSSProperties` | - |
| styles | 语义节点的内联样式，可传对象或接收归一化 props 的回调 | `ActionRevealStylesType` | - |
| triggerIcon | 关闭态按钮图标 | `ReactNode` | - |
| width | 展开后的目标宽度；未传时在打开前测量内容自然宽度 | `number \| string` | - |

`contentProps` 包含 `className`、`style`、`ref`、`hidden` 和 `onBlur`，需要透传给真实内容根节点；其中 `className` 用于识别复合内容的焦点范围。`content` 同时收到 `open`、`expanded` 与 `close`，可用来区分目标状态、动画状态或主动收起内容。内容调用 `close` 主动收起后，焦点会回到重新出现的触发按钮。

### 语义化节点

| 名称 | 说明 |
| --- | --- |
| trigger | 关闭态的 `antd Button` |
| content | 展开态内容根节点 |

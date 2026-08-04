---
category: Components
group: 通用
title: ActionReveal
subtitle: 动作展开
description: 在不增加包装节点的前提下，将动作图标切换为可聚焦的行内内容。
---

## 何时使用

ActionReveal 适合将低频或暂时不需要占用空间的操作收起为一个图标：

- 工具栏中的搜索、筛选、快速输入和紧凑设置；
- 点击图标后，用输入框、复合搜索框或一组行内操作替换原图标；
- 需要宽度展开/收起动画、自动聚焦和失焦收起；
- 需要展开内容自己调用 `close()`，并在关闭后把焦点恢复到触发图标。

以下场景通常不建议使用：

- 展开内容结构复杂、需要稳定占位或会显著改变高度：优先使用 Drawer、Popover、Collapse 或固定区域；
- 内容没有明确宽度但仍要求宽度动画：CSS 无法可靠地在确定宽度与 `auto` 之间插值，应明确提供 `width`；
- 展开内容无法把 `contentProps` 透传到真实根节点：焦点边界、宽度动画和失焦收起将无法正确工作。

ActionReveal 不会额外创建包装 DOM。关闭态只渲染 `ActionIcon`，展开态直接渲染 `content` 返回的元素。

## 怎么使用

### 带宽度动画的输入框

提供 `width` 后，内容会从触发按钮的实际宽度展开到目标宽度：

```tsx
import { SearchOutlined } from '@ant-design/icons'
import { ActionReveal } from '@zby/ui'
import { Input, type InputRef } from 'antd'
import type { Ref } from 'react'

export default () => (
  <ActionReveal
    triggerIcon={<SearchOutlined />}
    actionIconProps={{
      'aria-label': '打开搜索',
      title: '搜索',
    }}
    width={240}
    content={({ contentProps }) => (
      <Input
        ref={contentProps.ref as Ref<InputRef>}
        className={contentProps.className}
        style={contentProps.style}
        hidden={contentProps.hidden}
        onBlur={contentProps.onBlur}
        prefix={<SearchOutlined />}
        placeholder="搜索"
      />
    )}
  />
)
```

`contentProps` 必须传给展开内容的真实视觉根节点。对于 `Input.Search` 等复合组件，`className` 会标记完整焦点范围，内部输入框和按钮之间切换焦点不会误触发收起。

### 自然宽度内容

不传 `width` 时不会测量真实节点，也不会执行宽度动画，而是直接按内容自然宽度展开：

```tsx
import { SettingOutlined } from '@ant-design/icons'
import { ActionReveal } from '@zby/ui'
import type { Ref } from 'react'

export default () => (
  <ActionReveal
    triggerIcon={<SettingOutlined />}
    actionIconProps={{ 'aria-label': '打开快捷设置' }}
    content={({ close, contentProps }) => {
      const { ref, ...restContentProps } = contentProps

      return (
        <button
          {...restContentProps}
          ref={ref as Ref<HTMLButtonElement>}
          type="button"
          onClick={close}
        >
          完成并收起
        </button>
      )
    }}
  />
)
```

需要宽度动画时，请通过 `width` 或 `styles.content.width` 提供明确目标。`collapsedWidth` 只改变动画起点，不能替代展开目标宽度。

### 受控状态和主动关闭

```tsx
import { SettingOutlined } from '@ant-design/icons'
import { ActionReveal } from '@zby/ui'
import { Button, Input, Space } from 'antd'
import { useState, type Ref } from 'react'

export default () => {
  const [open, setOpen] = useState(false)

  return (
    <ActionReveal
      open={open}
      onOpenChange={setOpen}
      triggerIcon={<SettingOutlined />}
      actionIconProps={{ 'aria-label': '打开设置' }}
      width={320}
      collapseOnBlur={false}
      content={({ close, contentProps }) => {
        const { ref, ...restContentProps } = contentProps

        return (
          <Space
            {...restContentProps}
            ref={ref as Ref<HTMLDivElement>}
            tabIndex={-1}
          >
            <Input placeholder="设置名称" />
            <Button size="small" onClick={close}>
              完成
            </Button>
          </Space>
        )
      }}
    />
  )
}
```

受控模式下，组件只调用 `onOpenChange` 请求切换，是否真正开合取决于调用方是否更新 `open`。

### 阻止本次展开

`actionIconProps.onClick` 会先执行。调用 `event.preventDefault()` 可以保留自定义点击逻辑并阻止本次展开：

```tsx
<ActionReveal
  triggerIcon={<SearchOutlined />}
  actionIconProps={{
    'aria-label': '受条件限制的搜索',
    onClick: (event) => {
      if (!canSearch) event.preventDefault()
    },
  }}
  width={240}
  content={renderSearch}
/>
```

## Props

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| prefixCls | 自定义组件类名前缀 | `string` | 由 `ConfigProvider` 生成 |
| className | 追加到展开内容真实根节点的 className | `string` | - |
| rootClassName | 追加到展开内容真实根节点的额外 className；组件没有独立 root 包装 | `string` | - |
| style | 展开内容真实根节点的基础内联样式 | `CSSProperties` | - |
| hidden | 是否隐藏当前实际渲染的触发按钮或展开内容 | `boolean` | - |
| size | 关闭态 ActionIcon 尺寸；`medium` 是 `middle` 的兼容别名，不会自动传给展开内容 | `small \| middle \| medium \| large` | 继承 `ConfigProvider` |
| disabled | 是否禁用关闭态 ActionIcon；展开内容的禁用状态由调用方管理 | `boolean` | 继承 `ConfigProvider` |
| open | 受控目标开合状态 | `boolean` | - |
| defaultOpen | 非受控模式下的初始开合状态 | `boolean` | `false` |
| onOpenChange | 点击触发器、失焦或调用 `close` 请求切换状态时触发 | `(open: boolean) => void` | - |
| collapseOnBlur | 焦点真正离开展开内容完整根节点后是否请求收起 | `boolean` | `true` |
| autoFocus | 展开内容挂载后是否调用其 ref 的 `focus()` | `boolean` | `true` |
| triggerIcon | 关闭态 ActionIcon 的图标 | `ReactNode` | - |
| actionIconProps | 透传给关闭态 ActionIcon 的补充属性 | `Partial<ActionIconProps>` | - |
| width | 展开目标宽度；存在时启用内部宽度动画，未传时按自然宽度立即展开 | `CSSProperties['width']` | - |
| collapsedWidth | 宽度动画起点；优先于实测触发按钮宽度 | `CSSProperties['width']` | 实际按钮宽度或当前 ActionIcon 尺寸 |
| content | 展开内容渲染函数；返回元素直接替换触发按钮 | `ActionRevealContentRender` | 必填 |
| classNames | trigger/content 语义 className 对象或动态回调 | `ActionRevealClassNamesType` | - |
| styles | trigger/content 语义内联样式对象或动态回调 | `ActionRevealStylesType` | - |

内容样式合并顺序为 `style` → `styles.content` → 动画端点 `width`。调用方显式提供的 `overflow` 和 `transition` 优先于内部默认值。

### ActionRevealContentRender

```ts
type ActionRevealContentRender = (info: {
  open: boolean
  expanded: boolean
  close: () => void
  contentProps: ActionRevealContentProps
}) => ReactElement
```

| 字段 | 说明 | 类型 |
| --- | --- | --- |
| open | 当前目标状态；关闭动画开始后立即变为 `false` | `boolean` |
| expanded | 当前宽度端点状态；打开动画开始后为 `true`，收起时为 `false` | `boolean` |
| close | 请求收起；若焦点仍在内容内，收起完成后恢复到触发按钮 | `() => void` |
| contentProps | 必须透传给真实内容根节点的属性集合 | `ActionRevealContentProps` |

### ActionRevealContentProps

| 字段 | 说明 | 类型 |
| --- | --- | --- |
| ref | 用于聚焦、焦点边界判断和向外转发的 ref | `Ref<unknown>` |
| className | 基础类名、方向、动画状态、实例焦点作用域和自定义类名的合并结果 | `string` |
| style | 合并后的宽度、overflow、transition 和调用方样式 | `CSSProperties` |
| hidden | 透传自根组件的原生 hidden 状态 | `boolean` |
| onBlur | 判断焦点是否离开完整内容区域的处理函数 | `FocusEventHandler` |

如果需要在内容根节点增加自己的 `onBlur`，应先调用 `contentProps.onBlur(event)`，不要直接覆盖它。

### actionIconProps 与 ActionIconProps

`actionIconProps` 支持 ActionIcon 的颜色、变体、形状、选中状态、语义样式及原生 button 属性。以下字段由 ActionReveal 接管：

| 字段 | ActionReveal 中的规则 |
| --- | --- |
| icon | 由顶层 `triggerIcon` 决定 |
| size | 由顶层 `size` 决定 |
| disabled | 由顶层 `disabled` 与 ConfigProvider 决定 |
| onClick | 先执行；`preventDefault()` 可阻止展开 |
| className / style | 与 `classNames.trigger` / `styles.trigger` 合并 |

### ActionRevealClassNamesType

```ts
type ActionRevealClassNamesType =
  | Readonly<ActionRevealSemanticClassNames>
  | ((info: { props: ActionRevealProps }) => Readonly<ActionRevealSemanticClassNames>)
```

### ActionRevealStylesType

```ts
type ActionRevealStylesType =
  | Readonly<ActionRevealSemanticStyles>
  | ((info: { props: ActionRevealProps }) => Readonly<ActionRevealSemanticStyles>)
```

两个类型使用相同语义节点：

| 字段 | 对应节点 | classNames 类型 | styles 类型 |
| --- | --- | --- | --- |
| trigger | 关闭态 ActionIcon | `string` | `CSSProperties` |
| content | 展开内容真实根节点 | `string` | `CSSProperties` |

动态回调中的 `props` 已合并最终的 `open`、`size`、`disabled` 和 `collapseOnBlur` 等状态。

---
category: Components
group: 通用
title: ActionIcon
description: 轻量、紧凑且具备完整状态反馈的纯图标操作触发器。
---

## 何时使用

ActionIcon 用于“图标本身已经能够清楚表达动作”的紧凑操作场景：

- 表格操作列、列表项尾部、卡片角落或工具栏中的搜索、刷新、设置、删除等动作；
- 操作需要选中、危险、禁用、颜色或外观变体反馈；
- 图标需要和正文、`ActionText` 或 `ActionReveal` 保持紧凑的行内尺寸；
- 需要原生 `button` 的键盘、焦点、禁用和点击语义，但不需要普通 Button 的文字和水平留白。

以下场景通常不建议使用：

- 图标含义不够明确：优先使用带文案的 `Button`，或至少补充 Tooltip；
- 需要提交表单：ActionIcon 固定使用 `type="button"`，不会触发表单提交；
- 只是展示图标而没有交互：直接渲染图标，不要创建多余的按钮语义。

图标容器会设置 `aria-hidden="true"`。纯图标按钮必须通过 `aria-label` 提供可访问名称，`title` 只能作为补充提示，不能替代无障碍名称。

## 怎么使用

### 基础图标操作

通过 `icon` 提供图标，并使用 `aria-label` 描述动作：

```tsx
import { SearchOutlined } from '@ant-design/icons'
import { ActionIcon } from '@zby/ui'

export default () => (
  <ActionIcon
    icon={<SearchOutlined />}
    aria-label="搜索"
    title="搜索"
    onClick={() => console.log('search')}
  />
)
```

未传 `icon` 时会使用 `children`，但两者同时存在时始终以 `icon` 为准。

### 尺寸、形状和状态

```tsx
import { DeleteOutlined, StarOutlined } from '@ant-design/icons'
import { ActionIcon } from '@zby/ui'
import { Space } from 'antd'

export default () => (
  <Space>
    <ActionIcon size="small" icon={<StarOutlined />} aria-label="小号收藏" />
    <ActionIcon
      size="middle"
      shape="circle"
      selected
      icon={<StarOutlined />}
      aria-label="取消收藏"
    />
    <ActionIcon
      size="large"
      danger
      icon={<DeleteOutlined />}
      aria-label="删除"
    />
  </Space>
)
```

默认主题下的尺寸关系如下。主题修改字号、行高或间距 Token 后，数值会同步变化。

| size | 外框 | 图标字号 | 典型用途 |
| --- | ---: | ---: | --- |
| `small` | 22px | 16px | 正文行内、ActionText 操作 |
| `middle` / `medium` | 26px | 18px | 默认工具栏操作 |
| `large` | 30px | 20px | 更醒目的独立操作 |

### 颜色和外观变体

```tsx
import { CheckOutlined, SettingOutlined } from '@ant-design/icons'
import { ActionIcon } from '@zby/ui'
import { Space } from 'antd'

export default () => (
  <Space>
    <ActionIcon
      color="primary"
      variant="filled"
      icon={<SettingOutlined />}
      aria-label="设置"
    />
    <ActionIcon
      color="green"
      variant="solid"
      icon={<CheckOutlined />}
      aria-label="确认"
    />
    <ActionIcon
      variant="inline"
      icon={<SettingOutlined />}
      aria-label="行内设置"
    />
  </Space>
)
```

- `solid` 未指定 `color` 时默认使用 `primary`；
- `filled` 未指定 `color` 时默认使用 `default`；
- `danger` 是危险状态的快捷入口，显式 `color` 的优先级更高；
- `inline` 去掉固定宽高，但保留最小点击区域，适合嵌入文本行。

### 语义化定制

`classNames` 和 `styles` 可以直接传对象，也可以根据合并后的 Props 动态计算：

```tsx
<ActionIcon
  selected
  icon={<StarOutlined />}
  aria-label="收藏"
  classNames={({ props }) => ({
    root: props.selected ? 'is-selected' : undefined,
    icon: 'favorite-icon',
  })}
  styles={({ props }) => ({
    icon: { opacity: props.disabled ? 0.5 : 1 },
  })}
/>
```

## Props

除下表属性外，还支持除 `children`、`color`、`type` 以外的原生 `button` 属性，例如 `aria-label`、`title`、`onClick`、`onFocus`、`tabIndex` 和 `data-*`。组件固定渲染 `type="button"`。

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| prefixCls | 自定义组件类名前缀 | `string` | 由 `ConfigProvider` 生成 |
| className | 追加到根 button 的 className | `string` | - |
| rootClassName | 追加到根 button 的额外 className | `string` | - |
| style | 根 button 的内联样式，优先级高于上下文和语义样式 | `CSSProperties` | - |
| children | 未传 `icon` 时使用的图标内容 | `ReactNode` | - |
| icon | 图标节点，优先级高于 `children` | `ReactNode` | - |
| selected | 是否处于选中状态；显式传入时同步设置 `aria-pressed` | `boolean` | `false` |
| danger | 是否使用危险色反馈；显式 `color` 优先 | `boolean` | `false` |
| color | 操作颜色，支持 antd Button 颜色及预设色 | `default \| primary \| danger \| PresetColor` | 按 `danger`、上下文和 `variant` 推导 |
| variant | 外观变体；`inline` 为紧凑行内模式 | `outlined \| dashed \| solid \| filled \| text \| link \| inline` | 继承 Button 上下文 |
| disabled | 是否禁用；禁用后原生 button 不响应点击 | `boolean` | 继承 `ConfigProvider` |
| size | 外框和图标尺寸；`medium` 是 `middle` 的兼容别名 | `small \| middle \| medium \| large` | 继承 `ConfigProvider`，最终回退为 `middle` |
| shape | 按钮形状 | `square \| circle` | Button 上下文或 `square` |
| classNames | 语义节点 className 对象或动态回调 | `ActionIconClassNamesType` | - |
| styles | 语义节点内联样式对象或动态回调 | `ActionIconStylesType` | - |

属性优先级为：显式组件 Props > ConfigProvider Button 上下文 > 组件默认值。`className`、`rootClassName` 和语义 className 会合并；根节点 `style` 最后合并。

### ActionIconClassNamesType

```ts
type ActionIconClassNamesType =
  | Readonly<ActionIconSemanticClassNames>
  | ((info: { props: ActionIconProps }) => Readonly<ActionIconSemanticClassNames>)
```

回调中的 `props` 已合并选中、危险、颜色、变体、禁用、尺寸和形状等最终状态。

| 字段 | 对应节点 | 类型 |
| --- | --- | --- |
| root | 原生 button 根节点 | `string` |
| icon | 包裹图标内容的 span | `string` |

### ActionIconStylesType

```ts
type ActionIconStylesType =
  | Readonly<ActionIconSemanticStyles>
  | ((info: { props: ActionIconProps }) => Readonly<ActionIconSemanticStyles>)
```

| 字段 | 对应节点 | 类型 |
| --- | --- | --- |
| root | 原生 button 根节点 | `CSSProperties` |
| icon | 包裹图标内容的 span | `CSSProperties` |

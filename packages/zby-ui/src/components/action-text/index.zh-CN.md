---
category: Components
group: 通用
title: ActionText
subtitle: 操作文本
description: 在省略文本后承载复制、编辑、点击下钻和自定义轻量操作。
---

## 何时使用

ActionText 用于“文本是主体，操作是辅助”的数据展示场景：

- 表格单元格、列表项、描述项和详情字段中的长文本展示；
- 文本需要单行或多行省略，并在 Tooltip 中展示完整内容；
- 文本右侧需要复制、Popover 编辑或自定义图标操作；
- 文本本身需要作为链接或无跳转按钮，并记录受控/非受控访问状态；
- 操作区需要在 ActionText 自身 hover 时出现，或始终占据布局空间。

以下场景通常不建议使用：

- 操作是页面主动作：使用 `Button` 或清晰的操作区；
- 文本包含复杂交互组件或需要自由排版：直接组合 Typography、Flex 和 ActionIcon；
- 编辑流程包含大量字段、分步交互或复杂提交状态：使用 Modal、Drawer 或独立表单；
- 期望跟随 Table 行 hover 展示：ActionText 只监听自身 hover，不依赖 Table 的行状态。

## 怎么使用

### 省略、复制和自定义操作

```tsx
import { EyeOutlined } from '@ant-design/icons'
import { ActionText } from '@zby/ui'

export default () => (
  <div style={{ width: 320 }}>
    <ActionText
      copyable
      ellipsis={{ rows: 2, tooltip: true }}
      actions={[
        {
          key: 'view',
          icon: <EyeOutlined />,
          label: '查看详情',
          onClick: () => console.log('view'),
        },
      ]}
    >
      一段可能需要省略、复制并查看详情的较长文本内容
    </ActionText>
  </div>
)
```

省略依赖可计算的宽度约束，因此需要由父容器、表格列宽或 `styles.root` 提供最大宽度。操作顺序固定为：复制 → 编辑 → `actions` 自定义操作。

### 自定义复制内容和反馈

```tsx
import { CheckOutlined, CopyOutlined } from '@ant-design/icons'
import { ActionText } from '@zby/ui'

export default () => (
  <ActionText
    copyable={{
      text: async () => 'ORDER-2026-0001',
      icon: [<CopyOutlined />, <CheckOutlined />],
      tooltips: ['复制订单号', '订单号已复制'],
      onCopy: () => console.log('copied'),
    }}
  >
    订单 0001
  </ActionText>
)
```

只有剪贴板写入成功后才会显示成功图标并触发 `onCopy`。成功状态保留约 3 秒。复杂 React 节点不会自动转换成适合复制的业务文本，应显式提供 `copyable.text`。

### Popover 编辑

```tsx
import { ActionText } from '@zby/ui'
import { useState } from 'react'

export default () => {
  const [name, setName] = useState('华东仓库')

  return (
    <ActionText
      editable={{
        text: name,
        title: '编辑仓库名称',
        formItemProps: {
          rules: [{ required: true, message: '请输入仓库名称' }],
        },
        onConfirm: async (value) => {
          await saveWarehouseName(value)
          setName(value)
        },
      }}
    >
      {name}
    </ActionText>
  )
}
```

- `editable.text` 是输入框的当前值，提交成功后仍由业务更新展示用的 `children`；
- `onConfirm` 返回 Promise 时确认按钮进入 loading，Promise 成功后关闭，拒绝时保留编辑现场；
- `Form.initialValues` 是唯一初始值来源，主字段值会覆盖 `formProps.initialValues` 中同路径字段；
- 每次打开都会重新同步最新的 `editable.text` 或简单 `children` 并聚焦输入框。

### 点击下钻和访问状态

有 `href` 时渲染原生链接，没有 `href` 时渲染 `type="button"` 的文本按钮：

```tsx
import { ActionText } from '@zby/ui'
import { useState } from 'react'

export default () => {
  const [visited, setVisited] = useState(false)

  return (
    <ActionText
      clickable={{
        href: '/orders/ORDER-2026-0001',
        target: '_blank',
        visited,
        onVisitedChange: setVisited,
      }}
      actionsVisibleOn="always"
      copyable={{ text: 'ORDER-2026-0001' }}
    >
      ORDER-2026-0001
    </ActionText>
  )
}
```

`target="_blank"` 且未传 `rel` 时自动补充 `noopener noreferrer`。中键或 Ctrl、Meta、Shift、Alt 修饰键点击链接时保留浏览器原生行为，不触发普通访问状态逻辑。

### 自定义编辑表单主体

`renderForm` 可以增加额外字段，确认和取消按钮仍由 ActionText 提供：

```tsx
import { ActionText } from '@zby/ui'
import { Form, Switch } from 'antd'

<ActionText
  editable={{
    name: ['product', 'name'],
    formProps: {
      initialValues: { product: { enabled: true } },
    },
    renderForm: ({ name, inputNode }) => (
      <>
        <Form.Item name={name} label="名称" rules={[{ required: true }]}>
          {inputNode}
        </Form.Item>
        <Form.Item name={['product', 'enabled']} valuePropName="checked">
          <Switch />
        </Form.Item>
      </>
    ),
    onConfirm: (value, { values }) => saveProduct(value, values),
  }}
>
  商品名称
</ActionText>
```

## Props

除下表属性外，还支持除 `children` 以外的原生 `div` 属性，例如 `id`、`className`、`style`、`onMouseEnter` 和 `data-*`。

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| prefixCls | 自定义组件类名前缀 | `string` | 由 `ConfigProvider` 生成 |
| rootClassName | 追加到最外层 div 的额外 className | `string` | - |
| children | 展示内容，也是默认复制和编辑文本来源 | `ReactNode` | - |
| ellipsis | 文本省略配置；`true` 表示单行省略并以 children 作为 Tooltip 内容 | `boolean \| ActionTextEllipsisConfig` | `true` |
| copyable | 是否显示内置复制操作；对象形式可配置文本、图标、原生 title 和回调 | `boolean \| ActionTextCopyConfig` | - |
| editable | 是否显示内置编辑操作；对象形式配置 Popover、Form 和提交逻辑 | `boolean \| ActionTextEditableConfig` | - |
| clickable | 是否让文本具备按钮/链接语义；对象形式配置链接和访问状态 | `boolean \| ActionTextClickableConfig` | - |
| actions | 追加在复制、编辑之后的自定义 ActionIcon 操作 | `ActionTextAction[]` | - |
| actionsVisibleOn | 操作区跟随自身 hover 展示，或始终展示 | `self-hover \| always` | `self-hover` |
| classNames | 语义节点 className 对象或动态回调 | `ActionTextClassNamesType` | - |
| styles | 语义节点内联样式对象或动态回调 | `ActionTextStylesType` | - |

内置复制和编辑按钮固定使用 `ActionIcon size="small"`。自定义 action 默认也是 `small`，但可以在单个 `ActionTextAction` 中显式覆盖 `size`。

### ActionTextEllipsisConfig

| 字段 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| rows | 最多显示行数 | `number` | `1` |
| tooltip | `true` 使用原始 children；也可传 Tooltip 内容或完整 Tooltip 配置；`false` 关闭提示 | `boolean \| ReactNode \| TooltipProps` | 原始 children |

`ellipsis={false}` 会关闭 Typography.Paragraph 的省略能力。

### ActionTextCopyConfig

| 字段 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| text | 复制文本；函数在点击时求值，并支持异步返回 | `string \| (() => string \| Promise<string>)` | 从 children 浅层拼接 |
| onCopy | 浏览器实际复制成功后触发 | `(event?: MouseEvent<HTMLButtonElement>) => void` | - |
| icon | 单个图标，或 `[复制前, 复制成功后]` 两个图标；`false` 使用阶段默认图标 | `ReactNode` | Copy / Check 图标 |
| tooltips | 单个原生 title，或 `[复制前, 复制成功后]` 两个 title；`false` 时不输出 title | `string \| readonly [string?, string?] \| false` | 国际化“复制/已复制” |
| format | 写入剪贴板的数据格式 | `text/plain \| text/html` | `text/plain` |
| tabIndex | 复制 ActionIcon 的 Tab 顺序 | `number` | - |

`tooltips` 保留原属性名，但现在使用浏览器原生 `title`，不再渲染 antd Tooltip，因此只接受字符串。`aria-label` 始终保留；关闭 title 不会移除复制按钮的可访问名称。

### ActionTextEditableConfig

| 字段 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| text | 主编辑字段的当前文本；优先于从 children 推导的值 | `string` | 字符串/数字 children 或空字符串 |
| open | 受控 Popover 打开状态 | `boolean` | - |
| defaultOpen | 非受控模式下的初始打开状态 | `boolean` | `false` |
| onOpenChange | 点击编辑、点击外部、确认、取消或主动关闭时的状态通知 | `(open: boolean) => void` | - |
| title | Popover 标题，同时用于编辑按钮的可访问名称 | `ReactNode` | 国际化“编辑” |
| inputType | 默认输入组件类型 | `input \| textarea` | `input` |
| inputProps | 透传给当前 Input 或 Input.TextArea | `InputProps \| TextAreaProps` | - |
| formProps | 透传给内部 Form；内部 `form`、`initialValues`、`onFinish` 最终由组件接管 | `FormProps` | - |
| formItemProps | 透传给默认 Form.Item；不能覆盖 `name` 和 `initialValue` | `Omit<FormItemProps, 'name' \| 'initialValue'>` | - |
| name | 主编辑字段路径，支持嵌套 NamePath | `NamePath` | `value` |
| confirmText | 确认按钮内容 | `ReactNode` | 国际化“确定” |
| cancelText | 取消按钮内容 | `ReactNode` | 国际化“取消” |
| confirmButtonProps | 确认 Button 属性；内部最终接管 loading 和 onClick | `ButtonProps` | - |
| cancelButtonProps | 取消 Button 属性；内部最终接管 onClick | `ButtonProps` | - |
| popoverProps | Popover 属性；不能覆盖 `content`、`open`、`onOpenChange`、`trigger` 和 `children` | `Omit<PopoverProps, 组件接管字段>` | - |
| renderForm | 自定义表单主体 | `(ctx: ActionTextEditableRenderContext) => ReactNode` | 默认 Form.Item + Input |
| onConfirm | 校验成功后触发；Promise pending 时 loading，resolve 后关闭，reject 时保持打开 | `(value, info) => void \| Promise<void>` | - |
| onCancel | 用户点击取消时触发，之后关闭 Popover | `(info) => void` | - |

#### ActionTextEditableRenderContext

| 字段 | 说明 | 类型 |
| --- | --- | --- |
| form | 内部 antd Form 实例 | `FormInstance` |
| name | 主编辑字段路径 | `NamePath` |
| inputNode | 已根据 `inputType` 和 `inputProps` 创建的默认输入节点 | `ReactNode` |
| open | 当前 Popover 打开状态 | `boolean` |
| loading | 异步确认是否正在执行 | `boolean` |
| confirm | 校验、提交并在成功后关闭 | `() => Promise<void>` |
| cancel | 调用 `onCancel` 后关闭 | `() => void` |
| close | 仅关闭，不调用 `onCancel` | `() => void` |

#### ActionTextEditableConfirmInfo

| 字段 | 说明 | 类型 |
| --- | --- | --- |
| form | 当前编辑 Form 实例 | `FormInstance` |
| values | `validateFields()` 返回的完整表单值，包括 renderForm 增加的字段 | `any` |

`onConfirm` 的第一个参数是 `form.getFieldValue(name)`，第二个参数中的 `values` 是完整表单值。

#### ActionTextEditableCancelInfo

| 字段 | 说明 | 类型 |
| --- | --- | --- |
| form | 当前编辑 Form 实例，可读取取消前的字段状态 | `FormInstance` |

### ActionTextClickableConfig

| 字段 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| href | 存在时渲染原生 a；不存在时渲染文本 button | `string` | - |
| target | 原生链接 target | `HTMLAttributeAnchorTarget` | - |
| rel | 原生链接 rel；`target="_blank"` 时自动补安全值 | `string` | `noopener noreferrer`（仅 `_blank`） |
| onClick | 普通主键点击回调 | `MouseEventHandler<HTMLElement>` | - |
| disabled | 关闭可点击语义，文本回退为普通内容 | `boolean` | `false` |
| visited | 受控访问状态 | `boolean` | - |
| defaultVisited | 非受控初始访问状态 | `boolean` | `false` |
| onVisitedChange | 请求首次进入访问状态时触发 | `(visited: boolean) => void` | - |

### ActionTextAction

`ActionTextAction` 继承除 `children`、`icon`、`title` 之外的 ActionIcon Props，因此可以配置 `onClick`、`disabled`、`danger`、`selected`、`color`、`variant`、`shape`、`size`、`classNames`、`styles` 及原生 button 属性。

| 字段 | 说明 | 类型 | 必填 |
| --- | --- | --- | --- |
| key | React 列表 key，用于稳定识别操作 | `Key` | 是 |
| icon | ActionIcon 图标 | `ReactNode` | 是 |
| label | 操作说明；字符串且未提供 title 时也作为默认可访问名称 | `ReactNode` | 否 |
| title | 原生 title；字符串时优先作为默认可访问名称 | `ReactNode` | 否 |

当 `label` 和 `title` 都不是字符串时，应显式传入 `aria-label`。

### ActionTextClassNamesType / ActionTextStylesType

```ts
type ActionTextClassNamesType =
  | Readonly<ActionTextSemanticClassNames>
  | ((info: { props: ActionTextProps }) => Readonly<ActionTextSemanticClassNames>)

type ActionTextStylesType =
  | Readonly<ActionTextSemanticStyles>
  | ((info: { props: ActionTextProps }) => Readonly<ActionTextSemanticStyles>)
```

| 字段 | 对应节点 | classNames 类型 | styles 类型 |
| --- | --- | --- | --- |
| root | 最外层 div | `string` | `CSSProperties` |
| text | Typography.Paragraph 文本节点 | `string` | `CSSProperties` |
| actions | 完整操作区容器 | `string` | `CSSProperties` |
| action | 复制、编辑和每个自定义 ActionIcon | `string` | `CSSProperties` |

动态回调中的 `props.actionsVisibleOn` 已应用默认值 `self-hover`。

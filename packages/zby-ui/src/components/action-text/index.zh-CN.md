---
category: Components
group: 通用
title: ActionText
subtitle: 操作文本
description: 在单行省略文本后承载复制、点击下钻和自定义轻量操作。
---

## 何时使用

ActionText 用于“文本是主体，操作是辅助”的数据展示场景：

- 表格单元格、列表项、描述项和详情字段中的长文本展示；
- 文本需要单行省略，并用浏览器原生 `title` 展示完整内容；
- 文本右侧需要复制或自定义图标操作；
- 文本本身需要作为链接或无跳转按钮，并记录受控/非受控访问状态；
- 操作区需要在 ActionText 自身 hover 时出现，或始终占据布局空间。

以下场景通常不建议使用：

- 操作是页面主动作：使用 `Button` 或清晰的操作区；
- 文本包含复杂交互组件或需要自由排版：直接组合 Typography、Flex 和 ActionIcon；
- 编辑、确认或弹层流程：在 `actions` 中自行放入按钮和 Popover、Modal；
- 操作区需要脱离 `@zby/ui` Table 或 ProTable、却又想跟随表格行悬停：`table-row-hover` 只在这些表格的表体里生效。

## 怎么使用

### 省略、复制和自定义操作

```tsx
import { EyeOutlined } from '@ant-design/icons'
import { ActionIcon, ActionText } from '@zby/ui'

export default () => (
  <div style={{ width: 320 }}>
    <ActionText
      ellipsis
      copyable
      actions={
        <ActionIcon
          size="small"
          icon={<EyeOutlined />}
          aria-label="查看详情"
          onClick={() => console.log('view')}
        />
      }
    >
      一段可能需要省略、复制并查看详情的较长文本内容
    </ActionText>
  </div>
)
```

单行省略依赖可计算的宽度约束，因此需要由父容器、表格列宽或 `styles.root` 提供最大宽度。操作顺序固定为：复制 → `actions`。

不写 `ellipsis` 时不省略，也不设置原生 `title`。`ellipsis` 或 `ellipsis={true}` 开启单行省略，并把 `children` 里的文本拼进原生 `title`。组件内部自行渲染、没有通过 `children` 传入的文字不会进入 `title`，这时用 `ellipsis={{ title }}` 显式给出全文。

### 多行省略

组件不提供多行省略配置。需要多行时不要写 `ellipsis`，把截断样式写到 `styles.text`：

```tsx
<ActionText
  styles={{
    text: {
      display: '-webkit-box',
      overflow: 'hidden',
      whiteSpace: 'normal',
      WebkitBoxOrient: 'vertical',
      WebkitLineClamp: 2,
    },
  }}
>
  一段需要展示两行的较长文本
</ActionText>
```

不写 `ellipsis` 时不会叠加单行 `nowrap`，也不会设置原生 `title`。根节点的 `style` 作用在外层 flex 容器上，不能用来截断内部文本。如果同时写了 `ellipsis` 和 `styles.text.WebkitLineClamp`，行数样式会盖过单行 `nowrap`，`title` 仍按 `ellipsis` 生效。

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

### 自定义弹层

编辑弹窗不再内置。业务把按钮放进 `actions`，自己实现弹层和确认。`self-hover` 在鼠标离开根节点后会隐藏操作区，弹层内容挂到 `body` 时会一起把按钮隐藏，因此弹层打开期间把 `actionsVisible` 设为 `true`。

```tsx
import { EditOutlined } from '@ant-design/icons'
import { ActionIcon, ActionText } from '@zby/ui'
import { Button, Input, Popover, Space } from 'antd'
import { useState } from 'react'

export default () => {
  const [name, setName] = useState('华东仓库')
  const [draft, setDraft] = useState(name)
  const [open, setOpen] = useState(false)

  return (
    <ActionText
      actionsVisible={open}
      actions={
        <Popover
          trigger="click"
          open={open}
          onOpenChange={(next) => {
            setOpen(next)
            if (next) setDraft(name)
          }}
          content={
            <Space orientation="vertical">
              <Input value={draft} onChange={(event) => setDraft(event.target.value)} />
              <Button
                type="primary"
                size="small"
                onClick={() => {
                  setName(draft)
                  setOpen(false)
                }}
              >
                确定
              </Button>
            </Space>
          }
        >
          <ActionIcon size="small" icon={<EditOutlined />} aria-label="编辑" />
        </Popover>
      }
    >
      {name}
    </ActionText>
  )
}
```

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

## Props

除下表属性外，还支持除 `children` 以外的原生 `div` 属性，例如 `id`、`className`、`style`、`onMouseEnter` 和 `data-*`。

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| prefixCls | 自定义组件类名前缀 | `string` | 由 `ConfigProvider` 生成 |
| rootClassName | 追加到最外层 div 的额外 className | `string` | - |
| children | 展示内容，也是默认复制文本和省略 title 来源 | `ReactNode` | - |
| ellipsis | 单行省略。不写或 `false` 关闭；`true` 用 children 中的文本作为原生 title；对象只接受 `title` | `boolean \| { title?: string }` | `false` |
| copyable | 是否显示内置复制操作；对象形式可配置文本、图标、原生 title 和回调 | `boolean \| ActionTextCopyConfig` | - |
| clickable | 是否让文本具备按钮/链接语义；对象形式配置链接和访问状态 | `boolean \| ActionTextClickableConfig` | - |
| actions | 放在复制按钮之后的自定义操作节点 | `ReactNode` | - |
| actionsVisibleOn | 操作区跟随自身 hover、表格行 hover，或始终展示 | `self-hover \| table-row-hover \| always` | `self-hover` |
| actionsVisible | 为 `true` 时强制显示操作区，供自定义弹层打开时钉住按钮 | `boolean` | `false` |
| classNames | 语义节点 className 对象或动态回调 | `ActionTextClassNamesType` | - |
| styles | 语义节点内联样式对象或动态回调 | `ActionTextStylesType` | - |

内置复制按钮固定使用 `ActionIcon size="small"`。`classNames.action` 和 `styles.action` 只作用在这个复制按钮上；自定义操作的外观由 `actions` 节点自己决定。

### ActionTextCopyConfig

| 字段 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| text | 复制文本；函数在点击时求值，并支持异步返回 | `string \| (() => string \| Promise<string>)` | 从 children 浅层拼接 |
| onCopy | 浏览器实际复制成功后触发 | `(event?: MouseEvent<HTMLButtonElement>) => void` | - |
| icon | 单个图标，或 `[复制前, 复制成功后]` 两个图标；`false` 使用阶段默认图标 | `ReactNode` | Copy / Check 图标 |
| tooltips | 单个原生 title，或 `[复制前, 复制成功后]` 两个 title；`false` 时不输出 title | `string \| readonly [string?, string?] \| false` | 国际化“复制/已复制” |
| format | 写入剪贴板的数据格式 | `text/plain \| text/html` | `text/plain` |
| tabIndex | 复制 ActionIcon 的 Tab 顺序 | `number` | - |

`tooltips` 使用浏览器原生 `title`，不再渲染 antd Tooltip，因此只接受字符串。`aria-label` 始终保留；关闭 title 不会移除复制按钮的可访问名称。

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
| text | 文本节点 | `string` | `CSSProperties` |
| actions | 完整操作区容器 | `string` | `CSSProperties` |
| action | 内置复制按钮 | `string` | `CSSProperties` |

动态回调中的 `props.actionsVisibleOn` 已应用默认值 `self-hover`，`props.actionsVisible` 已应用默认值 `false`。

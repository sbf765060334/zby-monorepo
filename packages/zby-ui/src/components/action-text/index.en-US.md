---
category: Components
group: General
title: ActionText
subtitle: Action text
description: Single-line ellipsis text with copy, click-through, and custom lightweight actions.
---

## When to use

ActionText is for cases where the text is primary and the actions are secondary:

- Long text in table cells, list items, descriptions, and detail fields;
- Single-line ellipsis with the full text in the native `title`;
- A copy action or custom icons after the text;
- Text that should be a link or a button, with controlled or uncontrolled visited state;
- Actions that appear on hover of the ActionText itself, or that always take layout space.

It is usually the wrong choice when:

- The action is a primary page action: use `Button` or a dedicated action area;
- The text contains complex interactive content: compose Typography, Flex, and ActionIcon directly;
- Editing, confirmation, or overlays are required: put the button and Popover or Modal in `actions`;
- Actions should follow a table row hover outside `@zby/ui` Table or ProTable: `table-row-hover` only works inside those table bodies.

## Examples

### Ellipsis, copy, and a custom action

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
          aria-label="View details"
          onClick={() => console.log('view')}
        />
      }
    >
      A long piece of text that may be truncated, copied, and inspected
    </ActionText>
  </div>
)
```

Single-line ellipsis needs a calculable width from the parent, a table column, or `styles.root`. Action order is fixed: copy → `actions`.

Omitting `ellipsis` leaves the text untruncated and does not set a native `title`. `ellipsis` or `ellipsis={true}` enables single-line ellipsis and joins the text inside `children` into the native `title`. Text rendered inside a component, rather than passed through `children`, is not included; pass `ellipsis={{ title }}` for that case.

### Multiple lines

There is no multi-line ellipsis option. Omit `ellipsis` and put the clamp styles on `styles.text`:

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
  A long piece of text that should wrap to two lines
</ActionText>
```

Omitting `ellipsis` does not add the single-line `nowrap` rule or a native `title`. The root `style` targets the outer flex container and cannot clamp the inner text. If `ellipsis` and `styles.text.WebkitLineClamp` are both set, the line clamp overrides `nowrap` and the title still follows `ellipsis`.

### Custom copy content

```tsx
import { CheckOutlined, CopyOutlined } from '@ant-design/icons'
import { ActionText } from '@zby/ui'

export default () => (
  <ActionText
    copyable={{
      text: async () => 'ORDER-2026-0001',
      icon: [<CopyOutlined />, <CheckOutlined />],
      tooltips: ['Copy order number', 'Order number copied'],
      onCopy: () => console.log('copied'),
    }}
  >
    Order 0001
  </ActionText>
)
```

Success feedback and `onCopy` run only after the clipboard write succeeds. Feedback remains for about three seconds. Complex React children do not automatically become useful business text; provide `copyable.text` explicitly.

### Custom overlay

ActionText does not ship an edit popover. Render the trigger in `actions` and own the overlay. `self-hover` hides the action area once the pointer leaves the root, which also hides a trigger whose popup is portaled to `body`. Set `actionsVisible` while that popup is open.

```tsx
import { EditOutlined } from '@ant-design/icons'
import { ActionIcon, ActionText } from '@zby/ui'
import { Button, Input, Popover, Space } from 'antd'
import { useState } from 'react'

export default () => {
  const [name, setName] = useState('East warehouse')
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
                Save
              </Button>
            </Space>
          }
        >
          <ActionIcon size="small" icon={<EditOutlined />} aria-label="Edit" />
        </Popover>
      }
    >
      {name}
    </ActionText>
  )
}
```

### Click-through and visited state

An `href` renders a native link. Without `href`, the text is a `type="button"` button:

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

`target="_blank"` without `rel` receives `noopener noreferrer`. Middle-click and Ctrl, Meta, Shift, or Alt clicks keep the browser's native behavior and do not run the normal visited-state logic.

## Props

Besides the props below, native `div` attributes other than `children` are supported, including `id`, `className`, `style`, `onMouseEnter`, and `data-*`.

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| prefixCls | Class name prefix | `string` | From `ConfigProvider` |
| rootClassName | Extra class on the root div | `string` | - |
| children | Display content, and the default copy text and ellipsis title | `ReactNode` | - |
| ellipsis | Single-line ellipsis. Omitted or `false` disables it; `true` uses the text inside `children` as the native title; an object accepts only `title` | `boolean \| { title?: string }` | `false` |
| type | Text tone, matching antd Typography `type` | `secondary \| success \| warning \| danger` | - |
| strong | Wrap the text in `strong` | `boolean` | `false` |
| copyable | Built-in copy action. An object configures text, icons, native title, and the callback | `boolean \| ActionTextCopyConfig` | - |
| clickable | Link or button semantics. An object configures navigation and visited state | `boolean \| ActionTextClickableConfig` | - |
| actions | Custom nodes rendered after the copy button | `ReactNode` | - |
| actionsVisibleOn | Show actions on self hover, on table row hover, or always | `self-hover \| table-row-hover \| always` | `self-hover` |
| actionsVisible | Force the action area visible, so a custom popup can keep its trigger mounted | `boolean` | `false` |
| classNames | Semantic class names, or a callback | `ActionTextClassNamesType` | - |
| styles | Semantic inline styles, or a callback | `ActionTextStylesType` | - |

The built-in copy button always uses `ActionIcon size="small"`. `classNames.action` and `styles.action` apply only to that button. Custom action appearance belongs to the `actions` node.

### ActionTextCopyConfig

| Field | Description | Type | Default |
| --- | --- | --- | --- |
| text | Copied text. A function is evaluated on click and may be async | `string \| (() => string \| Promise<string>)` | Shallow join of children |
| onCopy | Called after the browser copy succeeds | `(event?: MouseEvent<HTMLButtonElement>) => void` | - |
| icon | One icon, or `[before, after]`. `false` uses the phase default | `ReactNode` | Copy / Check icons |
| tooltips | One native title, or `[before, after]`. `false` omits the title | `string \| readonly [string?, string?] \| false` | Localized “Copy/Copied” |
| format | Clipboard data format | `text/plain \| text/html` | `text/plain` |
| tabIndex | Tab order of the copy ActionIcon | `number` | - |

`tooltips` uses the browser native `title` and accepts only strings. `aria-label` remains when the title is disabled.

### ActionTextClickableConfig

| Field | Description | Type | Default |
| --- | --- | --- | --- |
| href | Renders a native `a` when set; otherwise a text button | `string` | - |
| target | Native link target | `HTMLAttributeAnchorTarget` | - |
| rel | Native link rel. `_blank` fills the safe default when omitted | `string` | `noopener noreferrer` (only `_blank`) |
| onClick | Primary-button click callback | `MouseEventHandler<HTMLElement>` | - |
| disabled | Removes clickable semantics and renders normal text | `boolean` | `false` |
| visited | Controlled visited state | `boolean` | - |
| defaultVisited | Initial uncontrolled visited state | `boolean` | `false` |
| onVisitedChange | Called when visited first becomes true | `(visited: boolean) => void` | - |

### ActionTextClassNamesType / ActionTextStylesType

```ts
type ActionTextClassNamesType =
  | Readonly<ActionTextSemanticClassNames>
  | ((info: { props: ActionTextProps }) => Readonly<ActionTextSemanticClassNames>)

type ActionTextStylesType =
  | Readonly<ActionTextSemanticStyles>
  | ((info: { props: ActionTextProps }) => Readonly<ActionTextSemanticStyles>)
```

| Field | Node | classNames | styles |
| --- | --- | --- | --- |
| root | Outer div | `string` | `CSSProperties` |
| text | Text node | `string` | `CSSProperties` |
| actions | Action area | `string` | `CSSProperties` |
| action | Built-in copy button | `string` | `CSSProperties` |

Callback `props.actionsVisibleOn` includes its default `self-hover`. Callback `props.actionsVisible` includes its default `false`.

---
category: Components
group: General
title: ActionText
description: Adds copy, edit, click-through, and custom lightweight actions to truncated text.
---

## When To Use

ActionText is designed for data displays where text is primary and actions are secondary:

- Long text in table cells, list rows, descriptions, and detail fields;
- Single-line or multi-line ellipsis with a full-content Tooltip;
- Copy, Popover edit, or custom icon actions after the text;
- Text that behaves as a link or text button with controlled or uncontrolled visited state;
- Actions that appear when ActionText itself is hovered or remain visible at all times.

Avoid it when:

- The action is a page-level primary action. Use a labeled `Button` or a dedicated action area;
- The content contains complex interactive elements or requires free-form layout. Compose Typography, Flex, and ActionIcon directly;
- Editing needs many fields, multiple steps, or a complex submission flow. Use a Modal, Drawer, or standalone form;
- Actions are expected to follow Table row hover. ActionText observes only its own hover state and has no Table coupling.

## How To Use

### Ellipsis, copy, and a custom action

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
          label: 'View details',
          onClick: () => console.log('view'),
        },
      ]}
    >
      Long text that may need truncation, copy, and a detail action
    </ActionText>
  </div>
)
```

Ellipsis requires a calculable width constraint from the parent, a table column, or `styles.root`. Action order is fixed: copy → edit → custom `actions`.

### Custom copy content and feedback

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

### Popover editing

```tsx
import { ActionText } from '@zby/ui'
import { useState } from 'react'

export default () => {
  const [name, setName] = useState('East warehouse')

  return (
    <ActionText
      editable={{
        text: name,
        title: 'Edit warehouse name',
        formItemProps: {
          rules: [{ required: true, message: 'Enter a warehouse name' }],
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

- `editable.text` is the current input value; business code still updates displayed `children` after a successful save;
- When `onConfirm` returns a Promise, the confirm button loads until resolution. Rejection keeps the editor open;
- `Form.initialValues` is the single initial-value source, and the main field overrides the same path in `formProps.initialValues`;
- Every open synchronizes the latest `editable.text` or simple `children` and focuses the input.

### Click-through and visited state

With `href`, ActionText renders a native link. Without it, it renders a `type="button"` text button:

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

When `target="_blank"` is used without `rel`, `noopener noreferrer` is added automatically. Middle-clicks and Ctrl, Meta, Shift, or Alt modified link clicks keep native browser behavior and skip normal visited-state handling.

### Custom edit form body

`renderForm` can add fields while ActionText continues to provide confirm and cancel actions:

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
        <Form.Item name={name} label="Name" rules={[{ required: true }]}>
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
  Product name
</ActionText>
```

## Props

Native `div` attributes except `children` are also accepted, including `id`, `className`, `style`, `onMouseEnter`, and `data-*`.

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| prefixCls | Custom component class prefix | `string` | Generated by `ConfigProvider` |
| rootClassName | Additional class name for the outer div | `string` | - |
| children | Displayed content and the default copy/edit text source | `ReactNode` | - |
| ellipsis | Ellipsis configuration; `true` means one line with children as Tooltip content | `boolean \| ActionTextEllipsisConfig` | `true` |
| copyable | Enables the built-in copy action; object form configures text, icons, native title hints, and callback | `boolean \| ActionTextCopyConfig` | - |
| editable | Enables the built-in edit action; object form configures Popover, Form, and submission | `boolean \| ActionTextEditableConfig` | - |
| clickable | Gives the text link/button semantics; object form configures navigation and visited state | `boolean \| ActionTextClickableConfig` | - |
| actions | Custom ActionIcon actions appended after copy and edit | `ActionTextAction[]` | - |
| actionsVisibleOn | Shows actions on self hover or at all times | `self-hover \| always` | `self-hover` |
| classNames | Semantic class-name object or callback | `ActionTextClassNamesType` | - |
| styles | Semantic inline-style object or callback | `ActionTextStylesType` | - |

Built-in copy and edit actions always use `ActionIcon size="small"`. Custom actions also default to `small`, but each `ActionTextAction` may override `size`.

### ActionTextEllipsisConfig

| Field | Description | Type | Default |
| --- | --- | --- | --- |
| rows | Maximum displayed lines | `number` | `1` |
| tooltip | `true` uses original children; Tooltip content or full Tooltip props are also supported; `false` disables it | `boolean \| ReactNode \| TooltipProps` | Original children |

`ellipsis={false}` disables Typography.Paragraph ellipsis.

### ActionTextCopyConfig

| Field | Description | Type | Default |
| --- | --- | --- | --- |
| text | Copied text; a function is evaluated on click and may resolve asynchronously | `string \| (() => string \| Promise<string>)` | Shallow text joined from children |
| onCopy | Called after the browser actually copies successfully | `(event?: MouseEvent<HTMLButtonElement>) => void` | - |
| icon | One icon or `[before copy, after success]`; `false` falls back to the stage default | `ReactNode` | Copy / Check icons |
| tooltips | One native title or `[before copy, after success]`; `false` omits the title | `string \| readonly [string?, string?] \| false` | Localized “Copy/Copied” |
| format | Clipboard data format | `text/plain \| text/html` | `text/plain` |
| tabIndex | Copy ActionIcon tab order | `number` | - |

The `tooltips` property name is retained, but it now uses the browser-native `title` and no longer renders an antd Tooltip, so only strings are accepted. `aria-label` is always preserved; disabling the title does not remove the copy button's accessible name.

### ActionTextEditableConfig

| Field | Description | Type | Default |
| --- | --- | --- | --- |
| text | Current main-field text; takes priority over inferred children | `string` | String/number children or empty string |
| open | Controlled Popover open state | `boolean` | - |
| defaultOpen | Initial open state in uncontrolled mode | `boolean` | `false` |
| onOpenChange | State notification from edit click, outside click, confirm, cancel, or programmatic close | `(open: boolean) => void` | - |
| title | Popover title and edit-button accessible name | `ReactNode` | Localized “Edit” |
| inputType | Default input component | `input \| textarea` | `input` |
| inputProps | Props forwarded to the selected Input or Input.TextArea | `InputProps \| TextAreaProps` | - |
| formProps | Props forwarded to Form; internal `form`, `initialValues`, and `onFinish` ultimately take control | `FormProps` | - |
| formItemProps | Props for the default Form.Item; cannot override `name` or `initialValue` | `Omit<FormItemProps, 'name' \| 'initialValue'>` | - |
| name | Main field path, including nested NamePath values | `NamePath` | `value` |
| confirmText | Confirm button content | `ReactNode` | Localized “Confirm” |
| cancelText | Cancel button content | `ReactNode` | Localized “Cancel” |
| confirmButtonProps | Confirm Button props; loading and onClick are finally controlled internally | `ButtonProps` | - |
| cancelButtonProps | Cancel Button props; onClick is finally controlled internally | `ButtonProps` | - |
| popoverProps | Popover props except the component-managed content/open/trigger fields | `Omit<PopoverProps, component-managed fields>` | - |
| renderForm | Custom form body | `(ctx: ActionTextEditableRenderContext) => ReactNode` | Default Form.Item + Input |
| onConfirm | Runs after validation; Promise pending loads, resolve closes, and reject keeps the editor open | `(value, info) => void \| Promise<void>` | - |
| onCancel | Runs when the user clicks cancel, before closing | `(info) => void` | - |

#### ActionTextEditableRenderContext

| Field | Description | Type |
| --- | --- | --- |
| form | Internal antd Form instance | `FormInstance` |
| name | Main field path | `NamePath` |
| inputNode | Default input built from `inputType` and `inputProps` | `ReactNode` |
| open | Current Popover state | `boolean` |
| loading | Whether asynchronous confirm is running | `boolean` |
| confirm | Validates, submits, and closes after success | `() => Promise<void>` |
| cancel | Calls `onCancel` and closes | `() => void` |
| close | Closes without calling `onCancel` | `() => void` |

#### ActionTextEditableConfirmInfo

| Field | Description | Type |
| --- | --- | --- |
| form | Current edit Form instance | `FormInstance` |
| values | Complete result from `validateFields()`, including fields added by renderForm | `any` |

The first `onConfirm` argument is `form.getFieldValue(name)`; `info.values` contains the complete form result.

#### ActionTextEditableCancelInfo

| Field | Description | Type |
| --- | --- | --- |
| form | Current Form instance, available for reading values before cancellation | `FormInstance` |

### ActionTextClickableConfig

| Field | Description | Type | Default |
| --- | --- | --- | --- |
| href | Renders a native anchor when present; otherwise renders a text button | `string` | - |
| target | Native anchor target | `HTMLAttributeAnchorTarget` | - |
| rel | Native anchor rel; a safe value is added automatically for `_blank` | `string` | `noopener noreferrer` for `_blank` |
| onClick | Normal primary-button click handler | `MouseEventHandler<HTMLElement>` | - |
| disabled | Removes clickable semantics and renders normal text | `boolean` | `false` |
| visited | Controlled visited state | `boolean` | - |
| defaultVisited | Initial visited state in uncontrolled mode | `boolean` | `false` |
| onVisitedChange | Called when entering visited state is first requested | `(visited: boolean) => void` | - |

### ActionTextAction

`ActionTextAction` inherits ActionIcon Props except `children`, `icon`, and `title`. It can configure `onClick`, `disabled`, `danger`, `selected`, `color`, `variant`, `shape`, `size`, `classNames`, `styles`, and native button attributes.

| Field | Description | Type | Required |
| --- | --- | --- | --- |
| key | Stable React list key | `Key` | Yes |
| icon | ActionIcon glyph | `ReactNode` | Yes |
| label | Action description; a string is also the default accessible name when title is absent | `ReactNode` | No |
| title | Native title; a string takes priority as the default accessible name | `ReactNode` | No |

Provide `aria-label` explicitly when neither `label` nor `title` is a string.

### ActionTextClassNamesType / ActionTextStylesType

```ts
type ActionTextClassNamesType =
  | Readonly<ActionTextSemanticClassNames>
  | ((info: { props: ActionTextProps }) => Readonly<ActionTextSemanticClassNames>)

type ActionTextStylesType =
  | Readonly<ActionTextSemanticStyles>
  | ((info: { props: ActionTextProps }) => Readonly<ActionTextSemanticStyles>)
```

| Field | Node | classNames type | styles type |
| --- | --- | --- | --- |
| root | Outermost div | `string` | `CSSProperties` |
| text | Typography.Paragraph text node | `string` | `CSSProperties` |
| actions | Complete action-area container | `string` | `CSSProperties` |
| action | Copy, edit, and every custom ActionIcon | `string` | `CSSProperties` |

Callback `props.actionsVisibleOn` includes its default value of `self-hover`.

---
category: Components
group: General
title: ActionText
description: Displays text with lightweight trailing actions.
---

## When To Use

Use ActionText in table cells, list items, and descriptions that need ellipsis, a full-text tooltip, or lightweight copy and edit actions.

## Basic Usage

```tsx
import { EditOutlined } from '@ant-design/icons'
import { ActionText } from '@zby/ui'

export default () => (
  <ActionText
    copyable
    ellipsis={{ rows: 2, tooltip: true }}
    actions={[{ key: 'edit', icon: <EditOutlined />, label: 'Edit' }]}
  >
    Long text that may be truncated and followed by lightweight actions
  </ActionText>
)
```

## API

ActionText also accepts native `div` attributes.

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| actions | Actions rendered after the text | `ActionTextAction[]` | - |
| actionsVisibleOn | When actions become visible | `self-hover \| always` | `self-hover` |
| clickable | Click-through behavior | `boolean \| ActionTextClickableConfig` | - |
| copyable | Copy behavior compatible with antd Typography | `boolean \| ActionTextCopyConfig` | - |
| editable | Popover form editing behavior | `boolean \| ActionTextEditableConfig` | - |
| ellipsis | Ellipsis behavior backed by antd Typography.Paragraph | `boolean \| ActionTextEllipsisConfig` | `true` |
| classNames | Semantic class names as an object or callback | `ActionTextClassNamesType` | - |
| styles | Semantic inline styles as an object or callback | `ActionTextStylesType` | - |

Actions use the existing `ActionIcon` at the `small` size and inherit antd theme, CSS variable, RTL, and prefix configuration.

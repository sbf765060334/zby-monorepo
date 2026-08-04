---
category: Components
group: General
title: ActionReveal
description: Switch an action icon to inline content with a reveal animation.
---

## When To Use

Use it for lightweight inline reveal interactions in toolbars, such as opening a search or filter input from an icon.

## Basic Usage

```tsx
import { SearchOutlined } from '@ant-design/icons'
import { ActionReveal } from '@zby/ui'
import { Input, type InputRef } from 'antd'
import type { Ref } from 'react'

export default () => (
  <ActionReveal
    triggerIcon={<SearchOutlined />}
    actionIconProps={{ 'aria-label': 'Open search' }}
    width={180}
    content={({ contentProps }) => (
      <Input
        ref={contentProps.ref as Ref<InputRef>}
        className={contentProps.className}
        style={contentProps.style}
        onBlur={contentProps.onBlur}
        prefix={<SearchOutlined />}
        placeholder="Search"
      />
    )}
  />
)
```

## API

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| actionIconProps | Props passed to the closed-state `ActionIcon` | `Partial<ActionIconProps>` | - |
| autoFocus | Whether to focus the content ref after opening | `boolean` | `true` |
| className | Class name for the expanded content root | `string` | - |
| classNames | Semantic class names, as an object or a function of normalized props | `ActionRevealClassNamesType` | - |
| collapsedWidth | Reveal animation start width; uses the measured button width when omitted | `number \| string` | - |
| collapseOnBlur | Whether to collapse when content blurs | `boolean` | `true` |
| content | Expanded content render function | `ActionRevealContentRender` | - |
| defaultOpen | Whether content is expanded by default | `boolean` | `false` |
| disabled | Whether the closed-state button is disabled; inherits `ConfigProvider` when omitted | `boolean` | - |
| hidden | Whether to hide the currently rendered trigger or content | `boolean` | - |
| onOpenChange | Called when an open-state change is requested | `(open: boolean) => void` | - |
| open | Controlled open state | `boolean` | - |
| prefixCls | Custom CSS class prefix | `string` | Inherited from `ConfigProvider` |
| rootClassName | Additional class name for the expanded content root | `string` | - |
| size | Closed-state button size; inherits `ConfigProvider` when omitted | `small \| middle \| large` | - |
| style | Inline style for the expanded content root | `CSSProperties` | - |
| styles | Semantic inline styles, as an object or a function of normalized props | `ActionRevealStylesType` | - |
| triggerIcon | Closed-state button icon | `ReactNode` | - |
| width | Target expanded width; measures the content's natural width before opening when omitted | `number \| string` | - |

`contentProps` contains `className`, `style`, `ref`, `hidden`, and `onBlur`; pass them to the real content root. The `className` identifies the focus boundary of compound content. The content renderer also receives `open`, `expanded`, and `close` for observing the requested state, tracking animation state, or closing content programmatically. After content calls `close`, focus returns to the trigger once it is rendered again.

### Semantic Nodes

| Name | Description |
| --- | --- |
| trigger | Closed-state `ActionIcon` |
| content | Expanded content root |

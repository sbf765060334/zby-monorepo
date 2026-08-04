---
category: Components
group: General
title: ActionIcon
description: Lightweight icon-only action trigger.
---

## When To Use

- When an icon action should feel lighter than a regular button;
- When selected, danger, or disabled states are needed, or when wrapping the action with `Badge`;
- For compact actions in table columns and toolbars.

The icon node is marked `aria-hidden`, so icon-only actions should provide an accessible name through `aria-label`.

## Basic Usage

```tsx
import { SearchOutlined } from '@ant-design/icons'
import { ActionIcon } from '@zby/ui'

export default () => (
  <ActionIcon
    icon={<SearchOutlined />}
    aria-label="Search"
    color="primary"
    variant="filled"
  />
)
```

## API

Native button attributes are supported except `children`, `color`, and `type`. The component always renders `type="button"`.

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| children | Icon content when `icon` is omitted | `ReactNode` | - |
| classNames | Semantic class names as an object or normalized-props callback | `ActionIconClassNamesType` | - |
| color | Color aligned with antd Button color | `default \| primary \| danger \| PresetColor` | - |
| danger | Applies danger feedback; explicit `color` takes priority | `boolean` | `false` |
| disabled | Disabled state; inherits `ConfigProvider` when omitted | `boolean` | - |
| icon | Icon node; takes priority over `children` | `ReactNode` | - |
| selected | Selected state; also sets `aria-pressed` | `boolean` | `false` |
| shape | Trigger shape | `square \| circle` | `square` |
| size | Size; both the frame and glyph scale through typography and spacing tokens; `medium` is a compatibility alias | `small \| middle \| medium \| large` | Inherited from `ConfigProvider` |
| styles | Semantic inline styles as an object or normalized-props callback | `ActionIconStylesType` | - |
| variant | Visual variant; `inline` is a compact inline mode | `outlined \| dashed \| solid \| filled \| text \| link \| inline` | - |

### Semantic Nodes

| Name | Description |
| --- | --- |
| root | Native button root |
| icon | Span wrapping the icon content |

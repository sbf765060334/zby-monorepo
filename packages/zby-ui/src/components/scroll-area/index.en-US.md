---
category: Components
group: Data Display
title: ScrollArea
description: A scrollable container with configurable native or custom scrollbars.
---

## When To Use

Use ScrollArea when a bounded area needs to scroll independently from the page, such as a task list, a horizontally overflowing data region, or a two-dimensional canvas. It provides a real scrollable viewport while allowing the scrollbar appearance and behavior to be customized.

## Basic Usage

```tsx
import { ScrollArea } from '@zby/ui'

export default () => (
  <ScrollArea style={{ height: 240 }}>
    <LongList />
  </ScrollArea>
)
```

Set a definite width or height on the root container. The content inside the component determines whether the corresponding direction overflows.

## API

### ScrollArea

Except for `children`, ScrollArea accepts the standard attributes of a `div`. The forwarded ref points to the root element; use `viewportRef` to access the element that actually scrolls.

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| direction | Allowed scroll directions | `vertical \| horizontal \| both` | `vertical` |
| scrollbar | Custom scrollbar visibility strategy. `true` is equivalent to `always`; `false` hides the custom tracks | `boolean \| ScrollAreaScrollbarTrigger \| ScrollAreaScrollbarTrigger[]` | `hover` |
| wheelBehavior | Wheel handling mode. `axis-mapping` maps vertical wheel input to horizontal scrolling when only horizontal overflow exists | `native \| axis-mapping` | `axis-mapping` |
| nativeScrollbar | Keep the browser native scrollbar and do not render custom tracks or thumbs | `boolean` | `false` |
| viewportRef | Ref for the actual scrolling viewport | `React.Ref<HTMLDivElement>` | - |
| viewportProps | Native `div` attributes passed to the scrolling viewport | `ScrollAreaViewportProps` | - |
| classNames | Semantic class names for internal nodes. Accepts an object or a function receiving the resolved props | `ScrollAreaClassNamesType` | - |
| styles | Semantic inline styles for internal nodes. Accepts an object or a function receiving the resolved props | `ScrollAreaStylesType` | - |
| prefixCls | Custom CSS class prefix | `string` | From `ConfigProvider` |
| rootClassName | Stable class name added to the root element | `string` | - |
| className | Class name added to the root element | `string` | - |
| style | Inline style applied to the root element | `React.CSSProperties` | - |
| children | Scrollable content | `React.ReactNode` | - |
| onWheel | Wheel callback. It runs before the optional axis mapping logic | `React.WheelEventHandler<HTMLDivElement>` | - |

### Scrollbar Strategies

`scrollbar` controls only the custom scrollbar. The viewport remains scrollable with the wheel, touch input, keyboard, or programmatic scrolling when it is `false`.

| Value | Description |
| --- | --- |
| `hover` | Show the scrollbar while the pointer is over the root element |
| `scrolling` | Show the scrollbar while scrolling or dragging, then hide it 1200 ms after scrolling stops |
| `always` | Always show the scrollbar track |
| `['hover', 'scrolling']` | Combine multiple visibility triggers |
| `true` | Alias of `always` |
| `false` | Do not render custom tracks or thumbs |

### ScrollAreaViewportProps

`viewportProps` is passed to the actual scrolling element. Its `onScroll` and `onWheel` callbacks are composed with ScrollArea's internal behavior. `viewportProps.ref` and `viewportRef` both receive the same DOM element.

| Property | Description | Type |
| --- | --- | --- |
| className | Additional class name for the scrolling viewport | `string` |
| style | Inline style for the scrolling viewport | `React.CSSProperties` |
| ref | Ref for the scrolling viewport | `React.Ref<HTMLDivElement>` |
| onScroll | Callback invoked when the viewport scrolls | `React.UIEventHandler<HTMLDivElement>` |
| onWheel | Callback invoked for viewport wheel events | `React.WheelEventHandler<HTMLDivElement>` |

Other standard `div` attributes are also supported.

### Semantic Nodes

`classNames` and `styles` accept the following semantic node names. Use them to style the internal structure without depending on generated CSS class names.

| Name | Description |
| --- | --- |
| root | Outer ScrollArea container |
| viewport | Element that performs native scrolling |
| content | Wrapper around the supplied children |
| horizontalTrack | Horizontal scrollbar track |
| horizontalThumb | Horizontal scrollbar thumb |
| verticalTrack | Vertical scrollbar track |
| verticalThumb | Vertical scrollbar thumb |

```tsx
<ScrollArea
  direction="vertical"
  classNames={{
    viewport: 'orders-viewport',
    verticalThumb: 'orders-scroll-thumb',
  }}
  styles={{
    verticalTrack: { width: 8 },
  }}
>
  <OrderList />
</ScrollArea>
```

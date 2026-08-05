---
category: Components
group: Data Display
title: ScrollArea
description: A bounded scroll container with native or custom scrollbars, direction control, and horizontal wheel mapping.
---

## When To Use

Use ScrollArea for bounded content that needs to scroll independently from the page:

- Height-constrained lists, logs, menus, filters, or detail panels;
- Width-constrained data regions, timelines, or toolbars that scroll horizontally;
- Canvases or large content panels that may overflow in both directions;
- Consistent scrollbar visuals, hover/scroll visibility strategies, or access to the actual scrolling element;
- Horizontal regions where a standard vertical mouse wheel should move the content naturally.

Avoid it when:

- The main document should use normal page scrolling. Extra nested scroll regions can make navigation harder;
- The content has no width or height boundary. ScrollArea needs a calculable constraint before overflow can exist;
- Virtual rendering is required. ScrollArea provides the container, not list virtualization, so combine it with a virtual-list solution;
- You only need a one-off `scrollIntoView` call and do not need a separate scroll container or custom scrollbar.

## How To Use

### Basic vertical scrolling

```tsx
import { ScrollArea } from '@zby/ui'

export default () => (
  <ScrollArea style={{ height: 240 }}>
    {Array.from({ length: 30 }, (_, index) => (
      <div key={index}>Record {index + 1}</div>
    ))}
  </ScrollArea>
)
```

The default is `direction="vertical"`. Give the root a calculable height or maximum height. A vertical thumb appears only when content is taller than the viewport.

### Horizontal scrolling and wheel mapping

```tsx
<ScrollArea
  direction="horizontal"
  scrollbar="hover"
  wheelBehavior="axis-mapping"
  style={{ width: 480 }}
  styles={{ content: { width: 960, whiteSpace: 'nowrap' } }}
>
  <WideContent />
</ScrollArea>
```

The default `wheelBehavior="native"` leaves browser wheel behavior untouched. With the explicit `wheelBehavior="axis-mapping"` option, dominant vertical wheel input is converted to horizontal movement when the viewport has horizontal-only overflow. Native behavior is still preserved when:

- The content also has vertical overflow;
- The event comes from a nested ScrollArea;
- The event target is inside a nested element that can still scroll vertically;
- An application `onWheel` callback has called `preventDefault()`;
- The horizontal edge has been reached, allowing continued wheel input to return to the page or outer container instead of creating a scroll trap.

### Two-dimensional scrolling

```tsx
<ScrollArea direction="both" scrollbar="always" style={{ width: 600, height: 320 }}>
  <div style={{ width: 1200, height: 800 }}>
    <LargeCanvas />
  </div>
</ScrollArea>
```

`direction="both"` enables horizontal and vertical tracks. A usable thumb appears only when content actually overflows in that direction.

### Scrollbar visibility strategies

```tsx
<ScrollArea scrollbar="scrolling" style={{ height: 240 }}>
  <LongList />
</ScrollArea>
```

`scrollbar` selects the scrollbar implementation and custom visibility behavior. It does not disable viewport scrolling. Even with `false`, wheel, touch, keyboard, and programmatic scrolling still work.

| Configuration | Behavior |
| --- | --- |
| `hover` | Show while the pointer is inside the root |
| `scrolling` | Show while scrolling, then hide about 1200 ms after scrolling stops |
| `always` | Always show tracks that contain a thumb |
| `native` | Use browser-native scrollbars without mounting custom tracks or thumbs |
| `false` | Hide custom tracks and thumbs without disabling scrolling |

### Native browser scrollbars

```tsx
<ScrollArea scrollbar="native" direction="both" style={{ width: 600, height: 320 }}>
  <LargeContent />
</ScrollArea>
```

With `scrollbar="native"`, the viewport keeps browser-native scrollbars and does not mount custom tracks, thumbs, or the corner. `direction` still limits overflow directions.

### Accessing the actual scrolling element

```tsx
import { ScrollArea } from '@zby/ui'
import { useRef } from 'react'

export default () => {
  const viewportRef = useRef<HTMLDivElement>(null)

  return (
    <>
      <button onClick={() => viewportRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}>
        Back to top
      </button>
      <ScrollArea
        style={{ height: 240 }}
        viewportRef={viewportRef}
        viewportProps={{
          'aria-label': 'Activity log',
          onScroll: (event) => console.log(event.currentTarget.scrollTop),
        }}
      >
        <LongList />
      </ScrollArea>
    </>
  )
}
```

The component ref points to the outer root. `viewportRef` points to the element that owns `scrollTop`, `scrollLeft`, and `scrollTo()`. Put scroll listeners on `viewportProps.onScroll` as well.

### Semantic styling

```tsx
<ScrollArea
  direction="vertical"
  classNames={({ props }) => ({
    root: `orders-scroll-${props.direction}`,
    viewport: 'orders-scroll-viewport',
  })}
  styles={{
    root: { height: 280 },
    content: { padding: 12 },
    verticalTrack: { width: 10 },
    verticalThumb: { background: '#8c8c8c' },
  }}
>
  <OrderList />
</ScrollArea>
```

`classNames` and `styles` accept either an object or a function receiving the final normalized props. Prefer semantic nodes over generated CSS hash class names.

### Theming scrollbars

```tsx
import { ConfigProvider } from 'antd'
import { ScrollArea } from '@zby/ui'

<ConfigProvider
  theme={{
    components: {
      ScrollArea: {
        trackSize: 10,
        thumbBg: 'rgba(0, 0, 0, 0.28)',
        thumbHoverBg: 'rgba(0, 0, 0, 0.5)',
        zIndex: 2,
      },
    },
  }}
>
  <ScrollArea style={{ height: 240 }}>
    <LongList />
  </ScrollArea>
</ConfigProvider>
```

Use component tokens for application-wide scrollbar styling and `styles` for local instance differences.

## Props

Except for `children`, ScrollArea inherits native `div` attributes and applies them to the root. The forwarded ref also points to the root. `onWheel` is the exception: it runs in the viewport's native wheel flow and receives a native `WheelEvent` so application code can handle the event before optional axis mapping.

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| direction | Allowed overflow direction and custom tracks | `ScrollAreaDirection` | `vertical` |
| scrollbar | Scrollbar implementation and custom visibility strategy | `ScrollAreaScrollbar` | `hover` |
| wheelBehavior | Wheel-axis handling; mapping applies only to horizontal-only overflow | `ScrollAreaWheelBehavior` | `native` |
| viewportRef | Ref for the element that actually scrolls | `React.Ref<HTMLDivElement>` | - |
| viewportProps | Native `div` attributes passed to the viewport | `ScrollAreaViewportProps` | - |
| classNames | Additional class names for semantic nodes, as an object or function | `ScrollAreaClassNamesType` | - |
| styles | Inline styles for semantic nodes, as an object or function | `ScrollAreaStylesType` | - |
| prefixCls | Custom component CSS class prefix | `string` | Generated by ConfigProvider |
| rootClassName | Stable class name appended to the root | `string` | - |
| className | Native class name appended to the root | `string` | - |
| style | Native inline style on the root; matching fields override `styles.root` | `CSSProperties` | - |
| dir | Text and horizontal scroll direction; inherited from ConfigProvider when omitted | `ltr \| rtl` | From ConfigProvider or `ltr` |
| children | Scrollable content placed inside the content semantic node | `ReactNode` | - |
| onWheel | Viewport wheel callback; calling `preventDefault()` skips axis mapping for that event | `ScrollAreaWheelEventHandler` | - |

### ScrollAreaDirection

```ts
type ScrollAreaDirection = 'vertical' | 'horizontal' | 'both'
```

| Value | Viewport overflow | Custom tracks |
| --- | --- | --- |
| `vertical` | Vertical auto, horizontal hidden | Vertical |
| `horizontal` | Horizontal auto, vertical hidden | Horizontal |
| `both` | Horizontal and vertical auto | Horizontal and vertical |

### ScrollAreaScrollbar

```ts
type ScrollAreaScrollbar =
  | false
  | 'native'
  | 'hover'
  | 'scrolling'
  | 'always'
```

`hover`, `scrolling`, and `always` use custom scrollbars; `native` uses browser scrollbars; `false` hides scrollbars without disabling scrolling.

### ScrollAreaWheelBehavior

```ts
type ScrollAreaWheelBehavior = 'native' | 'axis-mapping'
```

| Value | Behavior |
| --- | --- |
| `native` | Do not modify the wheel axis; the browser and input device decide movement |
| `axis-mapping` | Map dominant vertical wheel delta to `scrollLeft` for horizontal-only overflow |

Axis mapping handles pixel, line, and page wheel delta modes and adjusts the movement sign for RTL direction.

### ScrollAreaViewportProps

```ts
type ScrollAreaViewportProps = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'children' | 'dangerouslySetInnerHTML' | 'onWheel'
> & {
  ref?: React.Ref<HTMLDivElement>
  onWheel?: ScrollAreaWheelEventHandler
}
```

`viewportProps` supports other standard `div` attributes. The following fields have additional composition rules:

| Field | Description | Type |
| --- | --- | --- |
| ref | Receives the same actual scrolling element as `viewportRef` | `React.Ref<HTMLDivElement>` |
| className | Merged with internal classes and `classNames.viewport` | `string` |
| style | Merged after `styles.viewport`, so matching declarations here take precedence | `CSSProperties` |
| onScroll | Called when the viewport scrolls | `UIEventHandler<HTMLDivElement>` |
| onWheel | Called after component-level `onWheel`; it may prevent subsequent axis mapping | `ScrollAreaWheelEventHandler` |

### ScrollAreaClassNamesType / ScrollAreaStylesType

```ts
type ScrollAreaClassNamesType =
  | Readonly<ScrollAreaSemanticClassNames>
  | ((info: { props: ScrollAreaProps }) => Readonly<ScrollAreaSemanticClassNames>)

type ScrollAreaStylesType =
  | Readonly<ScrollAreaSemanticStyles>
  | ((info: { props: ScrollAreaProps }) => Readonly<ScrollAreaSemanticStyles>)
```

Function callbacks receive final `direction`, scalar `scrollbar`, `wheelBehavior`, and `dir` values.

| Field | Node | classNames type | styles type |
| --- | --- | --- | --- |
| root | Outermost layout and state container | `string` | `CSSProperties` |
| viewport | Element that owns the native scroll position | `string` | `CSSProperties` |
| content | Wrapper around `children` | `string` | `CSSProperties` |
| horizontalTrack | Horizontal scrollbar track | `string` | `CSSProperties` |
| horizontalThumb | Horizontal scrollbar thumb | `string` | `CSSProperties` |
| verticalTrack | Vertical scrollbar track | `string` | `CSSProperties` |
| verticalThumb | Vertical scrollbar thumb | `string` | `CSSProperties` |

`ScrollAreaSemanticName` is the union of the semantic field names above.

### ScrollAreaComponentToken

Configure these values through `ConfigProvider.theme.components.ScrollArea`:

| Token | Description | Type | Default |
| --- | --- | --- | --- |
| trackSize | Visible track size; the thumb hit target extends beyond it | `number` | `8` |
| thumbBg | Default thumb background | `string` | `colorTextQuaternary` |
| thumbHoverBg | Thumb background on hover | `string` | `colorTextTertiary` |
| zIndex | Custom scrollbar stacking level | `number` | `zIndexBase + 1` |

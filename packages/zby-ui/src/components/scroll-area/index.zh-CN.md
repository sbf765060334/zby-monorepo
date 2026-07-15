---
category: Components
group: 数据展示
title: ScrollArea
subtitle: 滚动区域
description: 支持原生或自定义滚动条的滚动容器。
---

## 何时使用

当局部区域需要独立于页面滚动时使用，例如任务列表、横向溢出的数据区域或二维画布。ScrollArea 提供真实的滚动 viewport，并允许自定义滚动条的外观和行为。

## 基本用法

```tsx
import { ScrollArea } from '@zby/ui'

export default () => (
  <ScrollArea style={{ height: 240 }}>
    <LongList />
  </ScrollArea>
)
```

请为根容器设置确定的宽度或高度。组件内部内容是否溢出，决定对应方向是否可以滚动。

## API

### ScrollArea

除 `children` 外，ScrollArea 支持标准 `div` 属性。转发的 ref 指向最外层 root；需要访问真正发生滚动的元素时，请使用 `viewportRef`。

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| direction | 允许滚动的方向 | `vertical \| horizontal \| both` | `vertical` |
| scrollbar | 自定义滚动条展示策略。`true` 等同于 `always`，`false` 不展示自定义轨道 | `boolean \| ScrollAreaScrollbarTrigger \| ScrollAreaScrollbarTrigger[]` | `hover` |
| wheelBehavior | 滚轮处理方式。仅横向溢出时，`axis-mapping` 会将纵向滚轮映射为横向滚动 | `native \| axis-mapping` | `axis-mapping` |
| nativeScrollbar | 保留浏览器原生滚动条，不渲染自定义轨道和滑块 | `boolean` | `false` |
| viewportRef | 真实滚动 viewport 的 ref | `React.Ref<HTMLDivElement>` | - |
| viewportProps | 透传给滚动 viewport 的原生 `div` 属性 | `ScrollAreaViewportProps` | - |
| classNames | 内部语义节点的 className。可传对象或接收归一化 props 的回调 | `ScrollAreaClassNamesType` | - |
| styles | 内部语义节点的内联样式。可传对象或接收归一化 props 的回调 | `ScrollAreaStylesType` | - |
| prefixCls | 自定义 CSS 类名前缀 | `string` | 继承 `ConfigProvider` |
| rootClassName | 附加在 root 上的稳定类名 | `string` | - |
| className | 附加在 root 上的类名 | `string` | - |
| style | 应用于 root 的内联样式 | `React.CSSProperties` | - |
| children | 需要滚动的内容 | `React.ReactNode` | - |
| onWheel | 滚轮回调，会先于可选的轴映射逻辑执行 | `React.WheelEventHandler<HTMLDivElement>` | - |

### 滚动条展示策略

`scrollbar` 只控制自定义滚动条。设置为 `false` 后，viewport 仍可通过滚轮、触摸、键盘或代码正常滚动。

| 值 | 说明 |
| --- | --- |
| `hover` | 指针进入 root 时显示滚动条 |
| `scrolling` | 滚动或拖拽时显示，停止滚动 1200ms 后隐藏 |
| `always` | 始终显示滚动条轨道 |
| `['hover', 'scrolling']` | 组合多个展示触发条件 |
| `true` | `always` 的别名 |
| `false` | 不渲染自定义轨道和滑块 |

### ScrollAreaViewportProps

`viewportProps` 会透传给真正发生滚动的元素。其 `onScroll` 和 `onWheel` 会与 ScrollArea 的内部逻辑合并调用。`viewportProps.ref` 和 `viewportRef` 会同时收到同一个 DOM 元素。

| 属性 | 说明 | 类型 |
| --- | --- | --- |
| className | 滚动 viewport 的附加类名 | `string` |
| style | 滚动 viewport 的内联样式 | `React.CSSProperties` |
| ref | 滚动 viewport 的 ref | `React.Ref<HTMLDivElement>` |
| onScroll | viewport 滚动时触发 | `React.UIEventHandler<HTMLDivElement>` |
| onWheel | viewport 的滚轮事件回调 | `React.WheelEventHandler<HTMLDivElement>` |

同时支持其他标准 `div` 属性。

### 语义化节点

`classNames` 和 `styles` 支持以下语义节点，可在不依赖生成 CSS 类名的情况下定制内部结构。

| 名称 | 说明 |
| --- | --- |
| root | ScrollArea 最外层容器 |
| viewport | 承担原生滚动的元素 |
| content | 包裹 children 的内容容器 |
| horizontalTrack | 横向滚动条轨道 |
| horizontalThumb | 横向滚动条滑块 |
| verticalTrack | 纵向滚动条轨道 |
| verticalThumb | 纵向滚动条滑块 |

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

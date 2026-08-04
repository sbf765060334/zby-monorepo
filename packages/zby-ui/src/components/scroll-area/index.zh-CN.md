---
category: Components
group: 数据展示
title: ScrollArea
subtitle: 滚动区域
description: 支持原生或自定义滚动条、方向控制和横向滚轮映射的局部滚动容器。
---

## 何时使用

ScrollArea 适合需要独立于页面滚动的有界内容区域：

- 高度受限的列表、日志、菜单、筛选项或详情面板；
- 宽度受限但内容需要横向浏览的数据区、时间轴或工具栏；
- 横纵两个方向都可能溢出的画布或大型内容面板；
- 需要统一滚动条视觉、按 hover/滚动状态显示滚动条，或访问真实滚动节点；
- 横向区域需要把普通鼠标的纵向滚轮自然映射为横向移动。

以下场景通常不建议使用：

- 页面主体应跟随浏览器整体滚动：直接使用页面滚动，避免制造嵌套滚动区域；
- 内容尺寸没有任何边界：ScrollArea 无法仅凭内容自行产生溢出，需要父级或自身提供宽高约束；
- 需要虚拟列表能力：ScrollArea 只负责滚动容器，不负责虚拟渲染，应与虚拟列表组件组合；
- 只需要一次性执行 `scrollIntoView`，且不需要独立滚动容器或滚动条定制：使用原生 DOM 即可。

## 怎么使用

### 基本纵向滚动

```tsx
import { ScrollArea } from '@zby/ui'

export default () => (
  <ScrollArea style={{ height: 240 }}>
    {Array.from({ length: 30 }, (_, index) => (
      <div key={index}>第 {index + 1} 条记录</div>
    ))}
  </ScrollArea>
)
```

默认 `direction="vertical"`。必须为 root 提供可计算的高度或最大高度；只有内容高度超过 viewport 时，纵向 thumb 才会出现。

### 横向滚动与滚轮映射

```tsx
<ScrollArea
  direction="horizontal"
  scrollbar={['hover', 'scrolling']}
  style={{ width: 480 }}
  styles={{ content: { width: 960, whiteSpace: 'nowrap' } }}
>
  <WideContent />
</ScrollArea>
```

横向模式默认使用 `wheelBehavior="axis-mapping"`：当 viewport 只有横向溢出时，主要的纵向滚轮输入会转换为横向滚动。以下情况会保留原生行为：

- 设置 `wheelBehavior="native"`；
- 内容同时存在纵向溢出；
- 事件来自嵌套的 ScrollArea；
- 事件目标位于仍可继续纵向滚动的内部容器；
- 业务 `onWheel` 已调用 `preventDefault()`；
- 横向滚动已到边界，继续滚动会交还给页面或外层容器，避免滚动陷阱。

### 双向滚动

```tsx
<ScrollArea direction="both" scrollbar="always" style={{ width: 600, height: 320 }}>
  <div style={{ width: 1200, height: 800 }}>
    <LargeCanvas />
  </div>
</ScrollArea>
```

`direction="both"` 会同时提供横向和纵向轨道；只有对应方向实际溢出时，轨道内才会出现可操作的 thumb。

### 滚动条展示策略

```tsx
<ScrollArea scrollbar={['hover', 'scrolling']} style={{ height: 240 }}>
  <LongList />
</ScrollArea>
```

`scrollbar` 只控制自定义滚动条的可见性，不会关闭 viewport 的滚动能力。即使设置为 `false`，仍可通过滚轮、触摸、键盘或代码滚动。

| 配置 | 行为 |
| --- | --- |
| `hover` | 指针位于 root 内时显示 |
| `scrolling` | 滚动或拖拽时显示；停止滚动约 1200ms 后隐藏 |
| `always` | 始终显示存在 thumb 的轨道 |
| `['hover', 'scrolling']` | 任一触发条件满足时显示；重复项会自动去重 |
| `true` | `always` 的别名 |
| `false` | 隐藏自定义轨道和滑块，但保留滚动能力 |

### 使用浏览器原生滚动条

```tsx
<ScrollArea nativeScrollbar direction="both" style={{ width: 600, height: 320 }}>
  <LargeContent />
</ScrollArea>
```

`nativeScrollbar` 为 `true` 时，viewport 保留浏览器原生滚动条，不显示自定义 track、thumb 和 corner。`direction` 仍然控制允许溢出的方向，`scrollbar` 的自定义展示策略不再产生视觉效果。

### 获取真实滚动节点

```tsx
import { ScrollArea } from '@zby/ui'
import { useRef } from 'react'

export default () => {
  const viewportRef = useRef<HTMLDivElement>(null)

  return (
    <>
      <button onClick={() => viewportRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}>
        回到顶部
      </button>
      <ScrollArea
        style={{ height: 240 }}
        viewportRef={viewportRef}
        viewportProps={{
          'aria-label': '操作记录',
          onScroll: (event) => console.log(event.currentTarget.scrollTop),
        }}
      >
        <LongList />
      </ScrollArea>
    </>
  )
}
```

组件 `ref` 指向最外层 root；`viewportRef` 指向真正持有 `scrollTop`、`scrollLeft` 和 `scrollTo()` 的 viewport。滚动监听也应放在 `viewportProps.onScroll` 上。

### 语义化样式

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

`classNames` 和 `styles` 可以是对象，也可以是接收最终归一化 props 的函数。优先使用语义节点，不要依赖内部生成的 CSS 哈希类名。

### 通过主题配置滚动条

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

主题 token 适合统一整个应用的滚动条视觉；单个实例的局部差异使用 `styles`。

## Props

除 `children` 外，ScrollArea 继承原生 `div` 属性并把它们应用到 root。组件 ref 同样指向 root。`onWheel` 是特例：它在 viewport 的原生 wheel 流程中调用，以便业务先于横向轴映射处理事件。

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| direction | 允许滚动并生成自定义轨道的方向 | `ScrollAreaDirection` | `vertical` |
| scrollbar | 自定义滚动条的展示策略；可组合多个触发条件 | `ScrollAreaScrollbar` | `hover` |
| wheelBehavior | wheel 轴处理方式；轴映射只在纯横向溢出场景生效 | `ScrollAreaWheelBehavior` | `axis-mapping` |
| nativeScrollbar | 是否保留浏览器原生滚动条并隐藏自定义轨道 | `boolean` | `false` |
| viewportRef | 获取真正发生滚动的 viewport | `React.Ref<HTMLDivElement>` | - |
| viewportProps | 透传给 viewport 的原生 `div` 属性 | `ScrollAreaViewportProps` | - |
| classNames | 各语义节点的附加 className 对象或动态函数 | `ScrollAreaClassNamesType` | - |
| styles | 各语义节点的内联样式对象或动态函数 | `ScrollAreaStylesType` | - |
| prefixCls | 自定义组件 CSS 类名前缀 | `string` | 由 ConfigProvider 生成 |
| rootClassName | 追加到 root 的稳定 className | `string` | - |
| className | 追加到 root 的原生 className | `string` | - |
| style | 应用于 root 的原生内联样式；同名字段覆盖 `styles.root` | `CSSProperties` | - |
| dir | 文本和横向滚动方向；未传时继承 ConfigProvider | `ltr \| rtl` | 继承 ConfigProvider 或 `ltr` |
| children | 放入 content 语义节点的可滚动内容 | `ReactNode` | - |
| onWheel | viewport wheel 回调；如调用 `preventDefault()`，本次轴映射不会继续 | `WheelEventHandler<HTMLDivElement>` | - |

### ScrollAreaDirection

```ts
type ScrollAreaDirection = 'vertical' | 'horizontal' | 'both'
```

| 值 | viewport overflow | 自定义轨道 |
| --- | --- | --- |
| `vertical` | 纵向自动，横向隐藏 | 纵向 |
| `horizontal` | 横向自动，纵向隐藏 | 横向 |
| `both` | 横向和纵向均为自动 | 横向和纵向 |

### ScrollAreaScrollbar

```ts
type ScrollAreaScrollbarTrigger = 'hover' | 'scrolling' | 'always'

type ScrollAreaScrollbar =
  | boolean
  | ScrollAreaScrollbarTrigger
  | ScrollAreaScrollbarTrigger[]
```

数组用于组合触发条件，内部会去除重复值。`true` 会归一为 `['always']`，`false` 会关闭自定义滚动条显示。

### ScrollAreaWheelBehavior

```ts
type ScrollAreaWheelBehavior = 'native' | 'axis-mapping'
```

| 值 | 行为 |
| --- | --- |
| `native` | 不修改滚轮轴，由浏览器和设备决定滚动方向 |
| `axis-mapping` | 纯横向溢出时，将主要的纵向滚轮增量映射到 `scrollLeft` |

轴映射支持像素、行和页三种浏览器 wheel 增量模式，也会根据 RTL 方向调整移动符号。

### ScrollAreaViewportProps

```ts
type ScrollAreaViewportProps = React.HTMLAttributes<HTMLDivElement> & {
  ref?: React.Ref<HTMLDivElement>
}
```

`viewportProps` 支持其他标准 `div` 属性。以下字段存在额外的合并规则：

| 字段 | 说明 | 类型 |
| --- | --- | --- |
| ref | 与 `viewportRef` 同时收到同一个真实滚动节点 | `React.Ref<HTMLDivElement>` |
| className | 与内部类名及 `classNames.viewport` 合并 | `string` |
| style | 在 `styles.viewport` 之后合并，同名声明以此处为准 | `CSSProperties` |
| onScroll | viewport 发生滚动时触发 | `UIEventHandler<HTMLDivElement>` |
| onWheel | 与组件级 `onWheel` 依次调用；可阻止后续轴映射 | `WheelEventHandler<HTMLDivElement>` |

### ScrollAreaClassNamesType / ScrollAreaStylesType

```ts
type ScrollAreaClassNamesType =
  | Readonly<ScrollAreaSemanticClassNames>
  | ((info: { props: ScrollAreaProps }) => Readonly<ScrollAreaSemanticClassNames>)

type ScrollAreaStylesType =
  | Readonly<ScrollAreaSemanticStyles>
  | ((info: { props: ScrollAreaProps }) => Readonly<ScrollAreaSemanticStyles>)
```

动态函数收到的 `props` 已包含最终的 `direction`、`scrollbar`、`wheelBehavior`、`nativeScrollbar` 和 `dir`。其中 `scrollbar` 已归一为触发条件数组或 `false`。

| 字段 | 对应节点 | classNames 类型 | styles 类型 |
| --- | --- | --- | --- |
| root | 最外层布局和状态容器 | `string` | `CSSProperties` |
| viewport | 持有原生滚动位置的元素 | `string` | `CSSProperties` |
| content | 包裹 `children` 的内容容器 | `string` | `CSSProperties` |
| horizontalTrack | 横向滚动条轨道 | `string` | `CSSProperties` |
| horizontalThumb | 横向滚动条滑块 | `string` | `CSSProperties` |
| verticalTrack | 纵向滚动条轨道 | `string` | `CSSProperties` |
| verticalThumb | 纵向滚动条滑块 | `string` | `CSSProperties` |

`ScrollAreaSemanticName` 是以上语义字段名的联合类型。

### ScrollAreaComponentToken

通过 `ConfigProvider.theme.components.ScrollArea` 配置：

| Token | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| trackSize | 轨道可见尺寸；滑块命中区域会在此基础上额外扩展 | `number` | `8` |
| thumbBg | 滑块默认背景色 | `string` | `colorTextQuaternary` |
| thumbHoverBg | 滑块 hover 背景色 | `string` | `colorTextTertiary` |
| zIndex | 自定义滚动条层级 | `number` | `zIndexBase + 1` |

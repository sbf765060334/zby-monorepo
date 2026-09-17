---
category: Components
group: 数据录入
title: InputNumberRange
subtitle: 数字范围输入框
description: 将起始值和结束值作为一个整体录入、校验并提交的数字范围控件。
---

## 何时使用

InputNumberRange 适合“两个数字共同表达一个范围”的表单字段：

- 价格、金额、库存、重量、里程等最小值与最大值；
- 数量、序号或时间长度等起始值与结束值；
- 希望用户完成一轮编辑后，再以 `[start, end]` 一次性提交整个范围；
- 需要自动排序、允许单侧为空、高精度字符串或两侧统一数值规则。

以下场景通常不建议使用：

- 两侧是两个独立业务字段，需要分别校验、分别提交或分别禁用：使用两个独立的 `InputNumber`；
- 业务必须在每次按键时立即提交完整范围：使用两个受控 `InputNumber` 自行组合；
- 输入的不是数值范围：日期使用日期范围组件，普通文本使用对应的文本输入组件；
- 起始侧和结束侧需要不同的 `min`、`max`、`step` 或 `precision`：当前组件的数值规则会同时作用于两侧。

## 怎么使用

### 基本受控用法

```tsx
import { InputNumberRange } from '@zby/ui'
import { useState } from 'react'

export default () => {
  const [value, setValue] = useState<[number | null, number | null]>([10, 100])

  return (
    <InputNumberRange
      value={value}
      onChange={setValue}
      placeholder={['最低价格', '最高价格']}
      min={0}
      precision={2}
      allowClear
      prefix="¥"
    />
  )
}
```

`value[0]` 是起始值，`value[1]` 是结束值，空边界统一使用 `null`。传入 `value` 后组件进入受控模式，业务方需要在 `onChange` 中保存新值。

### 草稿与提交时机

用户输入时，值先保存在内部草稿中；以下动作会尝试提交整个范围：

- 焦点离开整个 InputNumberRange；
- 在任一输入框中按 Enter；
- 点击清空按钮，此时直接提交 `[null, null]`。

焦点只在 start 和 end 之间切换时不会提交。焦点落到组件外的可聚焦节点（例如 Form 的提交按钮）时，会在当前失焦事件处理完后尽快提交，避免按钮 click 读到旧值。`startProps.onChange`、`endProps.onChange` 用于观察单侧草稿变化，组件级 `onChange` 只在完整范围成功提交且最终值发生变化时触发。

```tsx
<InputNumberRange
  defaultValue={[10, 20]}
  startProps={{
    onChange: (start) => console.log('起始侧草稿：', start),
  }}
  endProps={{
    onChange: (end) => console.log('结束侧草稿：', end),
  }}
  onChange={(range) => console.log('已提交范围：', range)}
/>
```

当草稿不满足 `allowEmpty` 时，失焦或按 Enter 不会提交，显示值会恢复到最近一次已提交值。

### 空边界与自动排序

```tsx
<InputNumberRange
  defaultValue={[10, null]}
  allowEmpty={[false, true]}
  order
/>
```

`allowEmpty={[false, true]}` 表示 start 不能为空、end 可以为空。数组中的布尔值描述“对应一侧是否允许为空”，而不是“对应一侧是否必填”。

| 配置 | 允许提交的范围 |
| --- | --- |
| `false` | 只有 `[有值, 有值]` |
| `true` | 两侧都可以为空，包括 `[null, null]` |
| `[false, true]` | start 必须有值，end 可以为空 |
| `[true, false]` | start 可以为空，end 必须有值 |

`order` 默认为 `true`。当两侧都有值且 start 大于 end 时，**提交结果**会自动交换；已经展示的 committed 值不会因为 `order` 自动对调。例如 `value` / `defaultValue` 为 `[90, 10]` 时，未再次提交前屏幕仍显示 90～10。设置 `order={false}` 可保留用户输入顺序。点击 clear 是明确清空操作，不受 `allowEmpty` 限制。

### 高精度与超大数值

```tsx
import type { InputNumberRangeValue } from '@zby/ui'

const value: InputNumberRangeValue<string> = [
  '900719925474099312345.01',
  '900719925474099312345.99',
]

<InputNumberRange
  value={value}
  stringMode
  precision={2}
  onChange={(nextValue) => saveAmountRange(nextValue)}
/>
```

开启 `stringMode` 后，应始终以字符串保存两侧数值。自动排序会按高精度十进制字符串比较，不会先转换成 `Number`，因此不会因为超出安全整数范围而丢失精度。

### 单侧属性、整体前后缀和自定义分隔符

```tsx
import { SwapOutlined } from '@ant-design/icons'

<InputNumberRange
  id="weight-range"
  prefix="重量"
  suffix="kg"
  separator={<SwapOutlined />}
  placeholder={['最小值', '最大值']}
  startProps={{
    name: 'minWeight',
    'aria-label': '最小重量',
    'data-field': 'minimum',
  }}
  endProps={{
    name: 'maxWeight',
    placeholder: '不设上限',
    'aria-label': '最大重量',
  }}
/>
```

组件级 `prefix`、`suffix` 位于整个范围控件外缘；`startProps.prefix`、`endProps.suffix` 位于对应的单侧输入框内部。单侧 `id` 和 `placeholder` 的优先级高于组件级配置。

### 在 Form 中使用

```tsx
import { Form } from 'antd'
import { InputNumberRange } from '@zby/ui'

export default () => (
  <Form
    initialValues={{ amountRange: [100, 500] }}
    onFinish={(values) => console.log(values)}
  >
    <Form.Item
      name="amountRange"
      label="金额范围"
      rules={[
        {
          validator: (_, value) =>
            value?.[0] != null && value?.[1] != null
              ? Promise.resolve()
              : Promise.reject(new Error('请输入完整金额范围')),
        },
      ]}
    >
      <InputNumberRange min={0} precision={2} allowClear />
    </Form.Item>
  </Form>
)
```

组件的 `value` 和 `onChange` 符合 antd Form 字段约定。Form.Item 注入的 `id` 会落到 start 输入框，label 的 `htmlFor` 可以点中起始侧。范围空值是 `[null, null]`，它仍是一个非空数组，因此需要像示例一样校验数组中的两个边界，不能只依赖普通的 `required` 规则。`status`、`size`、`disabled` 和 `variant` 也会与 Form 或 ConfigProvider 的上下文保持一致；显式传入组件属性时，以显式值为准。

## Props

组件 ref 指向最外层 `div`。InputNumberRange 不透传任意 `div` 属性；单侧原生输入属性请使用 `startProps` 和 `endProps` 中已开放的字段。

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| autoFocus | 首次具备聚焦条件时自动聚焦 start；禁用或只读时不会聚焦，也不会在状态变化后反复抢焦点 | `boolean` | `false` |
| value | 受控范围值；第 0 项为 start，第 1 项为 end | `InputNumberRangeValue<T>` | - |
| defaultValue | 非受控模式的首次默认值；传入 `value` 后不再参与状态控制 | `InputNumberRangeValue<T>` | `[null, null]` |
| onChange | 完整范围成功提交且与上一次提交值不同时触发 | `(value: InputNumberRangeValue<T>) => void` | - |
| order | 两侧都有值时，是否在提交阶段自动保证 start 小于或等于 end | `boolean` | `true` |
| placeholder | start 和 end 的组件级占位文案 | `[string, string]` | 国际化“最小值 / 最大值” |
| separator | 两个输入框之间的分隔内容 | `ReactNode` | `SwapRightOutlined` |
| prefix | 整体前缀，显示在两个输入框左侧 | `ReactNode` | - |
| suffix | 整体后缀，显示在 clear 入口右侧 | `ReactNode` | - |
| allowClear | 是否显示清空入口；对象形式可替换清空图标 | `boolean \| InputNumberRangeClearConfig` | `false` |
| disabled | 整体禁用，同时作用于两侧；显式值优先于 ConfigProvider | `boolean` | 继承 ConfigProvider |
| readOnly | 整体只读；两侧仍可聚焦和复制，但不能编辑且不显示 clear | `boolean` | `false` |
| allowEmpty | 是否允许空边界；元组分别控制 start 和 end | `boolean \| [boolean, boolean]` | `false` |
| id | 字符串赋给 start，end 为 `${id}-end`；对象形式可分别配置 | `string \| InputNumberRangeIdConfig` | - |
| startProps | start 输入框的单侧属性；部分字段优先于组件级配置 | `InputNumberRangeFieldProps<T>` | - |
| endProps | end 输入框的单侧属性；部分字段优先于组件级配置 | `InputNumberRangeFieldProps<T>` | - |
| onFocus | 任一侧聚焦时触发，通过 `info.range` 区分来源 | `(event, info: InputNumberRangeFocusInfo) => void` | - |
| onBlur | 任一侧失焦时触发；回调后组件再判断焦点是否离开整个范围 | `(event, info: InputNumberRangeFocusInfo) => void` | - |
| min | 同时作用于两侧的最小值 | `InputNumberProps<T>['min']` | - |
| max | 同时作用于两侧的最大值 | `InputNumberProps<T>['max']` | - |
| step | 同时作用于两侧的步进值 | `InputNumberProps<T>['step']` | - |
| precision | 同时作用于两侧的小数精度 | `InputNumberProps<T>['precision']` | - |
| formatter | 同时作用于两侧的展示格式化函数，只改变展示文本 | `InputNumberProps<T>['formatter']` | - |
| parser | 同时作用于两侧的解析函数，将展示文本转换回真实值 | `InputNumberProps<T>['parser']` | - |
| stringMode | 以字符串保存数值，适用于高精度小数或超大整数 | `InputNumberProps<T>['stringMode']` | `false` |
| changeOnWheel | 是否允许鼠标滚轮改变两侧数值 | `InputNumberProps<T>['changeOnWheel']` | - |
| keyboard | 是否允许键盘上下键改变两侧数值 | `InputNumberProps<T>['keyboard']` | - |
| className | 最外层容器的 className | `string` | - |
| style | 最外层容器的内联样式 | `CSSProperties` | - |
| rootClassName | 追加到最外层容器的稳定 className | `string` | - |
| prefixCls | 自定义组件 CSS 类名前缀 | `string` | 由 ConfigProvider 生成 |
| size | 组件尺寸；未传时继承 ConfigProvider | `small \| middle \| large` | 继承 ConfigProvider |
| status | 校验状态；未传时可继承 Form.Item 状态 | `error \| warning` | - |
| variant | 输入框外观；显式值会传给两侧 InputNumber | `outlined \| filled \| borderless \| underlined` | 继承 ConfigProvider |

### InputNumberRangeValue

```ts
type InputNumberRangeValue<T extends string | number = string | number> = [
  T | null,
  T | null,
]
```

| 索引 | 含义 | 空值 |
| --- | --- | --- |
| `0` | start，范围起始值 | `null` |
| `1` | end，范围结束值 | `null` |

组件会把缺失值归一为 `null`，不会使用 `undefined` 表达空边界。普通模式通常使用 `number`；`stringMode` 应使用 `string`。

### InputNumberRangeFieldProps

`startProps` 和 `endProps` 只开放不会破坏范围整体行为的单侧属性。不能通过它们覆盖 `value`、`disabled`、`readOnly`、`variant`、`status`、`size`、`controls`、单侧 `min/max` 或组件内部 className。

| 字段 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| id | 单侧 input id；优先于组件级 `id` 生成结果 | `string` | - |
| placeholder | 单侧占位文案；优先于组件级对应位置 | `string` | - |
| prefix | 显示在对应 InputNumber 内部的前缀 | `ReactNode` | - |
| suffix | 显示在对应 InputNumber 内部的后缀 | `ReactNode` | - |
| tabIndex | 单侧 input 的 Tab 顺序 | `number` | - |
| name | 单侧 input 的原生 name | `string` | - |
| autoComplete | 单侧 input 的自动填充配置 | `string` | - |
| inputMode | 提示移动端使用何种软键盘 | `HTMLAttributes<HTMLInputElement>['inputMode']` | - |
| pattern | 单侧 input 的原生 pattern | `string` | - |
| aria-label | 单侧输入框的无障碍名称 | `string` | - |
| data-* | 透传到单侧输入框的数据属性 | `string \| number \| boolean \| undefined` | - |
| onChange | 单侧草稿值变化时触发；不代表完整范围已经提交 | `(value: T \| null) => void` | - |
| onFocus | 单侧聚焦回调，先于组件级 `onFocus` 调用 | `FocusEventHandler<HTMLInputElement>` | - |
| onBlur | 单侧失焦回调，先于组件级 `onBlur` 调用 | `FocusEventHandler<HTMLInputElement>` | - |
| onInput | 接收单侧原始输入文本 | `(text: string) => void` | - |
| onPressEnter | 单侧 Enter 回调；调用后组件继续尝试提交范围 | `KeyboardEventHandler<HTMLInputElement>` | - |

### InputNumberRangeClearConfig

该名称用于说明 `allowClear` 的对象结构。

| 字段 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| clearIcon | 自定义清空图标 | `ReactNode` | `CloseCircleFilled` |

只有当前展示值至少一侧非空，且组件未禁用、未只读时，clear 入口才会显示。

### InputNumberRangeIdConfig

该名称用于说明 `id` 的对象结构。

| 字段 | 说明 | 类型 |
| --- | --- | --- |
| start | start 输入框 id | `string` |
| end | end 输入框 id | `string` |

当 `id` 是字符串时赋给 start，end 为 `${id}-end`。`startProps.id`、`endProps.id` 的优先级更高。

### InputNumberRangeFocusInfo

`onFocus` 和 `onBlur` 的第二个参数结构相同：

| 字段 | 说明 | 类型 |
| --- | --- | --- |
| range | 当前事件来自哪一侧 | `start \| end` |

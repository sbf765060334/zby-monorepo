---
category: Components
group: Data Entry
title: InputNumberRange
description: A numeric range control that edits, validates, and commits start and end values as one field.
---

## When To Use

Use InputNumberRange when two numbers form one business value:

- Minimum and maximum prices, amounts, stock levels, weights, or distances;
- Start and end quantities, sequence numbers, or durations;
- The complete `[start, end]` range should be committed after an editing session;
- The field needs automatic ordering, optional boundaries, or high-precision string values.

Avoid it when:

- Both sides are independent fields that need separate validation, submission, or disabled states. Use two standalone `InputNumber` controls;
- The complete range must be submitted after every keystroke. Compose two controlled `InputNumber` controls;
- The values are not numeric. Use the matching date or text range control;
- Start and end require different `min`, `max`, `step`, or `precision` rules. Numeric rules on InputNumberRange apply to both sides.

## How To Use

### Basic controlled usage

```tsx
import { InputNumberRange } from '@zby/ui'
import { useState } from 'react'

export default () => {
  const [value, setValue] = useState<[number | null, number | null]>([10, 100])

  return (
    <InputNumberRange
      value={value}
      onChange={setValue}
      placeholder={['Minimum price', 'Maximum price']}
      min={0}
      precision={2}
      allowClear
      prefix="$"
    />
  )
}
```

`value[0]` is the start value and `value[1]` is the end value. Empty boundaries are represented by `null`. Passing `value` enables controlled mode, so application code must store the next value in `onChange`.

### Draft and commit timing

Input is held in an internal draft while the user is editing. The complete range is committed when:

- Focus leaves the whole InputNumberRange;
- Enter is pressed in either input;
- The clear control is clicked, which directly commits `[null, null]`.

Moving focus only between start and end does not commit. `startProps.onChange` and `endProps.onChange` observe per-side draft changes; the component-level `onChange` runs only after a valid range is committed and differs from the previous committed value.

```tsx
<InputNumberRange
  defaultValue={[10, 20]}
  startProps={{
    onChange: (start) => console.log('Start draft:', start),
  }}
  endProps={{
    onChange: (end) => console.log('End draft:', end),
  }}
  onChange={(range) => console.log('Committed range:', range)}
/>
```

If a draft does not satisfy `allowEmpty`, blur or Enter does not submit it and the display returns to the latest committed value.

### Empty boundaries and automatic ordering

```tsx
<InputNumberRange
  defaultValue={[10, null]}
  allowEmpty={[false, true]}
  order
/>
```

`allowEmpty={[false, true]}` means start is required and end may be empty. Each Boolean describes whether its corresponding side may be empty.

| Configuration | Committable ranges |
| --- | --- |
| `false` | Only `[value, value]` |
| `true` | Both sides may be empty, including `[null, null]` |
| `[false, true]` | Start is required; end may be empty |
| `[true, false]` | Start may be empty; end is required |

`order` defaults to `true`. If both sides have values and start is greater than end, the submitted values are swapped. Use `order={false}` to preserve input order. Clear is an explicit action and is never blocked by `allowEmpty`.

### High-precision and very large values

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

Keep both values as strings when `stringMode` is enabled. Automatic ordering compares high-precision decimal strings without first converting them to `Number`, avoiding precision loss outside the safe integer range.

### Per-side props, outer affixes, and a custom separator

```tsx
import { SwapOutlined } from '@ant-design/icons'

<InputNumberRange
  id="weight-range"
  prefix="Weight"
  suffix="kg"
  separator={<SwapOutlined />}
  placeholder={['Minimum', 'Maximum']}
  startProps={{
    name: 'minWeight',
    'aria-label': 'Minimum weight',
    'data-field': 'minimum',
  }}
  endProps={{
    name: 'maxWeight',
    placeholder: 'No upper limit',
    'aria-label': 'Maximum weight',
  }}
/>
```

Component-level `prefix` and `suffix` sit at the outer edges of the complete control. `startProps.prefix` and `endProps.suffix` are rendered inside their respective InputNumber. Per-side `id` and `placeholder` values take precedence over component-level values.

### Using with Form

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
      label="Amount range"
      rules={[
        {
          validator: (_, value) =>
            value?.[0] != null && value?.[1] != null
              ? Promise.resolve()
              : Promise.reject(new Error('Enter a complete amount range')),
        },
      ]}
    >
      <InputNumberRange min={0} precision={2} allowClear />
    </Form.Item>
  </Form>
)
```

The `value` and `onChange` contract follows antd Form field conventions. An empty range is `[null, null]`, which is still a non-empty array, so validate its two boundaries as shown instead of relying only on a standard `required` rule. `status`, `size`, `disabled`, and `variant` also integrate with Form or ConfigProvider context. Explicit component props take precedence where supported.

## Props

The forwarded ref points to the outer `div`. InputNumberRange does not forward arbitrary `div` attributes; use the explicitly supported fields in `startProps` and `endProps` for per-input native attributes.

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| autoFocus | Focus start the first time focus is allowed; disabled and read-only states prevent it | `boolean` | `false` |
| value | Controlled range; item 0 is start and item 1 is end | `InputNumberRangeValue<T>` | - |
| defaultValue | Initial value in uncontrolled mode; ignored for state control when `value` is present | `InputNumberRangeValue<T>` | `[null, null]` |
| onChange | Called when a complete range is successfully committed and differs from the previous value | `(value: InputNumberRangeValue<T>) => void` | - |
| order | Ensure start is less than or equal to end during commit when both values exist | `boolean` | `true` |
| placeholder | Component-level placeholders for start and end | `[string, string]` | Localized “Minimum / Maximum” |
| separator | Content between the two inputs | `ReactNode` | `SwapRightOutlined` |
| prefix | Outer prefix to the left of both inputs | `ReactNode` | - |
| suffix | Outer suffix to the right of the clear control | `ReactNode` | - |
| allowClear | Show the clear control; object form replaces the icon | `boolean \| InputNumberRangeClearConfig` | `false` |
| disabled | Disable both sides; an explicit value takes precedence over ConfigProvider | `boolean` | From ConfigProvider |
| readOnly | Make both sides read-only; inputs remain focusable, but clear is hidden | `boolean` | `false` |
| allowEmpty | Allow empty boundaries; a tuple controls start and end separately | `boolean \| [boolean, boolean]` | `false` |
| id | Generate both input ids from a string, or configure them separately with an object | `string \| InputNumberRangeIdConfig` | - |
| startProps | Per-side props for start; selected fields override component-level configuration | `InputNumberRangeFieldProps<T>` | - |
| endProps | Per-side props for end; selected fields override component-level configuration | `InputNumberRangeFieldProps<T>` | - |
| onFocus | Called when either side receives focus; inspect `info.range` for the source | `(event, info: InputNumberRangeFocusInfo) => void` | - |
| onBlur | Called when either side loses focus, before checking whether focus left the whole range | `(event, info: InputNumberRangeFocusInfo) => void` | - |
| min | Minimum shared by both inputs | `InputNumberProps<T>['min']` | - |
| max | Maximum shared by both inputs | `InputNumberProps<T>['max']` | - |
| step | Step shared by both inputs | `InputNumberProps<T>['step']` | - |
| precision | Decimal precision shared by both inputs | `InputNumberProps<T>['precision']` | - |
| formatter | Display formatter shared by both inputs; it changes display text only | `InputNumberProps<T>['formatter']` | - |
| parser | Parser shared by both inputs; it converts display text back to a value | `InputNumberProps<T>['parser']` | - |
| stringMode | Store values as strings for high-precision decimals or very large integers | `InputNumberProps<T>['stringMode']` | `false` |
| changeOnWheel | Allow the mouse wheel to change values on both sides | `InputNumberProps<T>['changeOnWheel']` | - |
| keyboard | Allow keyboard arrow keys to change values on both sides | `InputNumberProps<T>['keyboard']` | - |
| className | Class name of the outer container | `string` | - |
| style | Inline style of the outer container | `CSSProperties` | - |
| rootClassName | Stable class name appended to the outer container | `string` | - |
| prefixCls | Custom component CSS class prefix | `string` | Generated by ConfigProvider |
| size | Component size; inherited from ConfigProvider when omitted | `small \| middle \| large` | From ConfigProvider |
| status | Validation status; Form.Item status may be inherited when omitted | `error \| warning` | - |
| variant | Input appearance passed to both InputNumber controls | `outlined \| filled \| borderless \| underlined` | From ConfigProvider |

### InputNumberRangeValue

```ts
type InputNumberRangeValue<T extends string | number = string | number> = [
  T | null,
  T | null,
]
```

| Index | Meaning | Empty value |
| --- | --- | --- |
| `0` | Start boundary | `null` |
| `1` | End boundary | `null` |

Missing values are normalized to `null`; `undefined` is not used to represent an empty boundary. Normal mode typically uses `number`, while `stringMode` should use `string`.

### InputNumberRangeFieldProps

`startProps` and `endProps` expose only per-side fields that do not break the range contract. They cannot override `value`, `disabled`, `readOnly`, `variant`, `status`, `size`, `controls`, per-side `min/max`, or internal class names.

| Field | Description | Type | Default |
| --- | --- | --- | --- |
| id | Per-input id; takes precedence over the component-level generated id | `string` | - |
| placeholder | Per-input placeholder; takes precedence over the corresponding tuple item | `string` | - |
| prefix | Prefix rendered inside the corresponding InputNumber | `ReactNode` | - |
| suffix | Suffix rendered inside the corresponding InputNumber | `ReactNode` | - |
| tabIndex | Per-input tab order | `number` | - |
| name | Native per-input name | `string` | - |
| autoComplete | Per-input autocomplete setting | `string` | - |
| inputMode | Hint for the mobile virtual keyboard | `HTMLAttributes<HTMLInputElement>['inputMode']` | - |
| pattern | Native per-input pattern | `string` | - |
| aria-label | Accessible name for one input | `string` | - |
| data-* | Data attributes forwarded to one input | `string \| number \| boolean \| undefined` | - |
| onChange | Called when one draft value changes; the complete range has not necessarily committed | `(value: T \| null) => void` | - |
| onFocus | Per-side focus callback, called before component-level `onFocus` | `FocusEventHandler<HTMLInputElement>` | - |
| onBlur | Per-side blur callback, called before component-level `onBlur` | `FocusEventHandler<HTMLInputElement>` | - |
| onInput | Receives the raw text from one input | `(text: string) => void` | - |
| onPressEnter | Per-side Enter callback; the component then attempts to commit the range | `KeyboardEventHandler<HTMLInputElement>` | - |

### InputNumberRangeClearConfig

This documentation name describes the object form accepted by `allowClear`.

| Field | Description | Type | Default |
| --- | --- | --- | --- |
| clearIcon | Custom clear icon | `ReactNode` | `CloseCircleFilled` |

The clear control is visible only when at least one displayed value is non-empty and the component is neither disabled nor read-only.

### InputNumberRangeIdConfig

This documentation name describes the object form accepted by `id`.

| Field | Description | Type |
| --- | --- | --- |
| start | Id of the start input | `string` |
| end | Id of the end input | `string` |

A string `id` generates `${id}-start` and `${id}-end`. `startProps.id` and `endProps.id` have higher priority.

### InputNumberRangeFocusInfo

The second argument of `onFocus` and `onBlur` has the same structure:

| Field | Description | Type |
| --- | --- | --- |
| range | Side that emitted the event | `start \| end` |

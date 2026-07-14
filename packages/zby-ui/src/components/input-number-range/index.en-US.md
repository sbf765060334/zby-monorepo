---
category: Components
group: Data Entry
title: InputNumberRange
description: A numeric range control for entering start and end values.
---

## When To Use

Use InputNumberRange when a form needs a numeric interval such as minimum and maximum values, start and end quantities, or an amount range. It combines two `InputNumber` controls and handles them as one range value.

## Commit Behavior

Input values are kept as an internal draft while editing. The component attempts to commit when focus leaves the whole range or when the user presses Enter. Moving focus between the start and end inputs does not commit the range.

By default, both values are required and the component keeps the start value less than or equal to the end value. Clearing is an explicit action and directly commits `[null, null]`.

## API

### InputNumberRange

| Property      | Description                                                                                  | Type                                                 | Default                         |
| ------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------- |
| autoFocus     | Focus the start input after the first mount; disabled and read-only controls are not focused | `boolean`                                            | `false`                         |
| value         | Controlled range value. Item 0 is the start value and item 1 is the end value                | `[T \| null, T \| null]`                             | -                               |
| defaultValue  | Initial range value in uncontrolled mode                                                     | `[T \| null, T \| null]`                             | `[null, null]`                  |
| onChange      | Called when a range is committed and its final value has changed                             | `(value: [T \| null, T \| null]) => void`            | -                               |
| order         | Automatically keep the start value less than or equal to the end value when committing       | `boolean`                                            | `true`                          |
| placeholder   | Placeholders for the start and end inputs                                                    | `[string, string]`                                   | Localized defaults              |
| separator     | Content rendered between the two inputs                                                      | `React.ReactNode`                                    | `SwapRightOutlined`             |
| prefix        | Prefix rendered on the left side of the whole range control                                  | `React.ReactNode`                                    | -                               |
| suffix        | Suffix rendered on the right side of the whole range control                                 | `React.ReactNode`                                    | -                               |
| allowClear    | Show the clear button or configure a custom clear icon                                       | `boolean \| { clearIcon?: React.ReactNode }`         | `false`                         |
| disabled      | Disable the whole range and both inputs                                                      | `boolean`                                            | Inherited from `ConfigProvider` |
| readOnly      | Make the whole range and both inputs read-only                                               | `boolean`                                            | `false`                         |
| allowEmpty    | Allow empty boundaries. An array controls the start and end sides separately                 | `boolean \| [boolean, boolean]`                      | `false`                         |
| id            | A string generates `${id}-start` and `${id}-end`; an object configures both ids separately   | `string \| { start?: string; end?: string }`         | -                               |
| startProps    | Per-input props for the start input                                                          | `InputNumberRangeFieldProps<T>`                      | -                               |
| endProps      | Per-input props for the end input                                                            | `InputNumberRangeFieldProps<T>`                      | -                               |
| onFocus       | Called when either input receives focus. Use `info.range` to identify the side               | `(event, info: { range: 'start' \| 'end' }) => void` | -                               |
| onBlur        | Called when either input loses focus. Use `info.range` to identify the side                  | `(event, info: { range: 'start' \| 'end' }) => void` | -                               |
| min           | Shared minimum value for both inputs                                                         | `InputNumberProps<T>['min']`                         | -                               |
| max           | Shared maximum value for both inputs                                                         | `InputNumberProps<T>['max']`                         | -                               |
| step          | Shared step value for both inputs                                                            | `InputNumberProps<T>['step']`                        | -                               |
| precision     | Shared numeric precision for both inputs                                                     | `number`                                             | -                               |
| formatter     | Shared display formatter for both inputs                                                     | `InputNumberProps<T>['formatter']`                   | -                               |
| parser        | Shared input parser for both inputs                                                          | `InputNumberProps<T>['parser']`                      | -                               |
| stringMode    | Store values as strings for high-precision or very large numbers                             | `boolean`                                            | `false`                         |
| changeOnWheel | Change values with the mouse wheel                                                           | `boolean`                                            | -                               |
| keyboard      | Change values with the keyboard arrow keys                                                   | `boolean`                                            | -                               |
| className     | Class name of the outer container                                                            | `string`                                             | -                               |
| style         | Inline style of the outer container                                                          | `React.CSSProperties`                                | -                               |
| rootClassName | Root class name of the outer container                                                       | `string`                                             | -                               |
| prefixCls     | Custom CSS class prefix                                                                      | `string`                                             | `zby-input-number-range`        |
| size          | Component size                                                                               | `small \| middle \| large`                           | Inherited from `ConfigProvider` |
| status        | Validation status. Form.Item status is inherited                                             | `error \| warning`                                   | -                               |
| variant       | Input appearance variant. ConfigProvider variant is inherited                                | `outlined \| filled \| borderless \| underlined`     | Inherited from `ConfigProvider` |

### InputNumberRangeFieldProps

Use `startProps` and `endProps` to customize the start and end inputs separately. Per-input props take precedence over the corresponding component-level configuration.

| Property     | Description                                                                          | Type                                                  | Default |
| ------------ | ------------------------------------------------------------------------------------ | ----------------------------------------------------- | ------- |
| id           | Per-input id                                                                         | `string`                                              | -       |
| placeholder  | Per-input placeholder                                                                | `string`                                              | -       |
| prefix       | Prefix rendered inside one input                                                     | `React.ReactNode`                                     | -       |
| suffix       | Suffix rendered inside one input                                                     | `React.ReactNode`                                     | -       |
| tabIndex     | Per-input tab order                                                                  | `number`                                              | -       |
| name         | Per-input name                                                                       | `string`                                              | -       |
| autoComplete | Per-input autocomplete setting                                                       | `string`                                              | -       |
| inputMode    | Mobile keyboard hint for one input                                                   | `React.HTMLAttributes<HTMLInputElement>['inputMode']` | -       |
| pattern      | Per-input pattern                                                                    | `string`                                              | -       |
| aria-label   | Accessible label for one input                                                       | `string`                                              | -       |
| data-*       | Custom data attributes forwarded to one input                                        | `string \| number \| boolean`                         | -       |
| onChange     | Called when one input value changes; this does not mean the range has been committed | `(value: T \| null) => void`                          | -       |
| onFocus      | Per-input focus callback, called before the component-level `onFocus`                | `React.FocusEventHandler<HTMLInputElement>`           | -       |
| onBlur       | Per-input blur callback, called before the component-level `onBlur`                  | `React.FocusEventHandler<HTMLInputElement>`           | -       |
| onInput      | Called with the raw input text                                                       | `(text: string) => void`                              | -       |
| onPressEnter | Per-input Enter callback; the component then attempts to commit the range            | `React.KeyboardEventHandler<HTMLInputElement>`        | -       |

### Value Type

```ts
type InputNumberRangeValue<T extends string | number = string | number> = [T | null, T | null]
```

When `stringMode` is enabled, keep both values as strings. Automatic ordering uses high-precision string comparison to avoid precision loss from conversion to `Number`.

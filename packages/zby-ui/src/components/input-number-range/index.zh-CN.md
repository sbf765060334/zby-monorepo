---
category: Components
group: 数据录入
title: InputNumberRange
subtitle: 数字范围输入框
description: 用于录入起始值和结束值的数字范围控件。
---

## 何时使用

当业务需要录入最小值与最大值、起始数量与结束数量、金额区间等数字范围时使用。组件由两个 `InputNumber` 组成，并将两侧输入作为一个完整范围统一处理。

## 提交行为

输入过程中的值会暂存在组件内部。焦点离开整个范围组件或用户按下 Enter 时，组件才会尝试提交；在起始输入框和结束输入框之间切换焦点不会提交。

默认情况下，只有两侧都有值时才能提交，并会保证起始值小于或等于结束值。点击清空按钮属于明确的清空操作，会直接提交 `[null, null]`。

## API

### InputNumberRange

| 属性          | 说明                                                             | 类型                                                 | 默认值                   |
| ------------- | ---------------------------------------------------------------- | ---------------------------------------------------- | ------------------------ |
| autoFocus     | 首次挂载后自动聚焦起始输入框；禁用或只读时不聚焦                 | `boolean`                                            | `false`                  |
| value         | 受控范围值，第 0 项为起始值，第 1 项为结束值                     | `[T \| null, T \| null]`                             | -                        |
| defaultValue  | 非受控默认范围值                                                 | `[T \| null, T \| null]`                             | `[null, null]`           |
| onChange      | 范围提交且最终值发生变化时触发                                   | `(value: [T \| null, T \| null]) => void`            | -                        |
| order         | 提交时是否自动保证起始值小于或等于结束值                         | `boolean`                                            | `true`                   |
| placeholder   | 起始输入框和结束输入框的占位文案                                 | `[string, string]`                                   | 国际化默认文案           |
| separator     | 两个输入框之间的分隔内容                                         | `React.ReactNode`                                    | `SwapRightOutlined`      |
| prefix        | 显示在整个范围控件左侧的前缀                                     | `React.ReactNode`                                    | -                        |
| suffix        | 显示在整个范围控件右侧的后缀                                     | `React.ReactNode`                                    | -                        |
| allowClear    | 是否显示清空按钮，或配置自定义清空图标                           | `boolean \| { clearIcon?: React.ReactNode }`         | `false`                  |
| disabled      | 整体禁用，同时作用于两侧输入框                                   | `boolean`                                            | 继承 `ConfigProvider`    |
| readOnly      | 整体只读，同时作用于两侧输入框                                   | `boolean`                                            | `false`                  |
| allowEmpty    | 是否允许提交空边界；数组可分别控制起始侧和结束侧                 | `boolean \| [boolean, boolean]`                      | `false`                  |
| id            | 字符串会生成 `${id}-start` 和 `${id}-end`，对象可分别指定两侧 id | `string \| { start?: string; end?: string }`         | -                        |
| startProps    | 起始输入框的单侧属性                                             | `InputNumberRangeFieldProps<T>`                      | -                        |
| endProps      | 结束输入框的单侧属性                                             | `InputNumberRangeFieldProps<T>`                      | -                        |
| onFocus       | 任一侧聚焦时触发，通过 `info.range` 区分输入侧                   | `(event, info: { range: 'start' \| 'end' }) => void` | -                        |
| onBlur        | 任一侧失焦时触发，通过 `info.range` 区分输入侧                   | `(event, info: { range: 'start' \| 'end' }) => void` | -                        |
| min           | 两侧输入框共同的最小值                                           | `InputNumberProps<T>['min']`                         | -                        |
| max           | 两侧输入框共同的最大值                                           | `InputNumberProps<T>['max']`                         | -                        |
| step          | 两侧输入框共同的步进值                                           | `InputNumberProps<T>['step']`                        | -                        |
| precision     | 两侧输入框共同的小数精度                                         | `number`                                             | -                        |
| formatter     | 两侧输入框共同的展示格式化函数                                   | `InputNumberProps<T>['formatter']`                   | -                        |
| parser        | 两侧输入框共同的输入解析函数                                     | `InputNumberProps<T>['parser']`                      | -                        |
| stringMode    | 是否使用字符串保存数值，适用于高精度或超大数值                   | `boolean`                                            | `false`                  |
| changeOnWheel | 是否允许鼠标滚轮修改数值                                         | `boolean`                                            | -                        |
| keyboard      | 是否允许使用键盘上下键修改数值                                   | `boolean`                                            | -                        |
| className     | 外层容器 className                                               | `string`                                             | -                        |
| style         | 外层容器内联样式                                                 | `React.CSSProperties`                                | -                        |
| rootClassName | 外层根 className                                                 | `string`                                             | -                        |
| prefixCls     | 自定义样式类名前缀                                               | `string`                                             | `zby-input-number-range` |
| size          | 组件尺寸                                                         | `small \| middle \| large`                           | 继承 `ConfigProvider`    |
| status        | 校验状态，会继承 `Form.Item` 状态                                | `error \| warning`                                   | -                        |
| variant       | 输入框外观变体，会继承 `ConfigProvider`                          | `outlined \| filled \| borderless \| underlined`     | 继承 `ConfigProvider`    |

### InputNumberRangeFieldProps

`startProps` 和 `endProps` 分别用于定制起始输入框和结束输入框。单侧属性优先于对应的组件级配置。

| 属性         | 说明                                              | 类型                                                  | 默认值 |
| ------------ | ------------------------------------------------- | ----------------------------------------------------- | ------ |
| id           | 单侧输入框 id                                     | `string`                                              | -      |
| placeholder  | 单侧占位文案                                      | `string`                                              | -      |
| prefix       | 单侧输入框内部前缀                                | `React.ReactNode`                                     | -      |
| suffix       | 单侧输入框内部后缀                                | `React.ReactNode`                                     | -      |
| tabIndex     | 单侧输入框 tab 顺序                               | `number`                                              | -      |
| name         | 单侧输入框 name                                   | `string`                                              | -      |
| autoComplete | 单侧输入框自动填充配置                            | `string`                                              | -      |
| inputMode    | 单侧输入框的移动端键盘提示类型                    | `React.HTMLAttributes<HTMLInputElement>['inputMode']` | -      |
| pattern      | 单侧输入框 pattern                                | `string`                                              | -      |
| aria-label   | 单侧输入框无障碍标签                              | `string`                                              | -      |
| data-*       | 透传给单侧输入框的自定义数据属性                  | `string \| number \| boolean`                         | -      |
| onChange     | 单侧输入内容变化时触发，不代表整个范围已经提交    | `(value: T \| null) => void`                          | -      |
| onFocus      | 单侧聚焦时触发，先于组件级 `onFocus`              | `React.FocusEventHandler<HTMLInputElement>`           | -      |
| onBlur       | 单侧失焦时触发，先于组件级 `onBlur`               | `React.FocusEventHandler<HTMLInputElement>`           | -      |
| onInput      | 单侧原始输入文本变化时触发                        | `(text: string) => void`                              | -      |
| onPressEnter | 单侧按下 Enter 时触发，随后组件会尝试提交整个范围 | `React.KeyboardEventHandler<HTMLInputElement>`        | -      |

### 值类型

```ts
type InputNumberRangeValue<T extends string | number = string | number> = [T | null, T | null]
```

开启 `stringMode` 时，应使用字符串保存两侧数值。组件的自动排序会使用高精度字符串比较，避免转换为 `Number` 导致精度丢失。

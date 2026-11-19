# ProTable 内置金额列

金额列通过 `fieldProps.intlProps` 接收 `Intl.NumberFormatOptions`，与数字列使用相同的配置入口。金额渲染调用 `@zby/intl` 的 `formatNumber(locale, value, options)`，与 `intl.formatNumber` 共用底层实现。

```tsx
{
  title: '金额',
  dataIndex: 'amount',
  valueType: { type: 'money', currency: 'CNY', locale: 'zh-CN' },
  fieldProps: {
    intlProps: {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
      useGrouping: true,
    },
  },
}
```

示例金额的数值部分：`1` 显示为 `1.00`，`1.234` 显示为 `1.234`，`1.23456` 显示为 `1.2346`。`fieldProps` 也可以是 `(value, record, index) => ({ intlProps: ... })`，按行决定选项。

未配置小数位选项时，仍使用 `valueType.precision ?? fieldProps.precision ?? 2` 同时设置最小、最大小数位。`intlProps` 中显式配置的小数位优先于 `precision`；只传最小位数时，最大位数至少为该值；只传最大位数时，最小位数最多为该值。只有隐式的默认位数会被调整，同时显式指定最小位数大于最大位数时由原生 Intl 抛出 `RangeError`。其他非法选项也保留 Intl 的校验行为。

`currency`、`locale` 继续使用 `valueType`、`fieldProps`、默认值的优先级；默认币种为 `CNY`、地区为 `zh-CN`。货币符号由 `showSymbol`、`moneySymbol` 控制，自定义前缀由 `fieldProps.customSymbol` 控制。三种符号模式都支持 `intlProps`；其中的 `style`、`currency` 不覆盖金额列原有币种和符号控制。其他选项（例如分组、符号展示、有效数字等）按 Intl 原生规则生效。

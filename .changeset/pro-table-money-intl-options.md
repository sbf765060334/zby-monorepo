---
"@zby/pro": minor
---

金额列新增 fieldProps.intlProps 格式化选项透传，支持独立配置 minimumFractionDigits 和 maximumFractionDigits，以及分组等 Intl.NumberFormatOptions。显式小数位优先于 precision，只调整未显式配置的另一侧位数，保留默认固定两位及原有币种、符号行为；统一调用 @zby/intl 的 formatNumber，补充配置类型提示、使用文档和回归测试。

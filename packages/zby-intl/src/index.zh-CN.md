---
category: Utilities
group: 国际化
title: '@zby/intl'
subtitle: 国际化
description: 基于 i18next 的 ZBY React 国际化基础设施。
---

## 何时使用

`@zby/intl` 用于在 ZBY 组件库和业务应用之间共享同一个国际化上下文。它负责注册语言资源、响应受控的语言状态，并统一提供文案读取、日期格式化和数字格式化能力。

底层使用 `i18next` 和 `react-i18next`。业务应用只需要在根节点配置一次 `ZbyIntlProvider`，组件库和业务组件即可通过 `useIntl` 使用同一个实例。

## 基本用法

```tsx
import { mergeIntlResources, ZbyIntlProvider } from '@zby/intl'
import { zbyProLocales } from '@zby/pro'
import { zbyUiLocales } from '@zby/ui'
import { useState } from 'react'
import { appLocales } from './locales'

const resources = mergeIntlResources(zbyUiLocales, zbyProLocales, appLocales)

export default function AppRoot() {
  const [locale, setLocale] = useState('zh-CN')

  return (
    <ZbyIntlProvider
      locale={locale}
      fallbackLocale="zh-CN"
      resources={resources}
    >
      <button type="button" onClick={() => setLocale('en-US')}>
        English
      </button>
      <App />
    </ZbyIntlProvider>
  )
}
```

`locale` 是受控属性。语言偏好、持久化和切换入口由业务状态负责，Provider 只负责把最新的 `locale` 同步给 i18next。

## 语言资源

语言资源以 locale 为第一层键，文案支持嵌套对象：

```ts
export const appLocales = {
  'zh-CN': {
    app: {
      greeting: '你好，{{name}}',
    },
  },
  'en-US': {
    app: {
      greeting: 'Hello, {{name}}',
    },
  },
}
```

使用 `mergeIntlResources` 合并组件库和业务语言包。相同 locale 下的文案会深度合并；同名 key 以后传入的资源为准，因此业务应用可以覆盖组件库默认文案。

```ts
const resources = mergeIntlResources(
  zbyUiLocales,
  zbyProLocales,
  appLocales,
)
```

## 读取文案

```tsx
import { useIntl } from '@zby/intl'

function Greeting() {
  const intl = useIntl()

  return (
    <>
      <p>{intl.getMessage('app.greeting', '你好，{{name}}', { name: 'ZBY' })}</p>
      <p>{intl.formatDate(new Date())}</p>
      <p>{intl.formatNumber(123456.78)}</p>
    </>
  )
}
```

组件库推荐使用 `getMessage` 并提供 `defaultMessage`。语言包缺少 key 时，界面会显示默认文案，而不是直接暴露文案 key。

## 非 React 用法

工具函数、测试或服务端预处理可以使用 `createIntl`：

```ts
import { createIntl } from '@zby/intl'

const intl = createIntl({
  locale: 'zh-CN',
  fallbackLocale: 'zh-CN',
  resources: appLocales,
})

intl.getMessage('app.greeting', '你好，{{name}}', { name: 'ZBY' })
```

## API

### ZbyIntlProvider

`IntlProvider` 是 `ZbyIntlProvider` 的别名。

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| locale | 当前生效语言，由业务状态控制 | `string` | 必填 |
| fallbackLocale | 当前语言缺少文案时使用的兜底语言 | `string` | `zh-CN` |
| resources | 注册到 i18next 的语言资源 | `IntlResources` | `{}` |
| defaultNamespace | 默认 i18next namespace | `string` | `translation` |
| i18n | 复用业务已有的 i18next 实例 | `i18n` | 内部创建 |
| children | 使用国际化上下文的 React 子节点 | `React.ReactNode` | - |

### useIntl

`useIntl()` 返回 `IntlShape`：

| 字段 | 说明 | 类型 |
| --- | --- | --- |
| locale | i18next 当前解析后的语言 | `string` |
| fallbackLocale | Provider 配置的兜底语言 | `string` |
| i18n | 原始 i18next 实例，供高级场景使用 | `i18n` |
| t | 接近 i18next `t` 的翻译方法 | `(id, options?) => string` |
| getMessage | 支持默认文案和插值的推荐方法 | `(id, defaultMessage?, values?) => string` |
| formatMessage | `getMessage` 的语义化别名 | `(id, values?, defaultMessage?) => string` |
| formatDate | 按当前 locale 格式化日期 | `(value, options?) => string` |
| formatNumber | 按当前 locale 格式化数字 | `(value, options?) => string` |

### 资源工具

| 方法 | 说明 |
| --- | --- |
| mergeIntlResources | 按 locale 深度合并多份资源，后传入的资源优先级更高 |
| normalizeResources | 将轻量资源结构转换为 i18next namespace 结构 |

### 创建与格式化工具

| 方法 | 说明 |
| --- | --- |
| createIntl | 创建可在非 React 场景使用的 `IntlShape` |
| createI18n | 创建一份独立的 i18next 实例 |
| createIntlShape | 将已有 i18next 实例包装为 `IntlShape` |
| formatDate | 使用指定 locale 格式化日期 |
| formatNumber | 使用指定 locale 格式化数字 |


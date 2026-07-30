---
category: Utilities
group: Internationalization
title: '@zby/intl'
description: Shared i18next-based internationalization infrastructure for ZBY React packages.
---

## When To Use

Use `@zby/intl` to share one internationalization context across ZBY component packages and an application. It registers locale resources, follows a controlled locale value, and provides consistent message lookup, date formatting, and number formatting.

The package uses `i18next` and `react-i18next` internally. Configure `ZbyIntlProvider` once at the application root, then use the same instance from both library and application components through `useIntl`.

## Basic Usage

```tsx
import { mergeIntlResources, ZbyIntlProvider } from '@zby/intl'
import { zbyProLocales } from '@zby/pro'
import { zbyUiLocales } from '@zby/ui'
import { useState } from 'react'
import { appLocales } from './locales'

const resources = mergeIntlResources(zbyUiLocales, zbyProLocales, appLocales)

export default function AppRoot() {
  const [locale, setLocale] = useState('en-US')

  return (
    <ZbyIntlProvider
      locale={locale}
      fallbackLocale="zh-CN"
      resources={resources}
    >
      <button type="button" onClick={() => setLocale('zh-CN')}>
        简体中文
      </button>
      <App />
    </ZbyIntlProvider>
  )
}
```

`locale` is controlled. The application owns locale preference, persistence, and switching; the provider only synchronizes the latest `locale` value to i18next.

## Locale Resources

Resources use the locale as the first-level key and support nested message objects:

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

Use `mergeIntlResources` to combine component and application resources. Messages under the same locale are deeply merged. Later resources override matching keys, allowing an application to replace default component copy.

```ts
const resources = mergeIntlResources(
  zbyUiLocales,
  zbyProLocales,
  appLocales,
)
```

## Reading Messages

```tsx
import { useIntl } from '@zby/intl'

function Greeting() {
  const intl = useIntl()

  return (
    <>
      <p>{intl.getMessage('app.greeting', 'Hello, {{name}}', { name: 'ZBY' })}</p>
      <p>{intl.formatDate(new Date())}</p>
      <p>{intl.formatNumber(123456.78)}</p>
    </>
  )
}
```

Component packages should prefer `getMessage` with a `defaultMessage`. When a key is missing from the locale resources, the UI displays the default copy instead of exposing the message key.

## Non-React Usage

Use `createIntl` in utilities, tests, or server-side preprocessing:

```ts
import { createIntl } from '@zby/intl'

const intl = createIntl({
  locale: 'en-US',
  fallbackLocale: 'zh-CN',
  resources: appLocales,
})

intl.getMessage('app.greeting', 'Hello, {{name}}', { name: 'ZBY' })
```

## API

### ZbyIntlProvider

`IntlProvider` is an alias of `ZbyIntlProvider`.

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| locale | Active locale controlled by application state | `string` | Required |
| fallbackLocale | Locale used when the active locale is missing a message | `string` | `zh-CN` |
| resources | Locale resources registered with i18next | `IntlResources` | `{}` |
| defaultNamespace | Default i18next namespace | `string` | `translation` |
| i18n | Existing i18next instance supplied by the application | `i18n` | Created internally |
| children | React children that consume the internationalization context | `React.ReactNode` | - |

### useIntl

`useIntl()` returns `IntlShape`:

| Field | Description | Type |
| --- | --- | --- |
| locale | Locale currently resolved by i18next | `string` |
| fallbackLocale | Fallback locale configured on the provider | `string` |
| i18n | Raw i18next instance for advanced use cases | `i18n` |
| t | Translation method close to i18next `t` | `(id, options?) => string` |
| getMessage | Recommended method with default copy and interpolation | `(id, defaultMessage?, values?) => string` |
| formatMessage | Semantic alias of `getMessage` | `(id, values?, defaultMessage?) => string` |
| formatDate | Format a date with the active locale | `(value, options?) => string` |
| formatNumber | Format a number with the active locale | `(value, options?) => string` |

### Resource Utilities

| Function | Description |
| --- | --- |
| mergeIntlResources | Deeply merge resources by locale; later resources have higher priority |
| normalizeResources | Convert the lightweight resource shape to the i18next namespace shape |

### Creation And Formatting Utilities

| Function | Description |
| --- | --- |
| createIntl | Create an `IntlShape` for non-React use cases |
| createI18n | Create an isolated i18next instance |
| createIntlShape | Wrap an existing i18next instance as `IntlShape` |
| formatDate | Format a date with a specified locale |
| formatNumber | Format a number with a specified locale |


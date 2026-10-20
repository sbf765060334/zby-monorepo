---
category: Components
group: Internationalization
title: mergeLocales
subtitle: Merge locale packs
description: Combine one language's antd locale and internal messages into a single pack.
---

## When To Use

The application decides which languages it supports. Call `mergeLocales` once per language, then pass the `ZbyLocalePack` results to `ReactRouterProLayout` through `locales`.

Pages outside ProLayout use the same pack: `pack.antd` goes to antd `ConfigProvider`, and `toIntlResources(pack)` goes to `ZbyIntlProvider`.

`mergeIntlResources` from `@zby/intl` only merges `{ 'zh-CN': messageTree }`. It does not know about antd locales, so assembling a locale pack stays in `@zby/ui`.

## What A Pack Contains

| Field | Consumer | Description |
| --- | --- | --- |
| `locale` | ProLayout, `ZbyIntlProvider` | Language code, for example `zh-CN`. Every pack in one `mergeLocales` call must use the same code. |
| `antd` | antd `ConfigProvider` | The antd locale. It is not visible to `getMessage`. |
| Other fields | `getMessage` | `zby` holds component messages. Applications can add their own top-level fields. |

`toIntlResources(pack)` removes `locale` and `antd` and returns `{ 'zh-CN': messageTree }`. ProLayout registers every language in the list, then falls back to `zh-CN` when a message is missing.

## Pass It To ProLayout

```tsx
import antdZhCN from 'antd/locale/zh_CN'
import antdEnUS from 'antd/locale/en_US'
import { ReactRouterProLayout } from '@zby/pro'
import { mergeLocales } from '@zby/ui'
import uiZhCN from '@zby/ui/locale/zh_CN'
import uiEnUS from '@zby/ui/locale/en_US'
import proZhCN from '@zby/pro/locale/zh_CN'
import proEnUS from '@zby/pro/locale/en_US'

const locales = [
  {
    key: 'zh-CN',
    label: '简体中文',
    pack: mergeLocales({ antd: antdZhCN, packs: [uiZhCN, proZhCN, appZhCN] }),
  },
  {
    key: 'en-US',
    label: 'English',
    pack: mergeLocales({ antd: antdEnUS, packs: [uiEnUS, proEnUS, appEnUS] }),
  },
]

export default function AppRoot() {
  return (
    <ReactRouterProLayout
      router={router}
      title="Digital Platform"
      locales={locales}
      defaultLocale="zh-CN"
    />
  )
}
```

`key` must match the pack `locale`. The header shows `label` in that language's own wording.

## Compose It Outside The Layout

```tsx
import { ZbyIntlProvider } from '@zby/intl'
import { toIntlResources } from '@zby/ui'
import { App, ConfigProvider } from 'antd'

const zhCN = mergeLocales({ antd: antdZhCN, packs: [uiZhCN, appZhCN] })

export default function LoginPage() {
  return (
    <ConfigProvider locale={zhCN.antd}>
      <App>
        <ZbyIntlProvider locale={zhCN.locale} resources={toIntlResources(zhCN)}>
          <LoginForm />
        </ZbyIntlProvider>
      </App>
    </ConfigProvider>
  )
}
```

This tree has only one language, so there is no other pack to fall back to.

## Merge Rules

- At least one pack must include `locale`. An antd locale by itself is not enough.
- Every `locale` in one call must match. `zh-CN` and `en-US` cannot be merged into one pack.
- antd may write `locale` as `zh-cn`, `zh_CN`, or as `en` for `en_US`. Region, case, and `_` / `-` do not have to match the pack character for character.
- Message objects merge deeply. A later pack overrides an earlier key. If either side is not an object, the later value replaces the earlier one.
- When `antd/locale/zh_CN` arrives wrapped as `{ default: locale }`, that extra layer is removed before it reaches `ConfigProvider`.

## API

### mergeLocales

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| antd | antd locale for this language | `AntdLocale` | - |
| packs | ui, pro, and application packs | `ZbyLocalePack[]` | `[]` |

The return value is one `ZbyLocalePack`.

### toIntlResources

| Argument | Description | Type |
| --- | --- | --- |
| pack | A `mergeLocales` result, or any `ZbyLocalePack` | `ZbyLocalePack` |

Returns `{ [pack.locale]: message tree without locale and antd }`.

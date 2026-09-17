---
category: Components
group: Globalization
title: ZbyConfigProvider
description: Inject the current antd, zby-ui, zby-pro, and application locale in one provider.
---

## When To Use

Use `ZbyConfigProvider` at the application root instead of nesting `ConfigProvider`, `App`, and `ZbyIntlProvider` yourself. Import the current-language packs you actually use, assemble them with `mergeLocales`, and pass the result in.

## Basic Usage

```tsx
import antdZhCN from 'antd/locale/zh_CN'
import antdEnUS from 'antd/locale/en_US'
import { mergeLocales, ZbyConfigProvider } from '@zby/ui'
import uiZhCN from '@zby/ui/locale/zh_CN'
import uiEnUS from '@zby/ui/locale/en_US'
import proZhCN from '@zby/pro/locale/zh_CN'
import proEnUS from '@zby/pro/locale/en_US'
import { ReactRouterProLayout } from '@zby/pro'

const locales = {
  'zh-CN': mergeLocales({ antd: antdZhCN, packs: [uiZhCN, proZhCN, appZhCN] }),
  'en-US': mergeLocales({ antd: antdEnUS, packs: [uiEnUS, proEnUS, appEnUS] }),
}

export default function AppRoot() {
  return (
    <ZbyConfigProvider locale={locales['en-US']} theme={{ cssVar: true }}>
      <ReactRouterProLayout />
    </ZbyConfigProvider>
  )
}
```

`mergeLocales` stores the antd locale on `pack.antd` and deeply merges the remaining packs for `getMessage`. Later packs override earlier keys. Every pack must share the same `locale` code.

Pass `app={false}` on nested providers that only override `prefixCls` or RTL, so a second antd `App` is not mounted.

## API

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| locale | Current-language pack from `mergeLocales` | `ZbyLocalePack` | Required |
| fallbackLocale | i18next fallback language | `string` | `zh-CN` |
| app | Wrap antd `App`, or pass `App` props | `boolean \| AppProps` | `true` |
| ... | Other antd `ConfigProvider` props except `locale` | `ConfigProviderProps` | - |

---
category: Components
group: 全局化配置
title: ZbyConfigProvider
subtitle: 全局化配置
description: 一次注入 antd、zby-ui、zby-pro 与业务当前语言。
---

## 何时使用

应用根节点用 `ZbyConfigProvider` 代替分别套 `ConfigProvider`、`App` 和 `ZbyIntlProvider`。业务显式 import 当前语言的 antd / ui / pro / 项目语言包，用 `mergeLocales` 装成一份 pack 再传入。

## 基本用法

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
    <ZbyConfigProvider locale={locales['zh-CN']} theme={{ cssVar: true }}>
      <ReactRouterProLayout />
    </ZbyConfigProvider>
  )
}
```

`mergeLocales` 把 antd 语言包放到 `pack.antd`，把其余 pack 深合并后留给 `getMessage`。后写入的 pack 覆盖先写入的同名 key。所有 pack 的 `locale` 必须一致。

内层只想改 `prefixCls` 或 RTL 时传 `app={false}`，避免再挂一层 antd `App`。

## API

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| locale | `mergeLocales` 产出的当前语言 pack | `ZbyLocalePack` | 必填 |
| fallbackLocale | i18next 兜底语言 | `string` | `zh-CN` |
| app | 是否包裹 antd `App`；也可传入 `App` 的配置 | `boolean \| AppProps` | `true` |
| ... | 其余透传给 antd `ConfigProvider`（不含 `locale`） | `ConfigProviderProps` | - |

---
category: Components
group: 国际化
title: mergeLocales
subtitle: 合并语言包
description: 把一种语言的 antd 语言包和内部文案收成一份材料。
---

## 何时使用

业务自己准备当前要支持的语言。每种语言调用一次 `mergeLocales`，得到一份 `ZbyLocalePack`，再交给 `ReactRouterProLayout` 的 `locales`。

不用 ProLayout 的页面也用同一份 pack：`pack.antd` 给 antd `ConfigProvider`，`toIntlResources(pack)` 给 `ZbyIntlProvider`。

`@zby/intl` 的 `mergeIntlResources` 只合并 `{ 'zh-CN': 文案树 }`。它不知道 antd 语言包，所以合成语言材料这一步留在 `@zby/ui`。

## 一份 pack 里有什么

| 字段 | 谁来用 | 说明 |
| --- | --- | --- |
| `locale` | ProLayout、`ZbyIntlProvider` | 语言码，例如 `zh-CN`。同一次 `mergeLocales` 的所有 pack 必须一致。 |
| `antd` | antd `ConfigProvider` | antd 官方语言包。不会进入 `getMessage`。 |
| 其余字段 | `getMessage` | `zby` 放组件库文案，业务可以再加自己的顶层字段。 |

`toIntlResources(pack)` 会去掉 `locale` 和 `antd`，得到 `{ 'zh-CN': 文案树 }`。ProLayout 会把列表里的每一种语言都注册进去，缺文案时再回退到 `zh-CN`。

## 交给 ProLayout

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
      title="数字化平台"
      locales={locales}
      defaultLocale="zh-CN"
    />
  )
}
```

`key` 要和 pack 的 `locale` 一致。顶栏按 `label` 显示该语言自己的名字。

## 布局外自己组合

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

这里只有一种语言，所以资源里也不会有其他语言可以回退。

## 合并规则

- 至少要有一份带 `locale` 的 pack。只有 antd 语言包时会失败。
- 同一次调用里的 `locale` 必须相同。`zh-CN` 和 `en-US` 不能合成一份。
- antd 的 `locale` 可以写成 `zh-cn`、`zh_CN`，也可以像 `en_US` 那样只写 `en`。区域、大小写和横线都不要求与 pack 逐字相同。
- 文案按对象深合并。后传入的 pack 覆盖先传入的同名 key；一边是对象、一边不是对象时，整个值被后一份替换。
- `antd/locale/zh_CN` 如果被包成 `{ default: 语言包 }`，会先拆掉这一层再交给 `ConfigProvider`。

## API

### mergeLocales

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| antd | 当前语言的 antd 语言包 | `AntdLocale` | - |
| packs | ui、pro 和业务语言包 | `ZbyLocalePack[]` | `[]` |

返回值是一份 `ZbyLocalePack`。

### toIntlResources

| 参数 | 说明 | 类型 |
| --- | --- | --- |
| pack | `mergeLocales` 的返回值，或任意一份 `ZbyLocalePack` | `ZbyLocalePack` |

返回 `{ [pack.locale]: 去掉 locale 和 antd 之后的文案树 }`。

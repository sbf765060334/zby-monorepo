<!-- File responsibility: explain in English that the packages directory is Zibuyu's internal material library, and how its components extend Ant Design. -->

# packages

English | [简体中文](./index.zh-CN.md)

The internal React material library for Zibuyu (子不语). Packages use the `@zby/*` scope.

**Baseline: UI components are an extension of Ant Design.** Application screens keep using `antd` directly. This directory adds what antd does not ship, or what an internal admin product needs beyond it. It is not a separate design system.

## What is this directory?

Zibuyu admin products share one Ant Design baseline, then add their own actions, tables, layout, and request rules. `packages` keeps those internal materials in one monorepo for company applications. It is not published as a public component library.

It is responsible for:

- Base components and admin business components built on Ant Design v6.
- `ZbyConfigProvider`, which connects antd `ConfigProvider`, `App`, and the internal internationalization layer at one root.
- Layout, tabs, internationalization, the request client, and shared hooks for internal applications.

It is not responsible for:

- Replacing `antd`. Buttons, forms, overlays, dates, and other components antd already provides are still imported from `antd`.
- Public release, or compatibility outside Zibuyu products.
- Documenting every package API on this page. Read each package's own Chinese and English docs.

Integration is three steps:

1. Depend on the `@zby/*` packages you need, and install the `antd` `^6.6.4` peer.
2. Wrap the root with `ZbyConfigProvider` from `@zby/ui`, and combine the antd locale with internal locales through `mergeLocales`.
3. Use antd components next to `@zby/ui` and `@zby/pro`. Theme, size, disabled state, and form status follow antd `ConfigProvider`.

## Relationship With Ant Design

Extension means the visuals and interactions line up with antd. Components consume antd theme, locale, `Form`, and `ConfigProvider`, then add the pieces an internal admin product needs.

- `@zby/ui` and `@zby/pro` declare `antd` as a peer at `^6.6.4`. The application installs antd. The material library does not bundle its own copy.
- `ZbyConfigProvider` wraps antd `ConfigProvider` and `App`. Other settings, such as `theme` and `prefixCls`, are passed through to antd.
- `mergeLocales` accepts `antd/locale/*` and merges it with `@zby/ui`, `@zby/pro`, and application locale packs.
- Components such as `InputNumberRange` and `ActionIcon` follow antd Form and Button size, status, and variant. An explicit prop wins over context.
- `Table` from `@zby/ui` is only for the internal table. antd's own `Table` keeps antd's own dependencies. Do not force both onto one overridden package.

## Packages

| Package | Purpose | Docs |
| --- | --- | --- |
| `@zby/ui` | Base components added on top of antd, plus `ZbyConfigProvider` | `index.en-US.md` in each component directory |
| `@zby/pro` | Admin business components such as `ProLayout`, `ProTable`, and `ProModal` | `index.en-US.md` in each component directory |
| `@zby/intl` | Internal internationalization. `ZbyConfigProvider` wraps it | `zby-intl/src/index.en-US.md` |
| `@zby/hooks` | Shared React hooks | No separate guide |
| `@zby/router-core` | Routing, tabs, and KeepAlive used by `ProLayout`. Applications should not depend on it directly | `router-core/src/index.en-US.md` |
| `@zby/request` | Business request client keyed by `errCode`, plus a TanStack Query adapter | `request/src/index.en-US.md` |

`@zby/ui` currently exports `ActionIcon`, `ActionText`, `ActionReveal`, `InputNumberRange`, `ScrollArea`, `Table`, plus `ZbyConfigProvider` and `mergeLocales`.

`@zby/pro` adds admin components such as `ReactRouterProLayout`, `ProTable`, `ProModal`, and `ProViewManagement`. Layout and table behavior stay in those components' own docs.

## Installation

These packages are consumed inside the Zibuyu monorepo through the workspace. Applications depend on `@zby/ui`, `@zby/pro`, or `@zby/request` as needed. Do not install the `packages` directory as one npm package.

Applications that render UI components install:

- `antd` `^6.6.4`
- `react` and `react-dom` `>=18`
- `react-router-dom` `>=6` when using the `@zby/pro` layout

## Quick Start

Combine the antd locale and the internal locales at the root:

```tsx
import antdZhCN from 'antd/locale/zh_CN'
import { mergeLocales, ZbyConfigProvider } from '@zby/ui'
import uiZhCN from '@zby/ui/locale/zh_CN'
import proZhCN from '@zby/pro/locale/zh_CN'

const zhCN = mergeLocales({
  antd: antdZhCN,
  packs: [uiZhCN, proZhCN],
})

export function AppRoot() {
  return (
    <ZbyConfigProvider locale={zhCN} theme={{ cssVar: true }}>
      <App />
    </ZbyConfigProvider>
  )
}
```

Use antd and the internal components together:

```tsx
import { Button, Form } from 'antd'
import { InputNumberRange } from '@zby/ui'

export function FilterForm() {
  return (
    <Form>
      <Form.Item name="amount" label="金额">
        <InputNumberRange />
      </Form.Item>
      <Button type="primary" htmlType="submit">查询</Button>
    </Form>
  )
}
```

`Button` and `Form` come from antd. `InputNumberRange` is the range input added by this library, and it plugs into antd Form.

## Development Commands

Run these from the repository root:

```bash
pnpm --filter "@zby/*" build
pnpm typecheck
pnpm test
pnpm lint
```

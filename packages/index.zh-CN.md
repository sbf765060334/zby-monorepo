<!-- 文件职责：面向中文读者说明 packages 目录是子不语内部物料库，以及组件和 Ant Design 的关系。 -->

# packages

[English](./index.en-US.md) | 简体中文

子不语公司内部使用的 React 物料库。包名统一使用 `@zby/*`。

**基线：界面组件是对 Ant Design 的二次扩增。** 业务页面继续直接使用 `antd`。本目录补的是 antd 没有、或后台场景需要再往前走一步的能力，不另起一套设计系统和组件体系。

## 这个目录是做什么的？

子不语的中后台要在同一套 Ant Design 上长出自己的操作、表格、布局和请求约定。`packages` 把这些内部物料放在一个 monorepo 里，给公司应用依赖，不作为对外通用组件库发布。

它负责：

- 提供在 Ant Design v6 上扩增的基础组件和中后台业务组件。
- 用 `ZbyConfigProvider` 把 antd 的 `ConfigProvider`、`App` 和内部国际化接在同一个根节点上。
- 提供布局、页签、国际化、请求客户端和通用 hooks，供内部应用复用。

它不负责：

- 不替换 `antd`。按钮、表单、弹层、日期等 antd 已有组件，业务仍然从 `antd` 引入。
- 不对外发布，也不承诺兼容公司以外的产品。
- 不把每个包的 API 写在这一页。各包的用法看该包自己的中英文文档。

接入时可以理解成三步：

1. 应用依赖需要的 `@zby/*` 包，并安装 peer `antd` `^6.6.4`。
2. 根节点使用 `@zby/ui` 的 `ZbyConfigProvider`，用 `mergeLocales` 合入 antd 语言包和内部语言包。
3. 页面里 antd 组件和 `@zby/ui`、`@zby/pro` 组件一起用。主题、尺寸、禁用和表单状态沿用 antd 的 `ConfigProvider`。

## 和 Ant Design 的关系

二次扩增指的是：视觉和交互对齐 antd，组件接 antd 的主题、语言包、`Form` 和 `ConfigProvider`，再补上公司后台需要的组件。

- `@zby/ui`、`@zby/pro` 把 `antd` 声明为 peer，版本是 `^6.6.4`。应用自己安装 antd，物料库不内置一份。
- `ZbyConfigProvider` 内部包裹 antd `ConfigProvider` 和 `App`。`theme`、`prefixCls` 等其余配置透传给 antd。
- `mergeLocales` 接收 `antd/locale/*`，和 `@zby/ui`、`@zby/pro`、业务语言包合成一份当前语言。
- `InputNumberRange`、`ActionIcon` 等组件对齐 antd Form、Button 的尺寸、状态和变体。显式传入的属性优先于上下文。
- `@zby/ui` 的 `Table` 只给内部表格使用。antd 官方 `Table` 仍走 antd 自己的依赖，不要用覆盖把两者换成同一个包。

## 包一览

| 包 | 作用 | 文档 |
| --- | --- | --- |
| `@zby/ui` | 在 antd 上扩增的基础组件，以及 `ZbyConfigProvider` | 各组件目录下的 `index.zh-CN.md` |
| `@zby/pro` | 中后台业务组件，如 `ProLayout`、`ProTable`、`ProModal` | 各组件目录下的 `index.zh-CN.md` |
| `@zby/intl` | 内部国际化。`ZbyConfigProvider` 会包住它 | `zby-intl/src/index.zh-CN.md` |
| `@zby/hooks` | 内部复用的 React hooks | 无独立说明 |
| `@zby/router-core` | `ProLayout` 使用的路由、页签和 KeepAlive 核心。业务不要单独依赖 | `router-core/src/index.zh-CN.md` |
| `@zby/request` | 按 `errCode` 处理的业务请求客户端，以及 TanStack Query 适配 | `request/src/index.zh-CN.md` |

`@zby/ui` 当前导出 `ActionIcon`、`ActionText`、`ActionReveal`、`InputNumberRange`、`ScrollArea`、`Table`，以及 `ZbyConfigProvider`、`mergeLocales`。

`@zby/pro` 在此之上提供 `ReactRouterProLayout`、`ProTable`、`ProModal`、`ProViewManagement` 等后台组件。布局和表格文档以各组件自己的说明为准。

## 安装

这些包只在子不语 monorepo 内通过 workspace 引用。应用按需依赖 `@zby/ui`、`@zby/pro` 或 `@zby/request`，不要把整个 `packages` 目录当成一个 npm 包安装。

使用界面组件时，应用需要自行安装：

- `antd` `^6.6.4`
- `react`、`react-dom` `>=18`
- `@zby/pro` 的布局还需要 `react-router-dom` `>=6`

## 快速开始

根节点同时接入 antd 语言包和内部语言包：

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

页面里 antd 和内部组件放在一起：

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

`Button`、`Form` 来自 antd。`InputNumberRange` 是物料库补上的范围输入，并接入 antd Form。

## 开发命令

在仓库根目录执行：

```bash
pnpm --filter "@zby/*" build
pnpm typecheck
pnpm test
pnpm lint
```

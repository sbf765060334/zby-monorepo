---
category: Components
group: 布局
title: ProLayout
subtitle: 专业布局
description: 面向中后台应用的菜单、全局页签、面包屑、页面保活与布局扩展方案。
---

## 何时使用

ProLayout 适用于需要统一导航框架的中后台应用。它提供左侧图标菜单、多级 Drawer 菜单、全局页签、固定与拖拽排序、菜单收藏、面包屑、页面保活、异常页和浏览器标题同步。

`ReactRouterProLayout` 是推荐入口。业务先在 React 树外创建稳定的 `RouterCore`，再把实例交给布局。路由注册、权限、页签状态、KeepAlive 和持久化由 `@zby/router-core` 管理；ProLayout 只负责 React Router 装配、界面与浏览器副作用。

## 基础用法

`createRouterCore` 必须在组件外创建，不能在每次渲染时重新创建。

```tsx
import { DashboardOutlined, ShoppingOutlined } from '@ant-design/icons'
import { createRouterCore } from '@zby/router-core'
import {
  type ProLayoutRoute,
  ReactRouterProLayout,
} from '@zby/pro/pro-layout'
import { BrowserRouter } from 'react-router-dom'

function DashboardPage() {
  return <div>工作台</div>
}

function OrderListPage() {
  return <div>订单列表</div>
}

const routes: ProLayoutRoute[] = [
  {
    path: '/dashboard',
    title: '工作台',
    icon: DashboardOutlined,
    element: DashboardPage,
  },
  {
    path: '/orders',
    title: '订单管理',
    icon: ShoppingOutlined,
    routes: [
      {
        path: '/orders/list',
        title: '订单列表',
        element: OrderListPage,
      },
    ],
  },
]

const router = createRouterCore<ProLayoutRoute>({
  routes,
  defaultRedirectPath: '/dashboard',
  keepAlive: { maxCachedPages: 10 },
  storageKey: 'admin-platform',
  maxFixedTabCount: 4,
})

export function App() {
  return (
    <BrowserRouter basename="/platform">
      <ReactRouterProLayout
        router={router}
        title="数字化平台"
        minimumContentWidth={960}
      />
    </BrowserRouter>
  )
}
```

`ReactRouterProLayout` 内部已经装配 `RouterCoreProvider` 和 `RouterCoreReactRouterAdapter`。不要在外层重复装配这两个 Provider。

## 顶部扩展

搜索、语言和主题都是独立功能，由业务按需导入后放入 `header.extra`。三者会使用相同尺寸和交互风格，但 ProLayout 不会自动注入它们。

```tsx
import {
  ProLocaleSwitch,
  ProRouteSearch,
  ProThemeSwitch,
  ReactRouterProLayout,
  useLocalePreference,
  useThemePreference,
} from '@zby/pro/pro-layout'

function PlatformLayout() {
  const locale = useLocalePreference({
    defaultValue: 'zh-CN',
  })
  const theme = useThemePreference({
    defaultValue: { mode: 'auto', density: 'default' },
  })

  return (
    <ReactRouterProLayout
      router={router}
      title="数字化平台"
      header={{
        logo: <strong>Digital Platform</strong>,
        extra: (
          <>
            <ProRouteSearch />
            <ProLocaleSwitch
              value={locale.value}
              onChange={locale.setValue}
            />
            <ProThemeSwitch
              value={theme.value}
              appearance={theme.appearance}
              onChange={theme.setValue}
            />
          </>
        ),
      }}
    />
  )
}
```

`ProLocaleSwitch` 和 `ProThemeSwitch` 都是受控选择器。业务必须使用相同状态更新外层 `ZbyIntlProvider`、Ant Design `ConfigProvider` 以及自身国际化资源。`useLocalePreference` 和 `useThemePreference` 只管理偏好与 localStorage，不创建 Provider。

## 路由约定

路由固定配置属于 `createRouterCore`，不能传给 ProLayout。包括 `routes`、`hasAuth`、`defaultRedirectPath`、`keepAlive`、`storageAdapter`、`storageKey` 和 `maxFixedTabCount`。

一级菜单中的页面和目录必须互斥：

- 配置 `element` 表示点击后直接进入页面，不要再配置 `routes`。
- 配置 `routes` 表示点击后打开多级菜单，不要再配置 `element`。
- `ignore` 会从菜单和全局搜索中隐藏当前分支，但不会改变 router-core 的路由注册结果。
- `_blank` 使用原生链接打开；站内地址会保留 React Router 的 basename。
- `prompt` 用于“暂未开放”入口，字符串值会作为提示文案。

页面导航应使用 router-core 命令。完整页面跳转使用 `router.jumpTo(path)`；仅更新当前页面 search 或 hash 时使用 `router.smartNavigate(...)`。

## 全局搜索

`ProRouteSearch` 应放在 `header.extra`。点击放大镜或按 `Ctrl/Command + K` 打开搜索。

- 未输入时只展示最近搜索，最多保留 8 条。
- 输入后按权限路由的完整标题路径和 pathname 过滤，并高亮所有匹配文字。
- 每条结果同时展示完整标题层级与真实 pathname。
- 目录、动态占位路径、通配符、`prompt`、`_blank` 和 `ignore` 分支不会进入结果。
- 最近搜索固定存储在 `zby-pro-layout:route-search`，路由删除或权限失效后会自动清理对应记录。
- 内容较多时只有结果列表使用浏览器原生滚动条，搜索框和分区标题保持可见。

## 页面内容容器

`ProLayoutContentContainer` 用于统一页面内部的全高布局。`fill` 模式会把 children 包装为一个填满剩余空间的 Card；`stack` 模式适合纵向排列多个内容块，并由主体区域滚动。传入 `items` 时默认使用 `stack`。

```tsx
import { ProLayoutContentContainer } from '@zby/pro/pro-layout'

export function OrderPage() {
  return (
    <ProLayoutContentContainer
      mode="stack"
      header={<OrderToolbar />}
      aside={<OrderFilters />}
      asideWidth={280}
      footer={<OrderActions />}
    >
      <ProLayoutContentContainer.Item>
        <OrderSummary />
      </ProLayoutContentContainer.Item>
      <ProLayoutContentContainer.Item bodyPadding={false}>
        <OrderTable />
      </ProLayoutContentContainer.Item>
    </ProLayoutContentContainer>
  )
}
```

全局面包屑由 ProLayout 统一渲染，不属于内容容器。页面要自行实现导航层级时，应设置 `showBreadcrumb={false}`。

## API

### ReactRouterProLayout

`ReactRouterProLayoutProps` 继承全部 `ProLayoutProps`，并增加一个稳定的 router 实例和两个运行时回调。

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| router | 在 React 树外创建的稳定 RouterCore 实例 | `RouterCore<ProLayoutRoute>` | 必填 |
| title | 应用标题；页面存在标题时浏览器标题为“页面标题 - 应用标题” | `string` | 必填 |
| header | Logo 与页签栏右侧扩展内容 | `ProLayoutHeaderConfig` | - |
| showBreadcrumb | 是否在页签栏下方显示全局面包屑 | `boolean` | `true` |
| setPage | 当前页面标题变化后的通知；无匹配页面时传入空字符串 | `(pageName: string) => void` | - |
| onPageError | 页面渲染异常后的通知；接收原始异常、React 组件栈和当前 pathname | `ProLayoutPageErrorHandler` | - |
| beforeUnload | 离开或刷新页面前是否触发浏览器提示 | `boolean \| (() => boolean)` | - |
| minimumContentWidth | 内容区域最小宽度；数字按像素处理 | `number \| string` | - |
| noBar | 隐藏左侧菜单和顶部页签栏，让内容占满视口 | `boolean` | `false` |
| systemList | 左侧图标栏底部的系统切换入口 | `ProLayoutSystemItem[]` | - |
| prefixCls | CSS 类名前缀 | `string` | `zby-pro-layout` |
| className | 布局根节点的业务类名 | `string` | - |
| rootClassName | 布局根节点的稳定根类名 | `string` | - |
| style | 布局根节点样式，优先级高于 `styles.root` | `React.CSSProperties` | - |
| classNames | 按语义节点追加类名 | `ProLayoutClassNames` | - |
| styles | 按语义节点覆盖内联样式 | `ProLayoutStyles` | - |
| onTabClose | 页签关闭并完成清理后的通知，不能撤销关闭 | `(tabKey, info) => void \| Promise<void>` | - |
| onStorageError | router-core 持久化加载或保存失败后的通知 | `(error, info) => void \| Promise<void>` | - |

### ProLayoutHeaderConfig

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| logo | 左侧图标栏顶部内容；函数形式不接收折叠状态 | `ReactNode \| (() => ReactNode)` | - |
| extra | 页签栏右侧内容，适合放置搜索、语言、主题和用户操作 | `ReactNode` | - |

### 语义节点

`classNames` 和 `styles` 支持以下节点：

| 名称 | 区域 |
| --- | --- |
| `root` | 布局根节点 |
| `sider` / `siderLogo` / `siderMenu` | 左侧图标栏、Logo 和菜单 |
| `menuDrawer` | 多级菜单 Drawer |
| `header` / `tabs` / `headerExtra` | 顶部区域、全局页签和右侧扩展 |
| `breadcrumb` | 全局面包屑 |
| `content` / `page` | 内容区域和活动页面 |

### ProLayoutRoute

`ProLayoutRoute` 扩展 `RouterRoute`。router-core 会消费基础路由字段，ProLayout 解释 UI 字段。

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| path | 注册路径，支持静态段、`:param` 和末尾 `*` | `string` | 必填 |
| title | 菜单、页签和面包屑默认标题 | `string` | 必填 |
| routes | 子路由 | `ProLayoutRoute[]` | - |
| auth | 交给 `createRouterCore` 的 `hasAuth` 判断的权限码 | `string` | - |
| supportMultipleTabs | 动态路由的真实 pathname 是否分别创建页签 | `boolean` | `false` |
| element | 页面组件、带静态 `preload` 的组件或 React Element | `ProLayoutRouteComponent` | - |
| icon | 菜单和面包屑图标组件 | `ComponentType<ProLayoutRouteIconProps>` | - |
| tooltipProps | 菜单 Tooltip 配置 | `TooltipProps` | - |
| _blank | 是否使用原生链接打开 | `boolean` | `false` |
| target | 原生链接 target | `'_blank' \| '_self' \| string` | `'_blank'` |
| ignore | 从 ProLayout 可见菜单树和搜索中隐藏该分支 | `boolean` | `false` |
| prompt | 显示“暂未开放”提示；字符串作为自定义文案 | `true \| string` | - |
| tag | 菜单状态标签 | `string \| { text: string; color?: TagProps['color'] }` | - |

### ProLayoutSystemItem

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| systemName | 系统唯一名称 | `string` | 必填 |
| name | 展示名称 | `string` | 必填 |
| description | 系统说明 | `string` | 必填 |
| logo | Logo URL | `string` | 必填 |
| url | 系统地址 | `string` | 必填 |
| active | 是否为当前系统 | `boolean` | `false` |

### ProRouteSearch

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| prefixCls | CSS 类名前缀，应与 ProLayout 保持一致 | `string` | `zby-pro-layout` |
| className | 搜索触发按钮类名 | `string` | - |

### ProLocaleSwitch

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| value | 当前语言 | `'zh-CN' \| 'en-US'` | 必填 |
| onChange | 用户选择语言后的通知 | `(locale: ProLocale) => void` | 必填 |
| prefixCls | CSS 类名前缀 | `string` | `zby-pro-layout` |
| className | 触发按钮类名 | `string` | - |

`useLocalePreference(options)` 默认使用 `zh-CN`，并固定存储在 `zby-pro:locale-preference`。可通过 `defaultValue` 覆盖默认语言，并通过返回的 `value`、`setValue` 驱动选择器和外层 Provider。

### ProThemeSwitch

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| value | 当前明暗模式和布局密度 | `ProThemePreference` | 必填 |
| appearance | `auto` 解析后的实际 `light` 或 `dark` 外观 | `'light' \| 'dark'` | 必填 |
| onChange | 偏好变化通知 | `(value: ProThemePreference) => void` | 必填 |
| prefixCls | CSS 类名前缀 | `string` | `zby-pro-layout` |
| className | 触发按钮类名 | `string` | - |

`ProThemePreference` 包含 `mode: 'auto' | 'light' | 'dark'` 和 `density: 'default' | 'compact'`。`useThemePreference(options)` 默认使用亮色、默认密度，并固定存储在 `zby-pro:theme-preference`；返回 `value`、`appearance`、`setValue`、`setMode` 和 `setDensity`。

### ProLayoutContentContainer

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| mode | 内容布局模式 | `'fill' \| 'stack'` | 有 `items` 时为 `stack`，否则为 `fill` |
| header | 顶部固定内容 | `ReactNode` | - |
| footer | 底部内容 | `ReactNode` | - |
| aside | 独立滚动的侧栏 | `ReactNode` | - |
| asidePosition | 侧栏位置 | `'start' \| 'end'` | `'start'` |
| asideWidth | 侧栏宽度 | `CSSProperties['width']` | `7 × controlHeightLG` |
| items | 配置式内容卡片 | `ProLayoutContentContainerItemConfig[]` | - |
| padding | 内容内边距；`false` 表示 0 | `CSSProperties['padding'] \| false` | 主题默认值 |
| gap | 内容块间距 | `CSSProperties['gap']` | 主题默认值 |
| itemBodyPadding | 所有内容卡片的 body 内边距 | `CSSProperties['padding'] \| false` | - |
| itemProps | 所有内容卡片的公共属性 | `ProLayoutContentContainerItemProps` | - |
| contentClassName / contentStyle | 内容区域类名和样式 | `string / CSSProperties` | - |
| bodyClassName / bodyStyle | 主体区域类名和样式 | `string / CSSProperties` | - |
| footerClassName / footerStyle | 底部区域类名和样式 | `string / CSSProperties` | - |
| asideClassName / asideStyle | 侧栏类名和样式 | `string / CSSProperties` | - |
| prefixCls | CSS 类名前缀 | `string` | `zby-pro-layout` |

除上表属性外，容器还透传原生 `div` 属性。

### ProLayoutContentContainer.Item

Item 基于 Ant Design `Card`，但不开放 Card 的标题、Tab 等 Header API。

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| fill | 是否填满主体剩余空间 | `boolean` | `false` |
| bodyPadding | Card body 内边距；`false` 表示 0 | `CSSProperties['padding'] \| false` | - |
| prefixCls | CSS 类名前缀 | `string` | `zby-pro-layout` |
| children | 内容 | `ReactNode` | - |

其余属性继承支持的 Ant Design `CardProps`；默认 `variant="borderless"`。

### 布局 Context Hooks

| Hook | 返回值 | 说明 |
| --- | --- | --- |
| `useProLayoutContext()` | `ProLayoutContextValue` | 返回尺寸、`noBar` 和 `showBreadcrumb` |
| `useProLayoutContext(selector, equalityFn?)` | `Selected` | 精确订阅布局 Context 的选中部分 |
| `useProLayoutMetrics()` | `{ headerHeight; breadcrumbHeight; siderWidth }` | 返回全部 Token 派生尺寸 |
| `useProLayoutHeaderHeight()` | `number` | 顶部页签栏高度 |
| `useProLayoutBreadcrumbHeight()` | `number` | 面包屑区域高度 |
| `useProLayoutSiderWidth()` | `number` | 左侧图标栏宽度 |

这些 Hook 在 ProLayout 外调用时返回 0 尺寸的稳定默认值。

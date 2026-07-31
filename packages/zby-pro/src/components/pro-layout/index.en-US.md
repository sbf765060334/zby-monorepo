---
category: Components
group: Layout
title: ProLayout
description: An application shell for menus, global tabs, breadcrumbs, retained pages, and layout extensions.
---

## When To Use

Use ProLayout when a back-office application needs a consistent navigation shell. It provides an icon sider, multilevel drawer menus, global tabs, pinning and drag sorting, menu favorites, breadcrumbs, retained pages, exception pages, and browser-title synchronization.

`ReactRouterProLayout` is the recommended entry point. Create one stable `RouterCore` outside the React tree, then pass that instance to the layout. Route registration, authorization, tab state, KeepAlive, and persistence belong to `@zby/router-core`. ProLayout is responsible only for React Router composition, UI, and browser effects.

## Basic Usage

Create `RouterCore` outside the component. Do not recreate it during render.

```tsx
import { DashboardOutlined, ShoppingOutlined } from '@ant-design/icons'
import { createRouterCore } from '@zby/router-core'
import {
  type ProLayoutRoute,
  ReactRouterProLayout,
} from '@zby/pro/pro-layout'
import { BrowserRouter } from 'react-router-dom'

function DashboardPage() {
  return <div>Dashboard</div>
}

function OrderListPage() {
  return <div>Order list</div>
}

const routes: ProLayoutRoute[] = [
  {
    path: '/dashboard',
    title: 'Dashboard',
    icon: DashboardOutlined,
    element: DashboardPage,
  },
  {
    path: '/orders',
    title: 'Orders',
    icon: ShoppingOutlined,
    routes: [
      {
        path: '/orders/list',
        title: 'Order list',
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
        title="Digital Platform"
        minimumContentWidth={960}
      />
    </BrowserRouter>
  )
}
```

`ReactRouterProLayout` already installs `RouterCoreProvider` and `RouterCoreReactRouterAdapter`. Do not install either provider again around it.

## Header Extensions

Search, locale, and theme are independent features. Import the ones required by the application and place them in `header.extra`. They share the same sizing and interaction style, but ProLayout does not inject them automatically.

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
      title="Digital Platform"
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

`ProLocaleSwitch` and `ProThemeSwitch` are controlled selectors. The application must use the same state to update its outer `ZbyIntlProvider`, Ant Design `ConfigProvider`, and application resources. `useLocalePreference` and `useThemePreference` only manage preferences and localStorage; they do not create providers.

## Route Conventions

Fixed route configuration belongs to `createRouterCore` and must not be passed to ProLayout. This includes `routes`, `hasAuth`, `defaultRedirectPath`, `keepAlive`, `storageAdapter`, `storageKey`, and `maxFixedTabCount`.

A first-level menu entry must be either a page or a directory:

- Set `element` for an entry that navigates directly to a page; do not also set `routes`.
- Set `routes` for an entry that opens a multilevel menu; do not also set `element`.
- `ignore` hides the current branch from menus and global search without changing router-core registration.
- `_blank` uses a native link; internal links retain the React Router basename.
- `prompt` represents an unavailable entry. A string value becomes the message text.

Use router-core commands for navigation. Call `router.jumpTo(path)` for full page navigation and `router.smartNavigate(...)` when only the current page's search or hash changes.

## Global Search

Place `ProRouteSearch` in `header.extra`. Users can open it with the magnifying-glass button or `Ctrl/Command + K`.

- With an empty query, it shows only the eight most recent routes.
- With a query, it filters authorized routes by the full title path and pathname and highlights every match.
- Every result shows both its complete title hierarchy and real pathname.
- Directories, unresolved dynamic paths, wildcards, `prompt`, `_blank`, and `ignore` branches are excluded.
- Recent routes always use `zby-pro-layout:route-search`; removed or unauthorized routes are pruned automatically.
- For long lists, only the result container uses the browser's native scrollbar; the input and section heading remain visible.

## Page Content Container

Use `ProLayoutContentContainer` for a consistent full-height page layout. `fill` wraps children in one Card that fills the remaining space. `stack` arranges multiple blocks vertically and lets the body scroll. Passing `items` selects `stack` by default.

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

The global breadcrumb is rendered by ProLayout, not by the content container. Set `showBreadcrumb={false}` when a page provides its own navigation hierarchy.

## API

### ReactRouterProLayout

`ReactRouterProLayoutProps` includes every `ProLayoutProps` field and adds a stable router instance plus two runtime callbacks.

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| router | Stable RouterCore instance created outside the React tree | `RouterCore<ProLayoutRoute>` | Required |
| title | Application title; the document title becomes “Page title - Application title” | `string` | Required |
| header | Logo and content rendered to the right of the global tabs | `ProLayoutHeaderConfig` | - |
| showBreadcrumb | Show the global breadcrumb below the tab bar | `boolean` | `true` |
| setPage | Called when the current page title changes; receives an empty string for no match | `(pageName: string) => void` | - |
| onPageError | Called after a page render error with the original error, React component stack, and current pathname | `ProLayoutPageErrorHandler` | - |
| beforeUnload | Request a browser prompt before leaving or refreshing | `boolean \| (() => boolean)` | - |
| minimumContentWidth | Minimum content width; numbers are treated as pixels | `number \| string` | - |
| noBar | Hide the sider and tab bar and let content fill the viewport | `boolean` | `false` |
| systemList | System-switcher entries at the bottom of the icon sider | `ProLayoutSystemItem[]` | - |
| prefixCls | CSS class prefix | `string` | `zby-pro-layout` |
| className | Application class name on the layout root | `string` | - |
| rootClassName | Stable root class name on the layout root | `string` | - |
| style | Root inline style; takes precedence over `styles.root` | `React.CSSProperties` | - |
| classNames | Class names by semantic node | `ProLayoutClassNames` | - |
| styles | Inline styles by semantic node | `ProLayoutStyles` | - |
| onTabClose | Notification after a tab and its resources have been closed; cannot cancel closing | `(tabKey, info) => void \| Promise<void>` | - |
| onStorageError | Called when router-core persistence fails to load or save | `(error, info) => void \| Promise<void>` | - |

### ProLayoutHeaderConfig

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| logo | Content at the top of the icon sider; the function form receives no collapsed state | `ReactNode \| (() => ReactNode)` | - |
| extra | Content to the right of the tabs, such as search, locale, theme, and user actions | `ReactNode` | - |

### Semantic Nodes

`classNames` and `styles` support these nodes:

| Name | Region |
| --- | --- |
| `root` | Layout root |
| `sider` / `siderLogo` / `siderMenu` | Icon sider, logo, and menu |
| `menuDrawer` | Multilevel menu drawer |
| `header` / `tabs` / `headerExtra` | Header, global tabs, and right-side extensions |
| `breadcrumb` | Global breadcrumb |
| `content` / `page` | Content region and active page |

### ProLayoutRoute

`ProLayoutRoute` extends `RouterRoute`. router-core consumes the base route fields and ProLayout interprets the UI fields.

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| path | Registered path supporting static segments, `:param`, and a trailing `*` | `string` | Required |
| title | Default menu, tab, and breadcrumb title | `string` | Required |
| routes | Child routes | `ProLayoutRoute[]` | - |
| auth | Permission code passed to the `hasAuth` function configured in `createRouterCore` | `string` | - |
| supportMultipleTabs | Create a separate tab for each real pathname of a dynamic route | `boolean` | `false` |
| element | Page component, component with static `preload`, or React Element | `ProLayoutRouteComponent` | - |
| icon | Icon component used by menus and breadcrumbs | `ComponentType<ProLayoutRouteIconProps>` | - |
| tooltipProps | Menu Tooltip configuration | `TooltipProps` | - |
| _blank | Open through a native link | `boolean` | `false` |
| target | Native link target | `'_blank' \| '_self' \| string` | `'_blank'` |
| ignore | Hide this branch from ProLayout's visible menu tree and search | `boolean` | `false` |
| prompt | Show an unavailable message; a string supplies custom text | `true \| string` | - |
| tag | Menu status tag | `string \| { text: string; color?: TagProps['color'] }` | - |

### ProLayoutSystemItem

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| systemName | Unique system name | `string` | Required |
| name | Display name | `string` | Required |
| description | System description | `string` | Required |
| logo | Logo URL | `string` | Required |
| url | System URL | `string` | Required |
| active | Mark the current system | `boolean` | `false` |

### ProRouteSearch

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| prefixCls | CSS class prefix; keep it aligned with ProLayout | `string` | `zby-pro-layout` |
| className | Class name on the search trigger button | `string` | - |

### ProLocaleSwitch

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| value | Current locale | `'zh-CN' \| 'en-US'` | Required |
| onChange | Called when the user selects a locale | `(locale: ProLocale) => void` | Required |
| prefixCls | CSS class prefix | `string` | `zby-pro-layout` |
| className | Class name on the trigger button | `string` | - |

`useLocalePreference(options)` defaults to `zh-CN` and always stores it under `zby-pro:locale-preference`. Override the default locale with `defaultValue`, then use the returned `value` and `setValue` to drive the selector and outer providers.

### ProThemeSwitch

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| value | Current color mode and layout density | `ProThemePreference` | Required |
| appearance | Resolved `light` or `dark` appearance when mode may be `auto` | `'light' \| 'dark'` | Required |
| onChange | Called when the preference changes | `(value: ProThemePreference) => void` | Required |
| prefixCls | CSS class prefix | `string` | `zby-pro-layout` |
| className | Class name on the trigger button | `string` | - |

`ProThemePreference` contains `mode: 'auto' | 'light' | 'dark'` and `density: 'default' | 'compact'`. `useThemePreference(options)` defaults to light mode and default density and always stores data under `zby-pro:theme-preference`. It returns `value`, `appearance`, `setValue`, `setMode`, and `setDensity`.

### ProLayoutContentContainer

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| mode | Content layout mode | `'fill' \| 'stack'` | `stack` with `items`; otherwise `fill` |
| header | Fixed header content | `ReactNode` | - |
| footer | Footer content | `ReactNode` | - |
| aside | Independently scrolling aside | `ReactNode` | - |
| asidePosition | Aside position | `'start' \| 'end'` | `'start'` |
| asideWidth | Aside width | `CSSProperties['width']` | `7 × controlHeightLG` |
| items | Configured content cards | `ProLayoutContentContainerItemConfig[]` | - |
| padding | Content padding; `false` means 0 | `CSSProperties['padding'] \| false` | Theme default |
| gap | Gap between content blocks | `CSSProperties['gap']` | Theme default |
| itemBodyPadding | Body padding shared by all content cards | `CSSProperties['padding'] \| false` | - |
| itemProps | Props shared by all content cards | `ProLayoutContentContainerItemProps` | - |
| contentClassName / contentStyle | Content-region class and style | `string / CSSProperties` | - |
| bodyClassName / bodyStyle | Body-region class and style | `string / CSSProperties` | - |
| footerClassName / footerStyle | Footer-region class and style | `string / CSSProperties` | - |
| asideClassName / asideStyle | Aside class and style | `string / CSSProperties` | - |
| prefixCls | CSS class prefix | `string` | `zby-pro-layout` |

The container also accepts native `div` attributes in addition to the properties above.

### ProLayoutContentContainer.Item

Item is based on Ant Design `Card` but intentionally excludes Card header and tab APIs.

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| fill | Fill the remaining body space | `boolean` | `false` |
| bodyPadding | Card body padding; `false` means 0 | `CSSProperties['padding'] \| false` | - |
| prefixCls | CSS class prefix | `string` | `zby-pro-layout` |
| children | Item content | `ReactNode` | - |

All other supported Ant Design `CardProps` are forwarded. The default is `variant="borderless"`.

### Layout Context Hooks

| Hook | Return | Description |
| --- | --- | --- |
| `useProLayoutContext()` | `ProLayoutContextValue` | Return metrics, `noBar`, and `showBreadcrumb` |
| `useProLayoutContext(selector, equalityFn?)` | `Selected` | Subscribe to a selected context slice |
| `useProLayoutMetrics()` | `{ headerHeight; breadcrumbHeight; siderWidth }` | Return all token-derived dimensions |
| `useProLayoutHeaderHeight()` | `number` | Header and tab-bar height |
| `useProLayoutBreadcrumbHeight()` | `number` | Breadcrumb-region height |
| `useProLayoutSiderWidth()` | `number` | Icon-sider width |

Outside ProLayout, these hooks return stable defaults with zero dimensions.

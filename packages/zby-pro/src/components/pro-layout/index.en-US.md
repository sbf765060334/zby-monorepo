---
category: Components
group: Layout
title: ProLayout
description: An application shell for menus, global tabs, breadcrumbs, retained pages, and layout extensions.
---

## When To Use

Use ProLayout when a back-office application needs a consistent navigation shell. It provides an icon sider, multilevel drawer menus, global tabs, pinning and drag sorting, a tab context menu, menu favorites, breadcrumbs, retained pages, exception pages, and browser-title synchronization.

`ReactRouterProLayout` is the recommended entry point. Create one stable `RouterCore` outside the React tree, then pass that instance to the layout. `@zby/router-core` is ProLayout's internal engine and is not published as a standalone package. Route registration, authorization, tab state, KeepAlive, and persistence belong to it; ProLayout owns UI and browser effects.

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

`ReactRouterProLayout` already installs `RouterCoreProvider`. Do not wrap another provider around it.

## Lazy Route Loading

Use `lazyPage` to create a `React.lazy` page that loads on first visit, then pass the component reference directly to `element`:

```tsx
import {
  lazyPage,
  type ProLayoutRoute,
} from '@zby/pro/pro-layout'

const OrderListPage = lazyPage(
  () => import('./pages/OrderListPage'),
)

const routes: ProLayoutRoute[] = [
  {
    path: '/orders',
    title: 'Order list',
    element: OrderListPage,
  },
]
```

Do not use `element: <OrderListPage />`. The page chunk downloads on first visit; page-level `Suspense` covers the in-flight request. Re-entering a page that KeepAlive still holds does not download again. Menus and tabs do not preload on hover or focus.

## Header Extensions

When the header is visible, the locale, theme, and search buttons are always shown. `header.extra` is only for application buttons, such as the user menu, and it renders after those three buttons. `noBar` hides the header and the buttons together.

```tsx
import { mergeLocales } from '@zby/ui'
import { ReactRouterProLayout, UserMenu } from '@zby/pro/pro-layout'

function PlatformLayout() {
  return (
    <ReactRouterProLayout
      router={router}
      title="Digital Platform"
      locales={[
        { key: 'zh-CN', label: '简体中文', pack: zhCN },
        { key: 'en-US', label: 'English', pack: enUS },
      ]}
      defaultLocale="zh-CN"
      defaultTheme={{ mode: 'auto', density: 'default' }}
      configProvider={{ prefixCls: 'zby', theme: { cssVar: { prefix: 'zby' } } }}
      header={{
        logo: <strong>Digital Platform</strong>,
        extra: <UserMenu name="Ada" menus={[{ key: 'logout', label: 'Sign out' }]} />,
      }}
    />
  )
}
```

Each `locales` entry's `pack` comes from `mergeLocales`, combining the antd locale with component and application messages. When `locales` is omitted, the header offers the built-in Chinese, English, Vietnamese, and Burmese entries, and only ProLayout's own messages are registered. Theme, density, and locale live inside ProLayout and are written to its `ConfigProvider` and `ZbyIntlProvider`. Pages call `useTheme()` to read or change the theme, `useIntl().locale` to read the current locale, and `useLocale().setLocale` to change it. Outside the layout those hooks throw, because the providers are not there. Pages that do not use ProLayout compose antd `ConfigProvider`, `App`, and `ZbyIntlProvider` themselves.

## Route Conventions

Fixed route configuration belongs to `createRouterCore` and must not be passed to ProLayout. This includes `routes`, `hasAuth`, `defaultRedirectPath`, `keepAlive`, `storageAdapter`, `storageKey`, and `maxFixedTabCount`.

A first-level menu entry must be either a page or a directory:

- Set `element` for an entry that navigates directly to a page; do not also set `routes`.
- Set `routes` for an entry that opens a multilevel menu; do not also set `element`.
- `ignore` hides the current branch from menus and global search without changing router-core registration.
- Page paths with `:param` or wildcards are omitted from first-level and leaf menus. A directory that only contains such pages is also omitted. Concrete addresses such as `/orders/79` still open the page.
- `_blank` uses a native link; internal links retain the React Router basename.
- `prompt` marks an entry that has no page; clicking it only shows a message. `true` uses the built-in copy, anything else is read as a title descriptor.

Use router-core commands for navigation. Call `router.jumpTo(path)` for full page navigation and `router.smartNavigate(...)` when only the current page's search or hash changes.

## Menu Copy and Localization

`title`, `tag.text`, and `prompt` hold **copy descriptors**, not translated strings. Translation happens at render time, so switching locales never rebuilds the `RouterCore`; open tabs, breadcrumbs, favorites, and search results all update in place.

```tsx
// String: used directly as a locale key; displayed as-is when the key is missing
{ path: '/dashboard', title: 'app.menu.dashboard' }

// Object: use it when you need fallback copy or interpolation values
{
  path: '/reports/gmv',
  title: { key: 'app.menu.reports.gmv', defaultMessage: 'GMV report' },
  tag: { text: 'app.menu.tag.beta', color: 'processing' },
  prompt: { key: 'app.menu.reports.gmvPrompt', values: { contact: 'ops@example.com' } },
}
```

Keep the copy in the application's existing locale pack and pass it through `locales`; routes need no separate localization mechanism. `prompt: true` uses ProLayout's built-in "unavailable" copy.

Plain literals still work: `tag: 'Beta'` matches nothing in the locale pack and renders as `Beta`.

## Global Search

When the header is visible, ProLayout renders the magnifying-glass button. Open search with that button or `Ctrl/Command + K`.

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

## Tab Context Menu

Right-click a visible tab to close it, close tabs to its right, or close the other tabs. A batch closes from left to right. Unguarded background tabs close immediately, without navigation. A guarded tab is opened before its guard runs. Keeping it leaves that tab active. Accepting it finishes the remaining tabs first, then returns to the right-clicked tab if the active tab was closed. If the active tab is still open and the batch never left it to present a guard, nothing is navigated at the end. A thrown guard keeps that tab, continues, and shows the partial-failure message. While an async guard is pending, close icons and context-menu actions are disabled, and the icons stay visible. Pinned tabs are closed too.

With only one tab, every action is disabled. On the rightmost tab, "Close tabs to the right" is disabled. Tabs that have collapsed into the tab bar overflow menu do not have a context menu yet.

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
| pageLoading | Suspense fallback for lazy pages; `false` only hides the central fallback | `false \| ProLayoutPageLoading` | `{ delay: 300 }` |
| beforeUnload | Request a browser prompt before leaving or refreshing | `boolean \| (() => boolean)` | - |
| minimumContentWidth | Minimum content width; numbers are treated as pixels | `number \| string` | - |
| noBar | Hide the sider and tab bar and let content fill the viewport | `boolean` | `false` |
| systemList | System-switcher entries at the bottom of the icon sider | `ProLayoutSystemItem[]` | - |
| prefixCls | CSS class prefix. Defaults to `ConfigProvider.getPrefixCls('pro-layout')` (`ant-pro-layout`) | `string` | `ant-pro-layout` |
| className | Application class name on the layout root | `string` | - |
| rootClassName | Stable root class name on the layout root | `string` | - |
| style | Root inline style; takes precedence over `styles.root` | `React.CSSProperties` | - |
| classNames | Class names by semantic node | `ProLayoutClassNames` | - |
| styles | Non-structural inline styles by semantic node; Header positioning, size, and sider offset remain layout-managed | `ProLayoutStyles` | - |
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
| title | Default menu, tab, and breadcrumb title | `ProLayoutTitle` | Required |
| routes | Child routes | `ProLayoutRoute[]` | - |
| auth | Permission code passed to the `hasAuth` function configured in `createRouterCore` | `string` | - |
| supportMultipleTabs | Create a separate tab for each real pathname of a dynamic route | `boolean` | `false` |
| element | Page component, component with static `preload`, or React Element | `ProLayoutRouteComponent` | - |
| preload | Route-level preloader; takes priority over `element.preload` | `() => void \| Promise<void>` | - |
| icon | Icon component used by menus and breadcrumbs | `ComponentType<ProLayoutRouteIconProps>` | - |
| _blank | Open through a native link | `boolean` | `false` |
| target | Native link target | `'_blank' \| '_self' \| string` | `'_blank'` |
| ignore | Hide this branch from ProLayout's visible menu tree and search | `boolean` | `false` |
| prompt | Show a message instead of opening a page; `true` uses the built-in copy, anything else is read as a title descriptor | `true \| ProLayoutTitle` | - |
| tag | Menu status tag; `text` is read as a title descriptor | `string \| { text: ProLayoutTitle; color?: TagProps['color'] }` | - |

### ProLayoutTitle

Shared by `title`, `tag.text`, and any `prompt` other than `true`. All of them are translated at render time.

| Form | Description |
| --- | --- |
| `string` | Locale key; displayed as-is when no message matches |
| `{ key, defaultMessage?, values? }` | `defaultMessage` covers a missing key; `values` fills the `{{name}}` placeholders in the template |

### lazyPage

`lazyPage(loader)` accepts `() => Promise<{ default: ComponentType<Record<string, never>> }>` and returns a lazy component suitable for `route.element`. The module request starts on first render. It deduplicates in-flight requests and reuses successful results. A failed request is cleared so an error-boundary retry or a later visit can fetch again. The returned component still exposes `preload(): Promise<void>` for callers that want to prefetch themselves; ProLayout does not call it from menu or tab hover.

### ProLayoutPageLoading

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| delay | Delay in milliseconds before the default Spin appears | `number` | `300` |
| description | Description rendered by the default Spin | `SpinProps['description']` | - |
| indicator | Custom indicator rendered by the default Spin | `SpinProps['indicator']` | - |
| render | Completely replaces the default fallback and receives the concrete pathname | `(info: { pathname: string }) => ReactNode` | - |

When an active page remains in Suspense for more than 150ms, ProLayout shows the top page-loading progress bar. It finishes when the page commits, fails, is left, or becomes inactive. Restoring an already loaded KeepAlive page does not show it, and pending inactive cache entries do not keep it running.

When `render` is configured, ProLayout does not wrap it in the default Spin. With `pageLoading={false}`, Suspense renders `null` in the central content area while the top page-loading progress still follows the rules above.

### ProLayoutSystemItem

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| systemName | Unique system name | `string` | Required |
| name | Display name | `string` | Required |
| description | System description | `string` | Required |
| logo | Logo URL | `string` | Required |
| url | System URL | `string` | Required |
| active | Mark the current system | `boolean` | `false` |

### useTheme

`useTheme()` can be called only inside `ReactRouterProLayout`. It returns `theme` (`auto`, `light`, or `dark`), `resolvedTheme` (`light` or `dark`), `density` (`default` or `compact`), plus `setMode` and `setDensity`. The preference is stored at `zby-pro:theme-preference`. `defaultTheme` applies only when nothing is stored; the default is light mode and default density.

The header theme menu contains system appearance, light, dark, default density, compact density, and customize. The customize drawer edits global seeds on the left and previews the draft on the right. Field edits, per-field reset, and Reset only change the draft. OK writes `zby-pro:theme-seed` and updates the inner `ConfigProvider`. Closing the drawer discards the draft. `defaultThemeSeed` applies only when no seed is stored. A `null` color keeps Ant Design's default relationship, for example info following the primary color. Read the applied color, font size, and radius with antd `theme.useToken()`.

### useLocale

`useLocale()` can be called only inside `ReactRouterProLayout`. It returns `locale` and `setLocale`. Read the active messages with `useIntl().locale`; that value comes from the same state. The preference is stored at `zby-pro:locale-preference`. `defaultLocale` applies only when nothing is stored. Otherwise the first `locales` entry is used, or `zh-CN` when `locales` is omitted. The header menu lists only `locales`. A locale outside that list is not stored.

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
| prefixCls | CSS class prefix. Defaults to `ConfigProvider.getPrefixCls('pro-layout')` (`ant-pro-layout`) | `string` | `ant-pro-layout` |

The container also accepts native `div` attributes in addition to the properties above.

### ProLayoutContentContainer.Item

Item is based on Ant Design `Card` but intentionally excludes Card header and tab APIs.

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| fill | Fill the remaining body space | `boolean` | `false` |
| bodyPadding | Card body padding; `false` means 0 | `CSSProperties['padding'] \| false` | - |
| prefixCls | CSS class prefix. Defaults to `ConfigProvider.getPrefixCls('pro-layout')` (`ant-pro-layout`) | `string` | `ant-pro-layout` |
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

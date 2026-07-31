# @zby/router-core

English | [简体中文](./index.zh-CN.md)

Routing, tabs, KeepAlive, and persistence primitives for ZBY digital platforms.

This package is not a general-purpose browser router. It owns the platform-specific route registry, authorization snapshot, tab identity, retained page descriptions, URL cache, and fixed-tab persistence. A host adapter, such as React Router, remains responsible for changing and reporting the real URL. UI rendering is intentionally left to ProLayout or the application.

## Features

- Static, `:param`, and trailing `*` route matching.
- Immutable full and authorized route registries.
- Directory redirection and validated default routes.
- Shared or per-path tabs for dynamic routes.
- Tab ordering, fixed tabs, close guards, and close notifications.
- KeepAlive page descriptions with include, exclude, and LRU limits.
- Search, hash, and concrete dynamic-path restoration.
- IndexedDB persistence by default, or a custom storage adapter.
- Framework-neutral core plus React and React Router bindings.

## Entry Points

| Entry | Purpose |
| --- | --- |
| `@zby/router-core` | Core factory, registry helpers, storage adapters, and domain types |
| `@zby/router-core/react` | Core and page providers plus selector hooks |
| `@zby/router-core/react-router` | React Router host adapter and basename-aware href hook |

## Installation

```bash
pnpm add @zby/router-core
```

React bindings require React 18 or later. The React Router adapter supports React Router 6 and later.

## Quick Start

Create the router once, outside the React render path:

```tsx
// router.ts
import { createRouterCore } from '@zby/router-core'
import type { RouterRoute } from '@zby/router-core'
import type { ComponentType } from 'react'

interface AppRoute extends RouterRoute {
  routes?: AppRoute[]
  element?: ComponentType
}

const routes: AppRoute[] = [
  {
    path: '/dashboard',
    title: 'Dashboard',
    element: DashboardPage,
  },
  {
    path: '/orders',
    title: 'Orders',
    routes: [
      {
        path: '/orders/:id',
        title: 'Order details',
        element: OrderDetailsPage,
      },
    ],
  },
]

export const router = createRouterCore({
  routes,
  defaultRedirectPath: '/dashboard',
  keepAlive: { maxCachedPages: 10 },
  storageKey: 'admin-platform',
})
```

Connect that stable instance to React and React Router:

```tsx
// App.tsx
import { RouterCoreProvider } from '@zby/router-core/react'
import { RouterCoreReactRouterAdapter } from '@zby/router-core/react-router'
import { BrowserRouter } from 'react-router-dom'

import { router } from './router'

export function App() {
  return (
    <BrowserRouter basename="/platform">
      <RouterCoreProvider
        router={router}
        onStorageError={(error, info) => {
          console.error(info.phase, error)
        }}
      >
        <RouterCoreReactRouterAdapter>
          <AppShell />
        </RouterCoreReactRouterAdapter>
      </RouterCoreProvider>
    </BrowserRouter>
  )
}
```

Do not call `createRouterCore` directly on every component render. If module-level creation is unsuitable, keep the instance with `useState` or `useMemo` for the intended lifetime.

## Route Model

`RouterRoute` defines the fields consumed by the core:

| Field | Description |
| --- | --- |
| `path` | Static path, `:param` pattern, or trailing `*` wildcard |
| `title` | Default tab title |
| `routes` | Child routes; both directories and pages may have children |
| `auth` | Permission code passed to `hasAuth` |
| `supportMultipleTabs` | Creates one tab per concrete dynamic pathname when true |
| `element` | Page marker used by the default `isPageRoute` rule |

Additional metadata is preserved in the route snapshot for the UI layer. The core recursively snapshots routes during creation; mutating the original route objects later does not update an existing instance.

For a dynamic route such as `/orders/:id`:

- `supportMultipleTabs: false` or omitted uses the pattern as one shared tab key and remembers the latest concrete pathname.
- `supportMultipleTabs: true` uses each concrete pathname as an independent tab key.
- Navigating directly to an unresolved pattern is rejected. Pass a concrete pathname such as `/orders/42`.

## Creation Options

These options are fixed for the lifetime of a core instance:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `routes` | `Route[]` | required | Route tree copied into the registry |
| `hasAuth` | `(code: string) => boolean` | allow all | Builds the authorized route snapshot |
| `defaultRedirectPath` | `string` | first accessible concrete page | Target used for the root path |
| `isPageRoute` | `(route: Route) => boolean` | checks `element` | Custom page predicate |
| `keepAlive` | `boolean \| RouterKeepAliveConfig` | `true` | Retained-page policy |
| `storageAdapter` | `false \| RouterStorageAdapter` | IndexedDB | Persistence implementation; false disables persistence |
| `storageKey` | `string` | `default` | Persistence namespace |
| `maxFixedTabCount` | `number` | `4` | Maximum number of fixed tabs |

Create a new core instance when one of these definitions must change. `RouterCoreProvider` does not accept or update them.

## Core Commands and Queries

| API | Purpose |
| --- | --- |
| `registry` | Immutable full and authorized route queries |
| `hasAuth(code)` | Uses the authorization function fixed at creation |
| `getState()` | Reads the current state snapshot |
| `subscribe(listener)` | Subscribes to core state changes |
| `bindHost(host)` | Binds or unbinds the URL-changing host |
| `configureRuntime(options)` | Updates `onTabClose` and `onStorageError` callbacks |
| `hydrateStorage()` | Idempotently loads fixed tabs and dynamic path mappings |
| `syncLocation(location)` | Accepts the URL confirmed by the host |
| `jumpTo(target)` | Performs full platform navigation and tab/page activation |
| `smartNavigate(data)` | Replaces search/hash on the same page; delegates pathname changes to `jumpTo` |
| `getTabKey(pathname)` | Resolves the stable tab identity |
| `getCurrentRoutes(pathname)` | Returns the root-to-leaf matched route chain |
| `reorderTabs(keys)` | Reorders the complete current tab set after validation |
| `setTabLabel(key, label)` | Overrides a tab label |
| `setPathnameDescription(map)` | Incrementally sets concrete-path descriptions |
| `toggleFixed(tabKey)` | Fixes or unfixes an open tab |
| `closeTab(tabKey, options)` | Runs guards and closes a tab |
| `closeThisTabOpenNewOne(data, options)` | Closes one tab and performs only the final replacement navigation |
| `addBeforeCloseHook(handler, pathname)` | Registers a close guard for a page tab |
| `clearBeforeCloseHook(pathname, handler?)` | Removes one or all close guards for a page tab |
| `subscribePageLocation(tabKey, listener)` | Subscribes one retained page instance to its complete location |

`jumpTo` and `smartNavigate` require a bound host. With React Router, `RouterCoreReactRouterAdapter` manages `bindHost` and `syncLocation` automatically.

## Observable State

The most commonly rendered fields in `RouterCoreState` are:

| Field | Meaning |
| --- | --- |
| `navigationStatus` | Location settlement phase: `bootstrapping`, `redirecting`, or `settled`; only settled locations should resolve to 403/404 |
| `currentPathname` | Latest pathname confirmed by the host |
| `currentRoutes` | Current root-to-leaf route chain |
| `currentSelectedPath` | Concrete route paths used for menu selection |
| `activeTabKey` | Selected tab identity |
| `activePage` | Currently displayed retained page identity |
| `tabs` | Open tabs |
| `pages` | Page instances retained by KeepAlive |
| `fixedSet` | Ordered fixed-tab keys |
| `pathnameDescriptionMap` | Concrete pathname descriptions |
| `storageHydrated` / `storageLoading` / `storageLoadError` | Persistence hydration status |

Use commands to mutate domain state. The exposed Zustand store is read-only and intentionally does not expose `setState`.

## React Bindings

```tsx
import {
  useRouterCore,
  useRouterCoreSelector,
} from '@zby/router-core/react'
import type { RouterCoreState } from '@zby/router-core'

function TabBar() {
  const router = useRouterCore<AppRoute>()
  const tabs = useRouterCoreSelector(
    (state: RouterCoreState<AppRoute>) => state.tabs,
  )
  const activeKey = useRouterCoreSelector(
    (state: RouterCoreState<AppRoute>) => state.activeTabKey,
  )

  return tabs.map((tab) => (
    <button
      key={tab.key}
      aria-pressed={tab.key === activeKey}
      onClick={() => router.jumpTo(tab.key)}
    >
      {tab.label}
    </button>
  ))
}
```

- `RouterCoreProvider` supplies a stable core, synchronizes runtime callbacks, and starts hydration.
- `useRouterCore` returns the core instance and its commands.
- `useRouterCoreSelector` precisely subscribes to selected global state.
- `RouterPageProvider` wraps each page rendered by a custom KeepAlive UI.
- `useRouterPage` and `useRouterPageSelector` read page-specific pathname, active state, and location.

A custom page renderer can iterate `state.pages`:

```tsx
import {
  RouterPageProvider,
  useRouterCoreSelector,
} from '@zby/router-core/react'
import type { RouterCoreState } from '@zby/router-core'

function Pages() {
  const pages = useRouterCoreSelector(
    (state: RouterCoreState<AppRoute>) => state.pages,
  )
  const activePage = useRouterCoreSelector(
    (state: RouterCoreState<AppRoute>) => state.activePage,
  )

  return pages.map((page) => {
    const Page = page.route.element
    const active = page.key === activePage

    return (
      <RouterPageProvider key={page.key} page={page} active={active}>
        <div style={{ display: active ? 'block' : 'none' }}>
          {Page ? <Page /> : null}
        </div>
      </RouterPageProvider>
    )
  })
}
```

## React Router Binding

`RouterCoreReactRouterAdapter` must be inside both a React Router and `RouterCoreProvider`. It:

1. Binds React Router's `navigate` as the core host.
2. Sends every confirmed pathname, search, and hash to `syncLocation`.
3. Performs root and directory redirects in an effect, after React Router installs its history listener.
4. Unbinds the host on unmount; an uncommitted redirect is retried when a new host binds.

`useRouterCoreCreateHref` returns a render-time function for native links. It preserves BrowserRouter basenames and HashRouter prefixes:

```tsx
import { useRouterCoreCreateHref } from '@zby/router-core/react-router'

function NativeLink() {
  const createHref = useRouterCoreCreateHref()
  return <a href={createHref('/orders')} target="_blank">Orders</a>
}
```

## Persistence

Only fixed-tab keys and concrete path mappings required to restore fixed dynamic tabs are persisted. Open transient tabs, live page instances, UI state, and menu favorites are not persisted by router-core.

- Omit `storageAdapter` to use the built-in IndexedDB adapter.
- Set `storageAdapter: false` for memory-only behavior.
- Use `createRemoteRouterStorageAdapter` to normalize and serialize writes from a custom remote adapter.
- `onStorageError` reports failures; the core does not retry an old snapshot over newer state.

## Registry and Storage Utilities

The root entry also exports:

- `createRouteRegistry`, `snapshotRoutes`, and `filterAuthorizedRoutes`.
- `matchRoutePath`, `normalizeRoutePath`, `isConcreteRoutePath`, `isAccessibleRoute`, and `preloadRoute`.
- `createIndexedDBRouterStorageAdapter`, `createRemoteRouterStorageAdapter`, and `normalizeRouterStorageState`.

## Development

```bash
pnpm --filter @zby/router-core typecheck
pnpm --filter @zby/router-core test
pnpm --filter @zby/router-core build
```

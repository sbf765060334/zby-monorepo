<!-- File responsibility: document router-core usage, complete options, dependent types, and integration in English. -->

# @zby/router-core

English | [简体中文](./index.zh-CN.md)

Routing, tabs, KeepAlive, and persistence primitives for ZBY digital platforms.

**Baseline: `@zby/router-core` exists only for the internal `ProLayout`.** It is not a standalone router package for external publication, and it does not support Vue or other frameworks. Applications should enter through `ReactRouterProLayout` from `@zby/pro`; do not take this package as a public product dependency.

## What does router-core do?

A normal browser router mainly answers “which component belongs to this URL?” A platform application also needs to know which tab owns a page, whether concrete dynamic URLs share a tab, whether closing can be blocked, which inactive pages stay mounted, which fixed tabs and favorites return after a reload, and which routes are still accessible after authorization is applied. `@zby/router-core` keeps these platform rules as the internal domain core of `ProLayout`.

It is responsible for:

- Copying and validating the business route tree, then building full and authorized snapshots.
- Resolving stable tab keys and managing tabs, active pages, and KeepAlive page descriptions.
- Caching each tab's search/hash plus the last concrete pathname of a shared dynamic tab.
- Managing fixed tabs, route favorites, close guards, close notifications, and persistence hydration.
- Providing a React binding so `ProLayout` can subscribe precisely and Core can request real React Router navigation.

It is not responsible for:

- Calling `window.history` directly. A host such as React Router changes the real URL.
- Rendering menus, tabs, 403/404 screens, or page containers. ProLayout owns that UI.
- Choosing the source of authorization. It only calls the supplied `hasAuth` during creation.
- Persisting arbitrary form state. KeepAlive only describes which pages should remain rendered.

For a beginner, one navigation can be read as four steps:

1. Business code calls `router.jumpTo('/orders/42')`.
2. RouterCore validates the route, authorization, and tab identity, then asks the host to change URL.
3. React Router confirms the new location and `RouterCoreProvider` calls `router.syncLocation(...)`.
4. RouterCore updates the route chain, tabs, page descriptions, and page-level location; subscribed UI rerenders.

## Features

- Static, `:param`, and trailing `*` route matching.
- Immutable full and authorized route registries.
- Directory redirection and validated default routes.
- Shared or per-path tabs for dynamic routes.
- Tab ordering, fixed tabs, close guards, and close notifications.
- KeepAlive page descriptions with include, exclude, and LRU limits.
- Search, hash, and concrete dynamic-path restoration.
- IndexedDB persistence by default, or a custom storage adapter.
- An internal ProLayout core plus a React binding that connects React Router.

## Entry Points

| Entry | Purpose |
| --- | --- |
| `@zby/router-core` | Core factory, registry helpers, storage adapters, and domain types |
| `@zby/router-core/react` | Provider, page context, selector hooks, and basename-aware href |

## Installation

This package lives only inside the company monorepo and is consumed by ProLayout in `@zby/pro`. Do not install it on its own, and do not publish it as a standalone package.

React bindings require React 18 or later and must run inside React Router 6 or later.

## Quick Start

Application code should follow the `ProLayout` docs and use `ReactRouterProLayout`. The rest of this page describes core itself for ProLayout maintainers.

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
        <AppShell />
      </RouterCoreProvider>
    </BrowserRouter>
  )
}
```

Do not call `createRouterCore` directly on every component render. If module-level creation is unsuitable, keep the instance with `useState` or `useMemo` for the intended lifetime.

## Route Model

`RouterRoute` defines the fields consumed by the core:

| Field | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `path` | `string` | yes | none | Static path, `:param` pattern, or trailing `*` wildcard. |
| `title` | `RouterTitle` (i.e. `unknown`) | yes | none | Default new-tab title descriptor, also suitable for menus and breadcrumbs. The core stores it without interpreting it; see "Titles are descriptors, not strings". |
| `routes` | `RouterRoute[]` | no | none | Child routes; directories and pages may both have children. Business route types should narrow this to their own `Route[]`. |
| `auth` | `string` | no | none | Permission code passed to `hasAuth`. |
| `supportMultipleTabs` | `boolean` | no | `false` | Creates one tab per concrete dynamic pathname when true; otherwise shares the pattern tab. |
| `element` | `unknown` | no | none | Marker used by the default `isPageRoute`; the core neither renders nor interprets it. |
| `preload` | `() => void \| Promise<void>` | no | none | Route-level resource preloader; `preloadRoute` gives it priority. |
| additional fields | `unknown` | no | none | Business metadata such as icon or tag is retained for UI and utilities. |

Additional metadata is preserved in the route snapshot for the UI layer. `preloadRoute` also recognizes a function-valued `route.preload` or a `route.element` with a `preload` method.

### Route config is fixed once the core is created

The core copies the route tree node by node at creation time, and the Registry only uses its own copy afterwards. **Do not modify the route config after creating a core**; create a new core instance when routes need to change.

This is a convention the caller must honor — the core does not enforce it. The copy only covers each node's own fields plus the `routes` array, so the actual behavior is:

```ts
const routes = [{ path: '/workbench', title: 'Workbench', element: Page, tag: { text: 'New' } }]
const router = createRouterCore({ routes })

routes[0].title = 'Changed'       // No effect: title is an own field and was copied
routes.push({ /* ... */ })        // No effect: the array was copied
routes[0].tag.text = 'Changed'    // ⚠️ Does affect the core: tag is shared by reference
```

Nested objects such as `tag` and `icon` — plus the Registry's own route objects, which are not frozen — all fall into the "mutation takes effect" category. Do not rely on the copy as an isolation boundary.

Registry route objects are also **not the same objects** you passed in. Compare `path` rather than object identity:

```ts
const target = routes[1]
currentRoutes.at(-1)?.route === target           // Always false
currentRoutes.at(-1)?.route.path === target.path // Correct
```

### Titles are descriptors, not strings

`route.title`, `tab.label`, and `pathnameDescriptionMap` are all typed as `RouterTitle`, which is `unknown`. The core only stores and forwards them; it **never reads, concatenates, or translates** their content. The rendering layer decides their shape.

Because the route tree is fixed at creation, a already-translated string placed here is frozen in that language and cannot follow a later locale switch. Store *how to obtain the text* instead, and resolve it at render time:

```ts
// ❌ Finished copy: the tab stays in the original language after a locale switch
{ path: '/orders', title: 'Orders' }

// ✅ Descriptor: translated at render time
{ path: '/orders', title: 'app.menu.orders' }
{ path: '/orders', title: { key: 'app.menu.orders', defaultMessage: 'Orders' } }
```

How a descriptor becomes text is entirely up to the rendering layer; the core neither provides nor requires any resolution mechanism. A locale switch produces no core state change, so opened tabs and KeepAlive page instances are never rebuilt — re-translation happens only inside the components that read titles.

#### A locale switch triggers no core update at all

"A locale switch produces no core state change" is a performance win, but it also carries one thing you must remember: **the core will never tell you that it is time to re-translate.**

The reason is that state always holds descriptors. The value `'app.menu.orders'` does not change by a single byte between Chinese and English — only the rendering layer's interpretation of it changes, and the core neither depends on an i18n library nor knows that languages exist. Consequently `useRouterCoreSelector` does not fire on a locale switch: it subscribes to core state, and the locale is not part of it.

The rule that follows: **any derived result that depends on titles and is memoized must include the current locale in its dependencies.**

```tsx
// ❌ The menu stays in the language of its first render forever
const items = useMemo(() => buildMenuItems(router), [router])

// ✅ Descriptors are re-resolved whenever the locale changes
const items = useMemo(() => buildMenuItems(router, locale), [router, locale])
```

Omitting that dependency produces no warning of any kind: typecheck passes, lint passes, tests pass, and the page renders correctly. It only surfaces on a locale switch as partial desynchronization — the tabs update while the menu does not — which is hard to trace back to a dependency array.

When using `ProLayout` from `@zby/pro`, the resolution rule is already wired to `@zby/intl`; business code only needs to write `title` as a message key. Every title-dependent memo inside `ProLayout` already carries `intl.locale`, so you do not need to handle this yourself.

For a dynamic route such as `/orders/:id`:

- `supportMultipleTabs: false` or omitted uses the pattern as one shared tab key and remembers the latest concrete pathname.
- `supportMultipleTabs: true` uses each concrete pathname as an independent tab key.
- Navigating directly to an unresolved pattern is rejected. Pass a concrete pathname such as `/orders/42`. Without a cached concrete address, `jumpTo` is a no-op and writes a console warning.

## `createRouterCore` Options (Props)

These options are fixed for the lifetime of a core instance:

| Prop | Type | Required | Default | Plain-language description |
| --- | --- | --- | --- | --- |
| `routes` | `Route[]` | yes | none | Business route tree. Do not modify it after creation, including nested objects; see "Route config is fixed once the core is created". |
| `hasAuth` | `(code: string) => boolean` | no | always `true` | Checks each route's `auth` code while creating the authorized snapshot. |
| `defaultRedirectPath` | `string` | no | first accessible concrete page | Preferred target for `/`. Invalid, unauthorized, or unresolved patterns fall back automatically. |
| `isPageRoute` | `(route: Route) => boolean` | no | checks `route.element` | Tells the core which nodes are pages and which are directories only. |
| `isSameTitle` | `(left: RouterTitle, right: RouterTitle) => boolean` | no | `Object.is` | Decides whether two title descriptors are equivalent, which controls whether `setTabLabel` / `setPathnameDescription` publish new state. **Required** when descriptors are objects; otherwise every call is a new reference and re-renders the whole tab bar. |
| `keepAlive` | `boolean \| RouterKeepAliveConfig<Route>` | no | `true` | `false` keeps only the active page, `true` keeps all opened pages, and an object applies rules. |
| `storageAdapter` | `false \| RouterStorageAdapter` | no | built-in IndexedDB adapter | `false` disables persistence; provide an object for a remote or custom storage backend. |
| `storageKey` | `string` | no | `default` | Persistence namespace. Use different keys for different users or platforms. |
| `maxFixedTabCount` | `number` | no | `4` | Maximum number of opened tabs that may be fixed. Must be a finite non-negative integer; fractions are floored, `0` disables pinning, and negative or non-numeric values fall back to `4`. |

### Dependent type: `RouterKeepAliveConfig<Route>`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `maxCachedPages` | `number` | no | Maximum retained page instances. The active page is always retained; fixed tabs are protected from normal LRU eviction. |
| `include` | `string[] \| ((route: Route) => boolean)` | no | Allow list. Arrays match tab keys; functions can inspect the complete business route. |
| `exclude` | `string[] \| ((route: Route) => boolean)` | no | Deny list with higher priority than `include`. |

### Dependent type: `RouterStorageAdapter`

| Method | Parameters | Return | Description |
| --- | --- | --- | --- |
| `load` | `storageKey: string` | `Promise<Partial<RouterStorageState>>` | Loads a namespace. Fields may be missing; the core fills empty values. Same-key `load` is queued with `update`. |
| `update` | `storageKey, recipe: (current) => next` | `Promise<void>` | Applies one change to the latest persisted state. The core patches one field or one pathname; `null` deletes that key. |

### Dependent type: `RouterStorageState`

| Field | Type | Description |
| --- | --- | --- |
| `fixedTabs` | `string[]` | Complete ordered fixed-tab key snapshot. |
| `fixedParamsPathMap` | `Record<string, string>` | Shared dynamic tab key to last concrete pathname mapping. |
| `favoriteRoutePaths` | `string[]` | Complete ordered favorite registered-route paths. |

Create a new core instance when one of these definitions must change. `RouterCoreProvider` does not accept or update them.

## Core Commands and Queries

| API | Parameters / Type | Return | Plain-language description |
| --- | --- | --- | --- |
| `registry` | `RouteRegistry<Route>` | property | Immutable full and authorized route queries fixed at creation. |
| `hasAuth(code)` | `code: string` | `boolean` | Uses the authorization function supplied when the core was created. |
| `store` | `RouterReadableStore<Route>` | property | Read-only Zustand store for selectors; it intentionally has no `setState`. |
| `getState()` | none | `RouterCoreState<Route>` | Immediately reads the complete current state snapshot. |
| `subscribe(listener)` | Zustand state listener | `() => void` | Notifies on real Store changes and returns an unsubscribe function. |
| `bindHost(host)` | `RouterHost \| null` | `void` | Binds the real URL-changing host; `null` means unmounted. `RouterCoreProvider` calls this automatically. |
| `configureRuntime(options)` | `RouterRuntimeOptions` | `void` | Updates close/storage callbacks without publishing Store state. |
| `hydrateStorage()` | none | `Promise<void>` | Loads fixed tabs, dynamic pathnames, and favorites. Concurrent calls share one task. |
| `syncLocation(location)` | `RouterLocation` | `void` | Accepts the final host-confirmed URL. This is the only URL-to-Core entry. |
| `jumpTo(target)` | `string \| RouterNavigationTarget` | `void` | Validates directories, authorization, and tabs before requesting navigation. Missing host or an invalid address is a no-op. An unresolved pattern without a cached concrete pathname is ignored and writes a console warning. |
| `smartNavigate(data)` | `RouterSmartNavigateData` | `void` | Replaces same-page search/hash and delegates pathname changes to full `jumpTo`. |
| `getTabKey(pathname)` | `pathname: string` | `string \| null` | Converts a concrete URL into a stable tab identity. |
| `getCurrentRoutes(pathname)` | `pathname: string` | `RouterCurrentRoute<Route>[]` | Returns the root-to-leaf route chain for menus and breadcrumbs. |
| `reorderTabs(keys)` | `readonly string[]` | `boolean` | Requires every current tab exactly once and keeps fixed tabs before normal tabs. |
| `setTabLabel(key, label)` | `string, RouterTitle` | `void` | Replaces an open tab's default title with a business title descriptor; deduplicated through `isSameTitle`, so equal values do not publish state. |
| `setPathnameDescription(map)` | `Record<string, RouterTitle>` | `void` | Incrementally merges concrete-path descriptors, also deduplicated through `isSameTitle`. |
| `toggleFixed(tabKey)` | `tabKey: string` | `boolean` | Fixes/unfixes an open tab; returns `false` for unknown tabs or a reached limit. |
| `toggleFavoriteRoute(path)` | `path: string` | `boolean` | Favorites/unfavorites a registered page and canonicalizes dynamic paths to route patterns. |
| `closeTab(tabKey, options?)` | `string, RouterCloseOptions?` | `Promise<boolean>` | Runs close guards in registration order and rejects at the first result that is not `true`; the last remaining tab is not closed. A guarded tab that is not active is replaced into view before its guards run, and a rejection leaves the user on that tab. Unguarded inactive tabs clear immediately. The active tab waits until the host has left the closed page. A second close of that same tab returns `false` until the host confirms. Close navigation uses replace so Back cannot revive the closed tab. |
| `closeTabs(tabKeys, options)` | `readonly string[], RouterCloseTabsOptions` | `Promise<boolean>` | Closes tabs in the given order. A guarded tab is opened before its guard runs; unguarded background tabs clear immediately. A guard rejection or throw leaves that tab and continues; the first thrown error is rethrown after the batch. The batch ends on the last tab kept by a guard, or replaces back to `anchorKey` when every guard accepts. Returns false when the anchor is not open. At least one tab remains. |
| `closeThisTabOpenNewOne(data, options?)` | `{ oldPath, newPath }, RouterCloseOptions?` | `Promise<boolean>` | Requests one final replacement navigation. An active old tab closes after the host has left that page; an inactive old tab navigates first and closes only if that request succeeds. That navigation also uses replace. |
| `addBeforeCloseHook(handler, pathname)` | `RouterBeforeCloseHook, string` | `void` | Adds a close guard to the tab owning the pathname. |
| `clearBeforeCloseHook(pathname, handler?)` | `string, RouterBeforeCloseHook?` | `void` | Removes one guard, or every guard when `handler` is omitted. |
| `subscribePageLocation(tabKey, listener)` | `string, (location) => void` | `() => void` | Subscribes one retained page; immediately replays the current location when available. A throwing listener is logged and does not interrupt `syncLocation` or close notifications. |

`jumpTo` and `smartNavigate` require a bound host. `RouterCoreProvider` manages `bindHost` and `syncLocation` automatically, so it must sit inside React Router. A pathname request only enters `navigating`; it does not change `currentPathname`, `activeTabKey`, or `activePage` early. Only a host-confirmed `syncLocation` activates the target tab and page. An unresolved pattern without a cached concrete pathname does not navigate and writes a console warning. A string target keeps `URL.search` as-is and does not re-encode it with `URLSearchParams`.

`closeTab` returning `true` means the close request was accepted. The last remaining tab returns `false` so it cannot bounce through `/` and reopen. An inactive tab is cleared before the call returns, unless a composite close still needs to navigate: that navigation runs first, and the tab is not cleared if it becomes active during execute. When closing the active tab, the current page remains until the host has left the closed page, and that navigation uses replace. A second close of the same tab is rejected until the host confirms, so a double-click or overlapping `closeThisTabOpenNewOne` cannot overwrite the pending close. A trailing slash or encoding difference still counts as the same page; leaving the closed page commits the close even if the confirmed string is not an exact match. An unavailable host or synchronous navigation failure never deletes the current page early.

`closeTabs` closes several tabs, such as every tab to the left, to the right, or every tab except one. `tabKeys` is the close order. `options.anchorKey` is the tab that stays open and becomes active at the end. A guard that does not return `true` leaves that tab, and the next tab still closes. A thrown guard does the same, then the batch rejects with the first error. Closing the active tab replaces the URL with the anchor instead of stepping through another tab that is also being closed. The next tab starts only after the host has left. Overlapping calls queue. Fixed tabs are included.

### Core method dependent types

#### `RouterHost`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `navigate` | `RouterNavigate` | yes | Normal navigation accepting a string or `{ pathname, search, hash }`. |
| `redirect` | `RouterNavigate` | no | Dedicated root/directory redirect; falls back to `navigate`. |

The second `RouterNavigate` parameter is `{ replace?: boolean }`. `replace: true` replaces the current history entry instead of adding one.

| `RouterNavigateTarget` form | Field | Description |
| --- | --- | --- |
| string | complete `string` | For example `/orders/42?q=hello%20world#summary`. The query keeps `URL.search` and is not re-encoded with `URLSearchParams`. |
| object | `pathname: string` | Required target path. |
| object | `search?: string` | React Router-style query string. |
| object | `hash?: string` | React Router-style hash. |

#### `RouterLocation`

| Field | Type | Description |
| --- | --- | --- |
| `pathname` | `string` | Concrete path without query or hash. |
| `search` | `string` | Leading `?` is optional; the core normalizes it. |
| `hash` | `string` | Leading `#` is optional; the core normalizes it. |

#### Navigation input

| Type | Field | Description |
| --- | --- | --- |
| `RouterNavigationTarget` | `pathname: string` | Required concrete target path. |
| `RouterNavigationTarget` | `searchParams?: string \| null` | `undefined` restores cache; `null`/empty explicitly clears it. |
| `RouterNavigationTarget` | `hash?: string \| null` | `undefined` restores cache; `null`/empty explicitly clears it. |
| `RouterSmartNavigateData` | `pathname?: string` | Omit to reuse the active page's concrete path. |
| `RouterSmartNavigateData` | `searchParams?: string \| null` | Same semantics as above. |
| `RouterSmartNavigateData` | `hash?: string \| null` | Same semantics as above. |

> `RouterNavigationTarget` and `RouterSmartNavigateData` are documentation labels for readability. The actual TypeScript types are written inline in the method signatures.

#### Close and callback types

| Type / Field | Type | Description |
| --- | --- | --- |
| `RouterBeforeCloseHook` | `() => boolean \| Promise<boolean>` | Guards run in registration order. Each must explicitly return `true` to continue; otherwise closing is rejected and later guards do not run. |
| `RouterCloseOptions.skipBeforeClose` | `boolean` | Lets trusted callers skip guards; normal business closes should not set it. |
| `RouterCloseTabsOptions.anchorKey` | `string` | Tab kept open during a batch close, and the landing tab when the active tab is closed. |
| `RouterRuntimeOptions.onTabClose` | `(tabKey, info) => void \| Promise<void>` | Notification after closing commits; it cannot undo the close. |
| `RouterAfterTabCloseInfo.pathname` | `string` | Last concrete pathname represented by the closed tab. |
| `RouterRuntimeOptions.onStorageError` | `(error, info) => void \| Promise<void>` | Load/save failure notification; callback failures are isolated. |
| `RouterStorageErrorInfo.storageKey` | `string` | Storage namespace that failed. |
| `RouterStorageErrorInfo.phase` | `RouterStorageErrorPhase` | `load` or `update`. |

#### `RouterLocationEventPayload`

| Field | Type | Description |
| --- | --- | --- |
| `pathname` | `string` | Current concrete page path. |
| `search` | `string` | Always starts with `?` when non-empty. |
| `hash` | `string` | Always starts with `#` when non-empty. |

## Observable State

Every field in `RouterCoreState<Route>` is listed below:

| Field | Type | Meaning |
| --- | --- | --- |
| `navigationStatus` | `RouterNavigationStatus` | `bootstrapping` resolves the target, `navigating` means pathname navigation was requested, `redirecting` is redirecting, and `settled` is final. Only settled locations should render 403/404. |
| `currentPathname` | `string` | Latest pathname confirmed by the host. |
| `currentRoutes` | `readonly RouterCurrentRoute<Route>[]` | Current root-to-leaf route chain. |
| `currentSelectedPath` | `readonly string[]` | Concrete hierarchy paths used for menu selection. |
| `activeTabKey` | `string \| null` | Selected tab identity; a previous tab may remain selected on 403/404. |
| `activePage` | `string \| null` | Actually displayed KeepAlive page identity; `null` on 403/404. |
| `tabs` | `readonly RouterTab[]` | Every tab opened in this session. |
| `pages` | `readonly RouterPage<Route>[]` | Retained pages that the UI should still render. |
| `fixedSet` | `readonly string[]` | Ordered fixed-tab keys. |
| `favoriteRoutePaths` | `readonly string[]` | Ordered favorite registered-route paths. |
| `pathnameDescriptionMap` | `Readonly<Record<string, string>>` | Concrete pathname to business description mapping. |
| `storageKey` | `string` | Persistence namespace fixed at creation. |
| `maxFixedTabCount` | `number` | Fixed-tab limit fixed at creation. |
| `storageHydrated` | `boolean` | Whether the namespace completed its first successful load. Initially `true` when persistence is disabled. |
| `storageLoading` | `boolean` | Whether hydration is currently running. |
| `storageLoadError` | `unknown` | Latest hydration error; cleared when a retry starts. |

### State field dependent types

| Type | Field | Type | Description |
| --- | --- | --- | --- |
| `RouterCurrentRoute<Route>` | `route` | `Route` | Registry-owned route snapshot. |
| `RouterCurrentRoute<Route>` | `realPath` | `string` | Concrete hierarchy path with current parameters inserted. |
| `RouterTab` | `key` | `string` | Stable tab identity. |
| `RouterTab` | `label` | `RouterTitle` | Current title descriptor, copied from `route.title` by default. Not rendered text. |
| `RouterTab` | `labelCustomized` | `boolean` | Whether `setTabLabel` replaced the default title. |
| `RouterPage<Route>` | `key` | `string` | Stable identity shared with the tab. |
| `RouterPage<Route>` | `pathname` | `string` | Last concrete pathname represented by the page instance. |
| `RouterPage<Route>` | `route` | `Route` | Route snapshot used to create the page. |
| `RouterPage<Route>` | `touchedAt` | `number` | Last-visit timestamp used for finite LRU eviction. |

Use commands to mutate domain state. The exposed Zustand store is read-only and intentionally does not expose `setState`.

### `RouterReadableStore<Route>`

| Method | Return | Description |
| --- | --- | --- |
| `getState()` | `RouterCoreState<Route>` | Reads the current snapshot. |
| `getInitialState()` | `RouterCoreState<Route>` | Reads the Store creation snapshot for SSR/hydration. |
| `subscribe(listener)` | `() => void` | Subscribes and returns an unsubscribe function. There is no `setState`; use Core commands. |

## React Bindings

### `RouterCoreProvider` Props

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `router` | `RouterCore<Route>` | yes | Stable Core instance created outside React render. Replacing it moves descendants to the new Core. |
| `children` | `ReactNode` | yes | React subtree that needs the same Core. |
| `onTabClose` | `RouterRuntimeOptions['onTabClose']` | no | Notification after closing and required navigation complete; see “Close and callback types.” |
| `onStorageError` | `RouterRuntimeOptions['onStorageError']` | no | Hydration/save failure notification; see “Close and callback types.” |

The Provider does not accept fixed options such as `routes`, `keepAlive`, or `storageKey`; pass those only to `createRouterCore`. The Provider must sit inside React Router: it injects `navigate` and forwards the confirmed location to `syncLocation`. Root and directory redirects run in an effect so they do not race BrowserRouter's history listener.

### `RouterPageProvider` Props

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `page` | `RouterPage<Route>` | yes | One item directly from `state.pages`; do not construct it manually. |
| `active` | `boolean` | yes | Whether this page is actually visible, usually `page.key === state.activePage`. |
| `children` | `ReactNode` | yes | Business page subtree that needs the page-level Context. |

The dependent `RouterPage<Route>` fields are listed in “State field dependent types.”

### React Hook parameters

| Hook | Parameters | Return | Description |
| --- | --- | --- | --- |
| `useRouterCore<Route>()` | none | `RouterCore<Route>` | Reads the global Core; throws outside the Provider. |
| `useRouterCoreCreateHref()` | none | `(path: string) => string` | Builds a native href with the basename / Hash prefix. |
| `useRouterCoreSelector(selector, equalityFn?)` | state selector and optional comparator | `Selected` | Subscribes only to the selected global result. |
| `useRouterPage<Route>()` | none | `RouterPageContextValue<Route>` | Reads the complete current-page Context; throws outside PageProvider. |
| `useRouterPageSelector(selector, equalityFn?)` | page-context selector and optional comparator | `Selected` | Subscribes only to part of the current page. |

`equalityFn` is `(left: Selected, right: Selected) => boolean`; returning `true` means the results are equivalent and the previous reference can be reused.

### `RouterPageContextValue<Route>`

| Field | Type | Description |
| --- | --- | --- |
| `router` | `RouterCore<Route>` | Core owning this page, available for navigation and tab commands. |
| `pathname` | `string` | Last concrete pathname represented by the page instance. |
| `tabKey` | `string` | Stable identity shared by this page and its tab. |
| `currentRoutes` | `readonly RouterCurrentRoute<Route>[]` | This page's root-to-leaf route chain. |
| `active` | `boolean` | Whether the page is actually visible. |
| `location` | `RouterLocationEventPayload \| null` | Last complete location received by this tab; `null` before host synchronization. |

```tsx
import { useRouterCore, useRouterCoreSelector } from '@zby/router-core/react'
import type { RouterCoreState, RouterTitle } from '@zby/router-core'

// How a descriptor becomes text is up to the rendering layer; this example uses
// the simplest possible convention where a string is already the copy.
const resolve = (title: RouterTitle) => (typeof title === 'string' ? title : '')

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
      {/* label is a descriptor and must be resolved into text before rendering. */}
      {resolve(tab.label)}
    </button>
  ))
}
```

- `RouterCoreProvider` supplies a stable core, synchronizes runtime callbacks, starts hydration, and connects React Router.
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

## `useRouterCoreCreateHref`

This Hook has no arguments and returns `(path: string) => string`. An application path beginning with `/` receives the BrowserRouter basename or HashRouter prefix. External URLs and other strings not beginning with `/` are returned unchanged. It is a render-time capability and does not wait for Provider to bind navigate:

```tsx
import { useRouterCoreCreateHref } from '@zby/router-core/react'

function NativeLink() {
  const createHref = useRouterCoreCreateHref()
  return <a href={createHref('/orders')} target="_blank">Orders</a>
}
```

## Persistence

Router-core persists fixed-tab keys, the concrete pathname mapping needed by shared dynamic tabs, and favorite route paths. Transient open tabs, live page instances, customized tab labels, pathname descriptions, and other UI state are not persisted.

- Omit `storageAdapter` to use the built-in IndexedDB adapter.
- Set `storageAdapter: false` for memory-only behavior.
- Pass a custom `storageAdapter` object to use a remote API or other backend. The core normalizes data and serializes `load`/`update` for the same adapter and `storageKey`.
- Writes always go through `update(latest => next)`: fixed tabs and favorites last-write-win as whole fields; dynamic pathnames patch or delete one key. Hydration revises the latest disk snapshot instead of writing back a stale loaded copy.
- `onStorageError` reports failures; the core does not retry an old snapshot over newer state.

## Registry and Storage Utilities

### `createRouteRegistry` Props

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `routes` | `Route[]` | yes | none | Route tree to copy, validate, and index. |
| `hasAuth` | `(code: string) => boolean` | no | no active filtering | Builds the authorized tree from route.auth. |
| `defaultRedirectPath` | `string` | no | first accessible concrete page | Root-path target. |
| `isPageRoute` | `(route: Route) => boolean` | no | `isAccessibleRoute` | Custom page-node predicate. |

### Returned `RouteRegistry<Route>`

| Field / Method | Type or parameters | Description |
| --- | --- | --- |
| `routes` | `readonly Route[]` | Complete route tree snapshot. |
| `permissionRoutes` | `readonly Route[]` | Authorized route tree snapshot. |
| `fullRouteMapping` | `Readonly<Record<string, Route>>` | Complete path mapping. |
| `routeMapping` | `Readonly<Record<string, Route>>` | Authorized path mapping. |
| `defaultRoute` | `string` | Validated root-path target. |
| `resolveLeafRoute(pathname, options?)` | `options.withinAuth?: boolean` | Resolves to `{ routeKey, route }` or `null`. |
| `getTabKey(pathname)` | `string` | Resolves stable tab identity. |
| `getCurrentRoutes(pathname)` | `string` | Returns the root-to-leaf route chain. |
| `getCurrentSelectedPath(pathname)` | `string` | Returns menu-selection paths. |
| `findFirstAccessiblePath()` | none | Finds the first page path. |
| `findFirstAccessibleChild(pathname)` | `string` | Finds the first concrete child page under a directory. |
| `isPageRoute(route?)` | `Route \| null` | Applies the Registry's fixed page predicate. |

### Other root-entry utilities

| Utility | Parameters | Return / Description |
| --- | --- | --- |
| `snapshotRoutes(routes)` | `Route[]` | Copies a route tree node by node. Only own fields and the `routes` array are copied; nested objects such as `tag` stay shared by reference, and the result is not frozen. |
| `filterAuthorizedRoutes(routes, hasAuth?, isPageRoute?)` | route tree and two predicates | Returns a new authorized tree. |
| `matchRoutePath(pattern, pathname)` | two `string`s | Matches static, `:param`, and trailing `*` patterns. |
| `normalizeRoutePath(path)` | `string` | Removes query/hash and redundant trailing slashes; empty input becomes `/`. |
| `isConcreteRoutePath(path)` | `string` | Checks that no parameter or wildcard placeholders remain. |
| `isAccessibleRoute(route?)` | `RouterRoute \| null` | Default page predicate checking for `element`. |
| `preloadRoute(route?)` | `RouterRoute \| null` | Calls route.preload or element.preload; errors never escape. |
| `normalizeRouterStorageState(state?)` | `Partial<RouterStorageState> \| null` | Cleans and fills a complete storage state. |
| `createIndexedDBRouterStorageAdapter()` | none | Returns the built-in IndexedDB adapter. |

## Development

```bash
pnpm --filter @zby/router-core typecheck
pnpm --filter @zby/router-core test
pnpm --filter @zby/router-core build
```

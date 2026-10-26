<!-- 文件职责：面向中文读者说明 router-core 的用途、完整配置、类型依赖和接入方式。 -->

# @zby/router-core

[English](./index.en-US.md) | 简体中文

面向 ZBY 数字化平台的路由、页签、KeepAlive 与持久化基础能力。

**基线：`@zby/router-core` 只给公司内部的 `ProLayout` 使用。** 它不是可单独发布的通用路由包，也不接 Vue 或其它框架。业务请通过 `@zby/pro` 的 `ReactRouterProLayout` 接入；不要把它当成独立产品依赖。

## router-core 是做什么的？

普通浏览器路由器主要解决“URL 对应哪个组件”。后台平台还会遇到更多问题：一个页面对应哪个页签、动态参数页是否共用页签、关闭前能不能拦截、切走后页面是否保留、固定页签和收藏下次打开是否恢复，以及权限变化后哪些路由还能访问。`@zby/router-core` 把这些平台级规则集中起来，作为 `ProLayout` 的内部领域核心。

它负责：

- 复制并校验业务路由树，建立完整路由和权限路由两套查询快照。
- 根据真实 pathname 计算稳定页签 key，并管理页签、活动页面和 KeepAlive 页面描述。
- 缓存每个页签自己的 search、hash，以及共享动态页签最后使用的真实 pathname。
- 管理固定页签、收藏路由、关闭守卫、关闭通知和持久化 hydration。
- 给 `ProLayout` 提供 React 绑定，让布局能精确订阅状态，并把 React Router 的真实导航交给 Core。

它不负责：

- 不直接调用 `window.history`，真实 URL 由 React Router 等宿主修改。
- 不渲染菜单、页签、403/404 或页面容器，这些 UI 由 ProLayout 实现。
- 不替业务决定权限来源，只在创建时调用传入的 `hasAuth`。
- 不保存任意页面表单状态；KeepAlive 只维护仍应渲染哪些页面的描述。
- 不把业务路由注册成 React Router 的 `<Route>`。页面里的 `useParams`、`useLocation`、`useSearchParams` 要改用 `usePageParams`、`usePageLocation`、`usePageSearchParams`。对照表见下文「页面里的路由 Hooks」。

新手可以把一次导航理解成下面四步：

1. 业务调用 `router.jumpTo('/orders/42')`。
2. RouterCore 校验路由、权限和页签身份，再请求宿主改变 URL。
3. React Router 确认新地址，`RouterCoreProvider` 调用 `router.syncLocation(...)`。
4. RouterCore 更新菜单链、页签、页面描述和页面级 location，UI 订阅后重新渲染。

## 支持能力

- 静态路径、`:param` 参数路径和末尾 `*` 通配符匹配。
- 创建后不可变的完整路由表与权限路由表。
- 目录重定向和经过校验的默认页面。
- 动态路由共享页签或按真实路径创建独立页签。
- 页签排序、固定、关闭守卫和关闭通知。
- 支持 include、exclude 与 LRU 上限的 KeepAlive 页面描述。
- search、hash 和动态真实 pathname 恢复。
- 默认 IndexedDB 持久化，也可传入自定义存储适配器。
- 仅作为 ProLayout 内部核心，以及把 React Router 接进 Core 的 React 绑定层。

## 包入口

| 入口 | 作用 |
| --- | --- |
| `@zby/router-core` | Core 工厂、路由查询、存储适配器和领域类型 |
| `@zby/router-core/react` | Provider、页面 Context、精确订阅 Hook，以及 basename-aware href |

## 安装

本包只存在于公司 monorepo 内部，由 `@zby/pro` 的 ProLayout 依赖。不要单独安装，也不要作为独立包发布给外部使用。

React 绑定要求 React 18 及以上版本，并且必须位于 React Router 6 及以上版本的 Router 内部。

## 快速开始

业务接入请看 `ProLayout` 文档，使用 `ReactRouterProLayout`。下面只描述 core 自身能力，供 ProLayout 维护者阅读。

在 React 渲染流程之外只创建一次 router：

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
    title: '工作台',
    element: DashboardPage,
  },
  {
    path: '/orders',
    title: '订单管理',
    routes: [
      {
        path: '/orders/:id',
        title: '订单详情',
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

把稳定实例接入 React 与 React Router：

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

不要在组件每次渲染时直接调用 `createRouterCore`。如果不适合在模块顶层创建，应使用 `useState` 或 `useMemo` 在预期生命周期内保持同一个实例。

## 路由模型

`RouterRoute` 中由 core 消费的字段如下：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `path` | `string` | 是 | 无 | 静态路径、`:param` 参数 pattern 或末尾 `*` 通配符。 |
| `title` | `RouterTitle`（即 `unknown`） | 是 | 无 | 新页签的默认标题描述符，也可供菜单/面包屑使用。core 只存不解释；详见「标题是描述符，不是文案」。 |
| `routes` | `RouterRoute[]` | 否 | 无 | 子路由；目录和页面都可以继续拥有子节点。业务扩展类型应把它收窄成自己的 `Route[]`。 |
| `auth` | `string` | 否 | 无 | 交给 `hasAuth` 判断的权限码。 |
| `supportMultipleTabs` | `boolean` | 否 | `false` | `true` 时动态路由的每个真实 pathname 创建独立页签；否则共用 pattern 页签。 |
| `element` | `unknown` | 否 | 无 | 默认 `isPageRoute` 用来识别页面的标记，Core 不渲染也不解释它。 |
| `preload` | `() => void \| Promise<void>` | 否 | 无 | 路由级资源预加载入口；`preloadRoute` 会优先调用它。 |
| 其它字段 | `unknown` | 否 | 无 | icon、tag 等业务元数据会被快照保留，供 UI 和工具使用。 |

额外元数据会保留在路由快照中供 UI 使用。`preloadRoute` 会额外识别函数形式的 `route.preload`，或带 `preload` 方法的 `route.element`。

### 路由配置创建后不可修改

Core 创建时会逐节点复制路由树，Registry 之后只使用自己这一份。**创建 core 后请不要再修改路由配置**，需要改变路由时应创建新的 core 实例。

这条约定需要调用方自觉遵守，core 不做强制校验。复制只覆盖每个节点自身的字段和 `routes` 数组，所以实际行为是：

```ts
const routes = [{ path: '/workbench', title: '工作台', element: Page, tag: { text: 'New' } }]
const router = createRouterCore({ routes })

routes[0].title = '改过的'        // 不影响 core：title 是节点自身字段，已被复制
routes.push({ /* ... */ })        // 不影响 core：数组已被复制
routes[0].tag.text = '改过的'     // ⚠️ 会影响 core：tag 是嵌套对象，与 Registry 共享引用
```

`tag`、`icon` 等嵌套对象，以及 Registry 返回的路由对象本身（未冻结）都属于「改了会生效」的范围。不要依赖复制行为来做隔离。

另外，Registry 返回的路由对象与你传入的**不是同一个对象**，判断是否同一个路由请比较 `path`，不要用引用相等：

```ts
const target = routes[1]
currentRoutes.at(-1)?.route === target          // 永远为 false
currentRoutes.at(-1)?.route.path === target.path // 正确写法
```

### 标题是描述符，不是文案

`route.title`、`tab.label` 和 `pathnameDescriptionMap` 的类型都是 `RouterTitle`，也就是 `unknown`。core 只负责存放和原样传递，**从不读取、拼接或翻译它的内容**，具体形状由渲染层决定。

因为路由树在创建时固定，一旦把已经翻译好的文案塞进去，它就会被冻结在当时那个语言里，后续切换语言无法更新。正确做法是存「怎么得到文案」，在渲染时才解释：

```ts
// ❌ 成品文案：切换语言后页签仍是中文
{ path: '/orders', title: '订单管理' }

// ✅ 描述符：渲染时才翻译
{ path: '/orders', title: 'app.menu.orders' }
{ path: '/orders', title: { key: 'app.menu.orders', defaultMessage: '订单管理' } }
```

描述符怎么变成文本完全由渲染层决定，core 不提供也不要求任何解释机制。切换语言不产生任何 core 状态变更，因此已打开的页签和 KeepAlive 页面实例都不会被重建，重新翻译只发生在读取标题的组件内部。

#### 语言变化不会触发 core 的任何更新

上一段的「切换语言不产生任何 core 状态变更」是性能优势，但它同时意味着一件必须记住的事：**core 永远不会通知你「该重新翻译了」。**

原因是状态里存的始终是描述符。`'app.menu.orders'` 这个值在中英文之间一个字节都不会变，变的只是渲染层对它的解释方式，而 core 既不依赖 i18n 库也感知不到语言的存在。因此语言切换时，`useRouterCoreSelector` 不会触发——它订阅的是 core 状态，语言不在其中。

结论是：**任何「依赖标题、并且被缓存过」的派生结果，都必须把当前语言显式写进依赖。**

```tsx
// ❌ 菜单永远停留在首次渲染时的语言
const items = useMemo(() => buildMenuItems(router), [router])

// ✅ 语言变化时重新解释描述符
const items = useMemo(() => buildMenuItems(router, locale), [router, locale])
```

漏掉这条依赖不会有任何提示：类型检查通过、lint 通过、测试通过、页面渲染也完全正常，只在切换语言时暴露成「页签变了、菜单没变」这类局部不同步，排查时很难联想到依赖数组。

使用 `@zby/pro` 的 `ProLayout` 时解释规则已经接好 `@zby/intl`，业务只要把 `title` 写成语言包 key 即可；`ProLayout` 内部所有依赖标题的缓存都已经带上 `intl.locale`，不需要自己处理这件事。

以 `/orders/:id` 为例：

- `supportMultipleTabs: false` 或省略时，使用 pattern 作为共享页签 key，并记住最后一次真实 pathname。
- `supportMultipleTabs: true` 时，每个真实 pathname 使用独立页签 key。
- 未解析的动态 pattern 不能直接导航，应传入 `/orders/42` 这样的真实路径；没有可恢复缓存时会忽略这次 `jumpTo`，并打印控制台警告。

## `createRouterCore` 创建参数（Props）

以下配置在 core 实例生命周期内固定：

| Prop | 类型 | 必填 | 默认值 | 大白话说明 |
| --- | --- | --- | --- | --- |
| `routes` | `Route[]` | 是 | 无 | 业务路由树。创建后不要再修改，含其中的嵌套对象；详见「路由配置创建后不可修改」。 |
| `hasAuth` | `(code: string) => boolean` | 否 | 始终返回 `true` | 用路由的 `auth` 字段询问当前用户有没有权限，并据此生成权限快照。 |
| `defaultRedirectPath` | `string` | 否 | 第一个有权限的具体页面 | 用户访问 `/` 时优先跳到哪里。无效、无权限或仍带参数占位符时会自动回退。 |
| `isPageRoute` | `(route: Route) => boolean` | 否 | 检查 `route.element` 是否存在 | 告诉 Core 哪些节点是真页面，哪些只是目录。 |
| `isSameTitle` | `(left: RouterTitle, right: RouterTitle) => boolean` | 否 | `Object.is` | 判断两个标题描述符算不算同一个，决定 `setTabLabel`／`setPathnameDescription` 要不要发布新状态。描述符是对象时**必须**提供，否则每次调用都是新引用，会让整条页签栏白重渲染。 |
| `keepAlive` | `boolean \| RouterKeepAliveConfig<Route>` | 否 | `true` | `false` 表示只留活动页；`true` 表示保留全部已打开页面；对象表示按规则保留。 |
| `storageAdapter` | `false \| RouterStorageAdapter` | 否 | 内置 IndexedDB Adapter | `false` 完全关闭持久化；传对象可以接远程接口或其它存储。 |
| `storageKey` | `string` | 否 | `default` | 存储命名空间。不同用户或不同平台应使用不同 key，避免数据串用。 |
| `maxFixedTabCount` | `number` | 否 | `4` | 最多允许固定多少个已经打开的页签。必须是有限非负整数；小数向下取整，`0` 表示禁止固定，负数或非数字回退为 `4`。 |

### 依赖类型：`RouterKeepAliveConfig<Route>`

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `maxCachedPages` | `number` | 否 | 最多保留的页面实例数。活动页至少保留 1 个；固定页不会被普通 LRU 淘汰。 |
| `include` | `string[] \| ((route: Route) => boolean)` | 否 | 白名单。数组按页签 key 判断，函数可以读取整条业务路由。 |
| `exclude` | `string[] \| ((route: Route) => boolean)` | 否 | 黑名单，优先级高于 `include`；命中后页面切走即不再保留。 |

### 依赖类型：`RouterStorageAdapter`

| 方法 | 参数 | 返回值 | 说明 |
| --- | --- | --- | --- |
| `load` | `storageKey: string` | `Promise<Partial<RouterStorageState>>` | 加载指定命名空间；字段可缺失，Core 会补空值。同一 storageKey 的 load 会与 update 排队。 |
| `update` | `storageKey, recipe: (current) => next` | `Promise<void>` | 对着磁盘最新完整状态应用一次变更。Core 只改当前字段或单个 pathname；`pathname` 为 `null` 时删除该 key。 |

### 依赖类型：`RouterStorageState`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `fixedTabs` | `string[]` | 固定页签 key 的有序完整快照。 |
| `fixedParamsPathMap` | `Record<string, string>` | 共享动态页签 key 到最后真实 pathname 的映射。 |
| `favoriteRoutePaths` | `string[]` | 收藏的注册页面 route path 有序快照。 |

需要改变上述定义时应创建新的 core 实例。`RouterCoreProvider` 不重复接收或更新这些固定参数。

## Core 查询与命令

| API | 参数 / 类型 | 返回值 | 大白话说明 |
| --- | --- | --- | --- |
| `registry` | `RouteRegistry<Route>` | 属性 | 创建时固定的完整路由/权限路由查询对象。 |
| `hasAuth(code)` | `code: string` | `boolean` | 使用创建 Core 时传入的权限函数查询一个权限码。 |
| `store` | `RouterReadableStore<Route>` | 属性 | 给 React selector 使用的只读 Zustand Store，不包含 `setState`。 |
| `getState()` | 无 | `RouterCoreState<Route>` | 立即读取当前完整状态快照。 |
| `subscribe(listener)` | Zustand 状态 listener | `() => void` | 每次 Store 真正变化时通知；返回取消订阅函数。 |
| `bindHost(host)` | `RouterHost \| null` | `void` | 绑定真正能改变 URL 的宿主；传 `null` 表示宿主卸载。`RouterCoreProvider` 会自动调用，业务通常不必手动调用。 |
| `configureRuntime(options)` | `RouterRuntimeOptions` | `void` | 更新允许随 React render 变化的关闭/存储错误回调，不会发布 Store 状态。 |
| `hydrateStorage()` | 无 | `Promise<void>` | 加载固定页签、动态 pathname 和收藏；并发调用共享同一个任务。 |
| `syncLocation(location)` | `RouterLocation` | `void` | 接收宿主最终确认的地址，这是浏览器地址进入 Core 的唯一入口。 |
| `jumpTo(target)` | `string \| RouterNavigationTarget` | `void` | 校验目录、权限和页签后请求完整导航。没有宿主或地址无效时安全地不做事。未具体化且没有可恢复缓存的 pattern 会被忽略，并给出控制台警告。 |
| `smartNavigate(data)` | `RouterSmartNavigateData` | `void` | 同页只替换 search/hash；pathname 变化时自动走完整 `jumpTo`。 |
| `replacePageSearch(tabKey, searchParams, options?)` | `string, string \| null, { replace?: boolean }` | `void` | 替换一个页签自己的查询串。活动页默认 replace 地址栏；缓存页只更新该页 search，不改浏览器当前地址。空串和 `null` 都清空。 |
| `getTabKey(pathname)` | `pathname: string` | `string \| null` | 把真实地址转换成稳定页签身份；未知地址返回 `null`。 |
| `getCurrentRoutes(pathname)` | `pathname: string` | `RouterCurrentRoute<Route>[]` | 返回从根到叶子的匹配链，适合菜单和面包屑。 |
| `reorderTabs(keys)` | `readonly string[]` | `boolean` | 参数必须包含当前全部页签且不重复；固定组不能排到普通组后面。 |
| `setTabLabel(key, label)` | `string, RouterTitle` | `void` | 把一个已打开页签的默认标题换成业务标题描述符；用 `isSameTitle` 判重，相同值不会重复发布状态。 |
| `setPathnameDescription(map)` | `Record<string, RouterTitle>` | `void` | 增量合并真实地址的描述符，同样用 `isSameTitle` 判重。 |
| `toggleFixed(tabKey)` | `tabKey: string` | `boolean` | 固定/取消固定已打开页签；不存在或超过上限时返回 `false`。 |
| `toggleFavoriteRoute(path)` | `path: string` | `boolean` | 收藏/取消收藏注册页面；会把动态真实地址规范成 route pattern。 |
| `closeTab(tabKey, options?)` | `string, RouterCloseOptions?` | `Promise<boolean>` | 按注册顺序串行执行关闭守卫，遇到第一个不是 `true` 的立刻拒绝；只剩一个页签时返回 false。有守卫且当前不是活动页时，先 replace 到该页再执行守卫，拒绝则留在该页。没有守卫的非活动页签立即清理。活动页签在宿主确认已经离开被关页后清理。确认前同一页签的第二次关闭返回 false。关页跳转使用 replace，避免后退把已关页签救活。 |
| `closeTabs(tabKeys, options)` | `readonly string[], RouterCloseTabsOptions` | `Promise<boolean>` | 按给定顺序逐个关闭。有守卫的页先打开再确认；没有守卫的后台页当场关闭且不导航。守卫拒绝或抛错时留下该页，后续页签继续关；抛错会在整批结束后抛出第一个错误。活动页还在且没有为了守卫离开它时，结束不再导航。活动页被这次批量关掉时，最后 replace 回 `anchorKey`。anchor 未打开时返回 false。至少保留一个页签。 |
| `closeThisTabOpenNewOne(data, options?)` | `{ oldPath, newPath }, RouterCloseOptions?` | `Promise<boolean>` | 请求一次最终新地址导航。活动旧页在宿主离开后再关；非活动旧页先跳、成功后再关。适合保存成功后的详情页替换。这次导航同样使用 replace。 |
| `addBeforeCloseHook(handler, pathname)` | `RouterBeforeCloseHook, string` | `void` | 给 pathname 所属页签追加一个关闭前守卫。 |
| `clearBeforeCloseHook(pathname, handler?)` | `string, RouterBeforeCloseHook?` | `void` | 传 handler 删除一个；省略 handler 删除该页签全部守卫。 |
| `subscribePageLocation(tabKey, listener)` | `string, (location) => void` | `() => void` | 订阅一个保留页面自己的完整地址；若已有当前地址，会立即补发一次。listener 抛错只记日志，不会打断 `syncLocation` 或关页通知。 |

`jumpTo` 和 `smartNavigate` 需要先绑定宿主。`RouterCoreProvider` 会自动管理 `bindHost` 和 `syncLocation`，因此必须位于 React Router 内部。pathname 导航请求只会进入 `navigating`，不会提前修改 `currentPathname`、`activeTabKey` 或 `activePage`；只有宿主回传的 `syncLocation` 才会激活目标页签和页面。未具体化且没有可恢复缓存的 pattern 不会发起导航，并打印控制台警告。字符串形式的查询串按 `URL.search` 保留，不再经 `URLSearchParams` 重编码。

`closeTab` 返回 `true` 表示关闭请求已被接受。只剩一个页签时返回 `false`，避免关完经根路径重定向后再被打开。非活动页签普通关闭会在返回前完成清理；若组合命令还要跳转，则先导航，成功后再删。导航过程中该页签若已成为活动页则不再删除。关闭活动页签时，当前页会保留到宿主确认已经离开被关页，这次跳转使用 replace。宿主确认前同一页签不能再关一次，避免连点或交错的 `closeThisTabOpenNewOne` 覆盖 pending。尾斜杠或编码差异仍视为同一页；已经离开被关页则提交删除，不要求回传字符串精确等于下一页。宿主不可用或导航同步失败时不会提前删除当前页。

`closeTabs` 用于一次关掉多页，例如关闭右侧或其它页签。`tabKeys` 是待关页签，按数组顺序逐个处理；`options.anchorKey` 是保留页。某一页的守卫没有返回 `true` 时，这一页留下，下一页继续。守卫抛错同样留下该页并继续，整批结束后抛出第一个错误。没有守卫的后台页当场删除，不产生导航。带守卫的页先 replace 打开再确认；确认关闭后先处理其余页，若活动页因此被关掉，最后再 replace 到 anchor。活动页仍在且中途没有为了守卫离开它时，结束不再导航。打开下一张带守卫的页时才会在中途导航，并等宿主离开当前页后再继续。并发调用会排队。固定页签没有豁免。

### Core 方法依赖类型

#### `RouterHost`

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `navigate` | `RouterNavigate` | 是 | 普通业务导航；接收字符串或 `{ pathname, search, hash }`。 |
| `redirect` | `RouterNavigate` | 否 | 根路径/目录重定向专用；省略时复用 `navigate`。 |

`RouterNavigate` 的第二个参数是 `{ replace?: boolean }`。`replace: true` 表示替换当前 history 记录，而不是新增一条。

| `RouterNavigateTarget` 形式 | 字段 | 说明 |
| --- | --- | --- |
| 字符串 | 完整 `string` | 例如 `/orders/42?q=hello%20world#summary`。查询串按 `URL.search` 保留，不经 `URLSearchParams` 重编码。 |
| 对象 | `pathname: string` | 必填的目标路径。 |
| 对象 | `search?: string` | React Router 风格查询字符串。 |
| 对象 | `hash?: string` | React Router 风格 hash。 |

#### `RouterLocation`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `pathname` | `string` | 不含 query/hash 的真实路径。 |
| `search` | `string` | 可带或不带开头 `?`，Core 会统一格式。 |
| `hash` | `string` | 可带或不带开头 `#`，Core 会统一格式。 |

#### 导航输入

| 类型 | 字段 | 说明 |
| --- | --- | --- |
| `RouterNavigationTarget` | `pathname: string` | 必填的目标真实路径。 |
| `RouterNavigationTarget` | `searchParams?: string \| null` | `undefined` 恢复页签缓存；`null`/空串明确清空。 |
| `RouterNavigationTarget` | `hash?: string \| null` | `undefined` 恢复页签缓存；`null`/空串明确清空。 |
| `RouterSmartNavigateData` | `pathname?: string` | 省略时使用当前活动页真实路径。 |
| `RouterSmartNavigateData` | `searchParams?: string \| null` | 语义同上。 |
| `RouterSmartNavigateData` | `hash?: string \| null` | 语义同上。 |

> `RouterNavigationTarget` 和 `RouterSmartNavigateData` 是文档为了方便阅读使用的名字，实际 TypeScript 类型直接写在对应方法签名中。

#### 关闭与回调类型

| 类型 / 字段 | 类型 | 说明 |
| --- | --- | --- |
| `RouterBeforeCloseHook` | `() => boolean \| Promise<boolean>` | 按注册顺序串行执行；必须明确返回 `true` 才继续，否则关闭被拒绝且后续守卫不会运行。 |
| `RouterCloseOptions.skipBeforeClose` | `boolean` | 受信调用方跳过关闭守卫；普通业务关闭通常不要设置。 |
| `RouterCloseTabsOptions.anchorKey` | `string` | 批量关闭时保留的页签，也是活动页被关掉后的落点。 |
| `RouterRuntimeOptions.onTabClose` | `(tabKey, info) => void \| Promise<void>` | 关闭已经提交后的通知，不能撤销关闭。 |
| `RouterAfterTabCloseInfo.pathname` | `string` | 被关闭页签最后对应的真实 pathname。 |
| `RouterRuntimeOptions.onStorageError` | `(error, info) => void \| Promise<void>` | 加载或保存失败通知。回调失败会被隔离。 |
| `RouterStorageErrorInfo.storageKey` | `string` | 出错的存储命名空间。 |
| `RouterStorageErrorInfo.phase` | `RouterStorageErrorPhase` | `load` 或 `update`。 |

#### `RouterLocationEventPayload`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `pathname` | `string` | 页面当前真实路径。 |
| `search` | `string` | 非空时一定带 `?`。 |
| `hash` | `string` | 非空时一定带 `#`。 |

## 可观察状态

`RouterCoreState<Route>` 的全部字段如下：

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `navigationStatus` | `RouterNavigationStatus` | `bootstrapping` 正在判断落点；`navigating` 已请求 pathname 导航；`redirecting` 正在重定向；`settled` 地址已落定。只有落定后才应判断 403/404。 |
| `currentPathname` | `string` | 宿主最后确认的 pathname。 |
| `currentRoutes` | `readonly RouterCurrentRoute<Route>[]` | 当前地址从根到叶子的路由链。 |
| `currentSelectedPath` | `readonly string[]` | `currentRoutes` 对应的真实层级路径，适合菜单选中。 |
| `activeTabKey` | `string \| null` | UI 当前选中的页签身份；403/404 时可能仍保留旧页签选中。 |
| `activePage` | `string \| null` | 当前实际显示的 KeepAlive 页面身份；403/404 时为 `null`。 |
| `tabs` | `readonly RouterTab[]` | 本次会话已打开页签，数组顺序即页签栏顺序。新页签插在当前活动页签右侧；活动页签已固定时，未固定的新页签插在固定组之后。再次进入已有页签不改变位置。 |
| `pages` | `readonly RouterPage<Route>[]` | KeepAlive 仍然保留、应由 UI 渲染的页面描述。 |
| `fixedSet` | `readonly string[]` | 有序固定页签 key。 |
| `favoriteRoutePaths` | `readonly string[]` | 有序收藏 route path。 |
| `pathnameDescriptionMap` | `Readonly<Record<string, string>>` | 真实 pathname 到业务描述的映射。 |
| `storageKey` | `string` | 创建实例时固定的存储命名空间。 |
| `maxFixedTabCount` | `number` | 创建实例时固定的页签固定上限。 |
| `storageHydrated` | `boolean` | 当前 storageKey 是否完成首次成功加载。关闭持久化时初始就是 `true`。 |
| `storageLoading` | `boolean` | 当前是否有 hydration 正在执行。 |
| `storageLoadError` | `unknown` | 最近一次加载错误；重试开始时会清空。 |

### 状态字段依赖类型

| 类型 | 字段 | 类型 | 说明 |
| --- | --- | --- | --- |
| `RouterCurrentRoute<Route>` | `route` | `Route` | Registry 内部路由快照。 |
| `RouterCurrentRoute<Route>` | `realPath` | `string` | 已把当前参数代入的真实层级路径。 |
| `RouterTab` | `key` | `string` | 稳定页签身份。 |
| `RouterTab` | `label` | `RouterTitle` | 当前标题描述符，默认复制自 `route.title`，不是已渲染好的文本。 |
| `RouterTab` | `labelCustomized` | `boolean` | 是否被 `setTabLabel` 覆盖过。 |
| `RouterPage<Route>` | `key` | `string` | 与页签共用的稳定身份。 |
| `RouterPage<Route>` | `pathname` | `string` | 页面实例最后对应的真实 pathname。 |
| `RouterPage<Route>` | `route` | `Route` | 创建页面所用的路由快照。 |
| `RouterPage<Route>` | `touchedAt` | `number` | 最近访问时间戳，有限缓存用它做 LRU 淘汰。 |

领域状态只能通过 core 命令修改。公开的 Zustand Store 是只读契约，不暴露 `setState`。

### `RouterReadableStore<Route>`

| 方法 | 返回值 | 说明 |
| --- | --- | --- |
| `getState()` | `RouterCoreState<Route>` | 读取当前快照。 |
| `getInitialState()` | `RouterCoreState<Route>` | 读取 Store 创建时快照，主要供 SSR/hydration。 |
| `subscribe(listener)` | `() => void` | 订阅变化并返回取消函数。没有 `setState`，业务必须调用 Core 命令。 |

## React 绑定

### `RouterCoreProvider` Props

| Prop | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `router` | `RouterCore<Route>` | 是 | 在 React render 外创建并保持稳定引用的 Core 实例。切换实例会让后代改用新 Core。 |
| `children` | `ReactNode` | 是 | 需要访问同一个 Core 的 React 子树。 |
| `onTabClose` | `RouterRuntimeOptions['onTabClose']` | 否 | 页签已经关闭并完成必要导航后的通知；详细参数见前面的“关闭与回调类型”。 |
| `onStorageError` | `RouterRuntimeOptions['onStorageError']` | 否 | hydration 或保存失败通知；详细参数见前面的“关闭与回调类型”。 |

Provider 不接收 `routes`、`keepAlive`、`storageKey` 等固定配置，这些 Props 只能传给 `createRouterCore`。Provider 必须位于 React Router 内部：它会注入 `navigate`，并把确认后的 location 交给 `syncLocation`。首屏根路径或目录重定向会排到 effect 中执行，避免早于 BrowserRouter 的 history 监听。

### `RouterPageProvider` Props

| Prop | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `page` | `RouterPage<Route>` | 是 | 直接来自 `state.pages` 的某一项，不要自行拼装。 |
| `active` | `boolean` | 是 | 该页面现在是否真正显示，通常是 `page.key === state.activePage`。 |
| `children` | `ReactNode` | 是 | 需要读取当前页面级 Context 的业务页面子树。 |

`page` 依赖的 `RouterPage<Route>` 字段已列在“状态字段依赖类型”表中。

### React Hooks 参数

| Hook | 参数 | 返回值 | 说明 |
| --- | --- | --- | --- |
| `useRouterCore<Route>()` | 无 | `RouterCore<Route>` | 读取当前全局 Core；Provider 外调用会抛错。 |
| `useRouterCoreCreateHref()` | 无 | `(path: string) => string` | 生成带 basename / Hash 前缀的原生 href。 |
| `useRouterCoreSelector(selector, equalityFn?)` | 状态选择函数、可选比较函数 | `Selected` | 只订阅全局状态中真正关心的结果。 |
| `useRouterPage<Route>()` | 无 | `RouterPageContextValue<Route>` | 读取当前页面完整 Context；PageProvider 外调用会抛错。 |
| `useRouterPageSelector(selector, equalityFn?)` | 页面 Context 选择函数、可选比较函数 | `Selected` | 只订阅当前页面的某一部分。 |
| `usePageParams<Key>()` | 无 | `PageParams<Key>` | 读取当前页面自己的路径参数。用法与 `useParams()` 相同。 |
| `usePageLocation()` | 无 | `PageLocation` | 读取当前页面自己的 pathname、search、hash。 |
| `usePageSearchParams()` | 无 | `readonly [URLSearchParams, SetPageSearchParams]` | 读取并替换当前页面自己的查询串。用法与 `useSearchParams()` 相同。 |

`equalityFn` 类型为 `(left: Selected, right: Selected) => boolean`；返回 `true` 表示两次结果等价，可以复用旧引用。

### 页面里的路由 Hooks

KeepAlive 会同时留着多个页面，但 React Router 只有浏览器当前这一条地址。页面里要读「这一页自己的地址」时，用下面三个本地 Hook。它们都必须写在 `RouterPageProvider` 内；`ReactRouterProLayout` 已经为每个页签包了这一层。

| React Router | 页面里改用 | 为什么不能继续用原来的 |
| --- | --- | --- |
| `useParams()` | `usePageParams()` | 它只读 `<Route path="/records/:id">` 匹配后写入的 `params`。业务路由的 `path` 没有注册成这种 `<Route>`，页面又是 KeepAlive 直接渲染的，所以结果一直是 `{}`。 |
| `useLocation()` | `usePageLocation()` | 它读的是浏览器当前地址。缓存页还挂在树上，会看到正在显示的页签的 pathname、search 和 hash。 |
| `useSearchParams()` | `usePageSearchParams()` | 读和写的都是浏览器当前查询串。缓存页在隐藏时拉数、写 state，或调用 setter，会用到正在显示的页签的查询串，也可能把地址栏改掉。 |

```tsx
import {
  usePageLocation,
  usePageParams,
  usePageSearchParams,
} from '@zby/router-core/react'

function RecordPage() {
  const { id } = usePageParams()
  const location = usePageLocation()
  const [searchParams, setSearchParams] = usePageSearchParams()

  return (
    <button onClick={() => setSearchParams({ tab: 'activity' })}>
      {id}
      {location.pathname}
      {searchParams.get('tab')}
    </button>
  )
}
```

`usePageParams()` 用这一页的 pathname 和叶子路由 pattern 解析。地址 `/records/100`、路由 `/records/:id` 时，`id` 为 `'100'`。字段都是字符串；pattern 里没有的名字是 `undefined`。末尾 `*` 放在 `'*'` 上。百分号编码会解码，残缺编码保留原样。缓存页保留自己的参数。`usePageLocation()` 的 pathname 用这一页自己的 pathname，不借用地址快照里可能落后的那一份。

`usePageLocation()` 返回 `{ pathname, search, hash }`。`search` 非空时带 `?`，`hash` 非空时带 `#`。这里没有 React Router 的 `location.state` 和 `location.key`，因为页签不各自持有一条浏览器历史。

`usePageSearchParams()` 返回 `[URLSearchParams, setter]`。setter 替换这一页的整段查询串，函数形式会拿到这一页当前的 `URLSearchParams`。正在显示的页面默认 `replace` 地址栏，和 `smartNavigate` 一样；传入 `{ replace: false }` 才新增历史记录。缓存页只更新自己的 search，不改浏览器当前地址，之后再打开该页会恢复这次写入的查询串。

这些 Hook 可以直接用。它们作用在浏览器这一条地址上，不代表某个缓存页自己的历史：

- `useNavigate()`、`useHref()`、`<Link>`：改地址栏或生成 href。router-core 会在宿主确认后同步页签。
- `useNavigationType()`：最近一次浏览器导航是 push、replace 还是 pop。

这些 Hook 不能用：

- `useMatches()`、`useOutlet()`、`useOutletContext()`：没有对应的 `<Route>` 匹配，匹配链和出口都是空的。
- `useMatch(pattern)`：能解析浏览器当前地址，但缓存页拿到的仍是正在显示的页签。不要拿它代替 `usePageParams()`。
- `useResolvedPath()`：相对路径以浏览器当前 pathname 为基准，缓存页会算到别的页签上。
- `useLoaderData()`、`useRouteLoaderData()`、`useActionData()`、`useFetcher()`、`useSubmit()`、`useNavigation()`、`useRevalidator()`、`useBlocker()`：属于 data router。当前接入是 `BrowserRouter`，这些 Hook 不可用。页签关闭拦截用 `addBeforeCloseHook`。

### `RouterPageContextValue<Route>`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `router` | `RouterCore<Route>` | 当前页面所属 Core，可以调用导航和页签命令。 |
| `pathname` | `string` | 当前页面实例最后对应的真实 pathname。 |
| `tabKey` | `string` | 当前页面与页签共用的稳定身份。 |
| `currentRoutes` | `readonly RouterCurrentRoute<Route>[]` | 当前页面自己的根到叶子路由链。 |
| `active` | `boolean` | 页面现在是否实际显示。 |
| `location` | `RouterLocationEventPayload \| null` | 页签最后收到的完整地址；宿主尚未同步时为 `null`。 |

```tsx
import { useRouterCore, useRouterCoreSelector } from '@zby/router-core/react'
import type { RouterCoreState, RouterTitle } from '@zby/router-core'

// 描述符怎么变成文本由渲染层自己决定，这里示例最简单的「字符串即文案」约定。
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
      {/* label 是描述符，必须先解释成文本才能渲染。 */}
      {resolve(tab.label)}
    </button>
  ))
}
```

- `RouterCoreProvider` 提供稳定 core、同步运行时回调、启动 hydration，并把 React Router 接到 Core。
- `useRouterCore` 返回 core 实例和命令。
- `useRouterCoreSelector` 精确订阅选中的全局状态。
- `RouterPageProvider` 包裹自定义 KeepAlive UI 渲染的每个页面。
- `useRouterPage` 和 `useRouterPageSelector` 读取页面自己的 pathname、active 和 location。
- `usePageParams`、`usePageLocation`、`usePageSearchParams` 读取当前页面自己的路径参数、地址和查询串。对照表见「页面里的路由 Hooks」。

业务自行渲染页面时，可以遍历 `state.pages`：

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

该 Hook 没有参数，返回 `(path: string) => string`。传入以 `/` 开头的应用内路径时会补上 BrowserRouter basename 或 HashRouter 前缀；传入外部 URL 等非 `/` 开头字符串时保持原值。它属于渲染期能力，不必等待 Provider 绑定 navigate：

```tsx
import { useRouterCoreCreateHref } from '@zby/router-core/react'

function NativeLink() {
  const createHref = useRouterCoreCreateHref()
  return <a href={createHref('/orders')} target="_blank">订单管理</a>
}
```

## 持久化

Router-core 只持久化固定页签 key、恢复共享动态页签所需的真实 pathname 映射，以及收藏 route path。临时打开页签、运行中的页面实例、页签自定义标题、pathname 描述和其它 UI 状态不会持久化。

- 省略 `storageAdapter` 时使用内置 IndexedDB Adapter。
- 传入 `storageAdapter: false` 时仅使用内存状态。
- 传入自定义 `storageAdapter` 对象即可接接口或其它存储；Core 会清洗数据，并对同一 Adapter、同一 `storageKey` 的 load/update 串行。
- 写入一律 `update(latest => next)`：固定页签/收藏按字段后写赢；动态 pathname 只补或删当前 key。hydration 若需要清洗，也是对着当时磁盘最新值修订，不会把刚读到的过期快照整表写回。
- `onStorageError` 负责通知失败；core 不会用失败时捕获的旧快照覆盖后续新状态。

## Registry 与 Storage 工具

### `createRouteRegistry` Props

| Prop | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `routes` | `Route[]` | 是 | 无 | 要复制、校验并建立索引的路由树。 |
| `hasAuth` | `(code: string) => boolean` | 否 | 不主动过滤 | 根据 route.auth 生成权限树。 |
| `defaultRedirectPath` | `string` | 否 | 第一个可访问具体页面 | 根路径默认落点。 |
| `isPageRoute` | `(route: Route) => boolean` | 否 | `isAccessibleRoute` | 自定义页面节点判断。 |

### `RouteRegistry<Route>` 返回类型

| 字段 / 方法 | 类型或参数 | 说明 |
| --- | --- | --- |
| `routes` | `readonly Route[]` | 完整路由树快照。 |
| `permissionRoutes` | `readonly Route[]` | 有权限路由树快照。 |
| `fullRouteMapping` | `Readonly<Record<string, Route>>` | 完整 path 映射。 |
| `routeMapping` | `Readonly<Record<string, Route>>` | 有权限 path 映射。 |
| `defaultRoute` | `string` | 已验证的根路径落点。 |
| `resolveLeafRoute(pathname, options?)` | `options.withinAuth?: boolean` | 解析 pathname；结果是 `{ routeKey, route }` 或 `null`。 |
| `getTabKey(pathname)` | `string` | 计算稳定页签 key。 |
| `getCurrentRoutes(pathname)` | `string` | 获取根到叶子路由链。 |
| `getCurrentSelectedPath(pathname)` | `string` | 获取菜单选中路径数组。 |
| `findFirstAccessiblePath()` | 无 | 找第一个页面路径。 |
| `findFirstAccessibleChild(pathname)` | `string` | 找目录下第一个可具体化的页面。 |
| `isPageRoute(route?)` | `Route \| null` | 使用 Registry 固定规则判断页面身份。 |

### 其它根入口工具

| 工具 | 参数 | 返回值 / 说明 |
| --- | --- | --- |
| `snapshotRoutes(routes)` | `Route[]` | 逐节点复制路由树。只复制节点自身字段和 `routes` 数组，`tag` 等嵌套对象仍共享引用，返回值也未冻结。 |
| `filterAuthorizedRoutes(routes, hasAuth?, isPageRoute?)` | 路由树和两个判断函数 | 返回过滤后的新权限树。 |
| `matchRoutePath(pattern, pathname)` | 两个 `string` | 判断静态、`:param` 或末尾 `*` pattern 是否匹配。 |
| `normalizeRoutePath(path)` | `string` | 去掉 query/hash 和多余尾斜杠；空值变 `/`。 |
| `isConcreteRoutePath(path)` | `string` | 判断是否已经没有参数/通配符占位符。 |
| `isAccessibleRoute(route?)` | `RouterRoute \| null` | 默认页面判断：是否存在 `element`。 |
| `preloadRoute(route?)` | `RouterRoute \| null` | 尝试调用 route.preload 或 element.preload；失败不会冒泡。 |
| `normalizeRouterStorageState(state?)` | `Partial<RouterStorageState> \| null` | 清洗并补齐成完整存储状态。 |
| `createIndexedDBRouterStorageAdapter()` | 无 | 返回默认 IndexedDB Adapter。 |

## 开发命令

```bash
pnpm --filter @zby/router-core typecheck
pnpm --filter @zby/router-core test
pnpm --filter @zby/router-core build
```

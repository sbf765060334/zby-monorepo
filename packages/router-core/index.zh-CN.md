# @zby/router-core

[English](./README.md) | 简体中文

面向 ZBY 数字化平台的路由、页签、KeepAlive 与持久化基础能力。

这个包不是通用浏览器路由器。它负责平台特有的路由注册表、权限快照、页签身份、页面保留描述、URL 缓存和固定页签持久化；真实 URL 的改变与回传仍由 React Router 等宿主适配器完成。页面 UI 刻意留给 ProLayout 或业务应用自行实现。

## 支持能力

- 静态路径、`:param` 参数路径和末尾 `*` 通配符匹配。
- 创建后不可变的完整路由表与权限路由表。
- 目录重定向和经过校验的默认页面。
- 动态路由共享页签或按真实路径创建独立页签。
- 页签排序、固定、关闭守卫和关闭通知。
- 支持 include、exclude 与 LRU 上限的 KeepAlive 页面描述。
- search、hash 和动态真实 pathname 恢复。
- 默认 IndexedDB 持久化，也可传入自定义存储适配器。
- 与框架无关的 core，以及 React、React Router 绑定层。

## 包入口

| 入口 | 作用 |
| --- | --- |
| `@zby/router-core` | Core 工厂、路由查询、存储适配器和领域类型 |
| `@zby/router-core/react` | Core/Page Provider 与精确订阅 Hook |
| `@zby/router-core/react-router` | React Router 宿主适配器与 basename-aware href Hook |

## 安装

```bash
pnpm add @zby/router-core
```

React 绑定要求 React 18 及以上版本；React Router 适配层支持 React Router 6 及以上版本。

## 快速开始

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

不要在组件每次渲染时直接调用 `createRouterCore`。如果不适合在模块顶层创建，应使用 `useState` 或 `useMemo` 在预期生命周期内保持同一个实例。

## 路由模型

`RouterRoute` 中由 core 消费的字段如下：

| 字段 | 说明 |
| --- | --- |
| `path` | 静态路径、`:param` 参数 pattern 或末尾 `*` 通配符 |
| `title` | 默认页签标题 |
| `routes` | 子路由；目录和页面都可以继续拥有子节点 |
| `auth` | 交给 `hasAuth` 判断的权限码 |
| `supportMultipleTabs` | 为 true 时，动态路由的每个真实 pathname 创建独立页签 |
| `element` | 默认 `isPageRoute` 用来识别页面的标记 |

额外元数据会保留在路由快照中供 UI 使用。Core 创建时会递归复制路由树，后续修改原始路由对象不会更新已有实例。

以 `/orders/:id` 为例：

- `supportMultipleTabs: false` 或省略时，使用 pattern 作为共享页签 key，并记住最后一次真实 pathname。
- `supportMultipleTabs: true` 时，每个真实 pathname 使用独立页签 key。
- 未解析的动态 pattern 不能直接导航，应传入 `/orders/42` 这样的真实路径。

## 创建参数

以下配置在 core 实例生命周期内固定：

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `routes` | `Route[]` | 必填 | 创建时复制进 Registry 的路由树 |
| `hasAuth` | `(code: string) => boolean` | 全部允许 | 创建权限路由快照 |
| `defaultRedirectPath` | `string` | 第一个有权限的具体页面 | 根路径的落点 |
| `isPageRoute` | `(route: Route) => boolean` | 检查 `element` | 自定义页面判断规则 |
| `keepAlive` | `boolean \| RouterKeepAliveConfig` | `true` | 页面实例保留策略 |
| `storageAdapter` | `false \| RouterStorageAdapter` | IndexedDB | 持久化实现；false 表示关闭持久化 |
| `storageKey` | `string` | `default` | 持久化命名空间 |
| `maxFixedTabCount` | `number` | `4` | 最大固定页签数量 |

需要改变上述定义时应创建新的 core 实例。`RouterCoreProvider` 不重复接收或更新这些固定参数。

## Core 查询与命令

| API | 作用 |
| --- | --- |
| `registry` | 不可变的完整/权限路由查询 |
| `hasAuth(code)` | 使用创建实例时固定的权限函数 |
| `getState()` | 读取当前状态快照 |
| `subscribe(listener)` | 订阅 core 状态变化 |
| `bindHost(host)` | 绑定或解绑真正改变 URL 的宿主 |
| `configureRuntime(options)` | 更新 `onTabClose` 和 `onStorageError` 回调 |
| `hydrateStorage()` | 幂等加载固定页签和动态 pathname 映射 |
| `syncLocation(location)` | 接收宿主最终确认的地址 |
| `jumpTo(target)` | 执行完整平台导航并激活页签/页面 |
| `smartNavigate(data)` | 同页更新 search/hash 时 replace；pathname 改变时转交 `jumpTo` |
| `getTabKey(pathname)` | 计算稳定页签身份 |
| `getCurrentRoutes(pathname)` | 获取从根到叶子的匹配路由链 |
| `reorderTabs(keys)` | 校验后重排当前完整页签集合 |
| `setTabLabel(key, label)` | 覆盖页签标题 |
| `setPathnameDescription(map)` | 增量设置真实 pathname 描述 |
| `toggleFixed(tabKey)` | 固定或取消固定已打开页签 |
| `closeTab(tabKey, options)` | 执行关闭守卫并关闭页签 |
| `closeThisTabOpenNewOne(data, options)` | 关闭旧页签，并且只执行最终的新地址导航 |
| `addBeforeCloseHook(handler, pathname)` | 注册页面页签关闭守卫 |
| `clearBeforeCloseHook(pathname, handler?)` | 清理一个或全部关闭守卫 |
| `subscribePageLocation(tabKey, listener)` | 订阅某个保留页面实例的完整 location |

`jumpTo` 和 `smartNavigate` 需要先绑定宿主。使用 React Router 时，`RouterCoreReactRouterAdapter` 会自动管理 `bindHost` 和 `syncLocation`。

## 可观察状态

`RouterCoreState` 中最常用于渲染的字段如下：

| 字段 | 含义 |
| --- | --- |
| `currentPathname` | 宿主最后确认的 pathname |
| `currentRoutes` | 当前从根到叶子的路由链 |
| `currentSelectedPath` | 菜单选中使用的真实层级路径 |
| `activeTabKey` | 当前选中页签身份 |
| `activePage` | 当前实际显示的保留页面身份 |
| `tabs` | 已打开页签 |
| `pages` | KeepAlive 仍然保留的页面实例描述 |
| `fixedSet` | 有序固定页签 key |
| `pathnameDescriptionMap` | 真实 pathname 描述 |
| `storageHydrated` / `storageLoading` / `storageLoadError` | 持久化加载状态 |

领域状态只能通过 core 命令修改。公开的 Zustand Store 是只读契约，不暴露 `setState`。

## React 绑定

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

- `RouterCoreProvider` 提供稳定 core、同步运行时回调并启动 hydration。
- `useRouterCore` 返回 core 实例和命令。
- `useRouterCoreSelector` 精确订阅选中的全局状态。
- `RouterPageProvider` 包裹自定义 KeepAlive UI 渲染的每个页面。
- `useRouterPage` 和 `useRouterPageSelector` 读取页面自己的 pathname、active 和 location。

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

## React Router 适配层

`RouterCoreReactRouterAdapter` 必须同时位于 React Router 和 `RouterCoreProvider` 内部。它负责：

1. 把 React Router 的 `navigate` 绑定为 core 宿主。
2. 将最终确认的 pathname、search 和 hash 交给 `syncLocation`。
3. Adapter 卸载时解绑宿主。

`useRouterCoreCreateHref` 返回用于原生链接的渲染期函数，并保留 BrowserRouter basename 和 HashRouter 前缀：

```tsx
import { useRouterCoreCreateHref } from '@zby/router-core/react-router'

function NativeLink() {
  const createHref = useRouterCoreCreateHref()
  return <a href={createHref('/orders')} target="_blank">订单管理</a>
}
```

## 持久化

Router-core 只持久化固定页签 key，以及恢复固定动态页签所需的真实 pathname 映射。临时打开页签、运行中的页面实例、UI 状态和菜单收藏不会由 router-core 持久化。

- 省略 `storageAdapter` 时使用内置 IndexedDB Adapter。
- 传入 `storageAdapter: false` 时仅使用内存状态。
- 使用 `createRemoteRouterStorageAdapter` 包装远程 Adapter，可以统一标准化数据并串行同一命名空间的写入。
- `onStorageError` 负责通知失败；core 不会用失败时捕获的旧快照覆盖后续新状态。

## Registry 与 Storage 工具

根入口还导出：

- `createRouteRegistry`、`snapshotRoutes`、`filterAuthorizedRoutes`。
- `matchRoutePath`、`normalizeRoutePath`、`isAccessibleRoute`、`preloadRoute`。
- `createIndexedDBRouterStorageAdapter`、`createRemoteRouterStorageAdapter`、`normalizeRouterStorageState`。

## 开发命令

```bash
pnpm --filter @zby/router-core typecheck
pnpm --filter @zby/router-core test
pnpm --filter @zby/router-core build
```

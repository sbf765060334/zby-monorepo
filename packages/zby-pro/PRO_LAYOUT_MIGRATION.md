# ZBY ProLayout UI 与 router-core 装配迁移方案

> 更新日期：2026-07-23
>
> 本文档替代旧版“边迁移路由内核、边补 UI”的方案。当前事实是：`@zby/router-core` 的 core、React 层和 React Router Adapter 已经存在，后续 ProLayout 改造必须直接复用，不能继续维护第二套路由 Store。

## 1. 文档目标

本轮改造有两个目标：

1. 参考 Shuzhi ProLayout 已有 UI 和产品功能，在 ZBY 中补齐可迁移的 ProLayout 外壳。
2. 将路由、页签状态、KeepAlive 和持久化能力统一交给 `@zby/router-core`，使业务即使不使用 ProLayout，也能用同一套路由 API 自行搭建布局。

本文只记录能够从当前代码确认的功能、差异、问题和迁移步骤。未在 Shuzhi 或 ZBY 代码中出现的能力不纳入本次方案。

## 2. 已确认的边界

### 2.1 必须遵守

- ProLayout 最终只负责 UI、浏览器副作用和 router-core 的 React 装配，不再拥有路由 Registry、页签 Store、KeepAlive Cache 或固定页签持久化实现。
- 使用 `@zby/router-core`、`@zby/router-core/react` 和 `@zby/router-core/react-router` 的现有 API，不复制这些目录中的逻辑。
- `createRouterCore` 在 React 组件外创建并保持实例稳定；ProLayout 不根据每次 render 重新创建 core。
- `routes`、`hasAuth`、`defaultRedirectPath`、`keepAlive`、`storageAdapter`、`storageKey` 和 `maxFixedTabCount` 只传给 `createRouterCore`，不再在 ProLayout 和 Provider 中重复传递。
- 页面跳转继续使用平台语义 API：完整跳转用 `jumpTo`，同页更新查询参数或 hash 用 `smartNavigate`。不额外设计一套 `navigate`、`replace` 公共 API。
- 固定页签和动态 pathname 通过异步 hydration 恢复；已经从 router-core 删除的 `initial.pathname`、`initial.storageState` 和 ProLayout 的 `initialStorageState` 不得恢复。
- ZBY UI 只能使用 `antd` 和 `@zby/ui`；禁止引入 `shuzhi-ui`、`@shuzhi/*`。
- 新增实现及内部关键逻辑必须写清晰的中文注释。

### 2.2 明确不迁移

- Next.js 入口、`NextProLayoutProps`、`NextProLayoutPageLoading` 和 Next 专用缓存导航语义。
- AI 主题请求、AI 对话、AI Drawer、主题推荐。
- `default`、`mui`、`shadcn`、`bootstrap` 等主题 preset 及其持久化。
- 除 `auto`、`light`、`dark` 以外的主题模式。
- Inline 菜单、受控/非受控折叠、折叠弹出菜单以及 Shuzhi 的 `menu/inline/**` 实现。
- Shuzhi 私有 UI、图标、扩展 Token 和国际化依赖的直接实现。

## 3. 当前代码基线

### 3.1 `@zby/router-core` 已完成

当前包已经提供三个入口：

- `@zby/router-core`
  - `createRouterCore`
  - Route Registry、权限过滤、静态/动态/末尾通配符匹配、目录落点、资源预加载
  - 页签、固定页签、动态共享页签、多页签、KeepAlive、LRU、URL Cache
  - IndexedDB/远程 Storage Adapter
- `@zby/router-core/react`
  - `RouterCoreProvider`
  - `useRouterCore`、`useRouterCoreSelector`
  - `RouterPageProvider`
  - `useRouterPage`、`useRouterPageSelector`
- `@zby/router-core/react-router`
  - `RouterCoreReactRouterAdapter`
  - 负责绑定 React Router 的 location、navigate 和 basename-aware href 生成函数

当前 `RouterCore` 已公开的业务命令为：

- `bindHost`
- `configureRuntime`
- `hydrateStorage`
- `syncLocation`
- `jumpTo`
- `smartNavigate`
- `getTabKey`
- `getCurrentRoutes`
- `reorderTabs`
- `setTabLabel`
- `setPathnameDescription`
- `toggleFixed`
- `closeTab`
- `closeThisTabOpenNewOne`
- `addBeforeCloseHook`
- `clearBeforeCloseHook`
- `subscribePageLocation`

ProLayout 应通过 selector 读取 `currentPathname`、`currentRoutes`、`currentSelectedPath`、`tabs`、`pages`、`activeTabKey`、`activePage`、`fixedSet` 和 `pathnameDescriptionMap`，不能在 UI 内再次派生一套可写路由状态。

### 3.2 ZBY ProLayout 迁移前基线

以下内容记录开始本轮重构前的代码状态，用于解释为什么需要彻底迁移；不代表当前完成进度：

- `store/**`、`route/**`、`router/**` 与 router-core 职责重复。
- `effects/**` 仍使用旧 Store 的 pathname/location 同步链路。
- `context/**` 和 `content/PageContainer.tsx` 仍使用旧页面 emitter 和旧 Store。
- 当前没有菜单、页签、Header、收藏面板、主题、ContentContainer 等完整 UI。
- `components/pro-layout/index.ts` 只导出了类型、Context 和权限组件，没有导出可使用的 ProLayout 主组件。
- `packages/zby-pro/src/index.ts` 目前也没有公开 ProLayout。
- `ProLayoutProps` 仍包含 `routes`、`hasAuth`、`keepAlive`、`storageAdapter`、`initialStorageState` 等旧职责参数，后续需要按新边界清理。

因此，现有 ZBY ProLayout 不能被视为已经完成的布局组件；它更像是 router-core 迁移前留下的兼容代码和测试基线。

## 4. 目标装配结构

### 4.1 使用 ProLayout 的业务

推荐最终只把创建好的 router 实例传给 React Router 版 ProLayout，不能再次传固定配置：

```tsx
import { createRouterCore } from '@zby/router-core'
import { BrowserRouter } from 'react-router-dom'
import { ReactRouterProLayout } from '@zby/pro/pro-layout'

const router = createRouterCore({
  routes,
  hasAuth,
  defaultRedirectPath: '/dashboard',
  keepAlive: { maxCachedPages: 10 },
  storageKey: 'digital-platform',
})

export function App() {
  return (
    <BrowserRouter basename="/platform">
      <ReactRouterProLayout
        router={router}
        title="数字化平台"
        header={{ extra: <UserActions /> }}
        theme={{ enabled: true, defaultMode: 'auto' }}
      />
    </BrowserRouter>
  )
}
```

`ReactRouterProLayout` 内部只做以下装配：

```text
RouterCoreProvider(router)
└─ RouterCoreReactRouterAdapter
   └─ ProLayout UI Shell
      ├─ Menu
      ├─ Header + Tabs
      ├─ Breadcrumb
      └─ Content
         └─ RouterPageProvider（每个保留的 page 各一个）
```

固定配置仍然只存在于 `createRouterCore`。ProLayout 如需接收 `afterTabClose` 或存储错误回调，只能把它们映射给 `RouterCoreProvider` 的运行时回调，不能修改 core 的固定配置。

### 4.2 不使用 ProLayout 的业务

业务可以直接复用同一套基础能力：

```tsx
import { RouterCoreProvider } from '@zby/router-core/react'
import { RouterCoreReactRouterAdapter } from '@zby/router-core/react-router'
import { BrowserRouter } from 'react-router-dom'

export function App() {
  return (
    <BrowserRouter basename="/platform">
      <RouterCoreProvider router={router}>
        <RouterCoreReactRouterAdapter>
          <CustomLayout />
        </RouterCoreReactRouterAdapter>
      </RouterCoreProvider>
    </BrowserRouter>
  )
}
```

自定义布局通过 `useRouterCore` 调命令，通过 `useRouterCoreSelector` 订阅全局状态；渲染具体页面时，再用 `RouterPageProvider` 包裹页面组件。

## 5. Shuzhi ProLayout 完整功能对照

标记说明：

- `已支持`：当前 router-core 已有直接可用的能力。
- `部分支持`：core 有底层数据或内部实现，但仍缺少公开契约或兼容语义。
- `【router-core 不支持】`：当前 core 没有该能力。
- `UI 职责`：本来就不应进入 router-core，应在 ZBY ProLayout 中实现。
- `不迁移`：已由本项目边界明确排除。

### 5.1 路由、导航与权限

| Shuzhi 功能 | router-core 状态 | ZBY 迁移结论 |
| --- | --- | --- |
| 嵌套路由树、父子层级和当前路由链 | 已支持 | 使用 `registry`、`getCurrentRoutes` 和 `currentRoutes`。 |
| 静态路由、`:param` 动态路由、末尾 `*` 通配符 | 已支持 | 不再使用 ProLayout 私有 matcher。 |
| 完整路由索引与权限路由索引 | 已支持 | 菜单使用 `permissionRoutes`，403/404 同时查询完整索引和权限索引。 |
| `hasAuth` 路由过滤 | 已支持 | 创建 core 时固定权限快照。 |
| 根路径 `defaultRedirectPath` | 已支持 | core 会校验它是否为有权限的具体页面，否则回退首个可访问页面。 |
| 目录自动跳到首个可访问子页面 | 已支持 | 动态目录和尾斜杠目录也由 core 解析。 |
| `supportMultipleTabs` | 已支持 | 动态路由可选择共享 pattern 页签或按真实 pathname 建独立页签。 |
| `jumpTo` | 已支持 | ProLayout 菜单、页签、面包屑统一调用。 |
| `smartNavigate` | 已支持 | 同页 search/hash 更新使用 replace；pathname 改变时转交 `jumpTo`。 |
| 页面资源 preload | 已支持 | UI hover/focus 时解析权限路由后调用 `preloadRoute`。 |
| 菜单 `ignore` | core 保留元数据，不解释 UI | UI 只隐藏菜单项，URL 访问能力仍由路由本身决定。 |
| `_blank`、`target` | UI 职责 | UI 使用原生链接/新窗口；内部路径必须带 React Router basename。 |
| `prompt`、`tag`、`tooltipProps` | UI 职责 | core 的泛型路由快照会保留元数据，菜单负责展示与交互。 |
| 页面内任意权限码查询 | 已支持 | core 公开创建时固定的 `router.hasAuth(code)`；`useProLayoutAuth` 等业务 Hook 由业务侧按需实现，ProLayout 不重复封装。 |

### 5.2 菜单与系统切换

| Shuzhi 功能 | router-core 状态 | ZBY 迁移结论 |
| --- | --- | --- |
| Drawer 一级图标栏 | UI 职责 | 参考 Shuzhi 结构，用 antd/@zby/ui 重写。 |
| 多列菜单抽屉 | UI 职责 | 根据实际渲染分组计算列数，支持视口宽度限制。 |
| 多级递归菜单 | UI 职责 | 数据来自 `registry.permissionRoutes`。 |
| Inline 标准菜单 | 不迁移 | Shuzhi 支持，但 ZBY 为精简代码明确排除，不迁移 `menu/inline/**`。 |
| Inline 受控/非受控折叠与 popup | 不迁移 | 不保留 `collapsed/defaultCollapsed/onCollapsedChange` 及相关状态和样式。 |
| 当前菜单选中与父级展开 | 已支持底层路径 | 使用 `currentSelectedPath`，UI 维护展开交互状态。 |
| 菜单 hover/focus 预加载 | 已支持底层 preload | UI 触发 `preloadRoute`，失败不得打断交互。 |
| 收藏按钮、收藏面板、移除收藏 | UI 职责，已实现 | 收藏由 ProLayout 独立 Zustand Store 维护，导航复用 `jumpTo`，不进入路由 core。 |
| 收藏 IndexedDB/远程持久化 | UI 职责，本地存储已实现 | 使用独立 IndexedDB object store 和串行写队列；当前没有远程同步需求，因此不增加 Adapter。 |
| 系统切换入口、当前系统标识 | UI 职责 | 保留 `systemList`，点击行为仍是外部系统导航。 |
| Logo | UI 职责 | 保留图标栏顶部 Logo；不迁移 Inline 折叠态 Logo。 |

### 5.3 顶部页签

| Shuzhi 功能 | router-core 状态 | ZBY 迁移结论 |
| --- | --- | --- |
| 打开、激活、切换页签 | 已支持 | UI 读取 `tabs/activeTabKey`，切换调用 `jumpTo(tabKey)`。 |
| 动态共享页签真实 pathname 恢复 | 已支持 | core 的 Cache 与持久化负责。 |
| 页签标题动态修改 | 已支持 | 使用 `setTabLabel`。 |
| 页面 pathname 描述和 Tooltip | 已支持底层描述映射 | UI 必须用页面真实 pathname 查询描述，不能直接用共享动态 `tabKey`。 |
| 固定/取消固定 | 已支持 | 使用 `toggleFixed`，数量限制由 core 执行。 |
| 固定页签排在普通页签之前 | 已支持 | core 保证状态分组，UI 不再自行改写数组。 |
| 拖拽排序 | 已支持 | UI 将完整 key 顺序交给 `reorderTabs`；非法、缺失、重复或跨固定分组的排列会被拒绝。 |
| 关闭页签 | 已支持 | 使用 `closeTab`。 |
| 关闭前异步 Hook | 已支持 | 使用 `addBeforeCloseHook/clearBeforeCloseHook`。 |
| 关闭旧页签并打开新页 | 已支持 | 使用 `closeThisTabOpenNewOne`，只产生一次最终导航。 |
| 关闭后通知 | 已支持 | 由 `RouterCoreProvider` 同步 `onTabClose` 运行时回调。 |
| 页签下拉列表 | UI 职责 | 可由 antd Tabs 的 more/dropdown 能力实现。 |
| 收藏面板入口 | UI 职责，已实现 | 与 Drawer 菜单收藏使用同一份 ProLayout Zustand 状态。 |

### 5.4 页面渲染、KeepAlive 和异常页

| Shuzhi 功能 | router-core 状态 | ZBY 迁移结论 |
| --- | --- | --- |
| `pages` 页面实例列表 | 已支持 | Content 遍历 `RouterCoreState.pages`。 |
| 非活动页面隐藏但不卸载 | 已支持状态，UI 负责 DOM | 每个 page 只创建一个容器，使用 `activePage` 控制显示。 |
| `keepAlive=false` | 已支持 | core 只保留活动页面。 |
| `include/exclude` | 已支持 | 规则固定在 core 创建阶段。 |
| `maxCachedPages` 与 LRU | 已支持 | core 负责淘汰，UI 随 `pages` 删除卸载组件。 |
| 固定页签免于普通 LRU | 已支持 | 不在 UI 重复判断。 |
| 页面 pathname/search/hash 缓存与恢复 | 已支持 | Adapter 调用 `syncLocation` 后由 core 统一处理。 |
| 每页独立 pathname、tabKey、active、location | 已支持 | 每个页面外包 `RouterPageProvider`，页面用 `useRouterPageSelector` 精确订阅。 |
| Shuzhi `lifecycle$` 事件流 | 明确不迁移 | ZBY 只提供稳定 `active` 状态，页面通过 `useRouterPageSelector` 订阅；不构造兼容 emitter。 |
| 403 | 已支持底层判断 | 完整索引存在、权限索引不可访问时由 UI 展示 403。 |
| 404 | 已支持底层判断 | 完整索引也无法解析时由 UI 展示 404。 |
| 全局路由面包屑 | 已支持底层路由链 | ProLayout 在 Header/全局页签下方统一渲染，业务页面无需依赖 ContentContainer。 |
| Suspense loading | UI 职责 | React Router 版保留通用 Suspense fallback，不迁移 Next 专用 loading 配置。 |
| 页面错误边界 | UI 职责 | 保留按 pathname/element 变化恢复的边界。 |

### 5.5 持久化

| Shuzhi 功能 | router-core 状态 | ZBY 迁移结论 |
| --- | --- | --- |
| 固定页签持久化 | 已支持 | 由 core Adapter 保存。 |
| 固定动态页签真实 pathname | 已支持 | 由 `fixedParamsPathMap` 保存。 |
| 默认 IndexedDB Adapter | 已支持 | 使用 `createIndexedDBRouterStorageAdapter`。 |
| 远程 Adapter | 已支持 | 使用 `createRemoteRouterStorageAdapter`。 |
| `storageAdapter=false` | 已支持 | 只保留内存状态。 |
| `storageKey` 命名空间 | 已支持 | 创建 core 时固定；当前 state 可只读获取。 |
| 异步 hydration | 已支持 | Provider 挂载后执行，能防止 hydration 覆盖期间的新内存修改。 |
| 首屏同步 `initialStorageState` | 不支持且不迁移 | 已明确删除；固定页签刷新后会在 hydration 完成后异步出现。 |
| 保存失败 retry | 不支持且不迁移 | 当前精简语义是通知错误，后续任意成功保存会持久化当时的完整最新字段快照。 |
| 收藏持久化 | UI 职责，已实现 | ProLayout 使用独立 IndexedDB object store，不扩展 router-core Adapter。 |

### 5.6 Layout Context、页面副作用与浏览器行为

| Shuzhi 功能 | router-core 状态 | ZBY 迁移结论 |
| --- | --- | --- |
| 全局路由状态 selector | 已支持 | 使用 `useRouterCoreSelector`。 |
| 全局命令 | 已支持 | 使用 `useRouterCore`。 |
| 页面级 selector | 已支持 | 使用 `useRouterPageSelector`。 |
| `useProLayoutContext` 兼容 API | UI/兼容层 | 可以基于 core Hooks 做薄封装，不得保存重复状态。 |
| `useProLayoutPageContext` 兼容 API | 明确不迁移 | 页面直接使用 `useRouterPage/useRouterPageSelector`，不保留 Shuzhi Context 兼容层。 |
| 浏览器标题 | **【router-core 不支持】** | UI effect 根据应用 title、当前路由标题和 pathname 描述更新 `document.title`。 |
| `setPage` 外部页面名称通知 | **【router-core 不支持】** | UI effect 负责，属于平台集成副作用。 |
| `beforeUnload` | **【router-core 不支持】** | 保留在 ProLayout Hook，不应进入 core。 |
| 跨窗口 `message type=navigator` | 明确不迁移 | ZBY 不注册跨窗口导航监听，也不预留消息配置 API。 |
| React Router location 同步 | 已支持 | 使用 `RouterCoreReactRouterAdapter`。 |
| React Router basename href | 已支持 | `useRouterCoreCreateHref` 在渲染期读取 React Router basename/Hash 前缀；不依赖 core 私有 Host，也不拼接 `window.location.origin`。 |

### 5.7 Layout UI、主题和样式

| Shuzhi 功能 | router-core 状态 | ZBY 迁移结论 |
| --- | --- | --- |
| 左侧菜单、顶部 Header、内容区三段式布局 | UI 职责 | 用 antd Layout 和 @zby/ui 重写。 |
| `noBar` 无菜单/无页签模式 | UI 职责 | 内容区占满可视区域。 |
| `minimumContentWidth` | UI 职责 | 保留内容最小宽度语义，避免窄屏布局压坏。 |
| Header extra | UI 职责 | 保留 `header.extra`。 |
| `prefixCls` | UI 职责 | 使用 ZBY/antd 的前缀获取方式，不复制 Shuzhi extension API。 |
| semantic `classNames/styles` | UI 职责 | 至少覆盖 root、sider、logo、menu、drawer、header、tabs、extra、content、page、collection。 |
| Component Token | UI 职责 | 在 ZBY 主题体系中定义；不导入 Shuzhi Token 类型。 |
| `auto/light/dark` | UI 职责 | 保留受控/非受控模式、localStorage 和系统主题监听。 |
| View Transition 主题动画 | UI 职责 | 优先复用 ZBY 已公开的 `useThemeModeTransition`，并尊重 `prefers-reduced-motion`。 |
| 主题 preset | 不迁移 | 删除相关类型和 UI。 |
| AI 主题 | 不迁移 | 删除相关入口和依赖。 |

Shuzhi 的可确认布局 Token 包括：图标栏宽度、Header 高度、页签高度、面包屑高度、Drawer 列宽、内容最小宽度、各区域背景/边框/阴影、Logo/菜单尺寸、收藏面板尺寸和系统切换面板尺寸。ZBY 可以保留这些“可主题化的语义”，但默认值应结合 antd/@zby/ui 实际 Token 重建，不能照搬 Inline 专用 Token、`@shuzhi/cssinjs` 和 `shuzhi-ui/extension`。

#### 面包屑职责与 UI 基线

ZBY 不照搬 Shuzhi 将路由面包屑放进可选 `ProLayoutContentContainer` 的职责划分。面包屑由 ProLayout Shell 统一渲染，位置固定在 Header/全局页签下方、活动页面内容上方；`showBreadcrumb` 只控制这一处全局区域。

面包屑的数据与交互为：

- 路由层级读取 router-core 的 `currentRoutes`。
- 标题优先读取 `pathnameDescriptionMap[item.realPath]`，没有动态描述时使用 `route.title`。
- 路由存在 `icon` 时在标题前展示图标。
- 最后一项和等于当前 pathname 的项不可点击；其他可展示页面可以点击。
- 普通左键点击调用 `jumpTo(item.realPath)`；Ctrl/Command/Shift/中键等操作保留原生链接行为。
- 当前路由链为空时不渲染空面包屑栏。

虽然职责位置改变，视觉必须与 Shuzhi 保持一致：

- 左侧固定展示“当前位置：”。
- 使用 antd Breadcrumb 的默认层级分隔视觉。
- 整行水平居中对齐，最小高度使用 `breadcrumbHeight` Token。
- `paddingBlock` 对齐 `paddingXS`，`paddingInline` 对齐 `paddingSM`。
- 背景使用 `breadcrumbBg`，标签文字使用 `colorTextQuaternary` 和正常字号。
- 路由图标与文字间距使用 `marginXXS`。
- 可点击上级项 hover 时不增加背景，只显示下划线。

这里要求视觉等价，不要求继续保留 Shuzhi 的 `content-container-breadcrumb` DOM 层级或 `shuzhi-ui` 样式实现。

### 5.8 独立内容容器

Shuzhi 还公开了两个与全局路由页签不同的页面内容组件，二者属于 UI 组件：

#### `ProLayoutContentContainer`

- `fill`：默认把 children 包进一个撑满剩余空间的 Card。
- `stack`：多个内容块纵向排列，主体区域滚动。
- `items`：通过配置数组创建多个 Card。
- `ProLayoutContentContainer.Item`：允许页面直接声明单个内容块。
- `header`、`footer`。
- `aside`、`asidePosition=start/end`、`asideWidth`，窄屏下切换为纵向布局。
- 容器 `padding/gap`、Item `bodyPadding`。
- 主体、Item body 和 aside 的独立滚动能力。
- 各区域 className/style 透传。

ZBY 版本不再从页面路由 Context 读取或生成全局面包屑。特殊页面需要完全自定义导航层级时，应关闭 ProLayout 的 `showBreadcrumb` 并由业务自行渲染，避免出现两套面包屑。

#### `ProLayoutContentTabs`

- 基于 antd Tabs 组织页面内部的二级内容页签，不等同于全局路由页签。
- 默认 `fill`，单个 panel 可覆盖为 `stack`。
- 每个 panel 可以覆盖 ContentContainer 参数。
- 支持自定义 Header、Tabs extra 和 `renderTabBar`。
- 由 Tabs 控制懒挂载和已访问 panel 状态保留。

这两个组件可以迁移，但优先级应晚于主 Layout、菜单、全局页签和页面渲染链路。

## 6. 明确排除的兼容范围

ZBY 不迁移跨窗口 `navigator` 消息和 Shuzhi `lifecycle$` 事件流，也不为两者保留类型、Props、Hook 或监听器。页面显示状态统一读取 `active`；应用内导航统一由业务代码直接调用 router-core 命令。

## 7. Shuzhi 中确认存在的问题：禁止照搬

下表只列当前源码能够直接证明的问题。标为“core 已规避”的项目不需要在 ProLayout 再修一次；标为“UI 迁移必须处理”的项目要进入 ZBY UI 测试。

### 7.1 高风险

| 问题 | 代码证据与影响 | ZBY 处理 |
| --- | --- | --- |
| `hasAuth` 缺省语义错误 | `route/registry.ts` 使用 `route.auth && !hasAuth?.(route.auth)`；未传 `hasAuth` 时，所有带 auth 的路由都会被删除，与页面权限 Hook 的“未传则允许”语义冲突。 | core 已规避：只有提供 `hasAuth` 且返回 false 才过滤。 |
| IndexedDB 字段更新可能丢失 | `store/storage.ts` 先用 readonly transaction 读取，再开独立 readwrite transaction 写回。收藏、固定页签、参数路径并发更新时可能都基于旧快照，后写覆盖先写。 | core 已规避；ZBY 收藏使用独立记录和串行快照写入，也没有复制该竞态。 |
| hydration 使用单一 mutation version | `store/createStore.ts` 只要任意字段在加载期间变化，就整批放弃收藏、固定页签和参数路径 hydration，未冲突字段也无法恢复。 | core 已按字段保护，不复制旧 Store。 |
| 保存 retry 捕获旧快照 | `persistStorageAction` 的 retry 重放失败时捕获的旧 action，可能在后续状态已更新后覆盖新数据。 | core 已删除 retry，保留错误通知和后续最新快照保存。 |
| 同一页签并发关闭无锁 | 两次 `closeTab` 可同时通过首次存在性判断和异步 Hook，随后重复清理、回调和导航。 | core 已有同页签关闭事务保护。 |
| 关闭固定页签不更新 `fixedSet` | `closeTab` 删除 tabs/pages，但没有从 `fixedSet` 移除并持久化；刷新后该页签可能再次出现。 | core 已修复。 |

### 7.2 中风险

| 问题 | 代码证据与影响 | ZBY 处理 |
| --- | --- | --- |
| `ignore` 同时变成不可访问 | `isAccessibleRoute` 要求 `route.element && !route.ignore`，导致本应只从菜单隐藏的页面也不能通过 URL 访问。 | core 不解释 ignore，UI 只负责隐藏。 |
| `defaultRedirectPath` 不校验 | Shuzhi 直接采用传入字符串，不验证页面是否存在、是否有权限、是否为带 `:param` 的 pattern。 | core 已校验并回退。 |
| 动态路由仅按声明顺序匹配 | `dynamicRoutes` 按遍历顺序查找，没有具体度排序；重叠 pattern 结果依赖配置顺序，包含 `*` 但不含 `:` 的路由也没有进入动态索引。 | core 已统一静态/动态/通配符优先级。 |
| 动态目录无法正确找子页 | `findFirstAccessibleChild` 只用 `authIndex.mapping[pathname]` 精确查目录；真实动态 pathname 和尾斜杠目录查不到。 | core 已支持参数继承和目录具体化。 |
| preload 的同步 throw 未被捕获 | `Promise.resolve(preload()).catch(...)` 会先同步执行 `preload()`；同步抛错发生在 Promise 创建前。 | core 通过 Promise 微任务调用并隔离同步/异步异常。 |
| preload 可解析无权限路由 | `preloadTabRoute` 默认查完整 Registry，可能预加载无权限业务组件。 | ProLayout 必须只从权限 Registry 解析后调用 core preload。 |
| `closeThisTabOpenNewOne` 可能双导航 | 它先调用会导航相邻页的 `closeTab`，再 `jumpTo(newPath)`。 | core 已把组合命令收敛为一次最终导航。 |
| 关闭活动页可能激活不存在的 page | `closeTab` 无条件把相邻 tab key 写进 `activePage`，即使该 page 已被 LRU 淘汰。 | core 已在 page 实际存在时才设置 `activePage`。 |
| `afterTabClose` 异常可中断回退导航 | 回调在相邻页导航之前同步执行且没有异常隔离，抛错后状态已关闭但 URL 未切换。 | core 把通知放在提交/导航后并隔离同步 throw 与异步 rejection。 |
| `maxCachedPages=0` 被当成无限缓存 | `if (!maxCachedPages)` 把 0 当成未配置；超限时一次也只淘汰一个，不能立即收敛到新上限。 | core 已按明确数值和完整淘汰处理。 |
| `setTabs` 可写入任意模型 | Store 直接接受整个 Tabs item 数组，调用方可注入未知页签、删除现有页签或破坏固定分组。 | core 只公开受约束的 `reorderTabs(keys)`。 |
| `toggleFixed` 可固定未知 key | 未检查页签是否已打开，任意字符串都能进入 `fixedSet`。 | core 会拒绝未打开页签。 |

### 7.3 UI/同步问题

| 问题 | 代码证据与影响 | ZBY 处理 |
| --- | --- | --- |
| 页面 Context 与 location emitter 使用 passive effect | `content/PageContainer.tsx` 和 `effects/LocationCacheEffects.tsx` 使用 `useEffect`，绘制首帧时可能仍暴露旧 pathname，页面也可能错过首次 location。 | 使用现有 `RouterPageProvider`；它以 layout effect 同步 active、pathname 和 location。 |
| 面包屑依赖可选 ContentContainer | Shuzhi 的 `showBreadcrumb` 只提供全局开关，实际 Breadcrumb DOM 位于默认关闭 `breadcrumb` 的 ContentContainer 中；页面不使用或未开启该组件时没有面包屑。 | ZBY 改为 ProLayout 全局渲染，同时保持 Shuzhi UI。 |
| `createHref` 忽略 basename | `router/react-router.tsx` 返回 `window.location.origin + path`，部署在 `/platform` 时会生成错误链接。 | 已使用 `useRouterCoreCreateHref` 基于 React Router 根 href 生成，不复制 Shuzhi 实现。 |
| Drawer 一级 `_blank` 也忽略 basename | `menu/DrawerMenu.tsx` 直接 `window.open(path)`。 | 已改为 basename-aware 原生链接；真正外部 URL 保持原地址。 |
| 动态共享页签 Tooltip 查错 key | `tabs/PageTabs.tsx` 用 `pathnameDescriptionMap[tabKey]`，但描述通常按真实 pathname 保存，共享 `/:id` 页签可能没有 Tooltip。 | 根据 page/Cache 的真实 pathname 查询。 |
| 403/404 对目录判断不完整 | `content/index.tsx` 依赖权限精确 `routeMapping[pathname]`，存在但无权限的动态目录可能显示 404。 | 使用 core 的完整/权限 Registry 解析结果区分。 |
| `setPathnameDescription` 无变化也发布状态 | 每次都展开并创建新 map，相同描述也会触发订阅者更新。 | core 已做 no-op 判断。 |

这些问题说明 Shuzhi 只能作为功能和 UI 结构参考，不能整目录复制。

## 8. ProLayout 新旧职责与属性调整

### 8.1 从 ProLayout 固定属性中移除

以下参数改由业务在 `createRouterCore` 时传入：

- `routes`
- `hasAuth`
- `defaultRedirectPath`
- `keepAlive`
- `storageAdapter`
- `storageKey`
- `maxFixedTabCount`

以下参数直接删除：

- `initialStorageState`

### 8.2 ProLayout 保留的 UI/装配属性

- `router`：已经创建且稳定的 `RouterCore<ProLayoutRoute>`。
- `title`
- `header`
- `theme`，仅 `auto/light/dark`
- `showBreadcrumb`：控制 ProLayout 全局面包屑，不依赖业务页面组件。
- `setPage`
- `beforeUnload`
- `minimumContentWidth`
- `noBar`
- `systemList`
- `prefixCls`
- `className/rootClassName/style`
- semantic `classNames/styles`
- `afterTabClose`、存储错误通知：如为兼容旧 API 保留，只作为 Provider runtime callback，不进入 UI Store。

收藏已确认只使用 ProLayout 内部默认 IndexedDB，因此不增加收藏持久化属性或远程 Adapter API。

### 8.3 Route 类型

`ProLayoutRoute` 应扩展 router-core 的 `RouterRoute`，只增加 UI 元数据：

```ts
import type { RouterRoute } from '@zby/router-core'

export interface ProLayoutRoute extends RouterRoute {
  element?: ProLayoutRouteComponent
  icon?: ComponentType<ProLayoutRouteIconProps>
  tooltipProps?: TooltipProps
  _blank?: boolean
  target?: '_blank' | '_self' | string
  ignore?: boolean
  prompt?: true | string
  tag?: string | ProLayoutRouteTagConfig
}
```

`auth`、`routes` 和 `supportMultipleTabs` 直接复用 `RouterRoute`，避免两套领域类型逐渐偏离。

## 9. 实施顺序

### 阶段 1：调整公共类型与装配骨架

- 定义扩展 `RouterRoute` 的 `ProLayoutRoute`。
- 明确 React Router 版入口只接收一个稳定 `router` 实例。
- 装配 `RouterCoreProvider` 与 `RouterCoreReactRouterAdapter`。
- 建立只读的 `useProLayoutContext` 兼容层，底层直接委托 core Hooks。
- 暂不做菜单和页签视觉细节。

验收：根路径、直接 URL、浏览器前进后退能通过 Adapter 同步 core，且 React render 不会重建 router。

### 阶段 2：替换页面渲染链路

- Content 改为订阅 core 的 `pages/activePage`。
- 每个页面使用 `RouterPageProvider`。
- 替换旧 `PageContext` emitter、`LocationCacheEffects` 和 `PathnameSyncEffects`。
- 用 core Registry 处理 403/404。
- 在 ProLayout Shell 中统一渲染面包屑，并复刻 Shuzhi 的 UI、图标、点击和动态标题语义。
- 保留 Suspense 和错误边界。

验收：普通页面、共享动态页面、多页签动态页面、KeepAlive=false、include/exclude、LRU、关闭卸载均正确。

### 阶段 3：迁移顶部页签 UI

- 渲染 tabs、active、fixedSet。
- 切换、关闭、固定、取消固定、拖拽排序全部调用 core 命令。
- hover/focus 使用权限路由 preload。
- Tooltip 使用真实 pathname。
- 迁移 Header extra。

验收：不能跨固定/普通分组拖拽；固定数量限制、关闭 Hook、组合关闭打开和动态页签 URL 恢复正确。

### 阶段 4：迁移图标栏与 Drawer 菜单 UI

- 只实现图标一级导航栏和多列 Drawer 菜单。
- 使用 `permissionRoutes/currentSelectedPath`。
- 支持 ignore、prompt、tag、tooltip、anchor、外链和 preload。
- 迁移 Logo 和系统切换；不迁移 Inline 菜单、折叠状态和折叠 popup。
- 使用 basename-aware 原生 href 支持内部 `_blank`，普通菜单继续调用 `jumpTo`。

验收：2/3/4 级 Drawer 菜单、动态父级选中、当前路由重复点击、锚点、外链和窄屏抽屉均正确，构建产物中不包含 Inline 菜单实现。

### 阶段 5：迁移收藏

状态：已完成本地收藏与 IndexedDB 持久化。

- 收藏状态只属于 ProLayout UI。
- 实现菜单收藏按钮和收藏面板。
- 默认 IndexedDB 更新必须具备并发安全性。
- 当前没有远程收藏需求，不增加 Adapter；未来如出现真实需求，再定义独立 UI Storage Adapter。

验收：收藏不触发导航，刷新可恢复，并发收藏/取消不会丢更新，不同 storage namespace 隔离。

### 阶段 6：浏览器副作用

- 浏览器 title。
- `setPage`。
- `beforeUnload`。
- 页面权限 Hook 由业务侧按需基于 `router.hasAuth(code)` 实现，ProLayout 不迁移 `ProLayoutAuth/useProLayoutAuth`。

验收：副作用随当前页面更新且无重复监听。

### 阶段 7：ContentContainer 与 ContentTabs

- 用 antd/@zby/ui 迁移 fill、stack、aside、footer 和滚动；不在 ContentContainer 中重复实现全局面包屑。
- 再迁移页面内部 ContentTabs。
- 保持它们能够在 ProLayout Shell 外独立使用。

验收：fill 高度链、stack 滚动、aside 两侧布局、窄屏布局和 Tabs panel 状态正确。

### 阶段 8：主题与样式

- 迁移 semantic classNames/styles。
- 建立 ZBY ProLayout Component Token。
- 实现 `auto/light/dark` 受控/非受控状态和持久化。
- 复用 `useThemeModeTransition`。
- 清理所有 Shuzhi 私有依赖。

验收：三种主题模式、系统主题运行时变化、reduced-motion、暗色菜单/Drawer/Tabs/Popover/ContentContainer 可读性全部通过。

### 阶段 9：删除旧重复实现并公开导出

只有新链路测试通过后，才删除或停止导出旧的：

- `route/**`
- `router/**`
- `store/**`
- `effects/**`
- `context/emitter.ts`
- 旧 `PageContainer` 页面 emitter 逻辑

随后补齐 `@zby/pro` 的主入口或明确的 `./pro-layout`、`./pro-layout/container` 子路径导出。

验收：ZBY ProLayout 源码中不存在第二套路由 Store、Registry、Cache 或 Storage Adapter。

## 10. 回归测试矩阵

### 10.1 装配与路由

- [ ] router 实例只创建一次，普通 React render 不重建。
- [ ] BrowserRouter 和 MemoryRouter 均可使用。
- [x] basename 下导航、面包屑和 `_blank` 内部链接正确。
- [ ] `showBreadcrumb` 独立于 ContentContainer 生效，空路由链不渲染空栏。
- [ ] 面包屑的“当前位置：”、图标、间距、背景、高度和 hover 视觉与 Shuzhi 一致。
- [ ] 动态 pathname 描述覆盖路由默认标题，上级项点击调用 `jumpTo`。
- [ ] 根路径、目录、直接真实 URL、前进后退同步正确。
- [ ] 403 与 404 能区分静态、动态和目录路由。

### 10.2 页面与 KeepAlive

- [ ] 每个 `pages` 项只对应一个 React 页面实例。
- [ ] 非活动页面隐藏但不重复 render。
- [ ] `keepAlive=false`、include、exclude、LRU 与固定页签行为正确。
- [ ] 共享动态页签切换真实 pathname 时页面 Context 在绘制前更新。
- [ ] 页面能精确读取 active 和完整 location。
- [ ] 关闭或 LRU 淘汰后组件真正卸载。

### 10.3 页签

- [ ] 新页面打开、切换、关闭。
- [ ] 固定/取消固定和数量限制。
- [ ] 固定与普通分组顺序。
- [ ] 合法排序成功，缺失/重复/未知/跨组排序失败且不改状态。
- [ ] 关闭 Hook、并发关闭、关闭后回调。
- [ ] 动态页签 Tooltip 使用真实 pathname 描述。

### 10.4 菜单

- [ ] Drawer 一级菜单和多列抽屉。
- [ ] 权限过滤与 ignore 隐藏。
- [ ] prompt、tag、tooltip 和 anchor。
- [ ] hover/focus preload 的同步 throw/异步 rejection 不影响交互。
- [x] 外部 URL 与带 basename 的应用内 `_blank` 正确区分。
- [x] 收藏和系统切换不误触发内部导航。

### 10.5 持久化与副作用

- [ ] 固定页签与动态 pathname 在 hydration 后恢复。
- [ ] hydration 期间新操作不被旧数据覆盖。
- [ ] 保存失败只通知，不提供旧快照 retry。
- [x] 收藏持久化并发安全。
- [ ] title、setPage、beforeUnload 不重复注册或发布。

### 10.6 UI、主题与内容容器

- [ ] semantic classNames/styles 只影响对应区域。
- [ ] `auto/light/dark` 切换、持久化和系统主题监听正确。
- [ ] reduced-motion 下不播放主题过渡。
- [ ] 明暗主题下菜单、Tabs、Drawer、Popover 和 ContentContainer 可读。
- [ ] ContentContainer fill/stack/aside/footer/滚动正确。
- [ ] ContentTabs Header、panel mode、container props 和懒挂载正确。
- [ ] 桌面与窄视口无不可操作区域和意外溢出。

## 11. 每阶段验证命令

改动 router-core 时：

```text
pnpm --filter @zby/router-core typecheck
pnpm --filter @zby/router-core test
pnpm --filter @zby/router-core build
```

改动 ProLayout 时：

```text
pnpm --filter @zby/pro typecheck
pnpm --filter @zby/pro test
pnpm --filter @zby/pro build
```

每阶段还必须检查：

```text
git diff --check
git status --short
```

并确认：

- 没有引入 `shuzhi-ui`、`@shuzhi/*` 或 Next.js 专用依赖。
- 没有恢复 `initialStorageState` 或 storage retry。
- 没有在 ProLayout 内创建第二套 Registry、页签 Store、KeepAlive Cache 或固定页签持久化。
- 没有为了 UI 便利绕过 `jumpTo`、`smartNavigate`、`reorderTabs`、`closeTab` 等现有命令直接改 core 状态。

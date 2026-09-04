---
category: 组件
group: 数据展示
title: ProViewManagement
subtitle: 视图管理
description: 独立的视图切换与视图管理组件。
---

## 何时使用

- 表格、列表、看板或筛选页面需要保存多组业务视图；
- 需要把视图切换、新建、保存、重置、管理和排序从具体业务组件中拆出来；
- 需要本地 IndexedDB 持久化，同时保留远程接口 adapter 扩展点。

## 基本用法

```tsx
import { ProViewManagement } from '@zby/pro'
import type { ProViewManagementView } from '@zby/pro'

type Snapshot = { keyword: string }

const systemViews: ProViewManagementView<Snapshot>[] = [
  {
    id: 'all',
    name: '全部',
    scope: 'system',
    order: 0,
    snapshot: { keyword: '' },
  },
]

<ProViewManagement
  instanceId="orders"
  systemViews={systemViews}
  defaultSnapshot={{ keyword: '' }}
  currentSnapshot={snapshot}
  onApplyView={(view) => setSnapshot(view.snapshot)}
  onResetView={(view) => setSnapshot(view.snapshot)}
/>
```

未传 `adapter` 时，组件使用内置 IndexedDB adapter。数据库名为
`zby-ui-pro-view-management`，`instanceId` 用于隔离不同业务实例。

## 关键设计

- `systemViews` 由业务方提供，只能切换和重置，不能编辑、删除或排序；
- `currentSnapshot` 是当前业务状态，视图切换、重置、保存和 dirty 判断都围绕 snapshot 工作；
- `dirty` 是可选的外部覆盖值，未传时使用 `@rc-component/util` 的 `isEqual` 比较当前 snapshot 和激活视图 snapshot；
- `initialStorageState` 适合服务端或业务层预加载数据，传入后不会调用 `adapter.load`；
- `viewCounts` 优先于 `getViewCount`，数量可以是同步值或异步获取；
- 创建和重命名都会对去除首尾空格后的名称查重，范围包含系统视图和自定义视图；
- `maxCustomViews` 只限制新建和另存为，不限制重命名；远程查重或配额可通过 adapter 的异步校验方法接入。

## API

### ProViewManagement

| 参数 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| instanceId | 视图实例标识，用于隔离 IndexedDB 或自定义 adapter 中的数据 | `string` | - |
| systemViews | 系统视图列表，只能切换和重置 | `ProViewManagementView<TSnapshot>[]` | - |
| defaultSnapshot | 新建视图时使用的默认业务状态 | `TSnapshot` | - |
| currentSnapshot | 当前业务状态，保存、另存为和 dirty 判断都基于它 | `TSnapshot` | - |
| initialStorageState | 已预加载的存储状态；传入后跳过首次 `load` | `ProViewManagementStorageState<TSnapshot>` | - |
| adapter | 视图持久化 adapter；未传时使用 IndexedDB adapter | `ProViewManagementAdapter<TSnapshot>` | 内置 IndexedDB |
| loading | 外部控制的加载状态；传入后组件不会执行内部首屏 load | `boolean` | - |
| loadError | 外部控制的加载错误；错误时仍允许切换系统视图 | `unknown` | - |
| dirty | 外部覆盖未保存状态；未传时按 snapshot 自动比较 | `boolean` | - |
| isSnapshotEqual | 自定义 snapshot 比较函数 | `(left: TSnapshot, right: TSnapshot) => boolean` | `isEqual` |
| showCount | 是否展示视图数量 | `boolean` | `false` |
| popupWidth | 下拉候选列宽度（AntD `popupMatchSelectWidth`） | `number` | `220` |
| maxCustomViews | 自定义视图创建数量上限；未传表示不限制 | `number` | - |
| viewCounts | 同步数量映射，优先于 `getViewCount` | `Record<string, number | undefined | null>` | - |
| getViewCount | 获取单个视图数量 | `(view) => number | undefined | null | Promise<number | undefined | null>` | - |
| onApplyView | 切换视图后回调，业务方应在此应用 `view.snapshot` | `(view) => void | Promise<void>` | - |
| onSaveView | 保存当前自定义视图后回调 | `(view) => void | Promise<void>` | - |
| onResetView | 点击重置后回调，业务方应在此恢复 `view.snapshot` | `(view) => void | Promise<void>` | - |
| onActiveViewChange | 激活视图变化回调 | `(view) => void` | - |
| onViewsChange | 系统视图和自定义视图列表变化回调 | `(views) => void` | - |
| onRetryLoad | 加载失败后点击重试的回调 | `() => void | Promise<void>` | - |
| onLoadError | 内部 `load` 失败回调，参数包含 `retry` 方法 | `(error, info) => void` | - |
| prefixCls | 自定义样式前缀 | `string` | `pro-view-management` |
| className | 根节点类名 | `string` | - |
| rootClassName | 根节点补充类名 | `string` | - |
| style | 根节点样式 | `React.CSSProperties` | - |

### ProViewManagementView

| 字段 | 说明 | 类型 |
| --- | --- | --- |
| id | 视图唯一标识 | `string` |
| name | 视图名称 | `string` |
| scope | 视图来源；`system` 只读，`custom` 可管理 | `'system' | 'custom'` |
| order | 自定义视图排序值 | `number` |
| snapshot | 业务状态快照 | `TSnapshot` |

### ProViewManagementAdapter

| 方法 | 说明 | 类型 |
| --- | --- | --- |
| load | 加载指定实例的自定义视图和激活视图 | `(instanceId) => Promise<ProViewManagementStorageState<TSnapshot>>` |
| validateCreate | 创建前异步校验；返回字符串表示失败 | `(instanceId, payload) => string | void | Promise<string | void>` |
| validateRename | 重命名前异步校验；返回字符串表示失败 | `(instanceId, payload) => string | void | Promise<string | void>` |
| create | 创建自定义视图 | `(instanceId, view) => Promise<void>` |
| update | 更新名称、排序或 snapshot | `(instanceId, viewId, patch) => Promise<void>` |
| remove | 删除自定义视图 | `(instanceId, viewId) => Promise<void>` |
| reorder | 保存自定义视图排序 | `(instanceId, orderedViewIds) => Promise<void>` |
| setActiveViewId | 保存当前激活视图 | `(instanceId, viewId) => Promise<void>` |

可使用 `createRemoteProViewManagementAdapter(config)` 将远程接口配置原样转换为 adapter。内置
`createIndexedDBProViewManagementAdapter({ validationMessages })` 支持覆盖名称校验文案。

### ProViewManagementStorageState

| 字段 | 说明 | 类型 |
| --- | --- | --- |
| views | 自定义视图列表 | `ProViewManagementView<TSnapshot>[]` |
| activeViewId | 当前激活视图 id | `string | undefined` |

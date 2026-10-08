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
- 需要本地 IndexedDB 持久化自定义视图和当前激活视图。

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
`zby-pro-view-management`，`instanceId` 用于隔离不同业务实例。

## 关键设计

- `systemViews` 由业务方提供，只能切换和重置，不能编辑、删除或排序；
- `currentSnapshot` 是当前业务状态，视图切换、重置、保存和 dirty 判断都围绕 snapshot 工作；
- `dirty` 是可选的外部覆盖值，未传时使用 `@rc-component/util` 的 `isEqual` 比较当前 snapshot 和激活视图 snapshot；
- 未传 `storageState` 时组件自己 `adapter.load`，并在本地持有列表；传入 `storageState` 则为受控，不再 load，列表以 props 为准；
- `viewCounts` 优先于 `getViewCount`，数量可以是同步值或异步获取；
- 创建和重命名都会对去除首尾空格后的名称查重，范围包含系统视图和自定义视图；
- `maxCustomViews` 只限制新建和另存为，不限制重命名。

## API

### ProViewManagement

| 参数 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| instanceId | 视图实例标识，用于隔离 IndexedDB 或自定义 adapter 中的数据 | `string` | - |
| systemViews | 系统视图列表，只能切换和重置 | `ProViewManagementView<TSnapshot>[]` | - |
| defaultSnapshot | 新建视图时使用的默认业务状态 | `TSnapshot` | - |
| currentSnapshot | 当前业务状态，保存、另存为和 dirty 判断都基于它 | `TSnapshot` | - |
| storageState | 受控的存储状态；传入后不调用 `adapter.load`，也不再保留本地列表副本 | `ProViewManagementStorageState<TSnapshot>` | - |
| adapter | 视图持久化 adapter；未传时使用本地 IndexedDB | `ProViewManagementAdapter<TSnapshot>` | 内置 IndexedDB |
| loading | 加载中展示；不决定是否内部 load（是否 load 只看有没有 `storageState`） | `boolean` | - |
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
| onStorageStateChange | 自定义视图或当前视图 id 变化时回调；受控时父组件应据此写回 `storageState` | `(state) => void` | - |
| onRetryLoad | 加载失败后点击重试的回调 | `() => void | Promise<void>` | - |
| onLoadError | 内部 `load` 失败回调，参数包含 `retry` 方法 | `(error, info) => void` | - |
| prefixCls | 自定义样式前缀；未传时为 `ConfigProvider.getPrefixCls('pro-view-management')` | `string` | `ant-pro-view-management` |
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
| `load` | 加载指定实例的自定义视图和激活视图 | `(instanceId) => Promise<ProViewManagementStorageState<TSnapshot>>` |
| `update` | 对着磁盘最新完整状态应用一次变更 | `(instanceId, recipe: (current) => next) => Promise<void>` |

未传 `adapter` 时使用内置 IndexedDB Adapter。写入一律 `update(latest => next)`：同一 `instanceId` 的 load/update 会排队，recipe 在同一笔事务里对着当时磁盘最新值执行。名称校验在组件本地完成。一般业务不需要自己实现 Adapter。

可用 `createIndexedDBProViewManagementAdapter()` 拿到默认 IndexedDB Adapter；`normalizeProViewManagementStorageState(...)` 会补齐并清洗字段。

### ProViewManagementStorageState

| 字段 | 说明 | 类型 |
| --- | --- | --- |
| views | 自定义视图列表 | `ProViewManagementView<TSnapshot>[]` |
| activeViewId | 当前激活视图 id | `string | undefined` |

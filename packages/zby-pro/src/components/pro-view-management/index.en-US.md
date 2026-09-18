---
category: Components
group: Data Display
title: ProViewManagement
description: Standalone view switching and view management.
---

## When To Use

- A table, list, board, or filter page needs multiple saved business views;
- View switching, creation, save, reset, management, and sorting should be independent from a business component;
- Local IndexedDB persistence for custom views and the active view.

## Basic Usage

```tsx
import { ProViewManagement } from '@zby/pro'
import type { ProViewManagementView } from '@zby/pro'

type Snapshot = { keyword: string }

const systemViews: ProViewManagementView<Snapshot>[] = [
  {
    id: 'all',
    name: 'All',
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

When `adapter` is omitted, the component uses the built-in IndexedDB adapter. Its database is
named `zby-pro-view-management`, and `instanceId` isolates data for each business instance.

## Key Design Choices

- `systemViews` are supplied by the caller and can be selected or reset, but not edited, deleted, or reordered;
- `currentSnapshot` is the current business state used for switching, reset, save, and dirty detection;
- `dirty` can override internal dirty detection; when omitted, `@rc-component/util` `isEqual` compares snapshots;
- `initialStorageState` is useful for server or business-layer preloading and skips the initial `adapter.load` call;
- `viewCounts` takes precedence over `getViewCount`, and counts may be synchronous or asynchronous;
- Create and rename validate trimmed names against both system and custom views;
- `maxCustomViews` limits create/save-as but not rename.

## API

### ProViewManagement

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| instanceId | View instance id used to isolate IndexedDB or custom adapter data | `string` | - |
| systemViews | System views; they can be selected and reset | `ProViewManagementView<TSnapshot>[]` | - |
| defaultSnapshot | Business state used when creating a new view | `TSnapshot` | - |
| currentSnapshot | Current business state used for save, save-as, and dirty detection | `TSnapshot` | - |
| initialStorageState | Preloaded storage state; skips the initial `load` call | `ProViewManagementStorageState<TSnapshot>` | - |
| adapter | Persistence adapter; omitted value uses local IndexedDB | `ProViewManagementAdapter<TSnapshot>` | Built-in IndexedDB |
| loading | Externally controlled loading state; prevents the internal first load | `boolean` | - |
| loadError | Externally controlled load error; system views remain selectable | `unknown` | - |
| dirty | External dirty-state override; omitted value compares snapshots | `boolean` | - |
| isSnapshotEqual | Custom snapshot equality function | `(left: TSnapshot, right: TSnapshot) => boolean` | `isEqual` |
| showCount | Whether to show view counts | `boolean` | `false` |
| popupWidth | Dropdown option column width (`popupMatchSelectWidth` in AntD) | `number` | `220` |
| maxCustomViews | Maximum number of custom views; omitted means unlimited | `number` | - |
| viewCounts | Synchronous count map; takes precedence over `getViewCount` | `Record<string, number | undefined | null>` | - |
| getViewCount | Sync or async count getter for a view | `(view) => number | undefined | null | Promise<number | undefined | null>` | - |
| onApplyView | Called after selecting a view; apply `view.snapshot` here | `(view) => void | Promise<void>` | - |
| onSaveView | Called after saving the active custom view | `(view) => void | Promise<void>` | - |
| onResetView | Called after reset; restore `view.snapshot` here | `(view) => void | Promise<void>` | - |
| onActiveViewChange | Called when the active view changes | `(view) => void` | - |
| onViewsChange | Called when the combined view list changes | `(views) => void` | - |
| onRetryLoad | Called when the user retries after a load failure | `() => void | Promise<void>` | - |
| onLoadError | Called when internal `load` fails; `info` contains `retry` | `(error, info) => void` | - |
| prefixCls | Custom style prefix | `string` | `pro-view-management` |
| className | Root class name | `string` | - |
| rootClassName | Additional root class name | `string` | - |
| style | Root style | `React.CSSProperties` | - |

### ProViewManagementView

| Field | Description | Type |
| --- | --- | --- |
| id | Unique view id | `string` |
| name | View name | `string` |
| scope | View source; `system` is read-only and `custom` is manageable | `'system' \| 'custom'` |
| order | Custom view order | `number` |
| snapshot | Business state snapshot | `TSnapshot` |

### ProViewManagementAdapter

| Method | Description | Type |
| --- | --- | --- |
| `load` | Load custom views and the active view for an instance | `(instanceId) => Promise<ProViewManagementStorageState<TSnapshot>>` |
| `update` | Apply one change to the latest persisted state | `(instanceId, recipe: (current) => next) => Promise<void>` |

When `adapter` is omitted, the component uses the built-in IndexedDB adapter. Writes always go through `update(latest => next)`: same-`instanceId` `load`/`update` calls are queued, and the recipe runs against the latest disk value in one transaction. Name validation stays in the component. Most callers do not need a custom adapter.

Use `createIndexedDBProViewManagementAdapter()` for the default IndexedDB adapter, and `normalizeProViewManagementStorageState(...)` to fill missing fields.

### ProViewManagementStorageState

| Field | Description | Type |
| --- | --- | --- |
| views | Custom view list | `ProViewManagementView<TSnapshot>[]` |
| activeViewId | Active view id | `string \| undefined` |

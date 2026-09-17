import type {
  ProViewManagementAdapter,
  ProViewManagementView,
} from '@zby/pro'
import { createRemoteProViewManagementAdapter } from '@zby/pro'

export type Snapshot = {
  keyword: string
  owner: 'all' | 'me' | 'team'
  status: 'all' | 'pending' | 'archived'
}

export type CountMode = 'async' | 'sync'
export type LoadMode = 'ready' | 'loading' | 'error'

export const defaultSnapshot: Snapshot = {
  keyword: '',
  owner: 'all',
  status: 'all',
}

export const systemViews: ProViewManagementView<Snapshot>[] = [
  {
    id: 'system-all',
    name: '全部订单',
    scope: 'system',
    order: 0,
    snapshot: defaultSnapshot,
  },
  {
    id: 'system-pending',
    name: '待处理',
    scope: 'system',
    order: 1,
    snapshot: { keyword: '', owner: 'all', status: 'pending' },
  },
  {
    id: 'system-archived',
    name: '已归档',
    scope: 'system',
    order: 2,
    snapshot: { keyword: '', owner: 'all', status: 'archived' },
  },
]

export const initialCustomViews: ProViewManagementView<Snapshot>[] = [
  {
    id: 'custom-mine',
    name: '我的待办',
    scope: 'custom',
    order: 0,
    snapshot: { keyword: '', owner: 'me', status: 'pending' },
  },
  {
    id: 'custom-team',
    name: '团队归档',
    scope: 'custom',
    order: 1,
    snapshot: { keyword: '合同', owner: 'team', status: 'archived' },
  },
]

export const syncCounts: Record<string, number> = {
  'system-all': 128,
  'system-pending': 36,
  'system-archived': 92,
  'custom-mine': 12,
  'custom-team': 8,
}

export function createMemoryAdapter(
  onEvent: (text: string) => void,
): ProViewManagementAdapter<Snapshot> {
  let views = initialCustomViews.map((view) => ({ ...view }))
  let activeViewId: string | undefined = 'system-all'

  const wait = (duration = 180) =>
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, duration)
    })

  return createRemoteProViewManagementAdapter({
    async load(instanceId) {
      await wait(500)
      onEvent(`load · ${instanceId}`)
      return { views, activeViewId }
    },
    async validateCreate(_instanceId, payload) {
      await wait()
      if (payload.name.includes('远程')) {
        return '远程校验拒绝了这个名称'
      }
      onEvent(`validateCreate · ${payload.name}`)
      return undefined
    },
    async validateRename(_instanceId, payload) {
      await wait()
      if (payload.name.includes('远程')) {
        return '远程校验拒绝了这个名称'
      }
      onEvent(`validateRename · ${payload.name}`)
      return undefined
    },
    async create(instanceId, view) {
      await wait()
      views = views.concat({ ...view, scope: 'custom' })
      onEvent(`create · ${view.name} · ${instanceId}`)
    },
    async update(_instanceId, viewId, patch) {
      await wait()
      views = views.map((view) =>
        view.id === viewId
          ? { ...view, ...patch, id: view.id, scope: 'custom' }
          : view,
      )
      onEvent(`update · ${viewId}`)
    },
    async remove(_instanceId, viewId) {
      await wait()
      views = views.filter((view) => view.id !== viewId)
      if (activeViewId === viewId) {
        activeViewId = undefined
      }
      onEvent(`remove · ${viewId}`)
    },
    async reorder(_instanceId, orderedViewIds) {
      await wait()
      const orderLookup = new Map(
        orderedViewIds.map((viewId, index) => [viewId, index]),
      )
      views = views
        .map((view, index) => ({
          ...view,
          order: orderLookup.get(view.id) ?? index,
        }))
        .sort((left, right) => left.order - right.order)
      onEvent(`reorder · ${orderedViewIds.join(', ')}`)
    },
    async setActiveViewId(_instanceId, viewId) {
      await wait()
      activeViewId = viewId
      onEvent(`setActiveViewId · ${viewId}`)
    },
  })
}

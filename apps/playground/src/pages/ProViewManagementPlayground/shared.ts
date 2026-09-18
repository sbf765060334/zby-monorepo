import type { ProViewManagementView } from '@zby/pro'

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

export const syncCounts: Record<string, number> = {
  'system-all': 128,
  'system-pending': 36,
  'system-archived': 92,
  'custom-mine': 12,
  'custom-team': 8,
}

/**
 * 文件职责：守住 IndexedDB Adapter 的字段级写入、按 key 补丁，以及 load 读到刚写完的数据。
 */
import 'fake-indexeddb/auto'

import { describe, expect, it, vi } from 'vitest'

import {
  createIndexedDBRouterStorageAdapter,
  createRouterCore,
  normalizeRouterStorageState,
  type RouterRoute,
} from '../index'

/** 这组测试只需要静态页和共享动态页，用来观察存储字段而不是导航细节。 */
const routes: RouterRoute[] = [
  { path: '/dashboard', title: 'Dashboard', element: {} },
  { path: '/settings/profile', title: 'Profile', element: {} },
  { path: '/project/:id', title: 'Project', element: {} },
]

describe('createIndexedDBRouterStorageAdapter', () => {
  /** 后一次 load 必须读到前一次已经排队完成的收藏，而不是插队读到空快照。 */
  it('loads favorites after a previous core has queued the save', async () => {
    const storageKey = `idb-load-queue-${Date.now()}`
    const adapter = createIndexedDBRouterStorageAdapter()
    const first = createRouterCore({
      routes,
      storageAdapter: adapter,
      storageKey,
    })
    await first.hydrateStorage()
    expect(first.toggleFavoriteRoute('/settings/profile')).toBe(true)
    await vi.waitFor(async () => {
      expect((await adapter.load(storageKey)).favoriteRoutePaths).toEqual([
        '/settings/profile',
      ])
    })

    const second = createRouterCore({
      routes,
      storageAdapter: adapter,
      storageKey,
    })
    await second.hydrateStorage()
    expect(second.getState().favoriteRoutePaths).toEqual(['/settings/profile'])
  })

  /** 固定页签和动态 pathname 分字段写入，后写的固定页签不能把已有 pathname 冲掉。 */
  it('keeps params path entries when a later fixed-tab save lands', async () => {
    const storageKey = `idb-field-patch-${Date.now()}`
    const adapter = createIndexedDBRouterStorageAdapter()
    await adapter.update(storageKey, (current) => ({
      ...normalizeRouterStorageState(current),
      fixedParamsPathMap: { '/project/:id': '/project/1' },
    }))
    await adapter.update(storageKey, (current) => ({
      ...normalizeRouterStorageState(current),
      fixedTabs: ['/dashboard'],
    }))

    expect(await adapter.load(storageKey)).toEqual({
      fixedTabs: ['/dashboard'],
      fixedParamsPathMap: { '/project/:id': '/project/1' },
      favoriteRoutePaths: [],
    })
  })

  /** 按 key 增删动态 pathname 时，磁盘上其它 key 必须原样保留。 */
  it('patches and deletes one pathname without replacing the rest of the map', async () => {
    const storageKey = `idb-params-patch-${Date.now()}`
    const adapter = createIndexedDBRouterStorageAdapter()
    await adapter.update(storageKey, (current) => ({
      ...normalizeRouterStorageState(current),
      fixedParamsPathMap: { '/customer/:id': '/customer/7' },
    }))
    await adapter.update(storageKey, (current) => ({
      ...current,
      fixedParamsPathMap: {
        ...current.fixedParamsPathMap,
        '/project/:id': '/project/99',
      },
    }))

    expect((await adapter.load(storageKey)).fixedParamsPathMap).toEqual({
      '/customer/:id': '/customer/7',
      '/project/:id': '/project/99',
    })

    await adapter.update(storageKey, (current) => {
      const fixedParamsPathMap = { ...current.fixedParamsPathMap }
      delete fixedParamsPathMap['/project/:id']
      return { ...current, fixedParamsPathMap }
    })
    expect((await adapter.load(storageKey)).fixedParamsPathMap).toEqual({
      '/customer/:id': '/customer/7',
    })
  })
})

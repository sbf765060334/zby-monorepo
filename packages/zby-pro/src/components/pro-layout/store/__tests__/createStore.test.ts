import { describe, expect, it, vi } from 'vitest'

import type { ProLayoutRoute } from '../../interface'
import { createRouteRegistry } from '../../route'
import { createProLayoutStore } from '../createStore'
import type { ProLayoutStorageAdapter, ProLayoutStorageState } from '../interface'
import { enforceKeepAliveLimit } from '../keepAlive'
import { normalizeProLayoutStorageState } from '../storage'
import type {
  CreateProLayoutStoreParams,
  ProLayoutIntl,
  ProLayoutMessageApi,
} from '../types'

const routes: ProLayoutRoute[] = [
  {
    path: '/dashboard',
    title: '工作台',
    element: () => null,
  },
  {
    path: '/orders',
    title: '订单',
    element: () => null,
  },
  {
    path: '/project/:id',
    title: '项目',
    element: () => null,
  },
  {
    path: '/task/:id',
    title: '任务',
    supportMultipleTabs: true,
    element: () => null,
  },
]

const intl: ProLayoutIntl = {
  getMessage: (_id, defaultMessage = '', values) =>
    defaultMessage.replace('{{count}}', String(values?.count ?? '')),
}

describe('proLayout Store initialization and navigation', () => {
  it('keeps route indexes and internal coordination data outside the Store snapshot', () => {
    const state = createTestStore().getState()

    expect(state.registry.routes).toBe(routes)
    expect(state).not.toHaveProperty('routes')
    expect(state).not.toHaveProperty('permissionRoutes')
    expect(state).not.toHaveProperty('fullRouteMapping')
    expect(state).not.toHaveProperty('routeMapping')
    expect(state).not.toHaveProperty('storageSourceGeneration')
    expect(state).not.toHaveProperty('storageMutationVersions')
    expect(state).not.toHaveProperty('pageLocationEmitterMap')
    expect(state).not.toHaveProperty('beforeTabCloseMap')
  })

  it('creates an SSR-ready snapshot and keeps the current dynamic pathname authoritative', () => {
    const store = createTestStore({
      initialPathname: '/project/99',
      initialStorageState: {
        collection: ['/orders'],
        fixedTabs: ['/missing', '/dashboard'],
        fixedParamsPathMap: {
          '/project/:id': '/project/42',
        },
      },
    })
    const state = store.getState()

    expect(state.storageHydrated).toBe(true)
    expect(state.collectionSet).toEqual(['/orders'])
    expect(state.fixedSet).toEqual(['/dashboard'])
    expect(state.tabs.map((tab) => tab.key)).toEqual(['/dashboard', '/project/:id'])
    expect(state.activeTabKey).toBe('/project/:id')
    expect(state.activePage).toBe('/project/:id')
    expect(state.pages).toMatchObject([
      {
        key: '/project/:id',
        pathname: '/project/99',
      },
    ])
    expect(state.cache.getParamsPathByTabKey('/project/:id')).toBe('/project/99')
  })

  it('keeps persisted fixed tabs first while preserving both group orders', () => {
    const store = createTestStore({
      initialPathname: '/project/42',
      initialStorageState: {
        collection: [],
        fixedTabs: ['/orders', '/dashboard'],
        fixedParamsPathMap: {},
      },
    })

    store.getState().syncByPathname('/task/1')
    store.getState().syncByPathname('/task/2')

    expect(store.getState().tabs.map((tab) => tab.key)).toEqual([
      '/orders',
      '/dashboard',
      '/project/:id',
      '/task/1',
      '/task/2',
    ])
  })

  it('restores cached search/hash only for undefined and clears explicit empty values', () => {
    const navigate = vi.fn()
    const store = createTestStore()

    store.getState().syncExternalDeps({ navigate })
    store.getState().syncByPathname('/project/42')
    store.getState().cache.setSearchParamsForTabKey('/project/:id', 'tab=detail')
    store.getState().cache.setHashForTabKey('/project/:id', '#summary')

    store.getState().jumpTo({ pathname: '/project/99' })
    expect(navigate).toHaveBeenLastCalledWith('/project/99?tab=detail#summary')

    store.getState().jumpTo({
      pathname: '/project/100',
      searchParams: '',
      hash: null,
    })
    expect(navigate).toHaveBeenLastCalledWith('/project/100')

    // 字符串是完整目标地址，没有 search/hash 时也应明确清空旧缓存。
    store.getState().jumpTo('/project/101')
    expect(navigate).toHaveBeenLastCalledWith('/project/101')
  })

  it('replaces the current location without adding history in smart navigation', () => {
    const navigate = vi.fn()
    const store = createTestStore()

    store.getState().syncExternalDeps({ navigate })
    store.getState().syncByPathname('/orders')
    store.getState().cache.setSearchParamsForTabKey('/orders', 'status=open')
    store.getState().cache.setHashForTabKey('/orders', '#table')

    store.getState().smartNavigate({})
    expect(navigate).toHaveBeenLastCalledWith(
      {
        pathname: '/orders',
        search: 'status=open',
        hash: '#table',
      },
      { replace: true },
    )

    store.getState().smartNavigate({ searchParams: null, hash: '' })
    expect(navigate).toHaveBeenLastCalledWith(
      {
        pathname: '/orders',
        search: '',
        hash: '',
      },
      { replace: true },
    )
  })
})

describe('proLayout Store persistence coordination', () => {
  it('treats initialStorageState as hydrated and does not load over it asynchronously', async () => {
    const adapter = createAdapter()
    const store = createTestStore({
      storageAdapter: adapter,
      initialStorageState: {
        collection: ['/orders'],
        fixedTabs: ['/dashboard'],
        fixedParamsPathMap: {},
      },
    })

    await store.getState().hydrateStorage()

    expect(adapter.load).not.toHaveBeenCalled()
    expect(store.getState().collectionSet).toEqual(['/orders'])
    expect(store.getState().fixedSet).toEqual(['/dashboard'])
  })

  it('hydrates untouched fields without overwriting local collection or the active pathname', async () => {
    const loadDeferred = createDeferred<ProLayoutStorageState>()
    const adapter = createAdapter({ load: vi.fn(() => loadDeferred.promise) })
    const store = createTestStore({
      storageAdapter: adapter,
      initialPathname: '/project/99',
    })

    const hydration = store.getState().hydrateStorage()
    store.getState().toggleCollection('/orders')
    loadDeferred.resolve({
      collection: ['/dashboard'],
      fixedTabs: ['/missing', '/dashboard'],
      fixedParamsPathMap: {
        '/project/:id': '/project/42',
        '/task/:id': '/task/7',
      },
    })
    await hydration

    expect(store.getState().collectionSet).toEqual(['/orders'])
    expect(store.getState().fixedSet).toEqual(['/dashboard'])
    expect(store.getState().tabs.map((tab) => tab.key)).toEqual([
      '/dashboard',
      '/project/:id',
    ])
    expect(store.getState().cache.getFixedParamsPathMap()).toEqual({
      '/project/:id': '/project/99',
      '/task/:id': '/task/7',
    })
    expect(adapter.saveFixedTabs).toHaveBeenCalledWith('test-pro-layout', [
      '/dashboard',
    ])
    expect(adapter.saveFixedParamsPathMap).toHaveBeenCalledWith(
      'test-pro-layout',
      {
        '/project/:id': '/project/99',
        '/task/:id': '/task/7',
      },
    )
  })

  it('reloads a new storage source and ignores an older pending load result', async () => {
    const firstLoad = createDeferred<ProLayoutStorageState>()
    const firstAdapter = createAdapter({ load: vi.fn(() => firstLoad.promise) })
    const secondAdapter = createAdapter({
      load: vi.fn(async () => ({
        collection: ['/orders'],
        fixedTabs: ['/dashboard'],
        fixedParamsPathMap: {},
      })),
    })
    const store = createTestStore({ storageAdapter: firstAdapter })

    const obsoleteHydration = store.getState().hydrateStorage()
    store.getState().syncExternalDeps({
      storageKey: 'second-layout',
      storageAdapter: secondAdapter,
    })

    await vi.waitFor(() => {
      expect(store.getState().storageHydrated).toBe(true)
      expect(store.getState().collectionSet).toEqual(['/orders'])
    })

    firstLoad.resolve({
      collection: ['/dashboard'],
      fixedTabs: [],
      fixedParamsPathMap: {},
    })
    await obsoleteHydration

    expect(secondAdapter.load).toHaveBeenCalledWith('second-layout')
    expect(store.getState().storageKey).toBe('second-layout')
    expect(store.getState().collectionSet).toEqual(['/orders'])
  })

  it('keeps inactive shared dynamic tab paths when the storage source changes', async () => {
    const navigate = vi.fn()
    const nextAdapter = createAdapter()
    const store = createTestStore({ storageAdapter: false })

    store.getState().syncExternalDeps({ navigate })
    store.getState().syncByPathname('/project/42')
    store.getState().syncByPathname('/dashboard')

    expect(store.getState().activeTabKey).toBe('/dashboard')
    expect(store.getState().cache.getParamsPathByTabKey('/project/:id')).toBe(
      '/project/42',
    )

    store.getState().syncExternalDeps({ storageAdapter: nextAdapter })
    await vi.waitFor(() => {
      expect(store.getState().storageHydrated).toBe(true)
    })

    expect(store.getState().cache.getParamsPathByTabKey('/project/:id')).toBe(
      '/project/42',
    )

    store.getState().jumpTo('/project/:id')
    expect(navigate).toHaveBeenLastCalledWith('/project/42')
  })

  it('keeps the complete in-memory path cache when persistence is disabled', () => {
    const store = createTestStore({ storageAdapter: createAdapter() })

    store.getState().syncByPathname('/project/42')
    store.getState().syncByPathname('/dashboard')
    store.getState().syncExternalDeps({ storageAdapter: false })

    expect(store.getState().storageHydrated).toBe(true)
    expect(store.getState().cache.getParamsPathByTabKey('/project/:id')).toBe(
      '/project/42',
    )
  })

  it('loads an adapter introduced after starting in pure memory mode', async () => {
    const adapter = createAdapter({
      load: vi.fn(async () => ({
        collection: ['/dashboard'],
        fixedTabs: [],
        fixedParamsPathMap: {},
      })),
    })
    const store = createTestStore({ storageAdapter: false })

    expect(store.getState().storageHydrated).toBe(true)
    store.getState().syncExternalDeps({ storageAdapter: adapter })

    await vi.waitFor(() => {
      expect(adapter.load).toHaveBeenCalledOnce()
      expect(store.getState().collectionSet).toEqual(['/dashboard'])
    })
  })

  it('keeps state fully in memory while storageAdapter is false', async () => {
    const store = createTestStore({ storageAdapter: false })

    await store.getState().hydrateStorage()
    store.getState().toggleCollection('/orders')
    store.getState().toggleFixed('/dashboard')
    store.getState().syncByPathname('/project/42')

    expect(store.getState().storageHydrated).toBe(true)
    expect(store.getState().collectionSet).toEqual(['/orders'])
    expect(store.getState().fixedSet).toEqual(['/dashboard'])
    expect(store.getState().cache.getParamsPathByTabKey('/project/:id')).toBe(
      '/project/42',
    )
  })

  it('keeps the Store usable after load failure and retries the current source', async () => {
    const error = new Error('load failed')
    const load = vi
      .fn<ProLayoutStorageAdapter['load']>()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce({
        collection: ['/orders'],
        fixedTabs: [],
        fixedParamsPathMap: {},
      })
    const onStorageLoadError = vi.fn()
    const store = createTestStore({
      storageAdapter: createAdapter({ load }),
      onStorageLoadError,
    })

    await store.getState().hydrateStorage()
    store.getState().syncByPathname('/dashboard')

    expect(store.getState().storageLoadError).toBe(error)
    expect(store.getState().activeTabKey).toBe('/dashboard')
    const [, info] = onStorageLoadError.mock.lastCall!
    expect(info).toMatchObject({
      storageKey: 'test-pro-layout',
      phase: 'load',
    })

    await info.retry()
    expect(store.getState().storageHydrated).toBe(true)
    expect(store.getState().collectionSet).toEqual(['/orders'])
  })

  it('reports save errors with a retry that replays the failed operation', async () => {
    const error = new Error('save failed')
    const saveCollection = vi
      .fn<(storageKey: string, collection: string[]) => Promise<void>>()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(undefined)
    const onStorageLoadError = vi.fn()
    const adapter = createAdapter({ saveCollection })
    const store = createTestStore({ storageAdapter: adapter, onStorageLoadError })

    store.getState().toggleCollection('/dashboard')

    await vi.waitFor(() => {
      expect(onStorageLoadError).toHaveBeenCalledOnce()
    })

    const [, info] = onStorageLoadError.mock.lastCall!
    expect(info).toMatchObject({
      storageKey: 'test-pro-layout',
      phase: 'saveCollection',
    })
    await info.retry()
    expect(saveCollection).toHaveBeenCalledTimes(2)
  })
})

describe('proLayout Store tabs and KeepAlive', () => {
  it('does not update state or persist fixed tabs when setTabs receives equal tabs', () => {
    const adapter = createAdapter()
    const store = createTestStore({
      storageAdapter: adapter,
      initialStorageState: {
        collection: [],
        fixedTabs: ['/dashboard'],
        fixedParamsPathMap: {},
      },
    })
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)
    const equalTabs = store.getState().tabs.map((tab) => ({ ...tab }))

    store.getState().setTabs(equalTabs)

    expect(listener).not.toHaveBeenCalled()
    expect(adapter.saveFixedTabs).not.toHaveBeenCalled()
    unsubscribe()
  })

  it('updates an ordinary tab reorder without persisting fixed tabs', () => {
    const adapter = createAdapter()
    const store = createTestStore({
      storageAdapter: adapter,
      initialStorageState: {
        collection: [],
        fixedTabs: ['/dashboard'],
        fixedParamsPathMap: {},
      },
    })

    store.getState().syncByPathname('/orders')
    store.getState().syncByPathname('/project/42')
    const [fixedTab, ordersTab, projectTab] = store.getState().tabs

    store.getState().setTabs([fixedTab, projectTab, ordersTab])

    expect(store.getState().tabs.map((tab) => tab.key)).toEqual([
      '/dashboard',
      '/project/:id',
      '/orders',
    ])
    expect(store.getState().fixedSet).toEqual(['/dashboard'])
    expect(adapter.saveFixedTabs).not.toHaveBeenCalled()
  })

  it('updates and persists the fixed tab order exactly once', () => {
    const adapter = createAdapter()
    const store = createTestStore({
      storageAdapter: adapter,
      initialStorageState: {
        collection: [],
        fixedTabs: ['/dashboard', '/orders'],
        fixedParamsPathMap: {},
      },
    })
    const [dashboardTab, ordersTab] = store.getState().tabs

    store.getState().setTabs([ordersTab, dashboardTab])

    expect(store.getState().tabs.map((tab) => tab.key)).toEqual([
      '/orders',
      '/dashboard',
    ])
    expect(store.getState().fixedSet).toEqual(['/orders', '/dashboard'])
    expect(adapter.saveFixedTabs).toHaveBeenCalledOnce()
    expect(adapter.saveFixedTabs).toHaveBeenCalledWith('test-pro-layout', [
      '/orders',
      '/dashboard',
    ])
  })

  it('keeps a tab open when any before-close hook refuses', async () => {
    const store = createTestStore()

    store.getState().syncByPathname('/dashboard')
    store.getState().addBeforeCloseHook(() => true, '/dashboard')
    store.getState().addBeforeCloseHook(() => false, '/dashboard')

    await expect(store.getState().closeTab('/dashboard')).resolves.toBe(false)
    expect(store.getState().tabs.map((tab) => tab.key)).toEqual(['/dashboard'])
  })

  it('closes a fixed tab and removes its persisted fixed state', async () => {
    const adapter = createAdapter()
    const navigate = vi.fn()
    const store = createTestStore({ storageAdapter: adapter })

    store.getState().syncExternalDeps({ navigate })
    store.getState().syncByPathname('/dashboard')
    store.getState().toggleFixed('/dashboard')

    await expect(store.getState().closeTab('/dashboard')).resolves.toBe(true)

    expect(store.getState().tabs).toEqual([])
    expect(store.getState().fixedSet).toEqual([])
    expect(adapter.saveFixedTabs).toHaveBeenLastCalledWith('test-pro-layout', [])
    expect(navigate).toHaveBeenLastCalledWith('/')
  })

  it('allows only one concurrent close operation to clean and notify', async () => {
    const hookDeferred = createDeferred<boolean>()
    const afterTabClose = vi.fn()
    const store = createTestStore({ afterTabClose })

    store.getState().syncByPathname('/dashboard')
    store.getState().addBeforeCloseHook(() => hookDeferred.promise, '/dashboard')

    const firstClose = store.getState().closeTab('/dashboard')
    const secondClose = store.getState().closeTab('/dashboard')
    hookDeferred.resolve(true)

    await expect(Promise.all([firstClose, secondClose])).resolves.toEqual([true, false])
    expect(afterTabClose).toHaveBeenCalledOnce()
    expect(store.getState().tabs).toEqual([])
  })

  it('cleans page emitters, close hooks, descriptions and URL cache', async () => {
    const emitter = { emit: vi.fn() }
    const beforeClose = vi.fn(() => false)
    const store = createTestStore()

    store.getState().syncByPathname('/project/42')
    store.getState().cache.setSearchParamsForTabKey('/project/:id', 'tab=detail')
    store.getState().cache.setHashForTabKey('/project/:id', '#summary')
    store.getState().setPathnameDescription({ '/project/42': '项目 42' })
    store.getState().registerPageLocationEmitter('/project/:id', emitter)
    store.getState().addBeforeCloseHook(beforeClose, '/project/42')

    await store.getState().closeTab('/project/:id', { skipBeforeClose: true })

    expect(store.getState().cache.getParamsPathByTabKey('/project/:id')).toBe('')
    expect(store.getState().cache.getSearchParamsForTabKey('/project/:id')).toBe('')
    expect(store.getState().cache.getHashForTabKey('/project/:id')).toBe('')
    expect(store.getState().pathnameDescriptionMap['/project/42']).toBeUndefined()

    store.getState().emitPageLocationEvent('/project/:id', {
      pathname: '/project/42',
      search: '',
      hash: '',
    })
    expect(emitter.emit).not.toHaveBeenCalled()

    store.getState().syncByPathname('/project/42')
    await expect(store.getState().closeTab('/project/:id')).resolves.toBe(true)
    expect(beforeClose).not.toHaveBeenCalled()
  })

  it('immediately shrinks retained pages when maxCachedPages changes', () => {
    const store = createTestStore({ keepAlive: true })

    store.getState().syncByPathname('/dashboard')
    store.getState().syncByPathname('/orders')
    store.getState().syncByPathname('/project/42')
    expect(store.getState().pages).toHaveLength(3)

    store.getState().syncExternalDeps({ keepAlive: { maxCachedPages: 1 } })

    expect(store.getState().pages.map((page) => page.key)).toEqual(['/project/:id'])
  })

  it('creates independent tabs and page instances for supportMultipleTabs routes', () => {
    const store = createTestStore()

    store.getState().syncByPathname('/task/1')
    store.getState().syncByPathname('/task/2')

    expect(store.getState().tabs.map((tab) => tab.key)).toEqual(['/task/1', '/task/2'])
    expect(store.getState().pages.map((page) => page.key)).toEqual(['/task/1', '/task/2'])
    expect(store.getState().cache.getParamsPathByTabKey('/task/1')).toBe('')
  })

  it('keeps page object identity stable with unlimited KeepAlive', () => {
    const store = createTestStore({ keepAlive: true })

    store.getState().syncByPathname('/dashboard')
    const dashboardPage = store.getState().pages.find((page) => page.key === '/dashboard')
    store.getState().syncByPathname('/orders')
    store.getState().syncByPathname('/dashboard')

    expect(store.getState().pages.find((page) => page.key === '/dashboard')).toBe(
      dashboardPage,
    )
  })

  it('protects active and fixed pages while evicting the oldest ordinary page', () => {
    const pages = [
      createPage('/dashboard', 1),
      createPage('/orders', 2),
      createPage('/project/:id', 3),
    ]

    expect(
      enforceKeepAliveLimit(
        pages,
        '/project/:id',
        { maxCachedPages: 2 },
        ['/dashboard'],
      ).map((page) => page.key),
    ).toEqual(['/dashboard', '/project/:id'])
  })

  it('applies exclude before include while always retaining the active page', () => {
    const pages = [
      createPage('/dashboard', 1),
      createPage('/orders', 2),
      createPage('/project/:id', 3),
    ]

    expect(
      enforceKeepAliveLimit(
        pages,
        '/project/:id',
        {
          include: ['/dashboard', '/orders'],
          exclude: ['/orders'],
        },
        [],
      ).map((page) => page.key),
    ).toEqual(['/dashboard', '/project/:id'])
  })

  it('treats non-positive maxCachedPages as active-page-only caching', () => {
    const pages = [
      createPage('/dashboard', 1),
      createPage('/orders', 2),
      createPage('/project/:id', 3),
    ]

    expect(
      enforceKeepAliveLimit(pages, '/project/:id', { maxCachedPages: 0 }, []),
    ).toEqual([pages[2]])
  })

  it('synchronizes the latest intl and message dependencies', () => {
    const success = vi.fn()
    const messageApi: ProLayoutMessageApi = { success }
    const nextIntl: ProLayoutIntl = {
      getMessage: () => 'new locale message',
    }
    const store = createTestStore()

    store.getState().syncExternalDeps({ intl: nextIntl, messageApi })
    store.getState().toggleCollection('/dashboard')

    expect(success).toHaveBeenCalledWith('new locale message')
    expect(store.getState().intl).toBe(nextIntl)
  })
})

function createTestStore(params: Partial<CreateProLayoutStoreParams> = {}) {
  return createProLayoutStore({
    registry: createRouteRegistry({ routes }),
    storageKey: 'test-pro-layout',
    hasAuth: undefined,
    maxFixedTabCount: 4,
    keepAlive: true,
    headerHeight: 38,
    breadcrumbHeight: 40,
    noBar: false,
    showBreadcrumb: true,
    intl,
    ...params,
  })
}

function createAdapter(
  overrides: Partial<ProLayoutStorageAdapter> = {},
) {
  return {
    load: vi.fn<ProLayoutStorageAdapter['load']>(
      overrides.load ?? (async () => normalizeProLayoutStorageState()),
    ),
    saveCollection: vi.fn<ProLayoutStorageAdapter['saveCollection']>(
      overrides.saveCollection ?? (async () => undefined),
    ),
    saveFixedTabs: vi.fn<ProLayoutStorageAdapter['saveFixedTabs']>(
      overrides.saveFixedTabs ?? (async () => undefined),
    ),
    saveFixedParamsPathMap: vi.fn<
      ProLayoutStorageAdapter['saveFixedParamsPathMap']
    >(overrides.saveFixedParamsPathMap ?? (async () => undefined)),
  } satisfies ProLayoutStorageAdapter
}

function createDeferred<Value>() {
  let resolve!: (value: Value) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<Value>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  return { promise, resolve, reject }
}

function createPage(key: string, touchedAt: number) {
  const route = createRouteRegistry({ routes }).resolveLeafRoute(
    key === '/project/:id' ? '/project/42' : key,
  )!.route

  return {
    key,
    pathname: key === '/project/:id' ? '/project/42' : key,
    route,
    touchedAt,
  }
}

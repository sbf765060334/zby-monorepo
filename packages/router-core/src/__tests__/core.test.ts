import { describe, expect, it, vi } from 'vitest'

import {
  createRouteRegistry,
  createRouterCore,
  matchRoutePath,
  preloadRoute,
  type normalizeRouterStorageState,
  type RouterRoute,
  type RouterStorageAdapter,
} from '../index'

const routes: RouterRoute[] = [
  { path: '/dashboard', title: 'Dashboard', element: {} },
  {
    path: '/settings',
    title: 'Settings',
    routes: [
      { path: '/settings/profile', title: 'Profile', element: {} },
    ],
  },
  { path: '/project/:id', title: 'Project', element: {} },
  {
    path: '/task/:id',
    title: 'Task',
    element: {},
    supportMultipleTabs: true,
  },
  { path: '/admin', title: 'Admin', element: {}, auth: 'admin' },
]

/** 模拟 ProLayout 在 core 基础字段之外声明的强类型 UI 元数据。 */
interface PlatformRoute extends RouterRoute {
  routes?: PlatformRoute[]
  icon?: { name: string }
  tag?: 'beta' | 'stable'
  element?: { kind: 'page' }
}

describe('route registry', () => {
  it('matches static, parameter and wildcard paths', () => {
    expect(matchRoutePath('/Dashboard', '/dashboard/')).toBe(true)
    expect(matchRoutePath('/project/:id', '/project/42?tab=detail')).toBe(true)
    expect(matchRoutePath('/docs/*', '/docs/a/b')).toBe(true)
    expect(matchRoutePath('/project/:id', '/project')).toBe(false)
  })

  it('builds an authorization snapshot and resolves directory children', () => {
    const registry = createRouteRegistry({
      routes,
      hasAuth: (code) => code !== 'admin',
    })

    expect(registry.defaultRoute).toBe('/dashboard')
    expect(registry.resolveLeafRoute('/project/42')?.routeKey).toBe('/project/:id')
    expect(
      registry.resolveLeafRoute('/admin', { withinAuth: true }),
    ).toBeNull()
    expect(registry.findFirstAccessibleChild('/settings')).toBe('/settings/profile')
    expect(registry.getTabKey('/task/1')).toBe('/task/1')
  })

  it('owns a route-tree snapshot instead of the caller objects', () => {
    const input: RouterRoute[] = [
      { path: '/home', title: 'Before', element: {} },
    ]
    const registry = createRouteRegistry({ routes: input })

    input[0].title = 'After'
    input.push({ path: '/later', title: 'Later', element: {} })

    expect(registry.routes[0].title).toBe('Before')
    expect(registry.resolveLeafRoute('/later')).toBeNull()
  })

  it('preserves caller route metadata types through registry and core', () => {
    const platformRoutes: PlatformRoute[] = [
      {
        path: '/business',
        title: 'Business',
        routes: [
          {
            path: '/business/orders',
            title: 'Orders',
            icon: { name: 'orders' },
            tag: 'beta',
            element: { kind: 'page' },
          },
        ],
      },
    ]
    const registry = createRouteRegistry({
      routes: platformRoutes,
      isPageRoute: (route) => route.element?.kind === 'page',
    })
    const iconName: string | undefined =
      registry.resolveLeafRoute('/business/orders')?.route.icon?.name

    const router = createRouterCore({
      routes: platformRoutes,
      storageAdapter: false,
      initial: { pathname: '/business/orders' },
      isPageRoute: (route) => route.element?.kind === 'page',
      keepAlive: {
        include: (route) => {
          const tag: PlatformRoute['tag'] = route.tag
          return tag === 'beta'
        },
      },
    })
    const currentRoutes = router.getCurrentRoutes('/business/orders')
    const currentTag: PlatformRoute['tag'] =
      currentRoutes[currentRoutes.length - 1]?.route.tag
    const pageKind: 'page' | undefined =
      router.getState().pages[0]?.route.element?.kind

    expect(iconName).toBe('orders')
    expect(currentTag).toBe('beta')
    expect(pageKind).toBe('page')
  })

  it('isolates synchronous and asynchronous preload failures', async () => {
    const directPreload = vi.fn(() => {
      throw new Error('synchronous preload failed')
    })
    const elementPreload = vi.fn(async () => {
      throw new Error('asynchronous preload failed')
    })
    const element = Object.assign(() => undefined, { preload: elementPreload })

    expect(preloadRoute({
      path: '/direct-preload',
      title: 'Direct preload',
      element: {},
      preload: directPreload,
    })).toBeUndefined()
    expect(directPreload).not.toHaveBeenCalled()
    await Promise.resolve()
    expect(directPreload).toHaveBeenCalledOnce()

    expect(preloadRoute({
      path: '/element-preload',
      title: 'Element preload',
      element,
    })).toBeUndefined()
    await Promise.resolve()
    expect(elementPreload).toHaveBeenCalledOnce()
    await Promise.resolve()
  })
})

describe('createRouterCore', () => {
  it('creates a new independent state container on every factory call', () => {
    const first = createRouterCore({ routes, storageAdapter: false })
    const second = createRouterCore({ routes, storageAdapter: false })
    const storeSubscriber = vi.fn()
    const unsubscribe = first.store.subscribe(storeSubscriber)
    const exposesSetState: 'setState' extends keyof typeof first.store
      ? true
      : false = false

    expect(first).not.toBe(second)
    expect(first.store).not.toBe(second.store)
    expect(exposesSetState).toBe(false)
    expect('setState' in first.store).toBe(false)

    first.bindHost({ navigate: vi.fn() })
    first.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    expect(storeSubscriber).toHaveBeenCalled()
    expect(first.getState().tabs).toHaveLength(1)
    expect(second.getState().tabs).toHaveLength(0)
    unsubscribe()
  })

  it('opens pages with jumpTo and replaces current-page URL with smartNavigate', () => {
    const navigate = vi.fn()
    const router = createRouterCore({ routes, storageAdapter: false })
    router.bindHost({ navigate })
    router.syncLocation({
      pathname: '/project/42',
      search: '?tab=detail',
      hash: '#summary',
    })

    router.jumpTo({ pathname: '/dashboard' })
    expect(navigate).toHaveBeenLastCalledWith('/dashboard')
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })

    router.smartNavigate({ searchParams: 'page=2', hash: 'table' })
    expect(navigate).toHaveBeenLastCalledWith(
      { pathname: '/dashboard', search: 'page=2', hash: '#table' },
      { replace: true },
    )

    router.jumpTo({ pathname: '/project/:id' })
    expect(navigate).toHaveBeenLastCalledWith(
      '/project/42?tab=detail#summary',
    )
  })

  it('updates URL cache without publishing state when only search or hash changes', () => {
    const navigate = vi.fn()
    const router = createRouterCore({ routes, storageAdapter: false })
    router.bindHost({ navigate })
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })

    const subscriber = vi.fn()
    const unsubscribe = router.subscribe(subscriber)
    router.syncLocation({
      pathname: '/dashboard',
      search: '?page=2',
      hash: '#table',
    })

    expect(subscriber).not.toHaveBeenCalled()

    router.jumpTo({ pathname: '/dashboard' })
    expect(navigate).toHaveBeenLastCalledWith('/dashboard?page=2#table')
    unsubscribe()
  })

  it('emits every confirmed location to the current page emitter', () => {
    const router = createRouterCore({ routes, storageAdapter: false })
    const emit = vi.fn()
    router.registerPageLocationEmitter('/dashboard', { emit })

    router.syncLocation({
      pathname: '/dashboard',
      search: '',
      hash: '',
    })
    router.syncLocation({
      pathname: '/dashboard',
      search: 'page=2',
      hash: 'table',
    })

    expect(emit).toHaveBeenNthCalledWith(1, {
      pathname: '/dashboard',
      search: '',
      hash: '',
    })
    expect(emit).toHaveBeenNthCalledWith(2, {
      pathname: '/dashboard',
      search: '?page=2',
      hash: '#table',
    })
  })

  it('replays the latest location when its page emitter registers later', () => {
    const router = createRouterCore({ routes, storageAdapter: false })
    router.syncLocation({
      pathname: '/project/42',
      search: 'tab=detail',
      hash: 'summary',
    })

    const emit = vi.fn()
    const unregister = router.registerPageLocationEmitter(
      '/project/:id',
      { emit },
    )

    expect(emit).toHaveBeenCalledOnce()
    expect(emit).toHaveBeenCalledWith({
      pathname: '/project/42',
      search: '?tab=detail',
      hash: '#summary',
    })

    unregister()
    router.syncLocation({
      pathname: '/project/42',
      search: 'tab=activity',
      hash: '',
    })
    expect(emit).toHaveBeenCalledOnce()
  })

  it('does not publish state when reopening the active page changes no domain state', () => {
    const router = createRouterCore({
      routes,
      keepAlive: { include: ['/dashboard'] },
      storageAdapter: false,
    })
    router.bindHost({ navigate: vi.fn() })
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })

    const subscriber = vi.fn()
    const unsubscribe = router.subscribe(subscriber)
    router.jumpTo('/dashboard')

    expect(subscriber).not.toHaveBeenCalled()
    unsubscribe()
  })

  it('does not publish state when an unauthorized route keeps the same inactive state', () => {
    const router = createRouterCore({
      routes,
      hasAuth: (code) => code !== 'admin',
      storageAdapter: false,
    })
    router.bindHost({ navigate: vi.fn() })

    const subscriber = vi.fn()
    const unsubscribe = router.subscribe(subscriber)
    router.jumpTo('/admin')

    expect(subscriber).not.toHaveBeenCalled()
    unsubscribe()
  })

  it('delegates smartNavigate to jumpTo when pathname changes', () => {
    const navigate = vi.fn()
    const router = createRouterCore({ routes, storageAdapter: false })
    router.bindHost({ navigate })
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })

    router.smartNavigate({ pathname: '/settings/profile' })

    expect(navigate).toHaveBeenLastCalledWith('/settings/profile')
  })

  it('bootstraps a directory location once and waits for its leaf location', () => {
    const navigate = vi.fn()
    const router = createRouterCore({ routes, storageAdapter: false })
    router.bindHost({ navigate })
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    navigate.mockClear()

    router.syncLocation({ pathname: '/settings', search: '', hash: '' })

    expect(navigate).toHaveBeenCalledOnce()
    expect(navigate).toHaveBeenCalledWith('/settings/profile')
    // 目录只发起宿主导航；最终叶子地址回传前不清空当前可见页面。
    expect(router.getState().activePage).toBe('/dashboard')

    // StrictMode 重放或 Adapter 重复通知同一目录时不得重复导航。
    router.syncLocation({ pathname: '/settings', search: '?source=menu', hash: '' })
    expect(navigate).toHaveBeenCalledOnce()

    router.syncLocation({ pathname: '/settings/profile', search: '', hash: '' })
    expect(router.getState().activeTabKey).toBe('/settings/profile')
    expect(router.getState().activePage).toBe('/settings/profile')
  })

  it('bootstraps the root location once through syncLocation', () => {
    const navigate = vi.fn()
    const router = createRouterCore({ routes, storageAdapter: false })
    router.bindHost({ navigate })

    router.syncLocation({ pathname: '/', search: '', hash: '' })
    router.syncLocation({ pathname: '/', search: '?replayed=1', hash: '' })

    expect(navigate).toHaveBeenCalledOnce()
    expect(navigate).toHaveBeenCalledWith('/dashboard')
  })

  it('bootstraps the first host location even when initial pathname matches it', () => {
    const router = createRouterCore({
      routes,
      hasAuth: (code) => code !== 'admin',
      storageAdapter: false,
      initial: {
        pathname: '/admin',
        storageState: {
          fixedTabs: ['/admin'],
          fixedParamsPathMap: {},
        },
      },
    })
    router.bindHost({ navigate: vi.fn() })

    expect(router.getState().currentPathname).toBe('/admin')
    expect(router.getState().activeTabKey).toBeNull()

    router.syncLocation({ pathname: '/admin', search: '', hash: '' })

    // 首次同步仍需确认 403 的固定页签身份，不能因初始 pathname 相同而被跳过。
    expect(router.getState().activeTabKey).toBe('/admin')
    expect(router.getState().activePage).toBeNull()
  })

  it('retries a deferred directory bootstrap after the host is bound', () => {
    const navigate = vi.fn()
    const router = createRouterCore({ routes, storageAdapter: false })

    router.syncLocation({ pathname: '/settings', search: '', hash: '' })
    expect(router.getState().currentPathname).toBe('/settings')
    expect(router.getState().activePage).toBeNull()

    router.bindHost({ navigate })
    router.syncLocation({ pathname: '/settings', search: '', hash: '' })

    expect(navigate).toHaveBeenCalledOnce()
    expect(navigate).toHaveBeenCalledWith('/settings/profile')
  })

  it('clears an older bootstrap marker when a later pathname is deferred', () => {
    const router = createRouterCore({ routes, storageAdapter: false })
    router.bindHost({ navigate: vi.fn() })
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    expect(router.getState().activePage).toBe('/dashboard')

    router.bindHost(null)
    router.syncLocation({ pathname: '/settings', search: '', hash: '' })
    expect(router.getState().activePage).toBeNull()

    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    expect(router.getState().activePage).toBe('/dashboard')
  })

  it('redirects directories and creates no page for unauthorized routes', () => {
    const navigate = vi.fn()
    const router = createRouterCore({
      routes,
      hasAuth: (code) => code !== 'admin',
      storageAdapter: false,
    })
    router.bindHost({ navigate })

    router.jumpTo('/settings')
    expect(navigate).toHaveBeenLastCalledWith('/settings/profile')

    router.syncLocation({ pathname: '/admin', search: '', hash: '' })
    expect(router.getState().pages).toEqual([])
  })

  it('applies fixed KeepAlive configuration for the core lifetime', () => {
    const exclude = ['/dashboard']
    const router = createRouterCore({
      routes,
      keepAlive: { exclude },
      storageAdapter: false,
    })
    router.bindHost({ navigate: vi.fn() })

    exclude.length = 0
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    router.syncLocation({ pathname: '/settings/profile', search: '', hash: '' })

    expect(router.getState().pages.map((page) => page.key)).toEqual([
      '/settings/profile',
    ])
  })

  it('reorders the complete tab set and persists only a changed fixed order', async () => {
    const saveFixedTabs = vi.fn(async () => undefined)
    const router = createRouterCore({
      routes,
      storageAdapter: {
        load: vi.fn(async () => ({
          fixedTabs: [],
          fixedParamsPathMap: {},
        })),
        saveFixedTabs,
        saveFixedParamsPathMap: vi.fn(async () => undefined),
      },
    })
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    router.syncLocation({ pathname: '/settings/profile', search: '', hash: '' })
    router.syncLocation({ pathname: '/project/42', search: '', hash: '' })
    router.toggleFixed('/dashboard')
    router.toggleFixed('/settings/profile')
    await vi.waitFor(() => expect(saveFixedTabs).toHaveBeenCalledTimes(2))
    saveFixedTabs.mockClear()

    const previousTabs = new Map(
      router.getState().tabs.map((tab) => [tab.key, tab]),
    )
    expect(
      router.reorderTabs([
        '/settings/profile',
        '/dashboard',
        '/project/:id',
      ]),
    ).toBe(true)

    const state = router.getState()
    expect(state.tabs.map((tab) => tab.key)).toEqual([
      '/settings/profile',
      '/dashboard',
      '/project/:id',
    ])
    expect(state.fixedSet).toEqual(['/settings/profile', '/dashboard'])
    expect(state.activeTabKey).toBe('/project/:id')
    expect(state.tabs[0]).toBe(previousTabs.get('/settings/profile'))
    expect(state.tabs[1]).toBe(previousTabs.get('/dashboard'))
    await vi.waitFor(() => {
      expect(saveFixedTabs).toHaveBeenCalledOnce()
    })
    expect(saveFixedTabs).toHaveBeenCalledWith('default', [
      '/settings/profile',
      '/dashboard',
    ])

    const subscriber = vi.fn()
    const unsubscribe = router.subscribe(subscriber)
    expect(
      router.reorderTabs([
        '/settings/profile',
        '/dashboard',
        '/project/:id',
      ]),
    ).toBe(true)
    expect(subscriber).not.toHaveBeenCalled()
    unsubscribe()
  })

  it('rejects incomplete, duplicate, unknown and cross-group tab arrangements', () => {
    const router = createRouterCore({ routes, storageAdapter: false })
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    router.syncLocation({ pathname: '/settings/profile', search: '', hash: '' })
    router.toggleFixed('/dashboard')

    const snapshot = router.getState()
    const subscriber = vi.fn()
    const unsubscribe = router.subscribe(subscriber)

    expect(router.reorderTabs(['/dashboard'])).toBe(false)
    expect(router.reorderTabs(['/dashboard', '/dashboard'])).toBe(false)
    expect(router.reorderTabs(['/dashboard', '/unknown'])).toBe(false)
    expect(router.reorderTabs(['/settings/profile', '/dashboard'])).toBe(false)

    expect(router.getState()).toBe(snapshot)
    expect(subscriber).not.toHaveBeenCalled()
    unsubscribe()
  })

  it('does not fix unknown or unopened tab keys', async () => {
    const saveFixedTabs = vi.fn(async () => undefined)
    const router = createRouterCore({
      routes,
      storageAdapter: {
        load: vi.fn(async () => ({
          fixedTabs: [],
          fixedParamsPathMap: {},
        })),
        saveFixedTabs,
        saveFixedParamsPathMap: vi.fn(async () => undefined),
      },
    })
    const snapshot = router.getState()
    const subscriber = vi.fn()
    const unsubscribe = router.subscribe(subscriber)

    // 已注册但尚未打开的页面和完全未知的 key 都不能旁路创建固定状态。
    expect(router.toggleFixed('/dashboard')).toBe(false)
    expect(router.toggleFixed('/unknown')).toBe(false)
    await Promise.resolve()

    expect(router.getState()).toBe(snapshot)
    expect(subscriber).not.toHaveBeenCalled()
    expect(saveFixedTabs).not.toHaveBeenCalled()
    unsubscribe()
  })

  it('enforces fixed-tab limits and runs close guards', async () => {
    const navigate = vi.fn()
    const router = createRouterCore({ routes, storageAdapter: false })
    router.bindHost({ navigate })
    router.configureRuntime({ maxFixedTabCount: 1 })
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    router.syncLocation({ pathname: '/settings/profile', search: '', hash: '' })

    expect(router.toggleFixed('/dashboard')).toBe(true)
    expect(router.toggleFixed('/settings/profile')).toBe(false)

    const guard = vi.fn(() => false)
    router.addBeforeCloseHook(guard, '/settings/profile')
    expect(await router.closeTab('/settings/profile')).toBe(false)
    expect(guard).toHaveBeenCalledOnce()
    expect(router.getState().tabs.some((tab) => tab.key === '/settings/profile')).toBe(true)

    expect(
      await router.closeTab('/settings/profile', { skipBeforeClose: true }),
    ).toBe(true)
  })

  it('closes the old tab and performs only the final navigation', async () => {
    const navigate = vi.fn()
    const router = createRouterCore({ routes, storageAdapter: false })
    router.bindHost({ navigate })
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    router.syncLocation({ pathname: '/settings/profile', search: '', hash: '' })
    navigate.mockClear()

    expect(
      await router.closeThisTabOpenNewOne({
        oldPath: '/settings/profile',
        newPath: '/project/42?tab=detail#summary',
      }),
    ).toBe(true)

    expect(navigate).toHaveBeenCalledOnce()
    expect(navigate).toHaveBeenCalledWith('/project/42?tab=detail#summary')
  })

  it('keeps the old tab when the replacement target is unknown', async () => {
    const navigate = vi.fn()
    const router = createRouterCore({ routes, storageAdapter: false })
    router.bindHost({ navigate })
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    router.syncLocation({ pathname: '/settings/profile', search: '', hash: '' })
    navigate.mockClear()
    const snapshot = router.getState()

    expect(
      await router.closeThisTabOpenNewOne({
        oldPath: '/settings/profile',
        newPath: '/unknown',
      }),
    ).toBe(false)

    expect(router.getState()).toBe(snapshot)
    expect(navigate).not.toHaveBeenCalled()
  })

  it('navigates before onTabClose can unbind the host', async () => {
    const events: string[] = []
    const navigate = vi.fn(() => events.push('navigate'))
    const router = createRouterCore({ routes, storageAdapter: false })
    router.bindHost({ navigate })
    router.configureRuntime({
      onTabClose: () => {
        events.push('onTabClose')
        router.bindHost(null)
      },
    })
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    router.syncLocation({ pathname: '/settings/profile', search: '', hash: '' })
    navigate.mockClear()

    expect(
      await router.closeThisTabOpenNewOne({
        oldPath: '/settings/profile',
        newPath: '/project/42',
      }),
    ).toBe(true)

    expect(navigate).toHaveBeenCalledOnce()
    expect(navigate).toHaveBeenCalledWith('/project/42')
    expect(events).toEqual(['navigate', 'onTabClose'])
  })

  it('keeps the old tab when the host is unbound during a close guard', async () => {
    const navigate = vi.fn()
    const router = createRouterCore({ routes, storageAdapter: false })
    router.bindHost({ navigate })
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    router.syncLocation({ pathname: '/settings/profile', search: '', hash: '' })
    router.addBeforeCloseHook(async () => {
      router.bindHost(null)
      return true
    }, '/settings/profile')
    navigate.mockClear()
    const snapshot = router.getState()

    expect(
      await router.closeThisTabOpenNewOne({
        oldPath: '/settings/profile',
        newPath: '/project/42',
      }),
    ).toBe(false)

    expect(router.getState()).toBe(snapshot)
    expect(navigate).not.toHaveBeenCalled()
  })

  it('continues the replacement navigation when onTabClose throws', async () => {
    const error = new Error('callback failed')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const navigate = vi.fn()
    const router = createRouterCore({ routes, storageAdapter: false })
    router.bindHost({ navigate })
    router.configureRuntime({
      onTabClose: () => {
        throw error
      },
    })
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    router.syncLocation({ pathname: '/settings/profile', search: '', hash: '' })
    navigate.mockClear()

    try {
      expect(
        await router.closeThisTabOpenNewOne({
          oldPath: '/settings/profile',
          newPath: '/project/42',
        }),
      ).toBe(true)
      expect(navigate).toHaveBeenCalledOnce()
      expect(navigate).toHaveBeenCalledWith('/project/42')
      expect(consoleError).toHaveBeenCalledWith(
        '[RouterCore] onTabClose callback failed.',
        error,
      )
    } finally {
      consoleError.mockRestore()
    }
  })

  it('does not wait for or leak an asynchronous onTabClose rejection', async () => {
    const error = new Error('async callback failed')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const navigate = vi.fn()
    const router = createRouterCore({ routes, storageAdapter: false })
    router.bindHost({ navigate })
    router.configureRuntime({
      onTabClose: async () => {
        throw error
      },
    })
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    router.syncLocation({ pathname: '/settings/profile', search: '', hash: '' })
    navigate.mockClear()

    try {
      expect(
        await router.closeThisTabOpenNewOne({
          oldPath: '/settings/profile',
          newPath: '/project/42',
        }),
      ).toBe(true)
      expect(navigate).toHaveBeenCalledOnce()
      expect(navigate).toHaveBeenCalledWith('/project/42')
      await vi.waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          '[RouterCore] onTabClose callback failed.',
          error,
        )
      })
    } finally {
      consoleError.mockRestore()
    }
  })

  it('updates callback references without publishing a state change', () => {
    const router = createRouterCore({ routes, storageAdapter: false })
    const subscriber = vi.fn()
    const unsubscribe = router.subscribe(subscriber)

    router.configureRuntime({ onTabClose: vi.fn() })

    expect(subscriber).not.toHaveBeenCalled()
    unsubscribe()
  })

  it('writes back a current dynamic pathname that overrides hydrated storage', async () => {
    const saveFixedParamsPathMap = vi.fn(async () => undefined)
    const adapter: RouterStorageAdapter = {
      load: vi.fn(async () => ({
        fixedTabs: [],
        fixedParamsPathMap: { '/project/:id': '/project/1' },
      })),
      saveFixedTabs: vi.fn(async () => undefined),
      saveFixedParamsPathMap,
    }
    const router = createRouterCore({
      routes,
      storageAdapter: adapter,
      initial: { pathname: '/project/42' },
    })

    await router.hydrateStorage()
    await vi.waitFor(() => {
      expect(saveFixedParamsPathMap).toHaveBeenCalledWith(
        'default',
        { '/project/:id': '/project/42' },
      )
    })

    await router.hydrateStorage()
    expect(saveFixedParamsPathMap).toHaveBeenCalledOnce()
  })

  it('starts a new load when hydration retry is called immediately', async () => {
    let attempts = 0
    let retryPromise: Promise<void> | undefined
    const adapter: RouterStorageAdapter = {
      load: vi.fn(async () => {
        attempts += 1
        if (attempts === 1)
          throw new Error('temporary load failure')
        return { fixedTabs: [], fixedParamsPathMap: {} }
      }),
      saveFixedTabs: vi.fn(async () => undefined),
      saveFixedParamsPathMap: vi.fn(async () => undefined),
    }
    const router = createRouterCore({ routes, storageAdapter: adapter })
    router.configureRuntime({
      onStorageError: (_error, info) => {
        if (info.phase === 'load')
          retryPromise = info.retry()
      },
    })

    await router.hydrateStorage()
    expect(retryPromise).toBeDefined()
    await retryPromise

    expect(attempts).toBe(2)
    expect(router.getState().storageHydrated).toBe(true)
    expect(router.getState().storageLoadError).toBeUndefined()
  })

  it('hydrates fixed tabs without overwriting local changes made in flight', async () => {
    let resolveLoad!: (value: ReturnType<typeof normalizeRouterStorageState>) => void
    const adapter: RouterStorageAdapter = {
      load: vi.fn(
        () => new Promise<ReturnType<typeof normalizeRouterStorageState>>((resolve) => {
          resolveLoad = resolve
        }),
      ),
      saveFixedTabs: vi.fn(async () => undefined),
      saveFixedParamsPathMap: vi.fn(async () => undefined),
    }
    const router = createRouterCore({ routes, storageAdapter: adapter })
    router.configureRuntime({ storageKey: 'user-1' })
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    router.toggleFixed('/dashboard')

    resolveLoad({ fixedTabs: ['/settings/profile'], fixedParamsPathMap: {} })
    await router.hydrateStorage()

    expect(router.getState().fixedSet).toEqual(['/dashboard'])
    expect(router.getState().storageHydrated).toBe(true)
  })
})

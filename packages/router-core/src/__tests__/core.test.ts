import { describe, expect, it, vi } from 'vitest'

import {
  createRouteRegistry,
  createRouterCore,
  matchRoutePath,
  preloadRoute,
  type normalizeRouterStorageState,
  type RouterRoute,
  type RouterStorageAdapter,
  type RouterStorageErrorInfo,
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

  it('rejects normalized duplicate route paths during registration', () => {
    expect(() =>
      createRouteRegistry({
        routes: [
          { path: '/Users', title: 'Users' },
          { path: '/users/', title: 'Users duplicate' },
        ],
      }),
    ).toThrow('Route paths must be unique.')
  })

  it('rejects dynamic route patterns that differ only by parameter names', () => {
    expect(() =>
      createRouteRegistry({
        routes: [
          { path: '/user/:id', title: 'User by id' },
          { path: '/user/:name', title: 'User by name' },
        ],
      }),
    ).toThrow('match the same URL shape')
  })

  it('rejects repeated parameter names in one route', () => {
    expect(() =>
      createRouteRegistry({
        routes: [
          {
            path: '/organization/:id/user/:id',
            title: 'Organization user',
          },
        ],
      }),
    ).toThrow('Parameter names must be unique within a route.')
  })

  it('keeps distinct static and dynamic route patterns valid', () => {
    const registry = createRouteRegistry({
      routes: [
        { path: '/user/new', title: 'New user' },
        { path: '/user/:id', title: 'User' },
      ],
    })

    expect(registry.resolveLeafRoute('/user/new')?.routeKey).toBe('/user/new')
    expect(registry.resolveLeafRoute('/user/42')?.routeKey).toBe('/user/:id')
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
      isPageRoute: (route) => route.element?.kind === 'page',
      keepAlive: {
        include: (route) => {
          const tag: PlatformRoute['tag'] = route.tag
          return tag === 'beta'
        },
      },
    })
    router.syncLocation({
      pathname: '/business/orders',
      search: '',
      hash: '',
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
  it('exposes the fixed authorization query with an allow-all default', () => {
    const restricted = createRouterCore({
      routes,
      hasAuth: (code) => code !== 'admin',
      storageAdapter: false,
    })
    const allowAll = createRouterCore({ routes, storageAdapter: false })

    expect(restricted.hasAuth('dashboard')).toBe(true)
    expect(restricted.hasAuth('admin')).toBe(false)
    expect(
      restricted.registry.resolveLeafRoute('/admin', { withinAuth: true }),
    ).toBeNull()
    expect(allowAll.hasAuth('unknown-permission')).toBe(true)
    expect(
      allowAll.registry.resolveLeafRoute('/admin', { withinAuth: true }),
    ).not.toBeNull()
  })

  it('uses fixed configuration in an otherwise empty first store snapshot', () => {
    const router = createRouterCore({
      routes,
      storageAdapter: false,
      storageKey: 'user-1',
      maxFixedTabCount: 6,
    })

    expect(router.getState().storageKey).toBe('user-1')
    expect(router.getState().maxFixedTabCount).toBe(6)
    expect(router.getState().currentPathname).toBe('')
    expect(router.getState().tabs).toEqual([])
    expect(router.getState().pages).toEqual([])
    expect(router.getState().fixedSet).toEqual([])
    expect(router.getState().favoriteRoutePaths).toEqual([])
    expect(router.getState().storageHydrated).toBe(true)
  })

  it('creates a new independent state container on every factory call', () => {
    const first = createRouterCore({ routes, storageAdapter: false })
    const second = createRouterCore({ routes, storageAdapter: false })
    const storeSubscriber = vi.fn()
    const unsubscribe = first.store.subscribe(storeSubscriber)
    type StateSnapshot = ReturnType<typeof first.getState>
    const exposesSetState: 'setState' extends keyof typeof first.store
      ? true
      : false = false
    const tabsExposePush: 'push' extends keyof StateSnapshot['tabs']
      ? true
      : false = false
    const pagesExposePush: 'push' extends keyof StateSnapshot['pages']
      ? true
      : false = false
    const fixedSetExposesPush: 'push' extends keyof StateSnapshot['fixedSet']
      ? true
      : false = false
    const favoriteRoutesExposePush:
    'push' extends keyof StateSnapshot['favoriteRoutePaths']
      ? true
      : false = false

    expect(first).not.toBe(second)
    expect(first.store).not.toBe(second.store)
    expect(exposesSetState).toBe(false)
    expect(tabsExposePush).toBe(false)
    expect(pagesExposePush).toBe(false)
    expect(fixedSetExposesPush).toBe(false)
    expect(favoriteRoutesExposePush).toBe(false)
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
    expect(router.getState().navigationStatus).toBe('navigating')
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    expect(router.getState().navigationStatus).toBe('settled')

    router.smartNavigate({ searchParams: 'page=2', hash: 'table' })
    expect(navigate).toHaveBeenLastCalledWith(
      { pathname: '/dashboard', search: 'page=2', hash: '#table' },
      { replace: true },
    )
    expect(router.getState().navigationStatus).toBe('settled')

    router.jumpTo({ pathname: '/project/:id' })
    expect(navigate).toHaveBeenLastCalledWith(
      '/project/42?tab=detail#summary',
    )
    expect(router.getState().navigationStatus).toBe('navigating')
  })

  it('does not publish pathname navigation for a same-page hash change', () => {
    const navigate = vi.fn()
    const router = createRouterCore({ routes, storageAdapter: false })
    router.bindHost({ navigate })
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    const subscriber = vi.fn()
    const unsubscribe = router.subscribe(subscriber)

    router.jumpTo({ pathname: '/dashboard', hash: 'table' })

    expect(navigate).toHaveBeenCalledWith('/dashboard#table')
    expect(router.getState().navigationStatus).toBe('settled')
    expect(subscriber).not.toHaveBeenCalled()
    unsubscribe()
  })

  it('does not navigate an unresolved dynamic route pattern', () => {
    const navigate = vi.fn()
    const router = createRouterCore({ routes, storageAdapter: false })
    router.bindHost({ navigate })

    router.jumpTo('/project/:id')

    expect(navigate).not.toHaveBeenCalled()
    expect(router.getState().tabs).toEqual([])
  })

  it('restores a fixed dynamic tab from its persisted concrete pathname', async () => {
    const navigate = vi.fn()
    const router = createRouterCore({
      routes,
      storageAdapter: {
        load: vi.fn(async () => ({
          fixedTabs: ['/project/:id'],
          fixedParamsPathMap: {
            '/project/:id': '/project/42',
          },
        })),
        saveFixedTabs: vi.fn(async () => undefined),
        saveFixedParamsPathMap: vi.fn(async () => undefined),
        saveFavoriteRoutePaths: vi.fn(async () => undefined),
      },
    })
    router.bindHost({ navigate })
    await router.hydrateStorage()

    expect(router.getState().fixedSet).toEqual(['/project/:id'])
    router.jumpTo('/project/:id')
    expect(navigate).toHaveBeenCalledWith('/project/42')
  })

  it('uses a pre-hydration pathname to repair a fixed dynamic tab mapping', async () => {
    const navigate = vi.fn()
    const saveFixedParamsPathMap = vi.fn(async () => undefined)
    const router = createRouterCore({
      routes,
      storageAdapter: {
        load: vi.fn(async () => ({
          fixedTabs: ['/project/:id'],
          fixedParamsPathMap: {},
        })),
        saveFixedTabs: vi.fn(async () => undefined),
        saveFixedParamsPathMap,
        saveFavoriteRoutePaths: vi.fn(async () => undefined),
      },
    })
    router.bindHost({ navigate })
    router.syncLocation({ pathname: '/project/42', search: '', hash: '' })

    // 未加载完整 Map 前只能记录本地增量，不能先保存局部快照。
    expect(saveFixedParamsPathMap).not.toHaveBeenCalled()
    await router.hydrateStorage()

    expect(router.getState().fixedSet).toEqual(['/project/:id'])
    router.jumpTo('/project/:id')
    expect(navigate).toHaveBeenCalledWith('/project/42')
    await vi.waitFor(() => {
      expect(saveFixedParamsPathMap).toHaveBeenCalledWith(
        'default',
        { '/project/:id': '/project/42' },
      )
    })
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

  it('publishes every confirmed location to the current page listener', () => {
    const router = createRouterCore({ routes, storageAdapter: false })
    const listener = vi.fn()
    router.subscribePageLocation('/dashboard', listener)

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

    expect(listener).toHaveBeenNthCalledWith(1, {
      pathname: '/dashboard',
      search: '',
      hash: '',
    })
    expect(listener).toHaveBeenNthCalledWith(2, {
      pathname: '/dashboard',
      search: '?page=2',
      hash: '#table',
    })
  })

  it('replays the latest location when its page listener subscribes later', () => {
    const router = createRouterCore({ routes, storageAdapter: false })
    router.syncLocation({
      pathname: '/project/42',
      search: 'tab=detail',
      hash: 'summary',
    })

    const listener = vi.fn()
    const unsubscribe = router.subscribePageLocation(
      '/project/:id',
      listener,
    )

    expect(listener).toHaveBeenCalledOnce()
    expect(listener).toHaveBeenCalledWith({
      pathname: '/project/42',
      search: '?tab=detail',
      hash: '#summary',
    })

    unsubscribe()
    router.syncLocation({
      pathname: '/project/42',
      search: 'tab=activity',
      hash: '',
    })
    expect(listener).toHaveBeenCalledOnce()
  })

  it('removes a page listener when its immediate replay throws', () => {
    const router = createRouterCore({ routes, storageAdapter: false })
    router.syncLocation({
      pathname: '/project/42',
      search: 'tab=detail',
      hash: 'summary',
    })
    const error = new Error('page listener failed')
    const listener = vi.fn(() => {
      throw error
    })

    expect(() =>
      router.subscribePageLocation('/project/:id', listener),
    ).toThrow(error)
    expect(listener).toHaveBeenCalledOnce()

    expect(() =>
      router.syncLocation({
        pathname: '/project/42',
        search: 'tab=activity',
        hash: '',
      }),
    ).not.toThrow()
    expect(listener).toHaveBeenCalledOnce()
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

  it('tracks pathname navigation without activating an unauthorized route', () => {
    const navigate = vi.fn()
    const router = createRouterCore({
      routes,
      hasAuth: (code) => code !== 'admin',
      storageAdapter: false,
    })
    router.bindHost({ navigate })

    const subscriber = vi.fn()
    const unsubscribe = router.subscribe(subscriber)
    router.jumpTo('/admin')

    expect(navigate).toHaveBeenCalledWith('/admin')
    expect(router.getState().navigationStatus).toBe('navigating')
    expect(router.getState().activeTabKey).toBeNull()
    expect(router.getState().activePage).toBeNull()
    expect(router.getState().tabs).toEqual([])
    expect(subscriber).toHaveBeenCalledOnce()
    unsubscribe()
  })

  it('keeps an explicit pathname for unauthorized shared dynamic routes', () => {
    const navigate = vi.fn()
    const router = createRouterCore({
      routes: [
        {
          path: '/secret/:id',
          title: 'Secret',
          element: {},
          auth: 'secret',
        },
      ],
      hasAuth: () => false,
      storageAdapter: false,
    })
    router.bindHost({ navigate })
    router.syncLocation({
      pathname: '/secret/1',
      search: '',
      hash: '',
    })
    navigate.mockClear()

    router.jumpTo('/secret/2')
    expect(navigate).toHaveBeenLastCalledWith('/secret/2')

    router.jumpTo('/secret/:id')
    expect(navigate).toHaveBeenLastCalledWith('/secret/1')
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
    expect(navigate).toHaveBeenCalledWith('/settings/profile', { replace: true })
    // 目录只发起宿主导航；最终叶子地址回传前不清空当前可见页面。
    expect(router.getState().activePage).toBe('/dashboard')
    expect(router.getState().navigationStatus).toBe('redirecting')

    // StrictMode 重放或 Adapter 重复通知同一目录时不得重复导航。
    router.syncLocation({ pathname: '/settings', search: '?source=menu', hash: '' })
    expect(navigate).toHaveBeenCalledOnce()

    router.syncLocation({ pathname: '/settings/profile', search: '', hash: '' })
    expect(router.getState().activeTabKey).toBe('/settings/profile')
    expect(router.getState().activePage).toBe('/settings/profile')
    expect(router.getState().navigationStatus).toBe('settled')
  })

  it('requests an effect redirect for the root location and settles on confirmation', () => {
    const navigate = vi.fn()
    const redirect = vi.fn()
    const router = createRouterCore({ routes, storageAdapter: false })
    router.bindHost({ navigate, redirect })

    expect(router.getState().navigationStatus).toBe('bootstrapping')

    router.syncLocation({ pathname: '/', search: '', hash: '' })
    router.syncLocation({ pathname: '/', search: '?replayed=1', hash: '' })

    expect(redirect).toHaveBeenCalledOnce()
    expect(redirect).toHaveBeenCalledWith('/dashboard', { replace: true })
    expect(navigate).not.toHaveBeenCalled()
    expect(router.getState().navigationStatus).toBe('redirecting')

    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    expect(router.getState().navigationStatus).toBe('settled')
    expect(router.getState().activePage).toBe('/dashboard')
  })

  it('retries an uncommitted redirect after the host is rebound', () => {
    const firstRedirect = vi.fn()
    const secondRedirect = vi.fn()
    const router = createRouterCore({ routes, storageAdapter: false })

    router.bindHost({ navigate: vi.fn(), redirect: firstRedirect })
    router.syncLocation({ pathname: '/', search: '', hash: '' })
    expect(firstRedirect).toHaveBeenCalledOnce()
    expect(router.getState().navigationStatus).toBe('redirecting')

    router.bindHost(null)
    expect(router.getState().navigationStatus).toBe('bootstrapping')

    router.bindHost({ navigate: vi.fn(), redirect: secondRedirect })
    router.syncLocation({ pathname: '/', search: '', hash: '' })
    expect(secondRedirect).toHaveBeenCalledWith('/dashboard', { replace: true })
    expect(router.getState().navigationStatus).toBe('redirecting')
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
    expect(navigate).toHaveBeenCalledWith('/settings/profile', { replace: true })
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
        saveFavoriteRoutePaths: vi.fn(async () => undefined),
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
        saveFavoriteRoutePaths: vi.fn(async () => undefined),
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

  it('toggles registered page favorites and persists complete snapshots', async () => {
    const saveFavoriteRoutePaths = vi.fn(async () => undefined)
    const router = createRouterCore({
      routes,
      storageAdapter: {
        load: vi.fn(async () => ({})),
        saveFixedTabs: vi.fn(async () => undefined),
        saveFixedParamsPathMap: vi.fn(async () => undefined),
        saveFavoriteRoutePaths,
      },
    })

    expect(router.toggleFavoriteRoute('/dashboard')).toBe(true)
    expect(router.getState().favoriteRoutePaths).toEqual(['/dashboard'])
    await vi.waitFor(() => {
      expect(saveFavoriteRoutePaths).toHaveBeenLastCalledWith(
        'default',
        ['/dashboard'],
      )
    })

    expect(router.toggleFavoriteRoute('/settings')).toBe(false)
    expect(router.toggleFavoriteRoute('/missing')).toBe(false)
    expect(router.toggleFavoriteRoute('/dashboard')).toBe(true)
    expect(router.getState().favoriteRoutePaths).toEqual([])
    await vi.waitFor(() => {
      expect(saveFavoriteRoutePaths).toHaveBeenLastCalledWith('default', [])
    })
  })

  it('rejects parameter and wildcard routes as favorites', () => {
    const router = createRouterCore({
      routes: [
        { path: '/project/:id', title: 'Project', element: {} },
        { path: '/docs/*', title: 'Docs', element: {} },
      ],
      storageAdapter: false,
    })

    expect(router.toggleFavoriteRoute('/project/:id')).toBe(false)
    expect(router.toggleFavoriteRoute('/project/42')).toBe(false)
    expect(router.toggleFavoriteRoute('/docs/*')).toBe(false)
    expect(router.toggleFavoriteRoute('/docs/guide')).toBe(false)
    expect(router.getState().favoriteRoutePaths).toEqual([])
  })

  it('hydrates, canonicalizes and preserves unauthorized favorite routes', async () => {
    const saveFavoriteRoutePaths = vi.fn(async () => undefined)
    const router = createRouterCore({
      routes,
      hasAuth: () => false,
      storageAdapter: {
        load: vi.fn(async () => ({
          favoriteRoutePaths: [
            '/Dashboard/',
            '/dashboard',
            '/settings',
            '/missing',
            '/admin',
            '/project/:id',
            '/project/42',
            '/task/1',
          ],
        })),
        saveFixedTabs: vi.fn(async () => undefined),
        saveFixedParamsPathMap: vi.fn(async () => undefined),
        saveFavoriteRoutePaths,
      },
    })

    await router.hydrateStorage()

    expect(router.getState().favoriteRoutePaths).toEqual([
      '/dashboard',
      '/admin',
    ])
    await vi.waitFor(() => {
      expect(saveFavoriteRoutePaths).toHaveBeenCalledWith(
        'default',
        ['/dashboard', '/admin'],
      )
    })
  })

  it('enforces fixed-tab limits and runs close guards', async () => {
    const navigate = vi.fn()
    const router = createRouterCore({
      routes,
      storageAdapter: false,
      maxFixedTabCount: 1,
    })
    router.bindHost({ navigate })
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

  it('publishes pathname descriptions only when their values change', () => {
    const router = createRouterCore({ routes, storageAdapter: false })
    const initialState = router.getState()
    const subscriber = vi.fn()
    const unsubscribe = router.subscribe(subscriber)

    router.setPathnameDescription({})
    expect(router.getState()).toBe(initialState)
    expect(subscriber).not.toHaveBeenCalled()

    router.setPathnameDescription({ '/project/42': 'Project 42' })
    const changedState = router.getState()
    const changedMap = changedState.pathnameDescriptionMap
    expect(changedMap).toEqual({ '/project/42': 'Project 42' })
    expect(subscriber).toHaveBeenCalledOnce()

    router.setPathnameDescription({ '/project/42': 'Project 42' })
    expect(router.getState()).toBe(changedState)
    expect(router.getState().pathnameDescriptionMap).toBe(changedMap)
    expect(subscriber).toHaveBeenCalledOnce()

    router.setPathnameDescription({
      '/project/42': 'Project 42',
      '/project/43': 'Project 43',
    })
    expect(router.getState().pathnameDescriptionMap).toEqual({
      '/project/42': 'Project 42',
      '/project/43': 'Project 43',
    })
    expect(subscriber).toHaveBeenCalledTimes(2)
    unsubscribe()
  })

  it('writes back a current dynamic pathname that overrides hydrated storage', async () => {
    const saveFixedParamsPathMap = vi.fn(async () => undefined)
    const adapter: RouterStorageAdapter = {
      load: vi.fn(async () => ({
        fixedTabs: [],
        fixedParamsPathMap: {
          '/project/:id': '/project/1',
          '/customer/:id': '/customer/7',
        },
      })),
      saveFixedTabs: vi.fn(async () => undefined),
      saveFixedParamsPathMap,
      saveFavoriteRoutePaths: vi.fn(async () => undefined),
    }
    const router = createRouterCore({
      routes,
      storageAdapter: adapter,
    })
    router.syncLocation({ pathname: '/project/42', search: '', hash: '' })

    expect(saveFixedParamsPathMap).not.toHaveBeenCalled()
    await router.hydrateStorage()
    await vi.waitFor(() => {
      expect(saveFixedParamsPathMap).toHaveBeenCalledWith(
        'default',
        {
          '/project/:id': '/project/42',
          '/customer/:id': '/customer/7',
        },
      )
    })

    await router.hydrateStorage()
    expect(saveFixedParamsPathMap).toHaveBeenCalledOnce()
  })

  it('merges a dynamic pathname confirmed while hydration is in flight', async () => {
    let resolveLoad!: (value: ReturnType<typeof normalizeRouterStorageState>) => void
    const saveFixedParamsPathMap = vi.fn(async () => undefined)
    const router = createRouterCore({
      routes,
      storageAdapter: {
        load: vi.fn(
          () => new Promise<ReturnType<typeof normalizeRouterStorageState>>((resolve) => {
            resolveLoad = resolve
          }),
        ),
        saveFixedTabs: vi.fn(async () => undefined),
        saveFixedParamsPathMap,
        saveFavoriteRoutePaths: vi.fn(async () => undefined),
      },
    })

    const hydration = router.hydrateStorage()
    router.syncLocation({ pathname: '/project/42', search: '', hash: '' })
    expect(saveFixedParamsPathMap).not.toHaveBeenCalled()

    resolveLoad({
      fixedTabs: [],
      fixedParamsPathMap: {
        '/project/:id': '/project/1',
        '/customer/:id': '/customer/7',
      },
      favoriteRoutePaths: [],
    })
    await hydration
    await vi.waitFor(() => {
      expect(saveFixedParamsPathMap).toHaveBeenCalledWith(
        'default',
        {
          '/project/:id': '/project/42',
          '/customer/:id': '/customer/7',
        },
      )
    })
  })

  it('removes an unrestorable fixed dynamic tab loaded from storage', async () => {
    const saveFixedTabs = vi.fn(async () => undefined)
    const router = createRouterCore({
      routes,
      storageAdapter: {
        load: vi.fn(async () => ({
          fixedTabs: ['/project/:id'],
          fixedParamsPathMap: {},
        })),
        saveFixedTabs,
        saveFixedParamsPathMap: vi.fn(async () => undefined),
        saveFavoriteRoutePaths: vi.fn(async () => undefined),
      },
    })

    await router.hydrateStorage()

    expect(router.getState().fixedSet).toEqual([])
    expect(router.getState().tabs).toEqual([])
    await vi.waitFor(() => {
      expect(saveFixedTabs).toHaveBeenCalledWith('default', [])
    })
  })

  it('normalizes and deduplicates persisted fixed tab keys', async () => {
    const saveFixedTabs = vi.fn(async () => undefined)
    const router = createRouterCore({
      routes,
      storageAdapter: {
        load: vi.fn(async () => ({
          fixedTabs: ['/Dashboard/', '/dashboard'],
          fixedParamsPathMap: {},
        })),
        saveFixedTabs,
        saveFixedParamsPathMap: vi.fn(async () => undefined),
        saveFavoriteRoutePaths: vi.fn(async () => undefined),
      },
    })

    await router.hydrateStorage()
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })

    expect(router.getState().fixedSet).toEqual(['/dashboard'])
    expect(router.getState().tabs.map((tab) => tab.key)).toEqual(['/dashboard'])
    await vi.waitFor(() => {
      expect(saveFixedTabs).toHaveBeenCalledWith('default', ['/dashboard'])
    })
  })

  it('limits hydrated fixed tabs and writes back the cleaned set', async () => {
    const saveFixedTabs = vi.fn(async () => undefined)
    const router = createRouterCore({
      routes,
      maxFixedTabCount: 1,
      storageAdapter: {
        load: vi.fn(async () => ({
          fixedTabs: ['/dashboard', '/settings/profile'],
          fixedParamsPathMap: {},
        })),
        saveFixedTabs,
        saveFixedParamsPathMap: vi.fn(async () => undefined),
        saveFavoriteRoutePaths: vi.fn(async () => undefined),
      },
    })

    await router.hydrateStorage()

    expect(router.getState().fixedSet).toEqual(['/dashboard'])
    expect(router.getState().tabs.map((tab) => tab.key)).toEqual(['/dashboard'])
    await vi.waitFor(() => {
      expect(saveFixedTabs).toHaveBeenCalledWith('default', ['/dashboard'])
    })
  })

  it('reports a failed save and persists the next complete field snapshot', async () => {
    const saveError = new Error('temporary save failure')
    const persistedFixedTabs: string[][] = []
    let attempts = 0
    const onStorageError = vi.fn()
    const adapter: RouterStorageAdapter = {
      load: vi.fn(async () => ({ fixedTabs: [], fixedParamsPathMap: {} })),
      saveFixedTabs: vi.fn(async (_storageKey, fixedTabs) => {
        attempts += 1
        if (attempts === 1)
          throw saveError
        persistedFixedTabs.push([...fixedTabs])
      }),
      saveFixedParamsPathMap: vi.fn(async () => undefined),
      saveFavoriteRoutePaths: vi.fn(async () => undefined),
    }
    const router = createRouterCore({
      routes,
      storageAdapter: adapter,
    })
    router.configureRuntime({ onStorageError })
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    router.syncLocation({ pathname: '/settings/profile', search: '', hash: '' })

    expect(router.toggleFixed('/dashboard')).toBe(true)
    await vi.waitFor(() => expect(onStorageError).toHaveBeenCalledOnce())
    expect(onStorageError).toHaveBeenCalledWith(saveError, {
      storageKey: 'default',
      phase: 'saveFixedTabs',
    })

    expect(router.toggleFixed('/settings/profile')).toBe(true)
    await vi.waitFor(() => {
      expect(persistedFixedTabs).toEqual([
        ['/dashboard', '/settings/profile'],
      ])
    })
    expect(attempts).toBe(2)
    expect(router.getState().fixedSet).toEqual([
      '/dashboard',
      '/settings/profile',
    ])
  })

  it('isolates a synchronous onStorageError failure from hydration', async () => {
    const loadError = new Error('load failed')
    const callbackError = new Error('storage callback failed')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const adapter: RouterStorageAdapter = {
      load: vi.fn(async () => {
        throw loadError
      }),
      saveFixedTabs: vi.fn(async () => undefined),
      saveFixedParamsPathMap: vi.fn(async () => undefined),
      saveFavoriteRoutePaths: vi.fn(async () => undefined),
    }
    const router = createRouterCore({ routes, storageAdapter: adapter })
    router.configureRuntime({
      onStorageError: () => {
        throw callbackError
      },
    })

    try {
      await expect(router.hydrateStorage()).resolves.toBeUndefined()
      expect(router.getState().storageLoadError).toBe(loadError)
      expect(consoleError).toHaveBeenCalledWith(
        '[RouterCore] onStorageError callback failed.',
        callbackError,
      )
    } finally {
      consoleError.mockRestore()
    }
  })

  it('does not leak an asynchronous onStorageError rejection after save failure', async () => {
    const saveError = new Error('save failed')
    const callbackError = new Error('async storage callback failed')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const onStorageError = vi.fn(async (
      _error: unknown,
      _info: RouterStorageErrorInfo,
    ) => {
      throw callbackError
    })
    const adapter: RouterStorageAdapter = {
      load: vi.fn(async () => ({ fixedTabs: [], fixedParamsPathMap: {} })),
      saveFixedTabs: vi.fn(async () => {
        throw saveError
      }),
      saveFixedParamsPathMap: vi.fn(async () => undefined),
      saveFavoriteRoutePaths: vi.fn(async () => undefined),
    }
    const router = createRouterCore({
      routes,
      storageAdapter: adapter,
    })
    router.configureRuntime({ onStorageError })
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })

    try {
      expect(router.toggleFixed('/dashboard')).toBe(true)
      await vi.waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          '[RouterCore] onStorageError callback failed.',
          callbackError,
        )
      })
      expect(onStorageError).toHaveBeenCalledOnce()
      expect(onStorageError.mock.calls[0][0]).toBe(saveError)
      expect(onStorageError.mock.calls[0][1].phase).toBe('saveFixedTabs')
      expect(router.getState().fixedSet).toEqual(['/dashboard'])
    } finally {
      consoleError.mockRestore()
    }
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
      saveFavoriteRoutePaths: vi.fn(async () => undefined),
    }
    const router = createRouterCore({
      routes,
      storageAdapter: adapter,
      storageKey: 'user-1',
    })
    const hydration = router.hydrateStorage()
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    router.toggleFixed('/dashboard')

    resolveLoad({
      fixedTabs: ['/settings/profile'],
      fixedParamsPathMap: {},
      favoriteRoutePaths: [],
    })
    await hydration

    expect(router.getState().fixedSet).toEqual(['/dashboard'])
    expect(router.getState().storageHydrated).toBe(true)
  })

  it('hydrates favorites without overwriting local changes made in flight', async () => {
    let resolveLoad!: (value: ReturnType<typeof normalizeRouterStorageState>) => void
    const saveFavoriteRoutePaths = vi.fn(async () => undefined)
    const router = createRouterCore({
      routes,
      storageAdapter: {
        load: vi.fn(
          () => new Promise<ReturnType<typeof normalizeRouterStorageState>>((resolve) => {
            resolveLoad = resolve
          }),
        ),
        saveFixedTabs: vi.fn(async () => undefined),
        saveFixedParamsPathMap: vi.fn(async () => undefined),
        saveFavoriteRoutePaths,
      },
    })
    const hydration = router.hydrateStorage()

    expect(router.toggleFavoriteRoute('/dashboard')).toBe(true)
    resolveLoad({
      fixedTabs: [],
      fixedParamsPathMap: {},
      favoriteRoutePaths: ['/settings/profile'],
    })
    await hydration

    expect(router.getState().favoriteRoutePaths).toEqual(['/dashboard'])
    expect(router.getState().storageHydrated).toBe(true)
    await vi.waitFor(() => {
      expect(saveFavoriteRoutePaths).toHaveBeenCalledWith(
        'default',
        ['/dashboard'],
      )
    })
  })

  it('keeps and persists a favorite change when hydration fails', async () => {
    const loadError = new Error('favorite load failed')
    let rejectLoad!: (reason?: unknown) => void
    const saveFavoriteRoutePaths = vi.fn(async () => undefined)
    const router = createRouterCore({
      routes,
      storageAdapter: {
        load: vi.fn(
          () => new Promise<never>((_resolve, reject) => {
            rejectLoad = reject
          }),
        ),
        saveFixedTabs: vi.fn(async () => undefined),
        saveFixedParamsPathMap: vi.fn(async () => undefined),
        saveFavoriteRoutePaths,
      },
    })
    const hydration = router.hydrateStorage()

    expect(router.toggleFavoriteRoute('/dashboard')).toBe(true)
    rejectLoad(loadError)
    await hydration

    expect(router.getState().favoriteRoutePaths).toEqual(['/dashboard'])
    expect(router.getState().storageHydrated).toBe(false)
    expect(router.getState().storageLoadError).toBe(loadError)
    await vi.waitFor(() => {
      expect(saveFavoriteRoutePaths).toHaveBeenCalledWith(
        'default',
        ['/dashboard'],
      )
    })
  })
})

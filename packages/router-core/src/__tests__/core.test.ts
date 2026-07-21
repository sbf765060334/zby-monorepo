import { describe, expect, it, vi } from 'vitest'

import {
  createRouteRegistry,
  createRouterCore,
  matchRoutePath,
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
})

describe('createRouterCore', () => {
  it('creates a new independent state container on every factory call', () => {
    const first = createRouterCore({ routes, storageAdapter: false })
    const second = createRouterCore({ routes, storageAdapter: false })

    expect(first).not.toBe(second)
    expect(first.store).not.toBe(second.store)

    first.bindHost({ navigate: vi.fn() })
    first.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    expect(first.getState().tabs).toHaveLength(1)
    expect(second.getState().tabs).toHaveLength(0)
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

  it('delegates smartNavigate to jumpTo when pathname changes', () => {
    const navigate = vi.fn()
    const router = createRouterCore({ routes, storageAdapter: false })
    router.bindHost({ navigate })
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })

    router.smartNavigate({ pathname: '/settings/profile' })

    expect(navigate).toHaveBeenLastCalledWith('/settings/profile')
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

  it('updates callback references without publishing a state change', () => {
    const router = createRouterCore({ routes, storageAdapter: false })
    const subscriber = vi.fn()
    const unsubscribe = router.subscribe(subscriber)

    router.configureRuntime({ onTabClose: vi.fn() })

    expect(subscriber).not.toHaveBeenCalled()
    unsubscribe()
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

/**
 * 文件职责：用可执行测试守住 RouteRegistry、导航、页签、KeepAlive 和持久化的核心契约。
 *
 * 每个 `it` 都描述一个用户可观察场景。阅读测试时可以先看标题，再按“准备输入、执行
 * 命令、检查结果”的顺序理解；这些断言也保证注释和文档修改不会改变运行行为。
 */
import { describe, expect, it, vi } from 'vitest'

import {
  createRemoteRouterStorageAdapter,
  createRouteRegistry,
  createRouterCore,
  matchRoutePath,
  normalizeRouterStorageState,
  preloadRoute,
  type RouterRoute,
  type RouterStorageAdapter,
  type RouterStorageErrorInfo,
  type RouterStorageState,
} from '../index'

/** 大多数 Core 场景复用的最小路由树，覆盖目录、动态页签、独立页签和权限路由。 */
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

/** 测试用内存 Adapter：update 对着这份 disk 执行 recipe。 */
function createMemoryStorage(initial?: Partial<RouterStorageState>) {
  const disk = normalizeRouterStorageState(initial)
  const adapter: RouterStorageAdapter = {
    load: async () => ({
      fixedTabs: [...disk.fixedTabs],
      fixedParamsPathMap: { ...disk.fixedParamsPathMap },
      favoriteRoutePaths: [...disk.favoriteRoutePaths],
    }),
    update: async (_storageKey, recipe) => {
      const next = recipe({
        fixedTabs: [...disk.fixedTabs],
        fixedParamsPathMap: { ...disk.fixedParamsPathMap },
        favoriteRoutePaths: [...disk.favoriteRoutePaths],
      })
      disk.fixedTabs = [...next.fixedTabs]
      disk.fixedParamsPathMap = { ...next.fixedParamsPathMap }
      disk.favoriteRoutePaths = [...next.favoriteRoutePaths]
    },
  }
  return { disk, adapter }
}

/** 只关心 load 行为、不检查落盘内容时使用。 */
function createNoopStorageAdapter(
  load: RouterStorageAdapter['load'] = async () => ({}),
): RouterStorageAdapter {
  return {
    load,
    update: vi.fn(async () => undefined),
  }
}

/** 模拟 ProLayout 在 core 基础字段之外声明的强类型 UI 元数据。 */
interface PlatformRoute extends RouterRoute {
  routes?: PlatformRoute[]
  icon?: { name: string }
  tag?: 'beta' | 'stable'
  element?: { kind: 'page' }
}

/** 这一组先单独验证路由树与匹配器，排除 Store、宿主和持久化的干扰。 */
describe('route registry', () => {
  /** 最基础的匹配规则：大小写、尾斜杠、参数和末尾通配符都要符合约定。 */
  it('matches static, parameter and wildcard paths', () => {
    expect(matchRoutePath('/Dashboard', '/dashboard/')).toBe(true)
    expect(matchRoutePath('/project/:id', '/project/42?tab=detail')).toBe(true)
    expect(matchRoutePath('/docs/*', '/docs/a/b')).toBe(true)
    expect(matchRoutePath('/project/:id', '/project')).toBe(false)
  })

  /** 注册阶段就拒绝规范化后相同的路径，避免运行时不知道应该选哪一个。 */
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

  /** 参数名字不同不代表 URL 形状不同，这类冲突也必须提前报错。 */
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

  /** 同一 pattern 里参数重名会覆盖值，因此验证错误提示是否明确。 */
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

  /** 静态路径比动态路径更具体，两者可以共存且静态项应优先命中。 */
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

  /** 权限快照既要隐藏受限页，也要能为目录找到第一个可访问子页面。 */
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

  /** 创建后修改调用方原对象不能影响 Registry 内部已经固定的路由事实。 */
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

  /** 业务扩展的 icon、tag、element 类型要一路保留到查询结果和页面状态。 */
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

  /** 预加载只是优化，同步或异步失败都不能冒泡成业务未处理异常。 */
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
    expect(elementPreload).not.toHaveBeenCalled()

    expect(preloadRoute({
      path: '/element-preload',
      title: 'Element preload',
      element,
    })).toBeUndefined()
    await Promise.resolve()
    expect(elementPreload).toHaveBeenCalledOnce()
    await Promise.resolve()
  })

  it.each(['route', 'element'] as const)(
    'deduplicates an in-flight %s preload but allows later attempts',
    async (source) => {
      let resolvePreload!: () => void
      const preload = vi.fn(
        () => new Promise<void>((resolve) => {
          resolvePreload = resolve
        }),
      )
      const element = Object.assign(() => undefined, { preload })
      const route: RouterRoute = source === 'route'
        ? { path: '/preload', title: 'Preload', preload }
        : { path: '/preload', title: 'Preload', element }

      preloadRoute(route)
      preloadRoute(route)
      await Promise.resolve()
      expect(preload).toHaveBeenCalledOnce()

      resolvePreload()
      await flushMicrotasks()
      preloadRoute(route)
      await Promise.resolve()
      expect(preload).toHaveBeenCalledTimes(2)
    },
  )

  it('allows a custom preload to run again after failure', async () => {
    const preload = vi.fn(async () => {
      throw new Error('preload failed')
    })
    const route: RouterRoute = {
      path: '/failed-preload',
      title: 'Failed preload',
      preload,
    }

    preloadRoute(route)
    await flushMicrotasks()
    preloadRoute(route)
    await Promise.resolve()

    expect(preload).toHaveBeenCalledTimes(2)
  })
})

async function flushMicrotasks() {
  for (let index = 0; index < 5; index += 1)
    await Promise.resolve()
}

/** 这一组从公开命令观察完整 Core，覆盖导航、页签、缓存、回调和存储协作。 */
describe('createRouterCore', () => {
  /** 自定义权限函数与默认“全部允许”函数都应成为实例生命周期内的稳定查询。 */
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

  /** Core 初始状态应为空，但 storageKey、上限和持久化开关要立即反映创建参数。 */
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

  /** 两次创建的 Store、页签和回调必须彼此隔离，不能出现跨实例串数据。 */
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

  /** jumpTo 负责完整导航，smartNavigate 在同页只 replace 查询参数与 hash。 */
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
    expect(router.getState().currentPathname).toBe('/project/42')
    expect(router.getState().activeTabKey).toBe('/project/:id')
    expect(router.getState().activePage).toBe('/project/:id')
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    expect(router.getState().navigationStatus).toBe('settled')
    expect(router.getState().activeTabKey).toBe('/dashboard')
    expect(router.getState().activePage).toBe('/dashboard')

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
    // project 已被 KeepAlive 缓存，但宿主确认前仍保持 dashboard 活动。
    expect(router.getState().currentPathname).toBe('/dashboard')
    expect(router.getState().activeTabKey).toBe('/dashboard')
    expect(router.getState().activePage).toBe('/dashboard')
  })

  /** 字符串 jumpTo 的查询串取 URL.search，不能再被 URLSearchParams 改成 + 或编码逗号。 */
  it('keeps the original query encoding for string jumpTo', () => {
    const navigate = vi.fn()
    const router = createRouterCore({ routes, storageAdapter: false })
    router.bindHost({ navigate })
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })

    router.jumpTo('/dashboard?q=hello%20world')
    expect(navigate).toHaveBeenLastCalledWith('/dashboard?q=hello%20world')

    router.jumpTo('/dashboard?ids=1,2,3')
    expect(navigate).toHaveBeenLastCalledWith('/dashboard?ids=1,2,3')

    router.jumpTo({ pathname: '/dashboard', searchParams: 'q=hello%20world' })
    expect(navigate).toHaveBeenLastCalledWith('/dashboard?q=hello%20world')
  })

  /** 同步宿主在 navigate 内回传 location 时，最终状态不能被外层 navigating 覆盖。 */
  it('settles immediately when the host confirms navigation synchronously', () => {
    let confirmNavigation: () => void = () => undefined
    const navigate = vi.fn(() => confirmNavigation())
    const router = createRouterCore({ routes, storageAdapter: false })
    router.bindHost({ navigate })
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    confirmNavigation = () => router.syncLocation({
      pathname: '/settings/profile',
      search: '',
      hash: '',
    })

    router.jumpTo('/settings/profile')

    expect(navigate).toHaveBeenCalledWith('/settings/profile')
    expect(router.getState().currentPathname).toBe('/settings/profile')
    expect(router.getState().activeTabKey).toBe('/settings/profile')
    expect(router.getState().activePage).toBe('/settings/profile')
    expect(router.getState().navigationStatus).toBe('settled')
  })

  /** 只改 hash 不应把全局导航状态切成 navigating。 */
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

  /** 没有具体参数值的动态 pattern 不能直接交给浏览器导航。 */
  it('does not navigate an unresolved dynamic route pattern', () => {
    const navigate = vi.fn()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const router = createRouterCore({ routes, storageAdapter: false })
    router.bindHost({ navigate })

    router.jumpTo('/project/:id')

    expect(navigate).not.toHaveBeenCalled()
    expect(router.getState().tabs).toEqual([])
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]?.[0])).toContain('/project/:id')
    warn.mockRestore()
  })

  /** 固定的共享动态页签必须借助持久化映射恢复最后真实地址。 */
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
        update: vi.fn(async () => undefined),
      },
    })
    router.bindHost({ navigate })
    await router.hydrateStorage()

    expect(router.getState().fixedSet).toEqual(['/project/:id'])
    router.jumpTo('/project/:id')
    expect(navigate).toHaveBeenCalledWith('/project/42')
  })

  /** 存储加载前宿主已确认的新参数地址，应覆盖并修复存储中的旧映射。 */
  it('uses a pre-hydration pathname to repair a fixed dynamic tab mapping', async () => {
    const navigate = vi.fn()
    const { disk, adapter } = createMemoryStorage({
      fixedTabs: ['/project/:id'],
      fixedParamsPathMap: {},
    })
    const update = vi.fn(adapter.update)
    const router = createRouterCore({
      routes,
      storageAdapter: {
        load: adapter.load,
        update,
      },
    })
    router.bindHost({ navigate })
    router.syncLocation({ pathname: '/project/42', search: '', hash: '' })

    expect(update).not.toHaveBeenCalled()
    await router.hydrateStorage()

    expect(router.getState().fixedSet).toEqual(['/project/:id'])
    router.jumpTo('/project/:id')
    expect(navigate).toHaveBeenCalledWith('/project/42')
    await vi.waitFor(() => {
      expect(disk.fixedParamsPathMap).toEqual({
        '/project/:id': '/project/42',
      })
    })
  })

  /** search/hash 缓存更新不属于全局领域状态，不应通知 Store 订阅者。 */
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

  /** 页面 listener 要收到同 pathname 下每一次 search/hash 地址确认。 */
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

  /** 页面晚挂载时应立即补收最新地址，而不是等下一次导航才有数据。 */
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

  /** 首次补发抛错只记日志，订阅仍保留，也不能把错误抛出 subscribe。 */
  it('keeps a page listener when its immediate replay throws', () => {
    const error = new Error('page listener failed')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const router = createRouterCore({ routes, storageAdapter: false })
    router.syncLocation({
      pathname: '/project/42',
      search: 'tab=detail',
      hash: 'summary',
    })
    const listener = vi.fn(() => {
      throw error
    })

    try {
      expect(() =>
        router.subscribePageLocation('/project/:id', listener),
      ).not.toThrow()
      expect(listener).toHaveBeenCalledOnce()
      expect(consoleError).toHaveBeenCalledWith(
        '[RouterCore] page location listener failed.',
        error,
      )

      expect(() =>
        router.syncLocation({
          pathname: '/project/42',
          search: 'tab=activity',
          hash: '',
        }),
      ).not.toThrow()
      expect(listener).toHaveBeenCalledTimes(2)
    } finally {
      consoleError.mockRestore()
    }
  })

  /** 重复打开已经活动且无需刷新 LRU 的页面时，应复用原 Store 快照。 */
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

  /** 可以导航到受限地址展示 403，但不能为无权限路由创建页面实例。 */
  it('keeps the confirmed page active until an unauthorized location arrives', () => {
    const navigate = vi.fn()
    const router = createRouterCore({
      routes,
      hasAuth: (code) => code !== 'admin',
      storageAdapter: false,
    })
    router.bindHost({ navigate })
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    navigate.mockClear()

    const subscriber = vi.fn()
    const unsubscribe = router.subscribe(subscriber)
    router.jumpTo('/admin')

    expect(navigate).toHaveBeenCalledWith('/admin')
    expect(router.getState().navigationStatus).toBe('navigating')
    expect(router.getState().currentPathname).toBe('/dashboard')
    expect(router.getState().activeTabKey).toBe('/dashboard')
    expect(router.getState().activePage).toBe('/dashboard')
    expect(router.getState().tabs.map((tab) => tab.key)).toEqual(['/dashboard'])
    expect(subscriber).toHaveBeenCalledOnce()

    router.syncLocation({ pathname: '/admin', search: '', hash: '' })
    expect(router.getState().navigationStatus).toBe('settled')
    expect(router.getState().activeTabKey).toBeNull()
    expect(router.getState().activePage).toBeNull()
    unsubscribe()
  })

  /** 无权限动态地址仍应保留调用方明确传入的真实 pathname，不能换成旧缓存。 */
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

  /** 已授权共享动态页也必须打开调用方给出的具体地址；点页签 pattern 才恢复已确认地址。 */
  it('keeps an explicit pathname for authorized shared dynamic routes', () => {
    const navigate = vi.fn()
    const router = createRouterCore({ routes, storageAdapter: false })
    router.bindHost({ navigate })
    router.syncLocation({
      pathname: '/project/42',
      search: '?tab=detail',
      hash: '#summary',
    })
    navigate.mockClear()

    router.jumpTo('/project/99')
    expect(navigate).toHaveBeenLastCalledWith('/project/99')
    expect(router.getState().currentPathname).toBe('/project/42')

    // 宿主尚未确认 99 时，点页签仍应回到最后确认的 42，并恢复其 search/hash。
    router.jumpTo({ pathname: '/project/:id' })
    expect(navigate).toHaveBeenLastCalledWith(
      '/project/42?tab=detail#summary',
    )

    router.syncLocation({
      pathname: '/project/99',
      search: '?tab=pay',
      hash: '',
    })
    router.jumpTo({ pathname: '/dashboard' })
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    navigate.mockClear()

    router.jumpTo({ pathname: '/project/:id' })
    expect(navigate).toHaveBeenLastCalledWith('/project/99?tab=pay')
  })

  /** 独立多页签动态路由不共用 pathname 缓存，换 ID 必须打开新地址。 */
  it('opens a new concrete pathname for independent dynamic tabs', () => {
    const navigate = vi.fn()
    const router = createRouterCore({ routes, storageAdapter: false })
    router.bindHost({ navigate })
    router.syncLocation({ pathname: '/task/1', search: '', hash: '' })
    navigate.mockClear()

    router.jumpTo('/task/99')
    expect(navigate).toHaveBeenLastCalledWith('/task/99')
  })

  /** smartNavigate 一旦跨 pathname，就必须复用 jumpTo 的权限与页签完整流程。 */
  it('delegates smartNavigate to jumpTo when pathname changes', () => {
    const navigate = vi.fn()
    const router = createRouterCore({ routes, storageAdapter: false })
    router.bindHost({ navigate })
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })

    router.smartNavigate({ pathname: '/settings/profile' })

    expect(navigate).toHaveBeenLastCalledWith('/settings/profile')
  })

  /** 目录地址只请求一次叶子重定向，并等待宿主回传后再创建页面。 */
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

  /** 根路径通过 redirect 宿主请求默认页，最终状态以宿主确认地址为准。 */
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

  /** 重定向尚未提交就卸载宿主时，新宿主绑定后应允许再次发起。 */
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

  /** 没有宿主时暂缓的目录跳转，在宿主到位后必须重新尝试。 */
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

  /** 后来的暂缓地址要清掉旧去重标记，防止返回旧页时漏掉重新激活。 */
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

  /** 目录跳转与 403 场景要正确分流，受限页面始终不能进入页面缓存。 */
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

  /** KeepAlive 配置在创建时快照化，之后修改调用方数组不能改变淘汰规则。 */
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

  /** 合法重排更新全部页签，但只有固定组顺序变化才写持久化。 */
  it('reorders the complete tab set and persists only a changed fixed order', async () => {
    const { disk, adapter } = createMemoryStorage()
    const update = vi.fn(adapter.update)
    const router = createRouterCore({
      routes,
      storageAdapter: {
        load: adapter.load,
        update,
      },
    })
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    router.syncLocation({ pathname: '/settings/profile', search: '', hash: '' })
    router.syncLocation({ pathname: '/project/42', search: '', hash: '' })
    router.toggleFixed('/dashboard')
    router.toggleFixed('/settings/profile')
    await vi.waitFor(() => {
      expect(disk.fixedTabs).toEqual(['/dashboard', '/settings/profile'])
    })
    const writesAfterFix = update.mock.calls.length

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
      expect(disk.fixedTabs).toEqual(['/settings/profile', '/dashboard'])
    })
    expect(update.mock.calls.length).toBe(writesAfterFix + 1)

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

  /** 缺项、重复、未知 key 或跨越固定分组的排列都不能修改当前状态。 */
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

  /** 只有已打开页签才能固定，未知 key 不应产生状态或存储写入。 */
  it('does not fix unknown or unopened tab keys', async () => {
    const adapter = createNoopStorageAdapter(async () => ({
      fixedTabs: [],
      fixedParamsPathMap: {},
    }))
    const router = createRouterCore({
      routes,
      storageAdapter: adapter,
    })
    const snapshot = router.getState()
    const subscriber = vi.fn()
    const unsubscribe = router.subscribe(subscriber)

    expect(router.toggleFixed('/dashboard')).toBe(false)
    expect(router.toggleFixed('/unknown')).toBe(false)
    await Promise.resolve()

    expect(router.getState()).toBe(snapshot)
    expect(subscriber).not.toHaveBeenCalled()
    expect(adapter.update).not.toHaveBeenCalled()
    unsubscribe()
  })

  /** 收藏只接受已注册页面，每次变化保存完整且有序的收藏快照。 */
  it('toggles registered page favorites and persists complete snapshots', async () => {
    const { disk, adapter } = createMemoryStorage()
    const router = createRouterCore({
      routes,
      storageAdapter: adapter,
    })

    expect(router.toggleFavoriteRoute('/dashboard')).toBe(true)
    expect(router.getState().favoriteRoutePaths).toEqual(['/dashboard'])
    await vi.waitFor(() => {
      expect(disk.favoriteRoutePaths).toEqual(['/dashboard'])
    })

    expect(router.toggleFavoriteRoute('/settings')).toBe(false)
    expect(router.toggleFavoriteRoute('/missing')).toBe(false)
    expect(router.toggleFavoriteRoute('/dashboard')).toBe(true)
    expect(router.getState().favoriteRoutePaths).toEqual([])
    await vi.waitFor(() => {
      expect(disk.favoriteRoutePaths).toEqual([])
    })
  })

  /** 动态真实地址收藏应收敛到 route pattern，避免同一路由出现重复项。 */
  it('canonicalizes parameter and wildcard route favorites', () => {
    const router = createRouterCore({
      routes: [
        { path: '/project/:id', title: 'Project', element: {} },
        {
          path: '/task/:id',
          title: 'Task',
          element: {},
          supportMultipleTabs: true,
        },
        { path: '/docs/*', title: 'Docs', element: {} },
      ],
      storageAdapter: false,
    })

    expect(router.toggleFavoriteRoute('/project/42')).toBe(true)
    expect(router.toggleFavoriteRoute('/task/1')).toBe(true)
    expect(router.toggleFavoriteRoute('/docs/guide')).toBe(true)
    expect(router.getState().favoriteRoutePaths).toEqual([
      '/project/:id',
      '/task/:id',
      '/docs/*',
    ])

    expect(router.toggleFavoriteRoute('/project/:id')).toBe(true)
    expect(router.getState().favoriteRoutePaths).toEqual([
      '/task/:id',
      '/docs/*',
    ])
  })

  /** 加载收藏时要规范化路径，并保留暂时无权限但仍存在的完整路由。 */
  it('hydrates, canonicalizes and preserves unauthorized favorite routes', async () => {
    const { disk, adapter } = createMemoryStorage({
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
    })
    const router = createRouterCore({
      routes,
      hasAuth: () => false,
      storageAdapter: adapter,
    })

    await router.hydrateStorage()

    expect(router.getState().favoriteRoutePaths).toEqual([
      '/dashboard',
      '/admin',
      '/project/:id',
      '/task/:id',
    ])
    await vi.waitFor(() => {
      expect(disk.favoriteRoutePaths).toEqual([
        '/dashboard',
        '/admin',
        '/project/:id',
        '/task/:id',
      ])
    })
  })

  /** 固定页签上限和关闭守卫都必须在改变状态前生效。 */
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

  /** 多个关闭守卫按注册顺序串行执行，前面拒绝后后面不再调用。 */
  it('runs close guards in registration order and stops after the first rejection', async () => {
    const navigate = vi.fn()
    const router = createRouterCore({ routes, storageAdapter: false })
    router.bindHost({ navigate })
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    router.syncLocation({ pathname: '/settings/profile', search: '', hash: '' })

    const events: string[] = []
    const first = vi.fn(async () => {
      events.push('first')
      return false
    })
    const second = vi.fn(() => {
      events.push('second')
      return true
    })
    router.addBeforeCloseHook(first, '/settings/profile')
    router.addBeforeCloseHook(second, '/settings/profile')

    expect(await router.closeTab('/settings/profile')).toBe(false)
    expect(events).toEqual(['first'])
    expect(second).not.toHaveBeenCalled()
    expect(router.getState().tabs.some((tab) => tab.key === '/settings/profile')).toBe(true)

    router.clearBeforeCloseHook('/settings/profile', first)
    expect(await router.closeTab('/settings/profile')).toBe(true)
    expect(events).toEqual(['first', 'second'])
  })

  /** 只剩一个页签时不能关掉，避免经根路径重定向后再被打开。 */
  it('rejects closing the last remaining tab', async () => {
    const navigate = vi.fn()
    const guard = vi.fn(() => true)
    const router = createRouterCore({ routes, storageAdapter: false })
    router.bindHost({ navigate })
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    router.addBeforeCloseHook(guard, '/dashboard')
    const snapshot = router.getState()
    navigate.mockClear()

    expect(await router.closeTab('/dashboard')).toBe(false)
    expect(guard).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
    expect(router.getState()).toBe(snapshot)

    router.syncLocation({ pathname: '/settings/profile', search: '', hash: '' })
    expect(await router.closeTab('/dashboard')).toBe(true)
    expect(router.getState().tabs.map((tab) => tab.key)).toEqual(['/settings/profile'])
    navigate.mockClear()
    expect(await router.closeTab('/settings/profile')).toBe(false)
    expect(navigate).not.toHaveBeenCalled()
    expect(router.getState().tabs.map((tab) => tab.key)).toEqual(['/settings/profile'])
  })

  /** 最后一页仍可用组合命令替换到另一个页面。 */
  it('still replaces the last tab when closeThisTabOpenNewOne has a new target', async () => {
    const navigate = vi.fn()
    const router = createRouterCore({ routes, storageAdapter: false })
    router.bindHost({ navigate })
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    navigate.mockClear()

    expect(
      await router.closeThisTabOpenNewOne({
        oldPath: '/dashboard',
        newPath: '/settings/profile',
      }),
    ).toBe(true)
    expect(navigate).toHaveBeenCalledOnce()
    expect(navigate).toHaveBeenCalledWith('/settings/profile', { replace: true })

    router.syncLocation({ pathname: '/settings/profile', search: '', hash: '' })
    expect(router.getState().tabs.map((tab) => tab.key)).toEqual(['/settings/profile'])
    expect(router.getState().activePage).toBe('/settings/profile')
  })

  /** 关闭活动页发起的回退导航必须 replace，并等待宿主确认后才 settled。 */
  it('tracks close-tab navigation until the host confirms its location', async () => {
    const navigate = vi.fn()
    const router = createRouterCore({ routes, storageAdapter: false })
    router.bindHost({ navigate })
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    router.syncLocation({ pathname: '/settings/profile', search: '', hash: '' })
    navigate.mockClear()

    expect(await router.closeTab('/settings/profile')).toBe(true)
    expect(navigate).toHaveBeenCalledOnce()
    expect(navigate).toHaveBeenCalledWith('/dashboard', { replace: true })
    expect(router.getState().navigationStatus).toBe('navigating')
    expect(router.getState().activeTabKey).toBe('/settings/profile')
    expect(router.getState().activePage).toBe('/settings/profile')
    expect(router.getState().tabs.some((tab) => tab.key === '/settings/profile')).toBe(true)

    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    expect(router.getState().navigationStatus).toBe('settled')
    expect(router.getState().activeTabKey).toBe('/dashboard')
    expect(router.getState().activePage).toBe('/dashboard')
    expect(router.getState().tabs.some((tab) => tab.key === '/settings/profile')).toBe(false)
  })

  /** 宿主回传只差尾斜杠时也应提交关闭，不能把 pending 扔掉。 */
  it('commits an active-tab close when the host confirms a trailing-slash pathname', async () => {
    const navigate = vi.fn()
    const router = createRouterCore({ routes, storageAdapter: false })
    router.bindHost({ navigate })
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    router.syncLocation({ pathname: '/settings/profile', search: '', hash: '' })
    navigate.mockClear()

    expect(await router.closeTab('/settings/profile')).toBe(true)
    router.syncLocation({ pathname: '/dashboard/', search: '', hash: '' })

    expect(router.getState().tabs.some((tab) => tab.key === '/settings/profile')).toBe(false)
    expect(router.getState().activePage).toBe('/dashboard')
    expect(router.getState().currentPathname).toBe('/dashboard/')
  })

  /** 还停在被关页时即使多一个斜杠也不能删，pending 要留到真正离开。 */
  it('keeps a pending close while the host remains on the closed page', async () => {
    const navigate = vi.fn()
    const router = createRouterCore({ routes, storageAdapter: false })
    router.bindHost({ navigate })
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    router.syncLocation({ pathname: '/settings/profile', search: '', hash: '' })

    expect(await router.closeTab('/settings/profile')).toBe(true)
    router.syncLocation({ pathname: '/settings/profile/', search: '', hash: '' })

    expect(router.getState().tabs.some((tab) => tab.key === '/settings/profile')).toBe(true)
    expect(router.getState().activePage).toBe('/settings/profile')

    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    expect(router.getState().tabs.some((tab) => tab.key === '/settings/profile')).toBe(false)
    expect(router.getState().activePage).toBe('/dashboard')
  })

  /** 组合命令的新地址带尾斜杠回传时，旧页签同样要删。 */
  it('closes the old tab when closeThisTabOpenNewOne is confirmed with a trailing slash', async () => {
    const navigate = vi.fn()
    const router = createRouterCore({ routes, storageAdapter: false })
    router.bindHost({ navigate })
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    router.syncLocation({ pathname: '/settings/profile', search: '', hash: '' })
    navigate.mockClear()

    expect(
      await router.closeThisTabOpenNewOne({
        oldPath: '/settings/profile',
        newPath: '/project/42',
      }),
    ).toBe(true)
    router.syncLocation({ pathname: '/project/42/', search: '', hash: '' })

    expect(router.getState().tabs.some((tab) => tab.key === '/settings/profile')).toBe(false)
    expect(router.getState().activePage).toBe('/project/:id')
    expect(router.getState().currentPathname).toBe('/project/42/')
  })

  /** 没有可用宿主或宿主同步抛错时，活动页签不能被提前删除且必须允许重试。 */
  it('keeps the active tab when close navigation cannot be completed', async () => {
    const router = createRouterCore({ routes, storageAdapter: false })
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    router.syncLocation({ pathname: '/settings/profile', search: '', hash: '' })

    expect(await router.closeTab('/settings/profile')).toBe(false)
    expect(router.getState().activePage).toBe('/settings/profile')
    expect(router.getState().tabs.some((tab) => tab.key === '/settings/profile')).toBe(true)

    const error = new Error('host navigation failed')
    router.bindHost({
      navigate: () => {
        throw error
      },
    })
    await expect(router.closeTab('/settings/profile')).rejects.toBe(error)
    expect(router.getState().navigationStatus).toBe('settled')
    expect(router.getState().activePage).toBe('/settings/profile')
    expect(router.getState().tabs.some((tab) => tab.key === '/settings/profile')).toBe(true)

    router.bindHost({ navigate: vi.fn() })
    expect(await router.closeTab('/settings/profile')).toBe(true)
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    expect(router.getState().tabs.some((tab) => tab.key === '/settings/profile')).toBe(false)
  })

  /** 同步宿主在 closeTab 的 navigate 内确认目标时，也要完成删除并落到 settled。 */
  it('commits an active-tab close confirmed synchronously by the host', async () => {
    let confirmNavigation: () => void = () => undefined
    const navigate = vi.fn(() => confirmNavigation())
    const router = createRouterCore({ routes, storageAdapter: false })
    router.bindHost({ navigate })
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    router.syncLocation({ pathname: '/settings/profile', search: '', hash: '' })
    confirmNavigation = () => router.syncLocation({
      pathname: '/dashboard',
      search: '',
      hash: '',
    })

    expect(await router.closeTab('/settings/profile')).toBe(true)

    expect(router.getState().currentPathname).toBe('/dashboard')
    expect(router.getState().activePage).toBe('/dashboard')
    expect(router.getState().navigationStatus).toBe('settled')
    expect(router.getState().tabs.some((tab) => tab.key === '/settings/profile')).toBe(false)
  })

  /** 活动页关闭在宿主确认前保持锁，第二次关闭不能再发跳转或覆盖 pending。 */
  it('rejects a second close of the same active tab before the host confirms', async () => {
    const navigate = vi.fn()
    const router = createRouterCore({ routes, storageAdapter: false })
    router.bindHost({ navigate })
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    router.syncLocation({ pathname: '/settings/profile', search: '', hash: '' })
    router.syncLocation({ pathname: '/project/42', search: '', hash: '' })
    router.syncLocation({ pathname: '/settings/profile', search: '', hash: '' })
    navigate.mockClear()

    expect(await router.closeTab('/settings/profile')).toBe(true)
    expect(navigate).toHaveBeenCalledOnce()
    expect(navigate).toHaveBeenCalledWith('/dashboard', { replace: true })
    expect(await router.closeTab('/settings/profile')).toBe(false)
    expect(
      await router.closeThisTabOpenNewOne({
        oldPath: '/settings/profile',
        newPath: '/project/42',
      }),
    ).toBe(false)
    expect(navigate).toHaveBeenCalledOnce()
    expect(router.getState().tabs.map((tab) => tab.key)).toEqual([
      '/dashboard',
      '/settings/profile',
      '/project/:id',
    ])

    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    expect(router.getState().tabs.map((tab) => tab.key)).toEqual([
      '/dashboard',
      '/project/:id',
    ])
    expect(await router.closeTab('/project/:id')).toBe(true)
  })

  /** 守卫抛错要保留页签，同时释放并发锁让用户可以再次关闭。 */
  it('keeps the tab and releases the closing lock when a close guard throws', async () => {
    const navigate = vi.fn()
    const router = createRouterCore({ routes, storageAdapter: false })
    router.bindHost({ navigate })
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    router.syncLocation({ pathname: '/settings/profile', search: '', hash: '' })

    const error = new Error('close guard failed')
    const guard = () => {
      throw error
    }
    router.addBeforeCloseHook(guard, '/settings/profile')

    await expect(router.closeTab('/settings/profile')).rejects.toBe(error)
    expect(router.getState().tabs.some((tab) => tab.key === '/settings/profile')).toBe(true)

    router.clearBeforeCloseHook('/settings/profile', guard)
    expect(await router.closeTab('/settings/profile')).toBe(true)
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    expect(router.getState().tabs.some((tab) => tab.key === '/settings/profile')).toBe(false)
  })

  /** 组合命令关闭旧页后只导航一次新地址，不先跳到相邻页。 */
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
    expect(navigate).toHaveBeenCalledWith('/project/42?tab=detail#summary', { replace: true })
    expect(router.getState().activePage).toBe('/settings/profile')
    expect(router.getState().tabs.some((tab) => tab.key === '/settings/profile')).toBe(true)

    router.syncLocation({ pathname: '/project/42', search: '?tab=detail', hash: '#summary' })
    expect(router.getState().activePage).toBe('/project/:id')
    expect(router.getState().tabs.some((tab) => tab.key === '/settings/profile')).toBe(false)
  })

  /** 共享动态页换 ID 也按普通关页再开页：跑守卫、关掉旧页签，再创建新页。 */
  it('closes a shared dynamic tab and opens the new pathname as a fresh tab', async () => {
    const navigate = vi.fn()
    const onTabClose = vi.fn()
    const listener = vi.fn()
    const router = createRouterCore({ routes, storageAdapter: false })
    router.bindHost({ navigate })
    router.configureRuntime({ onTabClose })
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    router.syncLocation({
      pathname: '/project/42',
      search: '?tab=detail',
      hash: '#summary',
    })
    router.setTabLabel('/project/:id', 'Project 42')
    expect(router.toggleFixed('/project/:id')).toBe(true)
    const guard = vi.fn(() => true)
    router.addBeforeCloseHook(guard, '/project/42')
    router.subscribePageLocation('/project/:id', listener)
    listener.mockClear()
    navigate.mockClear()

    expect(
      await router.closeThisTabOpenNewOne({
        oldPath: '/project/42',
        newPath: '/project/99',
      }),
    ).toBe(true)

    expect(navigate).toHaveBeenCalledOnce()
    expect(navigate).toHaveBeenCalledWith('/project/99', { replace: true })
    expect(guard).toHaveBeenCalledOnce()

    router.syncLocation({ pathname: '/project/99', search: '', hash: '' })

    const state = router.getState()
    const tab = state.tabs.find((item) => item.key === '/project/:id')
    expect(onTabClose).toHaveBeenCalledOnce()
    expect(onTabClose).toHaveBeenCalledWith('/project/:id', { pathname: '/project/42' })
    expect(state.fixedSet).toEqual([])
    expect(tab?.label).toBe('Project')
    expect(tab?.labelCustomized).toBe(false)
    expect(state.pages.find((page) => page.key === '/project/:id')?.pathname)
      .toBe('/project/99')
    expect(state.activePage).toBe('/project/:id')
    expect(state.tabs.map((item) => item.key)).toEqual([
      '/dashboard',
      '/project/:id',
    ])
    expect(listener).not.toHaveBeenCalled()
    const remountListener = vi.fn()
    router.subscribePageLocation('/project/:id', remountListener)
    expect(remountListener).toHaveBeenCalledWith({
      pathname: '/project/99',
      search: '',
      hash: '',
    })
  })

  /** 守卫拒绝时共享页签必须停在旧真实地址，不能开始替换导航。 */
  it('keeps a shared dynamic tab when its close guard rejects replacement', async () => {
    const navigate = vi.fn()
    const router = createRouterCore({ routes, storageAdapter: false })
    router.bindHost({ navigate })
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    router.syncLocation({ pathname: '/project/42', search: '', hash: '' })
    router.addBeforeCloseHook(() => false, '/project/42')
    const snapshot = router.getState()
    navigate.mockClear()

    expect(
      await router.closeThisTabOpenNewOne({
        oldPath: '/project/42',
        newPath: '/project/99',
      }),
    ).toBe(false)

    expect(navigate).not.toHaveBeenCalled()
    expect(router.getState()).toBe(snapshot)
    expect(router.getState().pages.find((page) => page.key === '/project/:id')?.pathname)
      .toBe('/project/42')
  })

  /** 新地址无法解析时必须在删除旧页签前失败，保持状态与浏览器一致。 */
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

  /** 非活动页组合关闭在跳转抛错时必须保住旧页签，不能先删再失败。 */
  it('keeps an inactive tab when composite navigation throws', async () => {
    const error = new Error('host navigate failed')
    const onTabClose = vi.fn()
    const navigate = vi.fn(() => {
      throw error
    })
    const router = createRouterCore({ routes, storageAdapter: false })
    router.bindHost({ navigate })
    router.configureRuntime({ onTabClose })
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    router.syncLocation({ pathname: '/settings/profile', search: '', hash: '' })
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    navigate.mockClear()

    await expect(
      router.closeThisTabOpenNewOne({
        oldPath: '/settings/profile',
        newPath: '/project/42',
      }),
    ).rejects.toBe(error)

    expect(navigate).toHaveBeenCalledOnce()
    expect(onTabClose).not.toHaveBeenCalled()
    expect(router.getState().tabs.map((tab) => tab.key)).toEqual([
      '/dashboard',
      '/settings/profile',
    ])
    expect(router.getState().currentPathname).toBe('/dashboard')
    expect(router.getState().activeTabKey).toBe('/dashboard')
    expect(router.getState().navigationStatus).toBe('settled')
  })

  /** 非活动页组合关闭成功后，旧页签在命令返回时已经清掉，新页等宿主确认再建。 */
  it('clears an inactive tab only after composite navigation succeeds', async () => {
    const navigate = vi.fn()
    const onTabClose = vi.fn()
    const router = createRouterCore({ routes, storageAdapter: false })
    router.bindHost({ navigate })
    router.configureRuntime({ onTabClose })
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    router.syncLocation({ pathname: '/settings/profile', search: '', hash: '' })
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    navigate.mockClear()

    expect(
      await router.closeThisTabOpenNewOne({
        oldPath: '/settings/profile',
        newPath: '/project/42',
      }),
    ).toBe(true)

    expect(navigate).toHaveBeenCalledOnce()
    expect(navigate).toHaveBeenCalledWith('/project/42', { replace: true })
    expect(onTabClose).toHaveBeenCalledOnce()
    expect(onTabClose).toHaveBeenCalledWith('/settings/profile', {
      pathname: '/settings/profile',
    })
    expect(router.getState().tabs.map((tab) => tab.key)).toEqual(['/dashboard'])
    expect(router.getState().currentPathname).toBe('/dashboard')

    router.syncLocation({ pathname: '/project/42', search: '', hash: '' })
    expect(router.getState().tabs.map((tab) => tab.key)).toEqual([
      '/dashboard',
      '/project/:id',
    ])
  })

  /** 同步宿主落到同一共享页签时，不能把刚刚激活的那一页再删掉。 */
  it('does not delete an inactive shared tab that a sync host already activated', async () => {
    const router = createRouterCore({ routes, storageAdapter: false })
    const onTabClose = vi.fn()
    router.bindHost({
      navigate: (target) => {
        router.syncLocation({
          pathname: typeof target === 'string' ? target : target.pathname,
          search: '',
          hash: '',
        })
      },
    })
    router.configureRuntime({ onTabClose })
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    router.syncLocation({ pathname: '/project/42', search: '', hash: '' })
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    router.setTabLabel('/project/:id', 'Project 42')
    expect(router.toggleFixed('/project/:id')).toBe(true)

    expect(
      await router.closeThisTabOpenNewOne({
        oldPath: '/project/42',
        newPath: '/project/99',
      }),
    ).toBe(true)

    const state = router.getState()
    expect(onTabClose).not.toHaveBeenCalled()
    expect(state.currentPathname).toBe('/project/99')
    expect(state.activePage).toBe('/project/:id')
    expect(state.tabs.some((tab) => tab.key === '/project/:id')).toBe(true)
    expect(state.tabs.find((tab) => tab.key === '/project/:id')?.label).toBe('Project 42')
    expect(state.fixedSet).toEqual(['/project/:id'])
    expect(state.pages.find((page) => page.key === '/project/:id')?.pathname)
      .toBe('/project/99')
  })

  /** 最终导航必须早于关闭通知，避免通知回调解绑宿主后导航丢失。 */
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
    expect(navigate).toHaveBeenCalledWith('/project/42', { replace: true })
    expect(events).toEqual(['navigate'])
    router.syncLocation({ pathname: '/project/42', search: '', hash: '' })
    expect(events).toEqual(['navigate', 'onTabClose'])
  })

  /** 等待异步守卫期间宿主卸载时，应取消提交并保留旧页签。 */
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

  /** 落到的页面 listener 抛错时，关页提交和 onTabClose 仍要完成。 */
  it('still notifies onTabClose when the landing page listener throws', async () => {
    const error = new Error('page listener failed')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const onTabClose = vi.fn()
    const navigate = vi.fn()
    const router = createRouterCore({ routes, storageAdapter: false })
    router.bindHost({ navigate })
    router.configureRuntime({ onTabClose })
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    router.syncLocation({ pathname: '/settings/profile', search: '', hash: '' })
    router.subscribePageLocation('/dashboard', () => {
      throw error
    })

    try {
      expect(await router.closeTab('/settings/profile')).toBe(true)
      expect(() =>
        router.syncLocation({ pathname: '/dashboard', search: '', hash: '' }),
      ).not.toThrow()
      expect(onTabClose).toHaveBeenCalledOnce()
      expect(onTabClose).toHaveBeenCalledWith('/settings/profile', {
        pathname: '/settings/profile',
      })
      expect(router.getState().tabs.map((tab) => tab.key)).toEqual(['/dashboard'])
      expect(router.getState().navigationStatus).toBe('settled')
      expect(consoleError).toHaveBeenCalledWith(
        '[RouterCore] page location listener failed.',
        error,
      )
    } finally {
      consoleError.mockRestore()
    }
  })

  /** 关闭通知同步抛错只能记录日志，不能破坏已经完成的组合导航。 */
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
      expect(navigate).toHaveBeenCalledWith('/project/42', { replace: true })
      router.syncLocation({ pathname: '/project/42', search: '', hash: '' })
      expect(consoleError).toHaveBeenCalledWith(
        '[RouterCore] onTabClose callback failed.',
        error,
      )
    } finally {
      consoleError.mockRestore()
    }
  })

  /** 异步关闭通知不阻塞命令，rejection 也不能成为未处理异常。 */
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
      expect(navigate).toHaveBeenCalledWith('/project/42', { replace: true })
      router.syncLocation({ pathname: '/project/42', search: '', hash: '' })
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

  /** Provider 更新运行时回调时不应让 Store 订阅者重新渲染。 */
  it('updates callback references without publishing a state change', () => {
    const router = createRouterCore({ routes, storageAdapter: false })
    const subscriber = vi.fn()
    const unsubscribe = router.subscribe(subscriber)

    router.configureRuntime({ onTabClose: vi.fn() })

    expect(subscriber).not.toHaveBeenCalled()
    unsubscribe()
  })

  /** pathname 描述采用增量合并，重复值和空输入不能发布新状态。 */
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

  /** hydration 前已经确认的真实动态地址应覆盖存储旧值并回写修复。 */
  it('writes back a current dynamic pathname that overrides hydrated storage', async () => {
    const { disk, adapter } = createMemoryStorage({
      fixedParamsPathMap: {
        '/project/:id': '/project/1',
        '/customer/:id': '/customer/7',
      },
    })
    const update = vi.fn(adapter.update)
    const router = createRouterCore({
      routes,
      storageAdapter: {
        load: adapter.load,
        update,
      },
    })
    router.syncLocation({ pathname: '/project/42', search: '', hash: '' })

    expect(update).not.toHaveBeenCalled()
    await router.hydrateStorage()
    await vi.waitFor(() => {
      expect(disk.fixedParamsPathMap).toEqual({
        '/project/:id': '/project/42',
        '/customer/:id': '/customer/7',
      })
    })

    await router.hydrateStorage()
    expect(update).toHaveBeenCalledOnce()
  })

  /** 加载进行中确认的新 pathname 要与存储中的其它 key 合并，不能覆盖整张表。 */
  it('merges a dynamic pathname confirmed while hydration is in flight', async () => {
    const disk = normalizeRouterStorageState()
    let resolveLoad!: (value: RouterStorageState) => void
    const router = createRouterCore({
      routes,
      storageAdapter: {
        load: () => new Promise<RouterStorageState>((resolve) => {
          resolveLoad = (value) => {
            disk.fixedTabs = [...value.fixedTabs]
            disk.fixedParamsPathMap = { ...value.fixedParamsPathMap }
            disk.favoriteRoutePaths = [...value.favoriteRoutePaths]
            resolve({
              fixedTabs: [...disk.fixedTabs],
              fixedParamsPathMap: { ...disk.fixedParamsPathMap },
              favoriteRoutePaths: [...disk.favoriteRoutePaths],
            })
          }
        }),
        update: async (_storageKey, recipe) => {
          const next = recipe({
            fixedTabs: [...disk.fixedTabs],
            fixedParamsPathMap: { ...disk.fixedParamsPathMap },
            favoriteRoutePaths: [...disk.favoriteRoutePaths],
          })
          disk.fixedTabs = [...next.fixedTabs]
          disk.fixedParamsPathMap = { ...next.fixedParamsPathMap }
          disk.favoriteRoutePaths = [...next.favoriteRoutePaths]
        },
      },
    })

    const hydration = router.hydrateStorage()
    await vi.waitFor(() => expect(resolveLoad).toEqual(expect.any(Function)))
    router.syncLocation({ pathname: '/project/42', search: '', hash: '' })
    expect(disk.fixedParamsPathMap).toEqual({})

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
      expect(disk.fixedParamsPathMap).toEqual({
        '/project/:id': '/project/42',
        '/customer/:id': '/customer/7',
      })
    })
  })

  /** 缺少可信真实地址的固定动态页签无法恢复，应对着磁盘最新值清掉。 */
  it('removes an unrestorable fixed dynamic tab loaded from storage', async () => {
    const { disk, adapter } = createMemoryStorage({
      fixedTabs: ['/project/:id'],
      fixedParamsPathMap: {},
    })
    const router = createRouterCore({
      routes,
      storageAdapter: adapter,
    })

    await router.hydrateStorage()

    expect(router.getState().fixedSet).toEqual([])
    expect(router.getState().tabs).toEqual([])
    await vi.waitFor(() => {
      expect(disk.fixedTabs).toEqual([])
    })
  })

  /** 旧存储中的大小写、尾斜杠和重复 key 要整理成当前标准页签集合。 */
  it('normalizes and deduplicates persisted fixed tab keys', async () => {
    const { disk, adapter } = createMemoryStorage({
      fixedTabs: ['/Dashboard/', '/dashboard'],
    })
    const router = createRouterCore({
      routes,
      storageAdapter: adapter,
    })

    await router.hydrateStorage()
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })

    expect(router.getState().fixedSet).toEqual(['/dashboard'])
    expect(router.getState().tabs.map((tab) => tab.key)).toEqual(['/dashboard'])
    await vi.waitFor(() => {
      expect(disk.fixedTabs).toEqual(['/dashboard'])
    })
  })

  /** 宿主先建活动页时，稍后 hydration 仍应按持久化顺序补齐固定组。 */
  it('restores persisted fixed-tab order after the active route syncs first', async () => {
    const router = createRouterCore({
      routes,
      storageAdapter: createNoopStorageAdapter(async () => ({
        fixedTabs: ['/dashboard', '/settings/profile'],
        fixedParamsPathMap: {},
      })),
    })

    router.syncLocation({
      pathname: '/settings/profile',
      search: '',
      hash: '',
    })
    expect(router.getState().tabs.map((tab) => tab.key)).toEqual([
      '/settings/profile',
    ])

    await router.hydrateStorage()

    expect(router.getState().fixedSet).toEqual([
      '/dashboard',
      '/settings/profile',
    ])
    expect(router.getState().tabs.map((tab) => tab.key)).toEqual([
      '/dashboard',
      '/settings/profile',
    ])
    expect(router.getState().activeTabKey).toBe('/settings/profile')
  })

  /** 加载数据超过当前固定上限时要裁剪，并对着磁盘最新值写回清理结果。 */
  it('limits hydrated fixed tabs and writes the cleaned set back', async () => {
    const { disk, adapter } = createMemoryStorage({
      fixedTabs: ['/dashboard', '/settings/profile'],
    })
    const router = createRouterCore({
      routes,
      maxFixedTabCount: 1,
      storageAdapter: adapter,
    })

    await router.hydrateStorage()

    expect(router.getState().fixedSet).toEqual(['/dashboard'])
    expect(router.getState().tabs.map((tab) => tab.key)).toEqual(['/dashboard'])
    await vi.waitFor(() => {
      expect(disk.fixedTabs).toEqual(['/dashboard'])
    })
  })

  /** 一次保存失败要通知错误，但不能阻断下一次更完整的新快照保存。 */
  it('reports a failed save and persists the next complete field snapshot', async () => {
    const saveError = new Error('temporary save failure')
    const persistedFixedTabs: string[][] = []
    let attempts = 0
    const onStorageError = vi.fn()
    const adapter: RouterStorageAdapter = {
      load: vi.fn(async () => ({})),
      update: async (_storageKey, recipe) => {
        attempts += 1
        const next = recipe(normalizeRouterStorageState())
        if (attempts === 1)
          throw saveError
        persistedFixedTabs.push([...next.fixedTabs])
      },
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
      phase: 'update',
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

  /** 错误回调同步抛错不能改变 hydration 自己已经确认的结果。 */
  it('isolates a synchronous onStorageError failure from hydration', async () => {
    const loadError = new Error('load failed')
    const callbackError = new Error('storage callback failed')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const router = createRouterCore({
      routes,
      storageAdapter: createNoopStorageAdapter(async () => {
        throw loadError
      }),
    })
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

  /** 错误回调异步 rejection 必须被隔离，不能泄漏成全局未处理异常。 */
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
      load: vi.fn(async () => ({})),
      update: async () => {
        throw saveError
      },
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
      expect(onStorageError.mock.calls[0][1].phase).toBe('update')
      expect(router.getState().fixedSet).toEqual(['/dashboard'])
    } finally {
      consoleError.mockRestore()
    }
  })

  /** 加载期间用户修改固定页签时，返回的旧存储值不能覆盖本地新状态。 */
  it('hydrates fixed tabs without overwriting local changes made in flight', async () => {
    let resolveLoad!: (value: RouterStorageState) => void
    const router = createRouterCore({
      routes,
      storageAdapter: createNoopStorageAdapter(
        () => new Promise<RouterStorageState>((resolve) => {
          resolveLoad = resolve
        }),
      ),
      storageKey: 'user-1',
    })
    const hydration = router.hydrateStorage()
    await vi.waitFor(() => expect(resolveLoad).toEqual(expect.any(Function)))
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    router.toggleFixed('/dashboard')

    resolveLoad(normalizeRouterStorageState({
      fixedTabs: ['/settings/profile'],
    }))
    await hydration

    expect(router.getState().fixedSet).toEqual(['/dashboard'])
    expect(router.getState().storageHydrated).toBe(true)
  })

  /** 收藏与固定页签遵循同样的版本保护，等待期间的本地收藏优先。 */
  it('hydrates favorites without overwriting local changes made in flight', async () => {
    const disk = normalizeRouterStorageState()
    let resolveLoad!: (value: RouterStorageState) => void
    const router = createRouterCore({
      routes,
      storageAdapter: {
        load: () => new Promise<RouterStorageState>((resolve) => {
          resolveLoad = resolve
        }),
        update: async (_storageKey, recipe) => {
          const next = recipe({
            fixedTabs: [...disk.fixedTabs],
            fixedParamsPathMap: { ...disk.fixedParamsPathMap },
            favoriteRoutePaths: [...disk.favoriteRoutePaths],
          })
          disk.favoriteRoutePaths = [...next.favoriteRoutePaths]
        },
      },
    })
    const hydration = router.hydrateStorage()
    await vi.waitFor(() => expect(resolveLoad).toEqual(expect.any(Function)))

    expect(router.toggleFavoriteRoute('/dashboard')).toBe(true)
    resolveLoad(normalizeRouterStorageState({
      favoriteRoutePaths: ['/settings/profile'],
    }))
    await hydration

    expect(router.getState().favoriteRoutePaths).toEqual(['/dashboard'])
    expect(router.getState().storageHydrated).toBe(true)
    await vi.waitFor(() => {
      expect(disk.favoriteRoutePaths).toEqual(['/dashboard'])
    })
  })

  /** 即使加载失败，用户刚做的收藏仍保留在内存并继续尝试保存。 */
  it('keeps and persists a favorite change when hydration fails', async () => {
    const loadError = new Error('favorite load failed')
    let rejectLoad!: (reason?: unknown) => void
    const disk = normalizeRouterStorageState()
    const router = createRouterCore({
      routes,
      storageAdapter: {
        load: () => new Promise<never>((_resolve, reject) => {
          rejectLoad = reject
        }),
        update: async (_storageKey, recipe) => {
          const next = recipe({
            fixedTabs: [...disk.fixedTabs],
            fixedParamsPathMap: { ...disk.fixedParamsPathMap },
            favoriteRoutePaths: [...disk.favoriteRoutePaths],
          })
          disk.favoriteRoutePaths = [...next.favoriteRoutePaths]
        },
      },
    })
    const hydration = router.hydrateStorage()
    await vi.waitFor(() => expect(rejectLoad).toEqual(expect.any(Function)))

    expect(router.toggleFavoriteRoute('/dashboard')).toBe(true)
    rejectLoad(loadError)
    await hydration

    expect(router.getState().favoriteRoutePaths).toEqual(['/dashboard'])
    expect(router.getState().storageHydrated).toBe(false)
    expect(router.getState().storageLoadError).toBe(loadError)
    await vi.waitFor(() => {
      expect(disk.favoriteRoutePaths).toEqual(['/dashboard'])
    })
  })

  /** 包装后的 Adapter 让后打开的 Core 等到排队中的收藏写入完成再 load。 */
  it('loads through the remote write queue after a queued favorite save', async () => {
    const disk = normalizeRouterStorageState()
    let releaseSave!: () => void
    const saveGate = new Promise<void>((resolve) => {
      releaseSave = resolve
    })
    let markSaveStarted!: () => void
    const saveStarted = new Promise<void>((resolve) => {
      markSaveStarted = resolve
    })
    const adapter = createRemoteRouterStorageAdapter({
      async load() {
        return {
          fixedTabs: [...disk.fixedTabs],
          fixedParamsPathMap: { ...disk.fixedParamsPathMap },
          favoriteRoutePaths: [...disk.favoriteRoutePaths],
        }
      },
      update: async (_storageKey, recipe) => {
        markSaveStarted()
        await saveGate
        const next = recipe({
          fixedTabs: [...disk.fixedTabs],
          fixedParamsPathMap: { ...disk.fixedParamsPathMap },
          favoriteRoutePaths: [...disk.favoriteRoutePaths],
        })
        disk.favoriteRoutePaths = [...next.favoriteRoutePaths]
      },
    })
    const windowA = createRouterCore({ routes, storageAdapter: adapter })
    await windowA.hydrateStorage()
    expect(windowA.toggleFavoriteRoute('/settings/profile')).toBe(true)
    await saveStarted

    const windowB = createRouterCore({ routes, storageAdapter: adapter })
    const hydrationB = windowB.hydrateStorage()
    releaseSave()
    await hydrationB

    expect(windowB.getState().favoriteRoutePaths).toEqual(['/settings/profile'])
  })

  /** 只改当前动态页，不能用本实例整张 map 覆盖磁盘上别的 key。 */
  it('patches one dynamic pathname without replacing the rest of the stored map', async () => {
    const { disk, adapter } = createMemoryStorage({
      fixedParamsPathMap: { '/customer/:id': '/customer/7' },
    })
    const router = createRouterCore({
      routes,
      storageAdapter: adapter,
    })

    await router.hydrateStorage()
    router.syncLocation({ pathname: '/project/99', search: '', hash: '' })
    await vi.waitFor(() => {
      expect(disk.fixedParamsPathMap).toEqual({
        '/customer/:id': '/customer/7',
        '/project/:id': '/project/99',
      })
    })
  })

  /** 关页时 pathname 为 null 必须从磁盘删掉该 key，不能把已删 key 又合并回来。 */
  it('deletes a closed shared tab pathname without wiping other stored keys', async () => {
    const { disk, adapter } = createMemoryStorage({
      fixedParamsPathMap: {
        '/customer/:id': '/customer/7',
        '/project/:id': '/project/1',
      },
    })
    const router = createRouterCore({
      routes,
      storageAdapter: adapter,
    })

    await router.hydrateStorage()
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    router.syncLocation({ pathname: '/project/1', search: '', hash: '' })
    router.syncLocation({ pathname: '/dashboard', search: '', hash: '' })
    expect(await router.closeTab('/project/:id')).toBe(true)
    await vi.waitFor(() => {
      expect(disk.fixedParamsPathMap).toEqual({
        '/customer/:id': '/customer/7',
      })
    })
  })

  /** 加载前确认的动态地址只补这一条，仍保留存储里其它 key。 */
  it('patches a pre-hydration pathname instead of replacing the stored map', async () => {
    const { disk, adapter } = createMemoryStorage({
      fixedParamsPathMap: {
        '/project/:id': '/project/1',
        '/customer/:id': '/customer/7',
      },
    })
    const router = createRouterCore({
      routes,
      storageAdapter: adapter,
    })
    router.syncLocation({ pathname: '/project/42', search: '', hash: '' })
    await router.hydrateStorage()
    await vi.waitFor(() => {
      expect(disk.fixedParamsPathMap).toEqual({
        '/project/:id': '/project/42',
        '/customer/:id': '/customer/7',
      })
    })
  })
})

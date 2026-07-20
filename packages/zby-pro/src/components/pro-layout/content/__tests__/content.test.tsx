// @vitest-environment jsdom

import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { useEffect, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ProLayoutStoreContext, useProLayoutPageContext } from '../../context'
import { LocationCacheEffects } from '../../effects'
import type { ProLayoutRoute } from '../../interface'
import { createRouteRegistry } from '../../route'
import { createProLayoutStore } from '../../store'
import type { CreateProLayoutStoreParams, ProLayoutIntl } from '../../store'
import ProLayoutContent from '../index'

const dashboardRendered = vi.fn()
const reportsRendered = vi.fn()

function DashboardPage() {
  dashboardRendered()
  return <div>Dashboard page</div>
}

function ReportsPage() {
  reportsRendered()
  return <div>Reports page</div>
}

const routes: ProLayoutRoute[] = [
  { path: '/dashboard', title: '工作台', element: DashboardPage },
  { path: '/reports', title: '报表', element: ReportsPage },
  { path: '/admin', title: '管理后台', auth: 'admin', element: () => <div>Admin page</div> },
]

const intl: ProLayoutIntl = {
  getMessage: (_id, defaultMessage = '') => defaultMessage,
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  dashboardRendered.mockClear()
  reportsRendered.mockClear()
})

describe('ProLayoutContent', () => {
  it('keeps cached page components mounted without rerendering them on tab switches', () => {
    const store = createTestStore({ initialPathname: '/dashboard' })
    act(() => store.getState().syncByPathname('/reports'))
    const view = renderContent(store, '/reports')

    expect(dashboardRendered).toHaveBeenCalledOnce()
    expect(reportsRendered).toHaveBeenCalledOnce()
    expect(screen.getByText('Reports page')).toBeTruthy()

    act(() => {
      store.getState().syncExternalDeps({ currentPathname: '/dashboard' })
      store.getState().syncByPathname('/dashboard')
    })
    view.rerender(contentNode(store, '/dashboard'))

    expect(dashboardRendered).toHaveBeenCalledOnce()
    expect(reportsRendered).toHaveBeenCalledOnce()
    expect(screen.getByText('Dashboard page')).toBeTruthy()
  })

  it('unmounts a page after the KeepAlive LRU removes its descriptor', () => {
    const dashboardUnmounted = vi.fn()

    function EvictableDashboard() {
      useEffect(() => () => dashboardUnmounted(), [])
      return <div>Evictable dashboard</div>
    }

    const lruRoutes: ProLayoutRoute[] = [
      { path: '/dashboard', title: '工作台', element: EvictableDashboard },
      { path: '/reports', title: '报表', element: ReportsPage },
    ]
    const store = createTestStore({
      registry: createRouteRegistry({ routes: lruRoutes }),
      initialPathname: '/dashboard',
      keepAlive: { maxCachedPages: 1 },
    })
    const view = renderContent(store, '/dashboard')

    act(() => {
      store.getState().syncExternalDeps({ currentPathname: '/reports' })
      store.getState().syncByPathname('/reports')
    })
    view.rerender(contentNode(store, '/reports'))

    expect(dashboardUnmounted).toHaveBeenCalledOnce()
    expect(screen.queryByText('Evictable dashboard')).toBeNull()
    expect(screen.getByText('Reports page')).toBeTruthy()
  })

  it('renders 403 for unauthorized pages and directories, and 404 for unknown paths', () => {
    const hasAuth = (code: string) => code !== 'admin'
    const registry = createRouteRegistry({
      routes: routes.concat({
        path: '/admin-settings',
        title: '后台设置',
        auth: 'admin',
        routes: [
          {
            path: '/admin-settings/users',
            title: '用户管理',
            element: () => <div>Admin users page</div>,
          },
        ],
      }),
      hasAuth,
    })
    const store = createTestStore({
      registry,
      hasAuth,
      initialPathname: '/admin',
    })
    const view = renderContent(store, '/admin')

    expect(screen.getByText('暂无权限查看当前页面，若需当前页面权限，请联系管理员。')).toBeTruthy()
    expect(screen.queryByText('Admin page')).toBeNull()

    act(() => {
      store.getState().syncExternalDeps({ currentPathname: '/admin-settings' })
      store.getState().syncByPathname('/admin-settings')
    })
    view.rerender(contentNode(store, '/admin-settings'))

    expect(screen.getByText('暂无权限查看当前页面，若需当前页面权限，请联系管理员。')).toBeTruthy()
    expect(screen.queryByText('访问的页面暂时不存在，请输入正确的地址')).toBeNull()

    act(() => {
      store.getState().syncExternalDeps({ currentPathname: '/missing' })
      store.getState().syncByPathname('/missing')
    })
    view.rerender(contentNode(store, '/missing'))

    expect(screen.getByText('访问的页面暂时不存在，请输入正确的地址')).toBeTruthy()
  })

  it('replaces the rendered element when Registry changes at the same pathname', () => {
    const oldPageUnmounted = vi.fn()

    function OldReportsPage() {
      useEffect(() => () => oldPageUnmounted(), [])
      return <div>Old reports</div>
    }

    function NewReportsPage() {
      return <div>New reports</div>
    }

    const initialRegistry = createRouteRegistry({
      routes: [{ path: '/reports', title: '报表', element: OldReportsPage }],
    })
    const nextRegistry = createRouteRegistry({
      routes: [{ path: '/reports', title: 'Reports', element: NewReportsPage }],
    })
    const store = createTestStore({
      registry: initialRegistry,
      initialPathname: '/reports',
    })
    const view = renderContent(store, '/reports')

    act(() => {
      store.getState().syncExternalDeps({
        registry: nextRegistry,
        currentPathname: '/reports',
      })
      store.getState().syncByPathname('/reports')
    })
    view.rerender(contentNode(store, '/reports'))

    expect(oldPageUnmounted).toHaveBeenCalledOnce()
    expect(screen.queryByText('Old reports')).toBeNull()
    expect(screen.getByText('New reports')).toBeTruthy()
  })

  it('recovers a shared dynamic page after its pathname changes', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    function RecoverableProject() {
      const pathname = useProLayoutPageContext((state) => state.pathname)
      const lifecycle$ = useProLayoutPageContext((state) => state.lifecycle$)
      const location$ = useProLayoutPageContext((state) => state.location$)
      const [active, setActive] = useState<boolean | null>(null)
      const [location, setLocation] = useState('')

      lifecycle$.useSubscription(setActive)
      location$.useSubscription((value) => setLocation(value.pathname))

      if (pathname === '/project/1')
        throw new Error('project 1 render failed')

      return <div data-testid="recovered-project">{pathname}|{String(active)}|{location}</div>
    }

    const registry = createRouteRegistry({
      routes: [{ path: '/project/:id', title: '项目', element: RecoverableProject }],
    })
    const store = createTestStore({
      registry,
      initialPathname: '/project/1',
    })
    const view = render(contentWithLocationNode(store, {
      pathname: '/project/1',
      search: '',
      hash: '',
    }))

    expect(screen.getByText('Error: project 1 render failed')).toBeTruthy()

    act(() => {
      store.getState().syncExternalDeps({ currentPathname: '/project/2' })
      store.getState().syncByPathname('/project/2')
    })
    view.rerender(contentWithLocationNode(store, {
      pathname: '/project/2',
      search: '',
      hash: '',
    }))

    await waitFor(() => {
      expect(screen.getByTestId('recovered-project').textContent).toBe(
        '/project/2|true|/project/2',
      )
    })
    expect(store.getState().tabs.map((tab) => tab.key)).toEqual(['/project/:id'])
    expect(store.getState().pages.map((page) => page.key)).toEqual(['/project/:id'])
  })

  it('recovers after replacing a failed element at the same pathname', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    function FailedReportsPage(): null {
      throw new Error('reports render failed')
    }

    function FixedReportsPage() {
      const lifecycle$ = useProLayoutPageContext((state) => state.lifecycle$)
      const location$ = useProLayoutPageContext((state) => state.location$)
      const [active, setActive] = useState<boolean | null>(null)
      const [location, setLocation] = useState('')

      lifecycle$.useSubscription(setActive)
      location$.useSubscription((value) => {
        setLocation(`${value.pathname}${value.search}${value.hash}`)
      })

      return <div data-testid="fixed-reports">{String(active)}|{location}</div>
    }

    const initialRegistry = createRouteRegistry({
      routes: [{ path: '/reports', title: '报表', element: FailedReportsPage }],
    })
    const nextRegistry = createRouteRegistry({
      routes: [{ path: '/reports', title: 'Reports', element: FixedReportsPage }],
    })
    const store = createTestStore({
      registry: initialRegistry,
      initialPathname: '/reports',
    })
    const location = {
      pathname: '/reports',
      search: '?scope=mine',
      hash: '#table',
    }
    const view = render(contentWithLocationNode(store, location))

    expect(screen.getByText('Error: reports render failed')).toBeTruthy()

    act(() => {
      store.getState().syncExternalDeps({
        registry: nextRegistry,
        currentPathname: '/reports',
      })
      store.getState().syncByPathname('/reports')
    })
    view.rerender(contentWithLocationNode(store, location))

    await waitFor(() => {
      expect(screen.getByTestId('fixed-reports').textContent).toBe(
        'true|/reports?scope=mine#table',
      )
    })
  })

  it('synchronizes Page Context and receives the initial lifecycle and location events', async () => {
    const mounted = vi.fn()

    function ContextProbe() {
      const pathname = useProLayoutPageContext((state) => state.pathname)
      const routeTitle = useProLayoutPageContext(
        (state) => state.currentRoutes[state.currentRoutes.length - 1]?.route.title || '',
      )
      const lifecycle$ = useProLayoutPageContext((state) => state.lifecycle$)
      const location$ = useProLayoutPageContext((state) => state.location$)
      const [active, setActive] = useState<boolean | null>(null)
      const [location, setLocation] = useState('')

      lifecycle$.useSubscription(setActive)
      location$.useSubscription((value) => {
        setLocation(`${value.pathname}${value.search}${value.hash}`)
      })
      useEffect(() => {
        mounted()
      }, [])

      return (
        <div data-testid="page-context">
          {pathname}|{routeTitle}|{String(active)}|{location}
        </div>
      )
    }

    const projectRoutes: ProLayoutRoute[] = [
      { path: '/project/:id', title: '项目', element: ContextProbe },
    ]
    const registry = createRouteRegistry({ routes: projectRoutes })
    const store = createTestStore({
      registry,
      initialPathname: '/project/1',
    })
    const initialLocation = {
      pathname: '/project/1',
      search: '?tab=detail',
      hash: '#summary',
    }
    const view = render(contentWithLocationNode(store, initialLocation))

    await waitFor(() => {
      expect(screen.getByTestId('page-context').textContent).toBe(
        '/project/1|项目|true|/project/1?tab=detail#summary',
      )
    })

    const nextLocation = {
      pathname: '/project/2',
      search: '?tab=history',
      hash: '',
    }
    act(() => {
      store.getState().syncExternalDeps({ currentPathname: '/project/2' })
      store.getState().syncByPathname('/project/2')
    })
    view.rerender(contentWithLocationNode(store, nextLocation))

    await waitFor(() => {
      expect(screen.getByTestId('page-context').textContent).toBe(
        '/project/2|项目|true|/project/2?tab=history',
      )
    })

    const translatedRegistry = createRouteRegistry({
      routes: [{ path: '/project/:id', title: 'Project', element: ContextProbe }],
    })
    act(() => {
      store.getState().syncExternalDeps({
        registry: translatedRegistry,
        currentPathname: '/project/2',
      })
      store.getState().syncByPathname('/project/2')
    })
    view.rerender(contentWithLocationNode(store, nextLocation))

    await waitFor(() => {
      expect(screen.getByTestId('page-context').textContent).toContain('/project/2|Project|true|')
    })
    expect(mounted).toHaveBeenCalledOnce()
  })
})

function renderContent(store: ReturnType<typeof createTestStore>, pathname: string) {
  return render(contentNode(store, pathname))
}

function contentNode(store: ReturnType<typeof createTestStore>, pathname: string) {
  return (
    <ProLayoutStoreContext.Provider value={store}>
      <ProLayoutContent prefixCls="zby-pro-layout" pathname={pathname} />
    </ProLayoutStoreContext.Provider>
  )
}

function contentWithLocationNode(
  store: ReturnType<typeof createTestStore>,
  location: { pathname: string, search: string, hash: string },
) {
  return (
    <ProLayoutStoreContext.Provider value={store}>
      <LocationCacheEffects location={location} />
      <ProLayoutContent prefixCls="zby-pro-layout" pathname={location.pathname} />
    </ProLayoutStoreContext.Provider>
  )
}

function createTestStore(params: Partial<CreateProLayoutStoreParams> = {}) {
  return createProLayoutStore({
    registry: createRouteRegistry({ routes }),
    storageKey: 'test-pro-layout-content',
    hasAuth: undefined,
    maxFixedTabCount: 4,
    keepAlive: true,
    headerHeight: 38,
    breadcrumbHeight: 40,
    noBar: false,
    showBreadcrumb: true,
    intl,
    storageAdapter: false,
    ...params,
  })
}

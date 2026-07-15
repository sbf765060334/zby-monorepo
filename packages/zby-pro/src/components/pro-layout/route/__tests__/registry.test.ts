import { describe, expect, it } from 'vitest'

import type { ProLayoutRoute } from '../../interface'
import {
  createRouteRegistry,
  filterAuthorizedRoutes,
  isAccessibleRoute,
  isPromptRoute,
} from '../registry'

const DashboardPage = () => null
const ProjectPage = () => null
const TaskPage = () => null
const SecretPage = () => null
const AdminPage = () => null
const DocsPage = () => null

const routes: ProLayoutRoute[] = [
  {
    path: '/workspace',
    title: 'Workspace',
    routes: [
      { path: '/workspace/dashboard', title: 'Dashboard', element: DashboardPage },
      { path: '/workspace/projects/:projectId', title: 'Project', element: ProjectPage },
      {
        path: '/workspace/tasks/:taskId',
        title: 'Task',
        element: TaskPage,
        supportMultipleTabs: true,
      },
      {
        path: '/workspace/secret',
        title: 'Secret',
        element: SecretPage,
        auth: 'secret',
      },
    ],
  },
  { path: '/admin', title: 'Admin', element: AdminPage, auth: 'admin' },
  { path: '/docs/*', title: 'Docs', element: DocsPage },
  { path: '/ignored', title: 'Ignored', element: DashboardPage, ignore: true },
]

describe('createRouteRegistry', () => {
  it('builds route hierarchy, dynamic tab keys and wildcard real paths', () => {
    const registry = createRouteRegistry({ routes })

    expect(registry.defaultRoute).toBe('/workspace/dashboard')
    expect(registry.findFirstAccessibleChild('/workspace')).toBe('/workspace/dashboard')
    expect(registry.getTabKey('/workspace/projects/42')).toBe('/workspace/projects/:projectId')
    expect(registry.getTabKey('/workspace/tasks/7')).toBe('/workspace/tasks/7')
    expect(registry.getCurrentRoutes('/workspace/projects/42').map((item) => item.realPath)).toEqual(
      ['/workspace', '/workspace/projects/42'],
    )
    expect(registry.getCurrentSelectedPath('/docs/guide/start')).toEqual(['/docs/guide/start'])
    expect(registry.getCurrentSelectedPath('/docs')).toEqual(['/docs'])
  })

  it('normalizes static paths without changing public mapping keys', () => {
    const dashboardRoute = routes[0]?.routes?.[0]
    const trailingSlashRoute: ProLayoutRoute = {
      path: '/legacy/',
      title: 'Legacy',
      element: DashboardPage,
    }
    const registry = createRouteRegistry({ routes: [...routes, trailingSlashRoute] })

    expect(registry.resolveLeafRoute('/workspace/dashboard/')?.route).toBe(dashboardRoute)
    expect(registry.resolveLeafRoute('/legacy')?.route).toBe(trailingSlashRoute)
    expect(registry.getTabKey('/workspace/dashboard/')).toBe('/workspace/dashboard')
    expect(registry.fullRouteMapping['/legacy/']).toBe(trailingSlashRoute)
    expect(registry.fullRouteMapping['/legacy']).toBeUndefined()
  })

  it('rejects duplicate route paths before building ambiguous indexes', () => {
    const duplicateRoutes: ProLayoutRoute[] = [
      { path: '/orders/:orderId', title: 'Order A', element: ProjectPage },
      { path: '/orders/:orderId', title: 'Order B', element: TaskPage },
    ]

    expect(() => createRouteRegistry({ routes: duplicateRoutes })).toThrowError(
      '[ProLayout] Duplicate route paths "/orders/:orderId" and "/orders/:orderId" ' +
      'resolve to "/orders/:orderId". Route paths must be unique.',
    )
  })

  it('rejects route paths that conflict after normalization', () => {
    const duplicateRoutes: ProLayoutRoute[] = [
      { path: '/reports', title: 'Reports', element: ProjectPage },
      { path: '/reports/', title: 'Reports with slash', element: TaskPage },
    ]

    expect(() => createRouteRegistry({ routes: duplicateRoutes })).toThrowError(
      '[ProLayout] Duplicate route paths "/reports" and "/reports/" ' +
      'resolve to "/reports". Route paths must be unique.',
    )
  })

  it('allows protected routes when hasAuth is not provided', () => {
    const registry = createRouteRegistry({ routes })

    expect(registry.routeMapping['/admin']).toBe(routes[1])
    expect(registry.resolveLeafRoute('/admin', { withinAuth: true })?.route).toBe(routes[1])
  })

  it('keeps full routes while removing denied routes from the permission index', () => {
    const registry = createRouteRegistry({
      routes,
      hasAuth: (code) => code !== 'admin' && code !== 'secret',
    })

    expect(registry.fullRouteMapping['/admin']).toBe(routes[1])
    expect(registry.routeMapping['/admin']).toBeUndefined()
    expect(registry.routeMapping['/workspace/secret']).toBeUndefined()
    expect(registry.resolveLeafRoute('/admin')).not.toBeNull()
    expect(registry.resolveLeafRoute('/admin', { withinAuth: true })).toBeNull()
    expect(registry.permissionRoutes[0]).not.toBe(routes[0])
    expect(registry.permissionRoutes[0]?.routes?.map((route) => route.path)).toEqual([
      '/workspace/dashboard',
      '/workspace/projects/:projectId',
      '/workspace/tasks/:taskId',
    ])
  })

  it('keeps ignored menu routes accessible through the URL', () => {
    const ignoredRoute: ProLayoutRoute = {
      path: '/internal-report',
      title: 'Internal report',
      element: DashboardPage,
      ignore: true,
    }
    const registry = createRouteRegistry({ routes: [ignoredRoute] })

    expect(registry.permissionRoutes[0]).toBe(ignoredRoute)
    expect(registry.routeMapping['/internal-report']).toBe(ignoredRoute)
    expect(registry.resolveLeafRoute('/internal-report', { withinAuth: true })?.route).toBe(
      ignoredRoute,
    )
    expect(registry.isPageRoute(ignoredRoute)).toBe(true)
    expect(registry.defaultRoute).toBe('/internal-report')
    expect(ignoredRoute.ignore).toBe(true)
  })

  it('uses an explicit redirect path before the first accessible route', () => {
    const registry = createRouteRegistry({
      routes,
      defaultRedirectPath: '/docs/guide',
    })

    expect(registry.defaultRoute).toBe('/docs/guide')
  })

  it('requires element for client pages unless a custom page matcher is provided', () => {
    const shellRoutes: ProLayoutRoute[] = [
      { path: '/shell-page', title: 'Shell page', page: true },
    ]
    const clientRegistry = createRouteRegistry({ routes: shellRoutes })
    const customRegistry = createRouteRegistry({
      routes: shellRoutes,
      isPageRoute: (route) => Boolean(route.page),
    })

    expect(clientRegistry.defaultRoute).toBe('/')
    expect(clientRegistry.isPageRoute(shellRoutes[0])).toBe(false)
    expect(customRegistry.defaultRoute).toBe('/shell-page')
    expect(customRegistry.isPageRoute(shellRoutes[0])).toBe(true)
  })

  it('ranks overlapping dynamic routes by specificity after exact matches', () => {
    const WildcardPage = () => null
    const SettingsPage = () => null
    const overlapRoutes: ProLayoutRoute[] = [
      { path: '/files/:fileId/*', title: 'Wildcard', element: WildcardPage },
      { path: '/files/:fileId/settings', title: 'Settings', element: SettingsPage },
    ]
    const registry = createRouteRegistry({ routes: overlapRoutes })

    expect(registry.resolveLeafRoute('/files/42/settings')?.route).toBe(overlapRoutes[1])
    expect(registry.resolveLeafRoute('/files/:fileId/settings')?.route).toBe(overlapRoutes[1])
  })

  it('preserves declaration order for equally specific dynamic routes', () => {
    const SectionSettingsPage = () => null
    const FilePage = () => null
    const equalScoreRoutes: ProLayoutRoute[] = [
      { path: '/:section/settings', title: 'Section settings', element: SectionSettingsPage },
      { path: '/files/:page', title: 'File page', element: FilePage },
    ]
    const registry = createRouteRegistry({ routes: equalScoreRoutes })

    expect(registry.resolveLeafRoute('/files/settings')?.route).toBe(equalScoreRoutes[0])
  })
})

describe('route helpers', () => {
  it('filters inaccessible empty folders without mutating the input tree', () => {
    const input: ProLayoutRoute[] = [
      {
        path: '/settings',
        title: 'Settings',
        routes: [
          { path: '/settings/admin', title: 'Admin', element: AdminPage, auth: 'admin' },
        ],
      },
    ]

    expect(filterAuthorizedRoutes(input, () => false)).toEqual([])
    expect(input[0]?.routes).toHaveLength(1)
  })

  it('recognizes accessible and prompt routes', () => {
    expect(isAccessibleRoute({ path: '/page', title: 'Page', element: DashboardPage })).toBe(true)
    expect(
      isAccessibleRoute({ path: '/ignored', title: 'Ignored', element: DashboardPage, ignore: true }),
    ).toBe(true)
    expect(isPromptRoute(true)).toBe(true)
    expect(isPromptRoute('Coming soon')).toBe(true)
    expect(isPromptRoute(undefined)).toBe(false)
  })
})

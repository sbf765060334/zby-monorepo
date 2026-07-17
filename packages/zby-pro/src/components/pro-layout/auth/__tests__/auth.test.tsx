// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { ProLayoutStoreContext } from '../../context'
import type { ProLayoutRoute } from '../../interface'
import { createRouteRegistry } from '../../route'
import { createProLayoutStore } from '../../store'
import type { ProLayoutIntl } from '../../store'
import ProLayoutAuth from '../ProLayoutAuth'
import { useProLayoutAuth } from '../useProLayoutAuth'
import { useProLayoutAuthorization } from '../useProLayoutAuthorization'
import type { ProLayoutAuthorizationSnapshot } from '../useProLayoutAuthorization'

const routes: ProLayoutRoute[] = [
  {
    path: '/dashboard',
    title: '工作台',
    element: () => null,
  },
  {
    path: '/admin',
    title: '管理后台',
    auth: 'admin',
    element: () => null,
  },
]

const intl: ProLayoutIntl = {
  getMessage: (_id, defaultMessage = '') => defaultMessage,
}

afterEach(cleanup)

describe('static ProLayout authorization snapshot', () => {
  it('keeps the initial hasAuth for the whole mount', () => {
    const denyAdmin = (code: string) => code !== 'admin'
    const allowAll = () => true
    let latestSnapshot: ProLayoutAuthorizationSnapshot | null = null

    function SnapshotProbe(props: {
      hasAuth?: (code: string) => boolean
    }) {
      latestSnapshot = useProLayoutAuthorization({
        routes,
        hasAuth: props.hasAuth,
      })
      return null
    }

    const view = render(<SnapshotProbe hasAuth={denyAdmin} />)
    const initialSnapshot = latestSnapshot!
    expect(initialSnapshot.hasAuth).toBe(denyAdmin)
    expect(initialSnapshot.registry.resolveLeafRoute('/admin', { withinAuth: true })).toBeNull()

    // 后续新的内联/闭包函数不会改变首次挂载时保存的权限快照。
    view.rerender(<SnapshotProbe hasAuth={allowAll} />)
    expect(latestSnapshot).toBe(initialSnapshot)
    expect(latestSnapshot!.hasAuth).toBe(denyAdmin)
    expect(latestSnapshot!.registry.resolveLeafRoute('/admin', { withinAuth: true })).toBeNull()
  })

  it('rebuilds routes with the initial permission function', () => {
    const denyAdmin = (code: string) => code !== 'admin'
    const allowAll = () => true
    const nextRoutes = routes.concat({
      path: '/audit',
      title: '审计',
      auth: 'admin',
      element: () => null,
    })
    let latestSnapshot: ProLayoutAuthorizationSnapshot | null = null

    function SnapshotProbe(props: {
      routes: ProLayoutRoute[]
      hasAuth: (code: string) => boolean
    }) {
      latestSnapshot = useProLayoutAuthorization(props)
      return null
    }

    const view = render(<SnapshotProbe routes={routes} hasAuth={denyAdmin} />)
    view.rerender(<SnapshotProbe routes={nextRoutes} hasAuth={allowAll} />)

    expect(latestSnapshot!.registry.routes).toBe(nextRoutes)
    expect(latestSnapshot!.hasAuth).toBe(denyAdmin)
    expect(latestSnapshot!.registry.resolveLeafRoute('/audit', { withinAuth: true })).toBeNull()
  })
})

describe('ProLayout page authorization', () => {
  it('supports hooks and render guards with the static permission function', () => {
    const permissions = new Set(['read'])
    const stableHasAuth = (code: string) => permissions.has(code)
    const store = createProLayoutStore({
      registry: createRouteRegistry({ routes, hasAuth: stableHasAuth }),
      storageKey: 'test-pro-layout-auth',
      hasAuth: stableHasAuth,
      maxFixedTabCount: 4,
      keepAlive: true,
      headerHeight: 38,
      breadcrumbHeight: 40,
      noBar: false,
      showBreadcrumb: true,
      intl,
    })

    function AuthResult(props: {
      testId: string
      code?: string | string[] | null
      mode?: 'all' | 'some'
    }) {
      const authed = useProLayoutAuth(props.code, { mode: props.mode })
      return <span data-testid={props.testId}>{authed ? 'allowed' : 'denied'}</span>
    }

    render(
      <ProLayoutStoreContext.Provider value={store}>
        <AuthResult testId="admin-hook" code="admin" />
        <AuthResult testId="all-hook" code={['read', 'write']} />
        <AuthResult testId="some-hook" code={['read', 'write']} mode="some" />
        <ProLayoutAuth code="admin" fallback={<span data-testid="guard">denied</span>}>
          <span data-testid="guard">allowed</span>
        </ProLayoutAuth>
        <ProLayoutAuth code="admin">
          {(authed) => <span data-testid="function-child">{String(authed)}</span>}
        </ProLayoutAuth>
      </ProLayoutStoreContext.Provider>,
    )

    expect(screen.getByTestId('admin-hook').textContent).toBe('denied')
    expect(screen.getByTestId('all-hook').textContent).toBe('denied')
    expect(screen.getByTestId('some-hook').textContent).toBe('allowed')
    expect(screen.getByTestId('guard').textContent).toBe('denied')
    expect(screen.getByTestId('function-child').textContent).toBe('false')
  })

  it('allows empty codes and calls outside a Provider', () => {
    function OutsideProvider() {
      return (
        <>
          <span data-testid="empty-code">{String(useProLayoutAuth([]))}</span>
          <ProLayoutAuth code="admin" fallback={<span>denied</span>}>
            <span data-testid="outside-guard">allowed</span>
          </ProLayoutAuth>
        </>
      )
    }

    render(<OutsideProvider />)

    expect(screen.getByTestId('empty-code').textContent).toBe('true')
    expect(screen.getByTestId('outside-guard').textContent).toBe('allowed')
  })
})

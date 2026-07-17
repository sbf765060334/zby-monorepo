// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { StrictMode, act, useLayoutEffect } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ProLayoutRoute } from '../../interface'
import { createRouteRegistry } from '../../route'
import {
  createProLayoutStore,
  normalizeProLayoutStorageState,
} from '../../store'
import type {
  CreateProLayoutStoreParams,
  ProLayoutIntl,
  ProLayoutStorageAdapter,
} from '../../store'
import {
  LocationCacheEffects,
  PathnameSyncEffects,
  SyncExternalDepsEffects,
} from '../../effects'
import {
  ProLayoutStoreContext,
  useProLayoutContext,
  useProLayoutPageContext,
} from '../index'

const routes: ProLayoutRoute[] = [
  {
    path: '/dashboard',
    title: '工作台',
    element: () => null,
  },
  {
    path: '/settings',
    title: '设置',
    routes: [
      {
        path: '/settings/profile',
        title: '个人设置',
        element: () => null,
      },
    ],
  },
  {
    path: '/project/:id',
    title: '项目',
    element: () => null,
  },
]

const intl: ProLayoutIntl = {
  getMessage: (_id, defaultMessage = '') => defaultMessage,
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('ProLayout Context', () => {
  it('returns safe default layout and page values outside Providers', () => {
    function DefaultContexts() {
      const layout = useProLayoutContext()
      const page = useProLayoutPageContext()
      return (
        <span>
          {layout.currentPathname}|{page.pathname}|{page.tabKey}
        </span>
      )
    }

    render(<DefaultContexts />)

    expect(screen.getByText('||')).toBeTruthy()
  })

  it('recomputes a selector when only its closure input changes', () => {
    const store = createTestStore()
    store.getState().setPathnameDescription({
      '/project/1': '项目一',
      '/project/2': '项目二',
    })

    function Description(props: { pathname: string }) {
      const description = useProLayoutContext(
        (state) => state.pathnameDescriptionMap[props.pathname],
      )
      return <span>{description}</span>
    }

    const view = render(
      <ProLayoutStoreContext.Provider value={store}>
        <Description pathname="/project/1" />
      </ProLayoutStoreContext.Provider>,
    )

    expect(screen.getByText('项目一')).toBeTruthy()

    // Store 快照没有变化，只改变 selector 闭包中的 pathname。旧实现会错误复用项目一。
    view.rerender(
      <ProLayoutStoreContext.Provider value={store}>
        <Description pathname="/project/2" />
      </ProLayoutStoreContext.Provider>,
    )

    expect(screen.getByText('项目二')).toBeTruthy()
  })

  it('keeps an object selector snapshot stable without an equality function', () => {
    const store = createTestStore()
    const renderCount = vi.fn()

    function ObjectSelection() {
      // selector 每次执行都会创建新对象。useSyncExternalStore 在同一个 Store snapshot
      // 上重复读取时必须得到同一引用，否则 React 会进入无限重新渲染。
      const selection = useProLayoutContext((state) => ({ noBar: state.noBar }))
      renderCount()
      return <span>{selection.noBar ? 'hidden' : 'visible'}</span>
    }

    render(
      <ProLayoutStoreContext.Provider value={store}>
        <ObjectSelection />
      </ProLayoutStoreContext.Provider>,
    )

    expect(screen.getByText('visible')).toBeTruthy()
    expect(renderCount).toHaveBeenCalledOnce()
  })

  it('keeps an equal selected result stable across unrelated Store updates', () => {
    const store = createTestStore()
    const renderCount = vi.fn()

    function BarVisibility() {
      const selection = useProLayoutContext(
        (state) => ({ noBar: state.noBar }),
        (left, right) => left.noBar === right.noBar,
      )
      renderCount()
      return <span>{selection.noBar ? 'hidden' : 'visible'}</span>
    }

    render(
      <ProLayoutStoreContext.Provider value={store}>
        <BarVisibility />
      </ProLayoutStoreContext.Provider>,
    )

    act(() => store.setState({ headerHeight: 60 }))
    expect(renderCount).toHaveBeenCalledOnce()

    act(() => store.setState({ noBar: true }))
    expect(renderCount).toHaveBeenCalledTimes(2)
    expect(screen.getByText('hidden')).toBeTruthy()
  })
})

describe('ProLayout Effects', () => {
  it('synchronizes the latest intl and storage source into the stable Store', async () => {
    const store = createTestStore({ storageAdapter: false })
    const nextIntl: ProLayoutIntl = {
      getMessage: () => '新语言文案',
    }
    const nextAdapter = createAdapter()
    const view = render(
      <SyncExternalDepsEffects
        store={store}
        intl={intl}
        storageKey="first-layout"
        storageAdapter={false}
      />,
    )

    view.rerender(
      <SyncExternalDepsEffects
        store={store}
        intl={nextIntl}
        storageKey="second-layout"
        storageAdapter={nextAdapter}
      />,
    )

    await waitFor(() => {
      expect(nextAdapter.load).toHaveBeenCalledWith('second-layout')
      expect(store.getState().storageHydrated).toBe(true)
    })
    expect(store.getState().intl).toBe(nextIntl)
    expect(store.getState().storageKey).toBe('second-layout')
  })

  it('redirects a directory entered after mount and avoids StrictMode duplicate navigation', () => {
    const navigate = vi.fn()
    const store = createTestStore()
    const registry = store.getState().registry
    store.getState().syncExternalDeps({ navigate })
    const view = render(
      <StrictMode>
        <PathnameSyncEffects
          store={store}
          pathname="/settings"
          registry={registry}
        />
      </StrictMode>,
    )

    // StrictMode 重放首次 layout effect 时，相同目录输入也只允许发起一次导航。
    expect(navigate).toHaveBeenCalledOnce()
    expect(navigate).toHaveBeenLastCalledWith('/settings/profile')

    view.rerender(
      <StrictMode>
        <PathnameSyncEffects
          store={store}
          pathname="/dashboard"
          registry={registry}
        />
      </StrictMode>,
    )

    expect(store.getState().activeTabKey).toBe('/dashboard')
    expect(navigate).toHaveBeenCalledOnce()

    // 布局挂载后再次通过外部 Router 或浏览器历史进入目录，仍需重新解析子页面。
    view.rerender(
      <StrictMode>
        <PathnameSyncEffects
          store={store}
          pathname="/settings"
          registry={registry}
        />
      </StrictMode>,
    )

    expect(navigate).toHaveBeenCalledTimes(2)
    expect(navigate).toHaveBeenLastCalledWith('/settings/profile')
  })

  it('does not navigate from root to itself when no accessible page exists', () => {
    const navigate = vi.fn()
    const registry = createRouteRegistry({
      routes: [{ path: '/empty', title: '空目录', routes: [] }],
    })
    const store = createTestStore({ registry, initialPathname: '/' })
    store.getState().syncExternalDeps({ navigate })

    render(
      <PathnameSyncEffects
        store={store}
        pathname="/"
        registry={registry}
      />,
    )

    expect(registry.defaultRoute).toBe('/')
    expect(navigate).not.toHaveBeenCalled()
    expect(store.getState().activeTabKey).toBeNull()
  })

  it('re-evaluates the root default after the authoritative Registry changes', () => {
    const navigate = vi.fn()
    const initialRegistry = createRouteRegistry({
      routes: [{ path: '/empty', title: '空目录', routes: [] }],
    })
    const nextRegistry = createRouteRegistry({ routes })
    const store = createTestStore({ registry: initialRegistry, initialPathname: '/' })
    store.getState().syncExternalDeps({ navigate })
    const view = render(
      <PathnameSyncEffects store={store} pathname="/" registry={initialRegistry} />,
    )

    expect(navigate).not.toHaveBeenCalled()

    view.rerender(
      <PathnameSyncEffects store={store} pathname="/" registry={nextRegistry} />,
    )

    expect(store.getState().registry).toBe(nextRegistry)
    expect(navigate).toHaveBeenCalledOnce()
    expect(navigate).toHaveBeenCalledWith('/dashboard')
  })

  it('uses the validated Registry default when the configured default is unauthorized', () => {
    const navigate = vi.fn()
    const hasAuth = (code: string) => code !== 'admin'
    const registry = createRouteRegistry({
      routes: routes.concat({
        path: '/admin',
        title: '管理后台',
        auth: 'admin',
        element: () => null,
      }),
      hasAuth,
      defaultRedirectPath: '/admin',
    })
    const store = createTestStore({ registry, hasAuth, initialPathname: '/' })
    store.getState().syncExternalDeps({ navigate })

    render(<PathnameSyncEffects store={store} pathname="/" registry={registry} />)

    expect(registry.defaultRoute).toBe('/dashboard')
    expect(navigate).toHaveBeenCalledOnce()
    expect(navigate).toHaveBeenCalledWith('/dashboard')
  })

  it('keeps a directly visited unauthorized URL for the 403 renderer', () => {
    const navigate = vi.fn()
    const hasAuth = (code: string) => code !== 'admin'
    const registry = createRouteRegistry({
      routes: routes.concat({
        path: '/admin',
        title: '管理后台',
        auth: 'admin',
        element: () => null,
      }),
      hasAuth,
    })
    const store = createTestStore({ registry, hasAuth })
    store.getState().syncExternalDeps({ navigate })

    render(<PathnameSyncEffects store={store} pathname="/admin" registry={registry} />)

    expect(navigate).not.toHaveBeenCalled()
    expect(store.getState().currentPathname).toBe('/admin')
    expect(store.getState().registry.resolveLeafRoute('/admin')).not.toBeNull()
    expect(
      store.getState().registry.resolveLeafRoute('/admin', { withinAuth: true }),
    ).toBeNull()
    expect(store.getState().activePage).toBeNull()
  })

  it('caches and emits the complete location on first effect mount', async () => {
    const store = createTestStore()
    const emitter = { emit: vi.fn() }
    store.getState().syncByPathname('/project/42')

    function RegisterPageEmitter() {
      useLayoutEffect(
        () => store.getState().registerPageLocationEmitter('/project/:id', emitter),
        [],
      )
      return null
    }

    render(
      <ProLayoutStoreContext.Provider value={store}>
        <LocationCacheEffects
          location={{
            pathname: '/project/42',
            search: '?tab=detail',
            hash: '#summary',
          }}
        />
        <RegisterPageEmitter />
      </ProLayoutStoreContext.Provider>,
    )

    await waitFor(() => {
      expect(emitter.emit).toHaveBeenCalledWith({
        pathname: '/project/42',
        search: '?tab=detail',
        hash: '#summary',
      })
    })
    expect(store.getState().cache.getSearchParamsForTabKey('/project/:id')).toBe(
      'tab=detail',
    )
    expect(store.getState().cache.getHashForTabKey('/project/:id')).toBe('#summary')
  })
})

function createTestStore(params: Partial<CreateProLayoutStoreParams> = {}) {
  return createProLayoutStore({
    registry: createRouteRegistry({ routes }),
    storageKey: 'test-pro-layout-effects',
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

function createAdapter(): ProLayoutStorageAdapter {
  return {
    load: vi.fn(async () => normalizeProLayoutStorageState()),
    saveCollection: vi.fn(async () => undefined),
    saveFixedTabs: vi.fn(async () => undefined),
    saveFixedParamsPathMap: vi.fn(async () => undefined),
  }
}

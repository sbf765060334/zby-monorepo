/**
 * 文件职责：验证 React Router Adapter 的地址同步、重定向、history 与宿主解绑行为。
 *
 * 这些测试从真实 React 组件边界观察 Core 和 React Router 是否形成闭环，防止只在单元
 * 函数层面正确、挂到 BrowserRouter 或 MemoryRouter 后却出现时序问题。
 */
// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  BrowserRouter,
  MemoryRouter,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { StrictMode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createRouterCore } from '../../createRouterCore'
import { RouterCoreProvider } from '../../react'
import type { RouterRoute, RouterStorageAdapter } from '../../types'
import {
  RouterCoreReactRouterAdapter,
  useRouterCoreCreateHref,
} from '../index'

/** Adapter 场景共用的静态首页与共享动态项目页。 */
const routes: RouterRoute[] = [
  { path: '/home', title: '首页', element: 'home' },
  { path: '/project/:id', title: '项目', element: 'project' },
]

/** 卸载组件并把浏览器历史恢复到根路径，保证每个用例从干净地址开始。 */
afterEach(() => {
  cleanup()
  window.history.replaceState(null, '', '/')
})

/** 这一组验证 Core 命令和 React Router 地址能形成完整的双向同步。 */
describe('RouterCoreReactRouterAdapter', () => {
  /** StrictMode 首屏根路径重定向应只提交一次，并最终等待 `/home` 落定。 */
  it('settles an initial root redirect after BrowserRouter starts listening', async () => {
    window.history.replaceState(null, '', '/')
    const router = createRouterCore({
      routes,
      defaultRedirectPath: '/home',
      storageAdapter: false,
    })
    const states: Array<ReturnType<typeof router.getState>> = []
    const unsubscribe = router.subscribe((state) => states.push(state))

    render(
      <StrictMode>
        <BrowserRouter>
          <RouterCoreProvider router={router}>
            <RouterCoreReactRouterAdapter>
              <NavigationProbe router={router} />
            </RouterCoreReactRouterAdapter>
          </RouterCoreProvider>
        </BrowserRouter>
      </StrictMode>,
    )

    await waitFor(() => {
      expect(window.location.pathname).toBe('/home')
      expect(screen.getByTestId('location').textContent).toBe('/home')
      expect(router.getState().currentPathname).toBe('/home')
      expect(router.getState().activePage).toBe('/home')
      expect(router.getState().navigationStatus).toBe('settled')
    })
    expect(states.some((state) =>
      state.currentPathname === '/' &&
      state.navigationStatus === 'redirecting',
    )).toBe(true)
    expect(states.some((state) =>
      state.currentPathname === '/' &&
      state.navigationStatus === 'settled',
    )).toBe(false)
    unsubscribe()
  })

  /** 首个动态地址可以先进入本地增量，但必须等完整存储加载后才能安全保存。 */
  it('hydrates before persisting the first dynamic location', async () => {
    const loadedStorageKeys: string[] = []
    const savedStorageKeys: string[] = []
    const operations: string[] = []
    const savedParamsPathMaps: Array<Record<string, string>> = []
    const storageAdapter: RouterStorageAdapter = {
      async load(storageKey) {
        loadedStorageKeys.push(storageKey)
        operations.push('load')
        return {
          fixedTabs: [],
          fixedParamsPathMap: { '/customer/:id': '/customer/7' },
        }
      },
      async update(storageKey, recipe) {
        savedStorageKeys.push(storageKey)
        operations.push('update')
        const next = recipe({
          fixedTabs: [],
          fixedParamsPathMap: { '/customer/:id': '/customer/7' },
          favoriteRoutePaths: [],
        })
        savedParamsPathMaps.push({ ...next.fixedParamsPathMap })
      },
    }
    const router = createRouterCore({
      routes,
      storageAdapter,
      storageKey: 'user-1',
    })

    render(
      <MemoryRouter initialEntries={['/project/1']}>
        <RouterCoreProvider router={router}>
          <RouterCoreReactRouterAdapter>
            <span>content</span>
          </RouterCoreReactRouterAdapter>
        </RouterCoreProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(router.getState().storageHydrated).toBe(true)
      expect(savedStorageKeys.length).toBeGreaterThan(0)
    })
    expect(loadedStorageKeys).toEqual(['user-1'])
    expect(savedStorageKeys).not.toContain('default')
    expect(new Set(savedStorageKeys)).toEqual(new Set(['user-1']))
    // React Router 的首个动态地址先进入本地覆盖层；完整存储加载成功后才允许保存，
    // 因而不会删除本次会话尚未触达的其它动态页签映射。
    expect(operations[0]).toBe('load')
    expect(savedParamsPathMaps).toEqual([{
      '/customer/:id': '/customer/7',
      '/project/:id': '/project/1',
    }])
  })

  /** BrowserRouter 地址要进入 Core，Core 的 jump/replace 也要反向改变浏览器地址。 */
  it('synchronizes BrowserRouter location and forwards Core navigation commands', async () => {
    window.history.replaceState(null, '', '/home?source=browser#top')
    const router = createRouterCore({ routes, storageAdapter: false })
    const bindHost = vi.spyOn(router, 'bindHost')

    render(
      <BrowserRouter>
        <RouterCoreProvider router={router}>
          <RouterCoreReactRouterAdapter>
            <NavigationProbe router={router} />
          </RouterCoreReactRouterAdapter>
        </RouterCoreProvider>
      </BrowserRouter>,
    )

    expect(screen.getByTestId('location').textContent)
      .toBe('/home?source=browser#top')
    expect(router.getState().currentPathname).toBe('/home')
    expect(bindHost).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'jump' }))

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/project/42')
      expect(router.getState().currentPathname).toBe('/project/42')
    })
    // 普通 BrowserRouter 的 useNavigate 引用会随 pathname 变化；Adapter 应只更新
    // navigateRef，不能把同一个 RouterCore 宿主重复解绑和绑定。
    expect(bindHost).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'replace' }))

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent)
        .toBe('/project/42?tab=detail#summary')
    })
    expect(bindHost).toHaveBeenCalledTimes(1)
  })

  /** smartNavigate 的 replace 不能新增历史记录，回退应直接回到导航前页面。 */
  it('preserves smartNavigate replace semantics in MemoryRouter history', async () => {
    const router = createRouterCore({ routes, storageAdapter: false })

    render(
      <MemoryRouter initialEntries={['/home']}>
        <RouterCoreProvider router={router}>
          <RouterCoreReactRouterAdapter>
            <NavigationProbe router={router} />
          </RouterCoreReactRouterAdapter>
        </RouterCoreProvider>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'jump' }))
    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/project/42')
    })

    fireEvent.click(screen.getByRole('button', { name: 'replace' }))
    await waitFor(() => {
      expect(screen.getByTestId('location').textContent)
        .toBe('/project/42?tab=detail#summary')
    })

    fireEvent.click(screen.getByRole('button', { name: 'back' }))
    await waitFor(() => {
      // smartNavigate 替换的是 /project/42 记录；回退应直接返回最初的 /home。
      expect(screen.getByTestId('location').textContent).toBe('/home')
      expect(router.getState().currentPathname).toBe('/home')
    })
  })

  /** 关闭活动页签必须 replace 当前地址，后退不能把已关页签救活。 */
  it('replaces close-tab navigation so Back cannot revive the closed location', async () => {
    const router = createRouterCore({ routes, storageAdapter: false })

    render(
      <MemoryRouter initialEntries={['/home']}>
        <RouterCoreProvider router={router}>
          <RouterCoreReactRouterAdapter>
            <NavigationProbe router={router} />
          </RouterCoreReactRouterAdapter>
        </RouterCoreProvider>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'jump' }))
    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/project/42')
      expect(router.getState().activePage).toBe('/project/:id')
    })

    await act(async () => {
      expect(await router.closeTab('/project/:id')).toBe(true)
    })
    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/home')
      expect(router.getState().tabs.some((tab) => tab.key === '/project/:id')).toBe(false)
    })

    fireEvent.click(screen.getByRole('button', { name: 'back' }))
    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/home')
      expect(router.getState().currentPathname).toBe('/home')
      expect(router.getState().tabs.some((tab) => tab.key === '/project/:id')).toBe(false)
    })
  })

  /** 关旧开新同样覆盖当前历史，后退应回到更早的页面，而不是旧详情。 */
  it('replaces closeThisTabOpenNewOne so Back skips the closed pathname', async () => {
    const router = createRouterCore({ routes, storageAdapter: false })

    render(
      <MemoryRouter initialEntries={['/home']}>
        <RouterCoreProvider router={router}>
          <RouterCoreReactRouterAdapter>
            <NavigationProbe router={router} />
          </RouterCoreReactRouterAdapter>
        </RouterCoreProvider>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'jump' }))
    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/project/42')
    })

    await act(async () => {
      expect(await router.closeThisTabOpenNewOne({
        oldPath: '/project/42',
        newPath: '/project/99',
      })).toBe(true)
    })
    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/project/99')
      expect(router.getState().currentPathname).toBe('/project/99')
    })

    fireEvent.click(screen.getByRole('button', { name: 'back' }))
    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/home')
      expect(router.getState().currentPathname).toBe('/home')
    })
  })

  /** 原生 href 首屏就包含 basename，Adapter 卸载时还必须清除失效宿主。 */
  it('derives render-time href from basename and unbinds the navigation host', () => {
    const router = createRouterCore({ routes, storageAdapter: false })
    const bindHost = vi.spyOn(router, 'bindHost')

    const view = render(
      <MemoryRouter basename="/platform" initialEntries={['/platform/home']}>
        <RouterCoreProvider router={router}>
          <RouterCoreReactRouterAdapter>
            <HrefProbe />
          </RouterCoreReactRouterAdapter>
        </RouterCoreProvider>
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'internal-link' }).getAttribute('href'))
      .toBe('/platform/project/42')
    expect(screen.getByRole('link', { name: 'external-link' }).getAttribute('href'))
      .toBe('https://docs.example.com/guide')
    const host = bindHost.mock.calls.find(([value]) => value !== null)?.[0]
    expect(host).not.toHaveProperty('createHref')

    view.unmount()
    expect(bindHost).toHaveBeenLastCalledWith(null)
  })
})

/** 验证 href 在子组件首次渲染时已经可用，而不是等待 Host effect 后补写。 */
function HrefProbe() {
  const createHref = useRouterCoreCreateHref()

  return (
    <>
      <a href={createHref('/project/42')}>internal-link</a>
      <a href={createHref('https://docs.example.com/guide')}>external-link</a>
    </>
  )
}

/** 同时观察真实地址并触发 Core 与 React Router 两侧的导航动作。 */
function NavigationProbe(props: {
  router: ReturnType<typeof createRouterCore>
}) {
  const { router } = props
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <>
      <span data-testid="location">
        {`${location.pathname}${location.search}${location.hash}`}
      </span>
      <button type="button" onClick={() => router.jumpTo('/project/42')}>
        jump
      </button>
      <button
        type="button"
        onClick={() => router.smartNavigate({
          searchParams: 'tab=detail',
          hash: 'summary',
        })}
      >
        replace
      </button>
      <button type="button" onClick={() => void navigate(-1)}>
        back
      </button>
    </>
  )
}

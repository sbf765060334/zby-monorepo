/**
 * 文件职责：验证 React Provider、selector Hook 与页面级 Context 的订阅和生命周期。
 *
 * 测试重点不是页面样式，而是组件能否拿到正确 Core、是否只在相关数据变化时渲染，以
 * 及 KeepAlive 页面能否收到自己的 active 和 location 快照。
 */
// @vitest-environment jsdom

import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ReactNode } from 'react'
import type { RouterCore, RouterRoute, RouterRuntimeOptions } from '../../types'
import { createRouterCore } from '../../createRouterCore'
import {
  RouterCoreProvider,
  RouterPageProvider,
  useRouterCore,
  useRouterCoreSelector,
  useRouterPage,
  useRouterPageSelector,
} from '../index'

/** 测试路由把 element 简化成字符串，方便直接断言业务泛型是否保留。 */
interface TestRoute extends RouterRoute {
  element: string
  routes?: TestRoute[]
}

/** Provider 和页面 Context 场景共用的一条静态页与一条共享动态页。 */
const routes: TestRoute[] = [
  { path: '/home', title: '首页', element: 'home' },
  { path: '/project/:id', title: '项目', element: 'project' },
]

/** 每个场景后卸载 React 树，避免上一条测试的 Context 和 effect 影响下一条。 */
afterEach(() => {
  cleanup()
})

/** Provider 必须位于 React Router 内，才能注入 navigate 并同步 location。 */
function renderWithProvider<Route extends RouterRoute>(
  router: RouterCore<Route>,
  ui: ReactNode,
  options?: {
    initialEntries?: string[]
    onTabClose?: RouterRuntimeOptions['onTabClose']
  },
) {
  return render(
    <MemoryRouter initialEntries={options?.initialEntries ?? ['/']}>
      <RouterCoreProvider
        router={router}
        onTabClose={options?.onTabClose}
      >
        {ui}
      </RouterCoreProvider>
    </MemoryRouter>,
  )
}

/** 验证全局 Provider 只负责连接稳定实例和订阅，不偷偷重建 Core。 */
describe('RouterCoreProvider', () => {
  /** Provider 应原样提供实例，并把新增或移除的运行时回调同步给 Core。 */
  it('provides the existing core and synchronizes runtime callbacks', async () => {
    const router = createRouterCore({
      routes,
      storageAdapter: false,
      storageKey: 'first',
      maxFixedTabCount: 3,
    })
    const configureRuntime = vi.spyOn(router, 'configureRuntime')
    const hydrateStorage = vi.spyOn(router, 'hydrateStorage')
    const onTabClose = vi.fn()
    let receivedRouter: typeof router | null = null

    /** 最小消费组件：从 Context 读取实例，不渲染任何 DOM。 */
    function Probe() {
      receivedRouter = useRouterCore<TestRoute>()
      return null
    }

    const view = renderWithProvider(router, <Probe />, { onTabClose })

    expect(receivedRouter).toBe(router)
    expect(configureRuntime).toHaveBeenLastCalledWith({
      onStorageError: undefined,
      onTabClose,
    })
    await waitFor(() => expect(hydrateStorage).toHaveBeenCalled())

    view.rerender(
      <MemoryRouter initialEntries={['/']}>
        <RouterCoreProvider router={router}>
          <Probe />
        </RouterCoreProvider>
      </MemoryRouter>,
    )

    // 移除回调 prop 时仍显式传入 undefined，core 才能清理旧回调引用。
    expect(configureRuntime).toHaveBeenLastCalledWith({
      onStorageError: undefined,
      onTabClose: undefined,
    })
    expect(router.getState().storageKey).toBe('first')
    expect(router.getState().maxFixedTabCount).toBe(3)
  })

  /** selector 依赖变化时要重算，无关 Store 字段变化时则不能多渲染。 */
  it('recomputes changed selectors without rerendering for unrelated state', () => {
    const router = createRouterCore({ routes, storageAdapter: false })
    const renderValues: string[] = []

    /** 根据 prop 切换所选字段，用来同时验证状态变化与 selector 引用变化。 */
    function Probe(props: { source: 'pathname' | 'storageKey' }) {
      const value = useRouterCoreSelector((state) =>
        props.source === 'pathname' ? state.currentPathname : state.storageKey,
      )
      renderValues.push(value)
      return <span>{value}</span>
    }

    const view = renderWithProvider(router, <Probe source="pathname" />)

    act(() => {
      router.syncLocation({ pathname: '/home', search: '', hash: '' })
    })
    expect(screen.getByText('/home')).toBeTruthy()

    const renderCount = renderValues.length
    act(() => {
      router.setPathnameDescription({ '/home': '首页描述' })
    })
    expect(renderValues).toHaveLength(renderCount)

    // Store 快照没有再次变化，但 selector 捕获的 source 已变化，结果必须立即重算。
    view.rerender(
      <MemoryRouter initialEntries={['/']}>
        <RouterCoreProvider router={router}>
          <Probe source="storageKey" />
        </RouterCoreProvider>
      </MemoryRouter>,
    )
    expect(screen.getByText('default')).toBeTruthy()
  })
})

/** 验证每个 KeepAlive 页面拥有独立、可精确订阅的页面级快照。 */
describe('RouterPageProvider', () => {
  /** 页面切换真实动态地址和 active 后，Context 应在重绘前提供最新值。 */
  it('exposes current and subsequent page active and location snapshots', () => {
    const router = createRouterCore({ routes, storageAdapter: false })
    router.bindHost({ navigate: vi.fn() })
    router.syncLocation({
      pathname: '/project/1',
      search: '?tab=base',
      hash: '#detail',
    })

    /** 把页面 Context 关键字段拼成文本，让断言能一次看清完整快照。 */
    function PageProbe() {
      const page = useRouterPage<TestRoute>()
      const currentRoute = page.currentRoutes[page.currentRoutes.length - 1]
      const location = page.location
        ? `${page.location.pathname}${page.location.search}${page.location.hash}`
        : 'null'

      return (
        <span>
          {`${page.pathname}:${currentRoute?.route.element}:${page.active}:${location}`}
        </span>
      )
    }

    const firstPage = router.getState().pages[0]
    expect(firstPage).toBeDefined()

    const view = renderWithProvider(
      router,
      (
        <RouterPageProvider page={firstPage!} active>
          <PageProbe />
        </RouterPageProvider>
      ),
      { initialEntries: ['/project/1?tab=base#detail'] },
    )

    expect(
      screen.getByText('/project/1:project:true:/project/1?tab=base#detail'),
    ).toBeTruthy()

    act(() => {
      router.syncLocation({ pathname: '/project/2', search: '?tab=next', hash: '' })
    })
    const nextPage = router.getState().pages[0]

    view.rerender(
      <MemoryRouter initialEntries={['/project/1?tab=base#detail']}>
        <RouterCoreProvider router={router}>
          <RouterPageProvider page={nextPage!} active={false}>
            <PageProbe />
          </RouterPageProvider>
        </RouterCoreProvider>
      </MemoryRouter>,
    )

    expect(
      screen.getByText('/project/2:project:false:/project/2?tab=next'),
    ).toBeTruthy()
  })

  /** 晚挂载组件能读到已有快照，重复地址则不能触发额外渲染。 */
  it('provides snapshots to late consumers without notifying duplicate location', () => {
    const router = createRouterCore({ routes, storageAdapter: false })
    router.syncLocation({
      pathname: '/project/1',
      search: '?tab=base',
      hash: '#detail',
    })
    const page = router.getState().pages[0]
    let probeRenderCount = 0

    /** 记录渲染次数的晚挂载消费者，用来发现重复 location 通知。 */
    function LateProbe() {
      probeRenderCount += 1
      const active = useRouterPageSelector((context) => context.active)
      const location = useRouterPageSelector((context) => context.location)

      return (
        <span>
          {`${active}:${location?.pathname}${location?.search}${location?.hash}`}
        </span>
      )
    }

    /** 保持 Provider 不变，只用 show 控制消费组件何时进入页面树。 */
    function PageTree(props: { show: boolean }) {
      return (
        <RouterCoreProvider router={router}>
          <RouterPageProvider page={page!} active>
            {props.show ? <LateProbe /> : null}
          </RouterPageProvider>
        </RouterCoreProvider>
      )
    }

    const view = render(
      <MemoryRouter initialEntries={['/project/1?tab=base#detail']}>
        <PageTree show={false} />
      </MemoryRouter>,
    )
    view.rerender(
      <MemoryRouter initialEntries={['/project/1?tab=base#detail']}>
        <PageTree show />
      </MemoryRouter>,
    )

    expect(screen.getByText('true:/project/1?tab=base#detail')).toBeTruthy()
    const renderCountAfterMount = probeRenderCount

    act(() => {
      router.syncLocation({
        pathname: '/project/1',
        search: '?tab=base',
        hash: '#detail',
      })
    })

    expect(probeRenderCount).toBe(renderCountAfterMount)
  })

  /** 关页再开到新真实地址后，页面 Context 必须拿到确认后的 location。 */
  it('updates page location after close-and-open replacement', async () => {
    const router = createRouterCore({ routes, storageAdapter: false })
    router.bindHost({ navigate: vi.fn() })
    router.syncLocation({
      pathname: '/project/1',
      search: '',
      hash: '',
    })

    function PageProbe() {
      const page = useRouterPage<TestRoute>()
      return (
        <span>
          {`${page.pathname}:${page.location?.pathname ?? 'null'}`}
        </span>
      )
    }

    function Pages() {
      const pages = useRouterCoreSelector((state) => state.pages)
      const activePage = useRouterCoreSelector((state) => state.activePage)

      return (
        <>
          {pages.map((page) => (
            <RouterPageProvider
              key={page.key}
              page={page}
              active={page.key === activePage}
            >
              <PageProbe />
            </RouterPageProvider>
          ))}
        </>
      )
    }

    renderWithProvider(router, <Pages />, { initialEntries: ['/project/1'] })
    expect(screen.getByText('/project/1:/project/1')).toBeTruthy()

    await act(async () => {
      await router.closeThisTabOpenNewOne({
        oldPath: '/project/1',
        newPath: '/project/2',
      })
      router.syncLocation({ pathname: '/project/2', search: '', hash: '' })
    })

    expect(screen.getByText('/project/2:/project/2')).toBeTruthy()
  })
})

/**
 * 文件职责：验证 React Provider、selector Hook 与页面级 Context 的订阅和生命周期。
 *
 * 测试重点不是页面样式，而是组件能否拿到正确 Core、是否只在相关数据变化时渲染，以
 * 及 KeepAlive 页面能否收到自己的 active 和 location 快照。
 */
// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation, useParams } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ReactNode } from 'react'
import type { RouterCore, RouterRoute, RouterRuntimeOptions } from '../../types'
import { createRouterCore } from '../../createRouterCore'
import {
  RouterCoreProvider,
  RouterPageProvider,
  useRouterCore,
  useRouterCoreSelector,
  usePageLocation,
  usePageParams,
  usePageSearchParams,
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

/** 验证页面路径参数来自这一页自己的 pathname，而不是 React Router 的 Route 匹配。 */
describe('usePageParams', () => {
  /** 静态页、多段参数、通配符和尾斜杠都按叶子 pattern 解析，并且不走 useParams。 */
  it('reads this page pattern and leaves React Router params empty', () => {
    const router = createRouterCore({
      routes: [
        { path: '/home', title: '首页', element: 'home' },
        {
          path: '/project/:projectId/task/:taskId',
          title: '任务',
          element: 'task',
          supportMultipleTabs: true,
        },
        { path: '/docs/*', title: '文档', element: 'docs', supportMultipleTabs: true },
        { path: '/record/:id', title: '记录', element: 'record', supportMultipleTabs: true },
      ],
      storageAdapter: false,
    })
    router.syncLocation({ pathname: '/home', search: '', hash: '' })
    router.syncLocation({ pathname: '/project/9/task/3/', search: '', hash: '' })
    router.syncLocation({ pathname: '/docs/guide/intro', search: '', hash: '' })
    router.syncLocation({ pathname: '/record/AbC', search: '', hash: '' })

    /** 同时展示页面参数和 React Router 参数，确认后者在这棵树上始终为空。 */
    function Probe() {
      const pathname = useRouterPageSelector((page) => page.pathname)
      const pageParams = usePageParams()
      const routeParams = useParams()

      return (
        <span>
          {`${pathname}:${JSON.stringify(pageParams)}:${JSON.stringify(routeParams)}`}
        </span>
      )
    }

    /** 按 core 保留的页面逐个挂上 Provider，模拟 KeepAlive 同时留着多页。 */
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
              <Probe />
            </RouterPageProvider>
          ))}
        </>
      )
    }

    renderWithProvider(router, <Pages />, {
      initialEntries: ['/record/AbC?from=browser'],
    })

    expect(screen.getByText('/home:{}:{}')).toBeTruthy()
    expect(screen.getByText('/project/9/task/3/:{"projectId":"9","taskId":"3"}:{}')).toBeTruthy()
    expect(screen.getByText('/docs/guide/intro:{"*":"guide/intro"}:{}')).toBeTruthy()
    expect(screen.getByText('/record/AbC:{"id":"AbC"}:{}')).toBeTruthy()
  })

  /** 百分号编码按 useParams 的方式解码，残缺编码不能让页面抛错。 */
  it('decodes path params and keeps a malformed escape as-is', () => {
    const router = createRouterCore({
      routes: [
        { path: '/record/:id', title: '记录', element: 'record', supportMultipleTabs: true },
      ],
      storageAdapter: false,
    })
    router.syncLocation({ pathname: '/record/a%2Fb', search: '', hash: '' })
    router.syncLocation({ pathname: '/record/100%', search: '', hash: '' })

    function Probe() {
      const { id } = usePageParams()
      const pathname = useRouterPageSelector((page) => page.pathname)
      return <span>{`${pathname}:${id}`}</span>
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
              <Probe />
            </RouterPageProvider>
          ))}
        </>
      )
    }

    renderWithProvider(router, <Pages />, { initialEntries: ['/record/100%'] })

    expect(screen.getByText('/record/a%2Fb:a/b')).toBeTruthy()
    expect(screen.getByText('/record/100%:100%')).toBeTruthy()
  })

  /** 共享动态页签换真实地址后，参数跟着这一页的 pathname 变，不看浏览器旧地址。 */
  it('updates params when a shared dynamic page changes pathname', () => {
    const router = createRouterCore({
      routes: [{ path: '/project/:id', title: '项目', element: 'project' }],
      storageAdapter: false,
    })
    router.syncLocation({ pathname: '/project/1', search: '', hash: '' })

    /** 只输出 id，方便观察共享页签上的参数变化。 */
    function Probe() {
      const { id } = usePageParams()
      return <span>{id}</span>
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
              <Probe />
            </RouterPageProvider>
          ))}
        </>
      )
    }

    renderWithProvider(router, <Pages />, { initialEntries: ['/project/1'] })
    expect(screen.getByText('1')).toBeTruthy()

    act(() => {
      router.syncLocation({ pathname: '/project/2', search: '', hash: '' })
    })

    expect(screen.getByText('2')).toBeTruthy()
  })

  /** 只有查询串变化时，路径参数引用不变，页面不应因此重渲染。 */
  it('does not rerender when only the query string changes', () => {
    const router = createRouterCore({
      routes: [{ path: '/project/:id', title: '项目', element: 'project' }],
      storageAdapter: false,
    })
    router.syncLocation({ pathname: '/project/7', search: '?tab=base', hash: '' })
    let renders = 0

    /** 记录渲染次数，用来确认 search 更新没有打破参数订阅。 */
    function Probe() {
      renders += 1
      const { id } = usePageParams()
      return <span>{id}</span>
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
              <Probe />
            </RouterPageProvider>
          ))}
        </>
      )
    }

    renderWithProvider(router, <Pages />, {
      initialEntries: ['/project/7?tab=base'],
    })
    expect(screen.getByText('7')).toBeTruthy()
    const rendersAfterMount = renders

    act(() => {
      router.syncLocation({
        pathname: '/project/7',
        search: '?tab=activity',
        hash: '#detail',
      })
    })

    expect(renders).toBe(rendersAfterMount)
    expect(screen.getByText('7')).toBeTruthy()
  })

  /** 离开页面 Provider 时必须明确失败，避免静默读到空参数。 */
  it('throws outside RouterPageProvider', () => {
    /** 故意不包 Provider，确认错误指向页面 Hook 的使用位置。 */
    function Orphan() {
      usePageParams()
      return null
    }

    expect(() => render(<Orphan />)).toThrow(
      '页面路由 Hook 必须在 RouterPageProvider 内调用。',
    )
  })
})

/** 验证地址和查询串属于当前页面，缓存页不会改到浏览器正在显示的地址。 */
describe('usePageLocation and usePageSearchParams', () => {
  /** 列表和详情各自记住自己的 search/hash，浏览器地址只反映正在显示的详情。 */
  it('keeps a cached page location when the browser moves to another page', () => {
    const router = createRouterCore({
      routes: [
        { path: '/list', title: '列表', element: 'list' },
        { path: '/detail', title: '详情', element: 'detail' },
      ],
      storageAdapter: false,
    })

    /** 把这一页的地址和查询串拼出来，和浏览器地址分开断言。 */
    function Probe() {
      const pageLocation = usePageLocation()
      const [params] = usePageSearchParams()
      const status = params.get('status') ?? ''
      const id = params.get('id') ?? ''

      return (
        <span>
          {`${pageLocation.pathname}${pageLocation.search}${pageLocation.hash}:${status}:${id}`}
        </span>
      )
    }

    /** 浏览器地址单独渲染，用来证明它和缓存页的 location 不是同一份。 */
    function BrowserProbe() {
      const location = useLocation()
      return <span>{`browser:${location.pathname}${location.search}${location.hash}`}</span>
    }

    function Pages() {
      const pages = useRouterCoreSelector((state) => state.pages)
      const activePage = useRouterCoreSelector((state) => state.activePage)

      return (
        <>
          <BrowserProbe />
          {pages.map((page) => (
            <RouterPageProvider
              key={page.key}
              page={page}
              active={page.key === activePage}
            >
              <Probe />
            </RouterPageProvider>
          ))}
        </>
      )
    }

    renderWithProvider(router, <Pages />, {
      initialEntries: ['/list?status=open#filters'],
    })
    expect(screen.getByText('/list?status=open#filters:open:')).toBeTruthy()

    act(() => {
      router.jumpTo('/detail?id=1')
    })

    expect(screen.getByText('/list?status=open#filters:open:')).toBeTruthy()
    expect(screen.getByText('/detail?id=1::1')).toBeTruthy()
    expect(screen.getByText('browser:/detail?id=1')).toBeTruthy()
  })

  /** 活动页替换查询串时同步地址栏，并保留这一页原来的 hash。 */
  it('replaces the browser query string from the active page', () => {
    const router = createRouterCore({
      routes: [{ path: '/list', title: '列表', element: 'list' }],
      storageAdapter: false,
    })

    /** 按钮文本就是当前页面地址，点击后整段替换 status。 */
    function Probe() {
      const pageLocation = usePageLocation()
      const [params, setParams] = usePageSearchParams()

      return (
        <button
          type="button"
          onClick={() => setParams({ status: 'done' })}
        >
          {`${pageLocation.pathname}${pageLocation.search}${pageLocation.hash}:${params.get('status')}`}
        </button>
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
              <Probe />
            </RouterPageProvider>
          ))}
        </>
      )
    }

    renderWithProvider(router, <Pages />, {
      initialEntries: ['/list?status=open#filters'],
    })

    fireEvent.click(screen.getByRole('button', { name: '/list?status=open#filters:open' }))

    expect(screen.getByRole('button', { name: '/list?status=done#filters:done' })).toBeTruthy()
  })

  /** 同一次点击里的函数式更新要看见刚才写入的查询串，字符串里的 # 也不能变成 hash。 */
  it('chains functional updates and keeps a hash character inside the query', () => {
    const router = createRouterCore({
      routes: [{ path: '/list', title: '列表', element: 'list' }],
      storageAdapter: false,
    })

    function Probe() {
      const pageLocation = usePageLocation()
      const [params, setParams] = usePageSearchParams()

      return (
        <>
          <button
            type="button"
            aria-label="chain"
            onClick={() => {
              setParams({ status: 'a' })
              setParams((current) => {
                current.set('extra', 'b')
                return current
              })
            }}
          >
            {`chain:${pageLocation.search}${pageLocation.hash}:${params.get('status')}:${params.get('extra')}`}
          </button>
          <button
            type="button"
            aria-label="hash"
            onClick={() => setParams('q=1#nope')}
          >
            {`hash:${pageLocation.search}${pageLocation.hash}:${params.get('q')}`}
          </button>
        </>
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
              <Probe />
            </RouterPageProvider>
          ))}
        </>
      )
    }

    renderWithProvider(router, <Pages />, {
      initialEntries: ['/list?status=open#filters'],
    })

    fireEvent.click(screen.getByRole('button', { name: 'chain' }))
    expect(
      screen.getByRole('button', { name: 'chain' }).textContent,
    ).toBe('chain:?status=a&extra=b#filters:a:b')

    fireEvent.click(screen.getByRole('button', { name: 'hash' }))
    expect(
      screen.getByRole('button', { name: 'hash' }).textContent,
    ).toBe('hash:?q=1%23nope#filters:1#nope')
  })

  /** 缓存页改查询串只影响自己；回到该页时地址栏恢复这次写入。 */
  it('updates a cached page search without moving the browser URL', () => {
    const router = createRouterCore({
      routes: [
        { path: '/list', title: '列表', element: 'list' },
        { path: '/detail', title: '详情', element: 'detail' },
      ],
      storageAdapter: false,
    })

    /** 只有列表页提供写入按钮，避免点到当前正在显示的详情。 */
    function Probe() {
      const pathname = useRouterPageSelector((page) => page.pathname)
      const pageLocation = usePageLocation()
      const [params, setParams] = usePageSearchParams()
      const label = `${pageLocation.pathname}${pageLocation.search}${pageLocation.hash}:${params.get('status') ?? ''}`

      if (pathname !== '/list')
        return <span>{label}</span>

      return (
        <button type="button" onClick={() => setParams({ status: 'done' })}>
          {label}
        </button>
      )
    }

    function BrowserProbe() {
      const location = useLocation()
      return <span>{`browser:${location.pathname}${location.search}${location.hash}`}</span>
    }

    function Pages() {
      const pages = useRouterCoreSelector((state) => state.pages)
      const activePage = useRouterCoreSelector((state) => state.activePage)

      return (
        <>
          <BrowserProbe />
          {pages.map((page) => (
            <RouterPageProvider
              key={page.key}
              page={page}
              active={page.key === activePage}
            >
              <Probe />
            </RouterPageProvider>
          ))}
        </>
      )
    }

    renderWithProvider(router, <Pages />, {
      initialEntries: ['/list?status=open#filters'],
    })
    act(() => {
      router.jumpTo('/detail?id=1')
    })

    fireEvent.click(screen.getByRole('button', { name: '/list?status=open#filters:open' }))

    expect(screen.getByRole('button', { name: '/list?status=done#filters:done' })).toBeTruthy()
    expect(screen.getByText('browser:/detail?id=1')).toBeTruthy()

    act(() => {
      router.jumpTo({ pathname: '/list' })
    })

    expect(screen.getByText('browser:/list?status=done#filters')).toBeTruthy()
    expect(screen.getByRole('button', { name: '/list?status=done#filters:done' })).toBeTruthy()
  })

  /** 离开页面 Provider 时，地址和查询串 Hook 都要明确失败。 */
  it('throws outside RouterPageProvider', () => {
    /** 两个 Hook 都依赖页面 Context，缺 Provider 时不能静默返回浏览器地址。 */
    function OrphanLocation() {
      usePageLocation()
      return null
    }
    function OrphanSearch() {
      usePageSearchParams()
      return null
    }

    expect(() => render(<OrphanLocation />)).toThrow(
      '页面路由 Hook 必须在 RouterPageProvider 内调用。',
    )
    expect(() => render(<OrphanSearch />)).toThrow(
      '页面路由 Hook 必须在 RouterPageProvider 内调用。',
    )
  })
})

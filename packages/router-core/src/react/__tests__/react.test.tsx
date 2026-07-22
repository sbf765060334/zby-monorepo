// @vitest-environment jsdom

import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { RouterRoute } from '../../types'
import { createRouterCore } from '../../createRouterCore'
import {
  RouterCoreProvider,
  RouterPageProvider,
  useRouterCore,
  useRouterCoreSelector,
  useRouterPage,
  useRouterPageSelector,
} from '../index'

interface TestRoute extends RouterRoute {
  element: string
  routes?: TestRoute[]
}

const routes: TestRoute[] = [
  { path: '/home', title: '首页', element: 'home' },
  { path: '/project/:id', title: '项目', element: 'project' },
]

afterEach(() => {
  cleanup()
})

describe('RouterCoreProvider', () => {
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

    function Probe() {
      receivedRouter = useRouterCore<TestRoute>()
      return null
    }

    const view = render(
      <RouterCoreProvider
        router={router}
        onTabClose={onTabClose}
      >
        <Probe />
      </RouterCoreProvider>,
    )

    expect(receivedRouter).toBe(router)
    expect(configureRuntime).toHaveBeenLastCalledWith({
      onStorageError: undefined,
      onTabClose,
    })
    await waitFor(() => expect(hydrateStorage).toHaveBeenCalled())

    view.rerender(
      <RouterCoreProvider router={router}>
        <Probe />
      </RouterCoreProvider>,
    )

    // 移除回调 prop 时仍显式传入 undefined，core 才能清理旧回调引用。
    expect(configureRuntime).toHaveBeenLastCalledWith({
      onStorageError: undefined,
      onTabClose: undefined,
    })
    expect(router.getState().storageKey).toBe('first')
    expect(router.getState().maxFixedTabCount).toBe(3)
  })

  it('recomputes changed selectors without rerendering for unrelated state', () => {
    const router = createRouterCore({ routes, storageAdapter: false })
    const renderValues: string[] = []

    function Probe(props: { source: 'pathname' | 'storageKey' }) {
      const value = useRouterCoreSelector((state) =>
        props.source === 'pathname' ? state.currentPathname : state.storageKey,
      )
      renderValues.push(value)
      return <span>{value}</span>
    }

    const view = render(
      <RouterCoreProvider router={router}>
        <Probe source="pathname" />
      </RouterCoreProvider>,
    )

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
      <RouterCoreProvider router={router}>
        <Probe source="storageKey" />
      </RouterCoreProvider>,
    )
    expect(screen.getByText('default')).toBeTruthy()
  })
})

describe('RouterPageProvider', () => {
  it('exposes current and subsequent page active and location snapshots', () => {
    const router = createRouterCore({ routes, storageAdapter: false })
    router.bindHost({ navigate: vi.fn() })
    router.syncLocation({
      pathname: '/project/1',
      search: '?tab=base',
      hash: '#detail',
    })

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

    const view = render(
      <RouterCoreProvider router={router}>
        <RouterPageProvider page={firstPage!} active>
          <PageProbe />
        </RouterPageProvider>
      </RouterCoreProvider>,
    )

    expect(
      screen.getByText('/project/1:project:true:/project/1?tab=base#detail'),
    ).toBeTruthy()

    act(() => {
      router.syncLocation({ pathname: '/project/2', search: '?tab=next', hash: '' })
    })
    const nextPage = router.getState().pages[0]

    view.rerender(
      <RouterCoreProvider router={router}>
        <RouterPageProvider page={nextPage!} active={false}>
          <PageProbe />
        </RouterPageProvider>
      </RouterCoreProvider>,
    )

    expect(
      screen.getByText('/project/2:project:false:/project/2?tab=next'),
    ).toBeTruthy()
  })

  it('provides snapshots to late consumers without notifying duplicate location', () => {
    const router = createRouterCore({ routes, storageAdapter: false })
    router.syncLocation({
      pathname: '/project/1',
      search: '?tab=base',
      hash: '#detail',
    })
    const page = router.getState().pages[0]
    let probeRenderCount = 0

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

    function PageTree(props: { show: boolean }) {
      return (
        <RouterCoreProvider router={router}>
          <RouterPageProvider page={page!} active>
            {props.show ? <LateProbe /> : null}
          </RouterPageProvider>
        </RouterCoreProvider>
      )
    }

    const view = render(<PageTree show={false} />)
    view.rerender(<PageTree show />)

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
})

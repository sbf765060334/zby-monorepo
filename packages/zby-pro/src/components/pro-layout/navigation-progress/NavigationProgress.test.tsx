// @vitest-environment jsdom

import { createRouterCore } from '@zby/router-core'
import { RouterCoreProvider, useRouterCoreSelector } from '@zby/router-core/react'
import { ConfigProvider } from 'antd'
import { act, cleanup, render } from '@testing-library/react'
import NProgress from 'nprogress'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  NavigationProgressController,
  PageCommitReporter,
} from './NavigationProgress'
import type { RouterRoute } from '@zby/router-core'
import { createLazyRouteComponent } from '../createLazyRouteComponent'
import PageContent from '../page/PageContent'
import type { ProLayoutLazyRouteModule } from '../createLazyRouteComponent'
import type { ProLayoutRoute } from '../types'

vi.mock('nprogress', () => ({
  default: {
    configure: vi.fn(),
    done: vi.fn(),
    remove: vi.fn(),
    start: vi.fn(),
  },
}))

const routes: RouterRoute[] = [
  { path: '/first', title: 'First', element: {} },
  { path: '/second', title: 'Second', element: {} },
]

let nextFrameId = 0
let pendingFrames = new Map<number, FrameRequestCallback>()

describe('NavigationProgressController', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    nextFrameId = 0
    pendingFrames = new Map()
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      const frameId = ++nextFrameId
      pendingFrames.set(frameId, callback)
      return frameId
    })
    vi.stubGlobal('cancelAnimationFrame', (frameId: number) => {
      pendingFrames.delete(frameId)
    })
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('configures NProgress without its spinner', () => {
    const router = createRouterCore({ routes, storageAdapter: false })
    renderController(router)

    expect(NProgress.configure).toHaveBeenCalledWith({ showSpinner: false })
  })

  it('uses the current theme token for the progress color', () => {
    const router = createRouterCore({ routes, storageAdapter: false })

    render(
      <ConfigProvider theme={{ token: { colorPrimary: '#123456' } }}>
        <MemoryRouter initialEntries={['/first']}>
          <RouterCoreProvider router={router}>
            <NavigationProgressController>
              <CommitProbe />
            </NavigationProgressController>
          </RouterCoreProvider>
        </MemoryRouter>
      </ConfigProvider>,
    )

    expect(document.head.textContent).toContain('--ant-color-primary:#123456')
    expect(document.head.textContent).toContain(
      'background:var(--ant-color-primary)',
    )
    expect(document.head.textContent).toContain(
      'box-shadow:0 0 10px var(--ant-color-primary),0 0 5px var(--ant-color-primary)',
    )
  })

  it('starts immediately, commits after two frames, and finishes after page commit', () => {
    const router = createRouterCore({ routes, storageAdapter: false })
    renderController(router)
    vi.mocked(NProgress.start).mockClear()
    vi.mocked(NProgress.done).mockClear()

    act(() => router.jumpTo('/second'))

    expect(NProgress.start).toHaveBeenCalledOnce()
    expect(router.getState().currentPathname).toBe('/first')
    expect(NProgress.done).not.toHaveBeenCalled()

    flushAnimationFrame()
    expect(router.getState().currentPathname).toBe('/first')
    expect(NProgress.done).not.toHaveBeenCalled()

    flushAnimationFrame()
    expect(router.getState().currentPathname).toBe('/second')
    expect(NProgress.done).not.toHaveBeenCalled()

    flushAnimationFrame()
    expect(NProgress.done).toHaveBeenCalledOnce()
    expect(vi.mocked(NProgress.done).mock.calls[0]).toEqual([true])
  })

  it('does not start for same-page search or hash changes', () => {
    const router = createRouterCore({ routes, storageAdapter: false })
    renderController(router, '/first?tab=one#top')
    vi.mocked(NProgress.start).mockClear()

    act(() => router.jumpTo({ pathname: '/first', searchParams: 'tab=two', hash: 'details' }))

    expect(NProgress.start).not.toHaveBeenCalled()
    expect(router.getState().currentPathname).toBe('/first')
  })

  it('keeps progress active until a Suspense page commits', async () => {
    let resolveModule!: (module: ProLayoutLazyRouteModule) => void
    const loader = vi.fn(
      () => new Promise<ProLayoutLazyRouteModule>((resolve) => {
        resolveModule = resolve
      }),
    )
    const LazyPage = createLazyRouteComponent(loader)
    const lazyRoutes: ProLayoutRoute[] = [
      { path: '/first', title: 'First', element: FirstPage },
      { path: '/second', title: 'Second', element: LazyPage },
    ]
    const router = createRouterCore<ProLayoutRoute>({
      routes: lazyRoutes,
      storageAdapter: false,
    })
    renderPageController(router)
    vi.mocked(NProgress.start).mockClear()
    vi.mocked(NProgress.done).mockClear()

    act(() => router.jumpTo('/second'))
    flushAnimationFrame()
    flushAnimationFrame()

    expect(router.getState().currentPathname).toBe('/second')
    expect(NProgress.start).toHaveBeenCalledOnce()
    expect(NProgress.done).not.toHaveBeenCalled()

    act(() => router.smartNavigate({ searchParams: 'tab=details' }))
    await act(async () => {
      await Promise.resolve()
    })
    expect(NProgress.done).not.toHaveBeenCalled()

    await act(async () => {
      await Promise.resolve()
    })
    expect(loader).toHaveBeenCalledOnce()

    await act(async () => {
      resolveModule({ default: SecondPage })
      await Promise.resolve()
    })
    expect(NProgress.done).not.toHaveBeenCalled()

    flushAnimationFrame()
    expect(NProgress.done).toHaveBeenCalledOnce()
  })

  it('finishes when a cached KeepAlive page becomes active again', () => {
    const cachedRoutes: ProLayoutRoute[] = [
      { path: '/first', title: 'First', element: FirstPage },
      { path: '/second', title: 'Second', element: SecondPage },
    ]
    const router = createRouterCore<ProLayoutRoute>({
      routes: cachedRoutes,
      keepAlive: true,
      storageAdapter: false,
    })
    renderPageController(router)
    vi.mocked(NProgress.start).mockClear()
    vi.mocked(NProgress.done).mockClear()

    act(() => router.jumpTo('/second'))
    flushAnimationFrame()
    flushAnimationFrame()
    flushAnimationFrame()

    expect(NProgress.start).toHaveBeenCalledOnce()
    expect(NProgress.done).toHaveBeenCalledOnce()

    vi.mocked(NProgress.start).mockClear()
    vi.mocked(NProgress.done).mockClear()
    act(() => router.jumpTo('/first'))
    flushAnimationFrame()
    flushAnimationFrame()
    flushAnimationFrame()

    expect(NProgress.start).toHaveBeenCalledOnce()
    expect(NProgress.done).toHaveBeenCalledOnce()
  })

  it('cleans an active progress transaction when unmounted', () => {
    const router = createRouterCore({ routes, storageAdapter: false })
    const view = renderController(router)
    vi.mocked(NProgress.done).mockClear()

    act(() => router.jumpTo('/second'))
    view.unmount()

    expect(NProgress.done).toHaveBeenCalledOnce()
    expect(NProgress.remove).toHaveBeenCalledOnce()
  })
})

function renderController(
  router: ReturnType<typeof createRouterCore>,
  initialEntry = '/first',
) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <RouterCoreProvider router={router}>
        <NavigationProgressController>
          <CommitProbe />
        </NavigationProgressController>
      </RouterCoreProvider>
    </MemoryRouter>,
  )
}

function CommitProbe() {
  const pathname = useRouterCoreSelector((state) => state.currentPathname)
  return <PageCommitReporter pathname={pathname} />
}

function renderPageController(router: ReturnType<typeof createRouterCore<ProLayoutRoute>>) {
  return render(
    <MemoryRouter initialEntries={['/first']}>
      <RouterCoreProvider router={router}>
        <NavigationProgressController>
          <PageContent prefixCls="test-layout" />
        </NavigationProgressController>
      </RouterCoreProvider>
    </MemoryRouter>,
  )
}

function FirstPage() {
  return <div>First page</div>
}

function SecondPage() {
  return <div>Second page</div>
}

function flushAnimationFrame() {
  const frames = [...pendingFrames.values()]
  pendingFrames.clear()
  act(() => {
    for (const frame of frames)
      frame(performance.now())
  })
}

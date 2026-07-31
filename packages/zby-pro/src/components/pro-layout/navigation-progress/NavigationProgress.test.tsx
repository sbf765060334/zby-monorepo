// @vitest-environment jsdom

import { createRouterCore } from '@zby/router-core'
import { RouterCoreProvider } from '@zby/router-core/react'
import { ConfigProvider } from 'antd'
import { act, cleanup, render } from '@testing-library/react'
import NProgress from 'nprogress'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import NavigationProgress from './NavigationProgress'

vi.mock('nprogress', () => ({
  default: {
    configure: vi.fn(),
    done: vi.fn(),
    isStarted: vi.fn(() => false),
    remove: vi.fn(),
    start: vi.fn(),
  },
}))

const routes = [
  { path: '/first', title: 'First', element: {} },
  { path: '/second', title: 'Second', element: {} },
]

describe('NavigationProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('uses NProgress defaults and hides its spinner', () => {
    const router = createRouterCore({ routes, storageAdapter: false })
    router.syncLocation({ pathname: '/first', search: '', hash: '' })

    render(
      <RouterCoreProvider router={router}>
        <NavigationProgress />
      </RouterCoreProvider>,
    )

    expect(NProgress.configure).toHaveBeenCalledWith({ showSpinner: false })
  })

  it('overrides only the progress color with the current theme token', () => {
    const router = createRouterCore({ routes, storageAdapter: false })
    router.syncLocation({ pathname: '/first', search: '', hash: '' })

    render(
      <ConfigProvider theme={{ token: { colorPrimary: '#123456' } }}>
        <RouterCoreProvider router={router}>
          <NavigationProgress />
        </RouterCoreProvider>
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

  it('does not show for pathname navigation completed within the delay', () => {
    const router = createRouterCore({ routes, storageAdapter: false })
    router.bindHost({ navigate: vi.fn() })
    router.syncLocation({ pathname: '/first', search: '', hash: '' })
    render(
      <RouterCoreProvider router={router}>
        <NavigationProgress />
      </RouterCoreProvider>,
    )
    vi.mocked(NProgress.done).mockClear()

    act(() => {
      router.jumpTo('/second')
      router.syncLocation({ pathname: '/second', search: '', hash: '' })
      vi.advanceTimersByTime(150)
    })

    expect(NProgress.start).not.toHaveBeenCalled()
    expect(NProgress.done).not.toHaveBeenCalled()
  })

  it('starts after the delay and finishes when the pathname settles', () => {
    const router = createRouterCore({ routes, storageAdapter: false })
    router.bindHost({ navigate: vi.fn() })
    router.syncLocation({ pathname: '/first', search: '', hash: '' })
    render(
      <RouterCoreProvider router={router}>
        <NavigationProgress />
      </RouterCoreProvider>,
    )
    vi.mocked(NProgress.done).mockClear()

    act(() => router.jumpTo('/second'))
    expect(router.getState().navigationStatus).toBe('navigating')
    expect(vi.getTimerCount()).toBe(1)
    act(() => vi.advanceTimersByTime(149))
    expect(NProgress.start).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(1))
    expect(NProgress.start).toHaveBeenCalledOnce()

    act(() => router.syncLocation({ pathname: '/second', search: '', hash: '' }))
    expect(NProgress.done).toHaveBeenCalledOnce()
  })

  it('ignores a same-page hash change', () => {
    const router = createRouterCore({ routes, storageAdapter: false })
    router.bindHost({ navigate: vi.fn() })
    router.syncLocation({ pathname: '/first', search: '', hash: '' })
    render(
      <RouterCoreProvider router={router}>
        <NavigationProgress />
      </RouterCoreProvider>,
    )

    act(() => {
      router.jumpTo({ pathname: '/first', hash: 'table' })
      vi.advanceTimersByTime(150)
    })

    expect(NProgress.start).not.toHaveBeenCalled()
  })

  it('removes an active progress bar when unmounted', () => {
    vi.mocked(NProgress.isStarted).mockReturnValue(true)
    const router = createRouterCore({ routes, storageAdapter: false })
    router.syncLocation({ pathname: '/first', search: '', hash: '' })
    const view = render(
      <RouterCoreProvider router={router}>
        <NavigationProgress />
      </RouterCoreProvider>,
    )
    vi.mocked(NProgress.done).mockClear()

    view.unmount()

    expect(NProgress.done).toHaveBeenCalledOnce()
    expect(NProgress.remove).toHaveBeenCalledOnce()
  })
})

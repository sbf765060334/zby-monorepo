// @vitest-environment jsdom

import { createRouterCore } from '@zby/router-core'
import { RouterCoreProvider } from '@zby/router-core/react'
import { ConfigProvider } from 'antd'
import { StrictMode } from 'react'
import { act, cleanup, render } from '@testing-library/react'
import NProgress from 'nprogress'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import PageLoadingProgressProvider, {
  PageLoadingProgressFallback,
} from './PageLoadingProgress'

vi.mock('nprogress', () => ({
  default: {
    configure: vi.fn(),
    done: vi.fn(),
    remove: vi.fn(),
    start: vi.fn(),
  },
}))

describe('PageLoadingProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('uses NProgress defaults and follows the current theme color', () => {
    render(
      <ConfigProvider theme={{ token: { colorPrimary: '#123456' } }}>
        <PageLoadingProgressProvider>
          <div />
        </PageLoadingProgressProvider>
      </ConfigProvider>,
    )

    expect(NProgress.configure).toHaveBeenCalledWith({ showSpinner: false })
    expect(document.head.textContent).toContain('--ant-color-primary:#123456')
    expect(document.head.textContent).toContain(
      'background:var(--ant-color-primary)',
    )
    expect(document.head.textContent).toContain(
      'box-shadow:0 0 10px var(--ant-color-primary),0 0 5px var(--ant-color-primary)',
    )
  })

  it('does not show when the active fallback finishes within 150ms', async () => {
    const view = renderProgress(<TrackedFallback active />)

    act(() => vi.advanceTimersByTime(149))
    view.rerender(<PageLoadingProgressProvider />)
    await flushMicrotasks()
    act(() => vi.advanceTimersByTime(1))

    expect(NProgress.start).not.toHaveBeenCalled()
    expect(NProgress.done).not.toHaveBeenCalled()
  })

  it('starts after 150ms and finishes after the fallback unmounts', async () => {
    const view = renderProgress(<TrackedFallback active />)

    act(() => vi.advanceTimersByTime(150))
    expect(NProgress.start).toHaveBeenCalledOnce()

    view.rerender(<PageLoadingProgressProvider />)
    await flushMicrotasks()
    expect(NProgress.done).toHaveBeenCalledOnce()
  })

  it('ends on KeepAlive deactivation and starts again when still-pending content reactivates', async () => {
    const view = renderProgress(<TrackedFallback active />)
    act(() => vi.advanceTimersByTime(150))
    expect(NProgress.start).toHaveBeenCalledOnce()

    view.rerender(
      <PageLoadingProgressProvider>
        <TrackedFallback active={false} />
      </PageLoadingProgressProvider>,
    )
    await flushMicrotasks()
    expect(NProgress.done).toHaveBeenCalledOnce()

    view.rerender(
      <PageLoadingProgressProvider>
        <TrackedFallback active />
      </PageLoadingProgressProvider>,
    )
    act(() => vi.advanceTimersByTime(149))
    expect(NProgress.start).toHaveBeenCalledOnce()
    act(() => vi.advanceTimersByTime(1))
    expect(NProgress.start).toHaveBeenCalledTimes(2)
  })

  it('waits until every active fallback token has ended', async () => {
    const view = renderProgress(
      <>
        <TrackedFallback active label="first" />
        <TrackedFallback active label="second" />
      </>,
    )
    act(() => vi.advanceTimersByTime(150))
    expect(NProgress.start).toHaveBeenCalledOnce()

    view.rerender(
      <PageLoadingProgressProvider>
        <TrackedFallback active label="second" />
      </PageLoadingProgressProvider>,
    )
    await flushMicrotasks()
    expect(NProgress.done).not.toHaveBeenCalled()

    view.rerender(<PageLoadingProgressProvider />)
    await flushMicrotasks()
    expect(NProgress.done).toHaveBeenCalledOnce()
  })

  it('keeps an existing progress bar across a same-commit fallback handoff', async () => {
    const view = renderProgress(
      <TrackedFallback key="first" active label="first" />,
    )
    act(() => vi.advanceTimersByTime(150))

    view.rerender(
      <PageLoadingProgressProvider>
        <TrackedFallback key="second" active label="second" />
      </PageLoadingProgressProvider>,
    )
    await flushMicrotasks()

    expect(NProgress.start).toHaveBeenCalledOnce()
    expect(NProgress.done).not.toHaveBeenCalled()
  })

  it('does not react to router navigation status changes', () => {
    const router = createRouterCore({
      routes: [
        { path: '/first', title: 'First', element: {} },
        { path: '/second', title: 'Second', element: {} },
      ],
      storageAdapter: false,
    })
    router.bindHost({ navigate: vi.fn() })
    router.syncLocation({ pathname: '/first', search: '', hash: '' })

    render(
      <RouterCoreProvider router={router}>
        <PageLoadingProgressProvider>
          <div />
        </PageLoadingProgressProvider>
      </RouterCoreProvider>,
    )

    act(() => {
      router.jumpTo('/second')
      vi.advanceTimersByTime(1000)
    })

    expect(router.getState().navigationStatus).toBe('navigating')
    expect(NProgress.start).not.toHaveBeenCalled()
  })

  it('keeps token accounting balanced under StrictMode effect replay', async () => {
    const view = render(
      <StrictMode>
        <PageLoadingProgressProvider>
          <TrackedFallback active />
        </PageLoadingProgressProvider>
      </StrictMode>,
    )

    act(() => vi.advanceTimersByTime(150))
    expect(NProgress.start).toHaveBeenCalledOnce()

    view.unmount()
    await flushMicrotasks()
    expect(NProgress.done).toHaveBeenCalledOnce()
  })
})

function TrackedFallback(props: { active: boolean, label?: string }) {
  return (
    <PageLoadingProgressFallback active={props.active}>
      <div>{props.label}</div>
    </PageLoadingProgressFallback>
  )
}

function renderProgress(children: React.ReactNode) {
  return render(
    <PageLoadingProgressProvider>
      {children}
    </PageLoadingProgressProvider>,
  )
}

async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve()
  })
}

// @vitest-environment jsdom

import { createRouterCore } from '@zby/router-core'
import { RouterCoreProvider } from '@zby/router-core/react'
import { ZbyIntlProvider } from '@zby/intl'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import NProgress from 'nprogress'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { lazyPage } from '../lazyPage'
import PageContent from '../page/PageContent'
import PageProgressProvider from '../page-progress'
import { zbyProIntlResources } from '../../../locale/intl-resources'
import type { ProLayoutLazyPageModule } from '../lazyPage'
import type { ProLayoutPageLoading, ProLayoutRoute } from '../types'

vi.mock('nprogress', () => ({
  default: {
    configure: vi.fn(),
    done: vi.fn(),
    remove: vi.fn(),
    start: vi.fn(),
  },
}))

afterEach(() => {
  window.removeEventListener('error', preventExpectedWindowError)
  cleanup()
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('lazyPage', () => {
  it('reuses one module request across preload and React rendering', async () => {
    const module = createPageModule('lazy-page', 'Lazy page')
    let resolveModule!: (value: ProLayoutLazyPageModule) => void
    const loader = vi.fn(
      () => new Promise<ProLayoutLazyPageModule>((resolve) => {
        resolveModule = resolve
      }),
    )
    const LazyPage = lazyPage(loader)

    const firstPreload = LazyPage.preload()
    const secondPreload = LazyPage.preload()
    await Promise.resolve()
    expect(loader).toHaveBeenCalledOnce()

    resolveModule(module)
    await Promise.all([firstPreload, secondPreload])
    const router = createPageRouter('/lazy', LazyPage)
    router.syncLocation({ pathname: '/lazy', search: '', hash: '' })

    render(
      <MemoryRouter initialEntries={['/lazy']}>
        <RouterCoreProvider router={router}>
          <PageContent prefixCls="test-layout" />
        </RouterCoreProvider>
      </MemoryRouter>,
    )

    expect((await screen.findByTestId('lazy-page')).textContent).toBe('Lazy page')
    expect(loader).toHaveBeenCalledOnce()
  })

  it('clears a failed speculative request so a later preload can retry', async () => {
    const error = new Error('preload failed')
    const module = createPageModule('retry-page', 'Retry page')
    let attempt = 0
    const loader = vi.fn(() => {
      attempt += 1
      if (attempt === 1)
        throw error
      return Promise.resolve(module)
    })
    const LazyPage = lazyPage(loader)

    await expect(LazyPage.preload()).rejects.toBe(error)
    expect(loader).toHaveBeenCalledOnce()

    const router = createPageRouter('/retry', LazyPage)
    router.syncLocation({ pathname: '/retry', search: '', hash: '' })
    render(
      <MemoryRouter initialEntries={['/retry']}>
        <RouterCoreProvider router={router}>
          <PageContent prefixCls="test-layout" />
        </RouterCoreProvider>
      </MemoryRouter>,
    )

    expect((await screen.findByTestId('retry-page')).textContent).toBe('Retry page')
    expect(loader).toHaveBeenCalledTimes(2)
  })

  it('recreates a failed lazy page only after its route identity changes', async () => {
    vi.useFakeTimers()
    const error = new Error('first render failed')
    const module = createPageModule('recovered-page', 'Recovered page')
    let rejectFirst!: (error: Error) => void
    let resolveSecond!: (value: ProLayoutLazyPageModule) => void
    let attempt = 0
    const loader = vi.fn(() => {
      attempt += 1
      return new Promise<ProLayoutLazyPageModule>((resolve, reject) => {
        if (attempt === 1)
          rejectFirst = reject
        else
          resolveSecond = resolve
      })
    })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    window.addEventListener('error', preventExpectedWindowError)
    const LazyPage = lazyPage(loader)
    const router = createPageRouter('/retry-render/:id', LazyPage)
    router.syncLocation({ pathname: '/retry-render/1', search: '', hash: '' })

    render(
      <ZbyIntlProvider
        locale="zh-CN"
        fallbackLocale="zh-CN"
        resources={zbyProIntlResources}
      >
        <PageProgressProvider>
          <MemoryRouter initialEntries={['/retry-render/1']}>
            <RouterCoreProvider router={router}>
              <PageContent prefixCls="test-layout" />
            </RouterCoreProvider>
          </MemoryRouter>
        </PageProgressProvider>
      </ZbyIntlProvider>,
    )
    await flushMicrotasks()
    act(() => vi.advanceTimersByTime(150))
    expect(loader).toHaveBeenCalledOnce()
    expect(NProgress.start).toHaveBeenCalledOnce()

    await act(async () => {
      rejectFirst(error)
      await Promise.resolve()
    })
    await flushMicrotasks()
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByRole('button', { name: '重试' })).toBeTruthy()
    expect(NProgress.done).toHaveBeenCalledOnce()

    act(() => {
      router.syncLocation({ pathname: '/retry-render/2', search: '', hash: '' })
    })
    await flushMicrotasks()
    expect(loader).toHaveBeenCalledTimes(2)
    act(() => vi.advanceTimersByTime(150))
    expect(NProgress.start).toHaveBeenCalledTimes(2)

    await act(async () => {
      resolveSecond(module)
      await Promise.resolve()
    })
    await flushMicrotasks()
    expect(screen.getByTestId('recovered-page').textContent).toBe('Recovered page')
    expect(NProgress.done).toHaveBeenCalledTimes(2)
    consoleError.mockRestore()
  })

  it('retries a failed lazy page from the error fallback', async () => {
    vi.useFakeTimers()
    const error = new Error('first render failed')
    const module = createPageModule('retried-page', 'Retried page')
    let rejectFirst!: (error: Error) => void
    let resolveSecond!: (value: ProLayoutLazyPageModule) => void
    let attempt = 0
    const loader = vi.fn(() => {
      attempt += 1
      return new Promise<ProLayoutLazyPageModule>((resolve, reject) => {
        if (attempt === 1)
          rejectFirst = reject
        else
          resolveSecond = resolve
      })
    })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    window.addEventListener('error', preventExpectedWindowError)
    const LazyPage = lazyPage(loader)
    const router = createPageRouter('/retry-click', LazyPage)
    router.syncLocation({ pathname: '/retry-click', search: '', hash: '' })

    render(
      <ZbyIntlProvider
        locale="zh-CN"
        fallbackLocale="zh-CN"
        resources={zbyProIntlResources}
      >
        <PageProgressProvider>
          <MemoryRouter initialEntries={['/retry-click']}>
            <RouterCoreProvider router={router}>
              <PageContent prefixCls="test-layout" />
            </RouterCoreProvider>
          </MemoryRouter>
        </PageProgressProvider>
      </ZbyIntlProvider>,
    )
    await flushMicrotasks()
    act(() => vi.advanceTimersByTime(150))

    await act(async () => {
      rejectFirst(error)
      await Promise.resolve()
    })
    await flushMicrotasks()
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(loader).toHaveBeenCalledOnce()

    fireEvent.click(screen.getByRole('button', { name: '重试' }))
    await flushMicrotasks()
    expect(loader).toHaveBeenCalledTimes(2)
    act(() => vi.advanceTimersByTime(150))
    expect(NProgress.start).toHaveBeenCalledTimes(2)

    await act(async () => {
      resolveSecond(module)
      await Promise.resolve()
    })
    await flushMicrotasks()
    expect(screen.getByTestId('retried-page').textContent).toBe('Retried page')
    expect(NProgress.done).toHaveBeenCalledTimes(2)
    consoleError.mockRestore()
  })

  it('reuses a successful preload when retrying a poisoned lazy page', async () => {
    const error = new Error('first render failed')
    const module = createPageModule('preloaded-retry-page', 'Preloaded retry page')
    let rejectFirst!: (error: Error) => void
    let resolvePreload!: (value: ProLayoutLazyPageModule) => void
    let attempt = 0
    const loader = vi.fn(() => {
      attempt += 1
      return new Promise<ProLayoutLazyPageModule>((resolve, reject) => {
        if (attempt === 1)
          rejectFirst = reject
        else
          resolvePreload = resolve
      })
    })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    window.addEventListener('error', preventExpectedWindowError)
    const LazyPage = lazyPage(loader)
    const router = createPageRouter('/preload-retry', LazyPage)
    router.syncLocation({ pathname: '/preload-retry', search: '', hash: '' })

    render(renderRecoverablePage(router))
    await flushMicrotasks()

    await act(async () => {
      rejectFirst(error)
      await Promise.resolve()
    })
    await flushMicrotasks()
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(loader).toHaveBeenCalledOnce()

    const preload = LazyPage.preload()
    await flushMicrotasks()
    expect(loader).toHaveBeenCalledTimes(2)
    await act(async () => {
      resolvePreload(module)
      await preload
    })

    fireEvent.click(screen.getByRole('button', { name: '重试' }))
    await flushMicrotasks()
    expect(loader).toHaveBeenCalledTimes(2)
    expect(screen.getByTestId('preloaded-retry-page').textContent).toBe('Preloaded retry page')
    consoleError.mockRestore()
  })

  it('joins an in-flight preload when retrying a poisoned lazy page', async () => {
    const error = new Error('first render failed')
    const module = createPageModule('inflight-retry-page', 'Inflight retry page')
    let rejectFirst!: (error: Error) => void
    let resolvePreload!: (value: ProLayoutLazyPageModule) => void
    let attempt = 0
    const loader = vi.fn(() => {
      attempt += 1
      return new Promise<ProLayoutLazyPageModule>((resolve, reject) => {
        if (attempt === 1)
          rejectFirst = reject
        else
          resolvePreload = resolve
      })
    })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    window.addEventListener('error', preventExpectedWindowError)
    const LazyPage = lazyPage(loader)
    const router = createPageRouter('/inflight-retry', LazyPage)
    router.syncLocation({ pathname: '/inflight-retry', search: '', hash: '' })

    render(renderRecoverablePage(router))
    await flushMicrotasks()

    await act(async () => {
      rejectFirst(error)
      await Promise.resolve()
    })
    await flushMicrotasks()
    expect(screen.getByRole('alert')).toBeTruthy()

    const preload = LazyPage.preload()
    await flushMicrotasks()
    expect(loader).toHaveBeenCalledTimes(2)

    fireEvent.click(screen.getByRole('button', { name: '重试' }))
    await flushMicrotasks()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByTestId('inflight-retry-page')).toBeNull()

    await act(async () => {
      resolvePreload(module)
      await preload
    })
    await flushMicrotasks()
    expect(loader).toHaveBeenCalledTimes(2)
    expect(screen.getByTestId('inflight-retry-page').textContent).toBe('Inflight retry page')
    consoleError.mockRestore()
  })

  it('still retries when a later preload also fails on a poisoned lazy page', async () => {
    const renderError = new Error('first render failed')
    const preloadError = new Error('later preload failed')
    const module = createPageModule('failed-preload-retry-page', 'Failed preload retry page')
    let rejectFirst!: (error: Error) => void
    let resolveRetry!: (value: ProLayoutLazyPageModule) => void
    let attempt = 0
    const loader = vi.fn(() => {
      attempt += 1
      return new Promise<ProLayoutLazyPageModule>((resolve, reject) => {
        if (attempt === 1)
          rejectFirst = reject
        else if (attempt === 2)
          reject(preloadError)
        else
          resolveRetry = resolve
      })
    })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    window.addEventListener('error', preventExpectedWindowError)
    const LazyPage = lazyPage(loader)
    const router = createPageRouter('/failed-preload-retry', LazyPage)
    router.syncLocation({ pathname: '/failed-preload-retry', search: '', hash: '' })

    render(renderRecoverablePage(router))
    await flushMicrotasks()

    await act(async () => {
      rejectFirst(renderError)
      await Promise.resolve()
    })
    await flushMicrotasks()
    expect(screen.getByRole('alert')).toBeTruthy()

    await expect(LazyPage.preload()).rejects.toBe(preloadError)
    expect(loader).toHaveBeenCalledTimes(2)

    fireEvent.click(screen.getByRole('button', { name: '重试' }))
    await flushMicrotasks()
    expect(loader).toHaveBeenCalledTimes(3)

    await act(async () => {
      resolveRetry(module)
      await Promise.resolve()
    })
    await flushMicrotasks()
    expect(screen.getByTestId('failed-preload-retry-page').textContent).toBe('Failed preload retry page')
    consoleError.mockRestore()
  })

  it('does not suspend again when retrying a render error after a failed preload', async () => {
    const preloadError = new Error('preload failed')
    const renderError = new Error('page render failed')
    let shouldThrow = true
    let attempt = 0
    let resolveModule!: (value: ProLayoutLazyPageModule) => void
    const loader = vi.fn(() => {
      attempt += 1
      if (attempt === 1)
        return Promise.reject(preloadError)
      return new Promise<ProLayoutLazyPageModule>((resolve) => {
        resolveModule = resolve
      })
    })
    const renderLoading = vi.fn(({ pathname }: { pathname: string }) => (
      <div data-testid="render-error-loading">Loading {pathname}</div>
    ))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    window.addEventListener('error', preventExpectedWindowError)
    const LazyPage = lazyPage(loader)

    await expect(LazyPage.preload()).rejects.toBe(preloadError)
    expect(loader).toHaveBeenCalledOnce()

    const router = createPageRouter('/render-error-retry', LazyPage)
    router.syncLocation({ pathname: '/render-error-retry', search: '', hash: '' })
    render(renderRecoverablePage(router, { render: renderLoading }))
    expect(await screen.findByTestId('render-error-loading')).toBeTruthy()

    await act(async () => {
      resolveModule({
        default: () => {
          if (shouldThrow)
            throw renderError
          return <div data-testid="stable-page">Stable page</div>
        },
      })
      await Promise.resolve()
    })
    await flushMicrotasks()
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(loader).toHaveBeenCalledTimes(2)

    renderLoading.mockClear()
    shouldThrow = false
    fireEvent.click(screen.getByRole('button', { name: '重试' }))
    await flushMicrotasks()

    expect(renderLoading).not.toHaveBeenCalled()
    expect(screen.getByTestId('stable-page').textContent).toBe('Stable page')
    expect(loader).toHaveBeenCalledTimes(2)
    consoleError.mockRestore()
  })

  it('uses the configured Suspense fallback and retains a loaded page across navigation', async () => {
    const module = createPageModule('retained-page', 'Retained page')
    let resolveModule!: (value: ProLayoutLazyPageModule) => void
    const loader = vi.fn(
      () => new Promise<ProLayoutLazyPageModule>((resolve) => {
        resolveModule = resolve
      }),
    )
    const LazyPage = lazyPage(loader)
    const routes: ProLayoutRoute[] = [
      { path: '/lazy', title: 'Lazy', element: LazyPage },
      { path: '/other', title: 'Other', element: OtherPage },
    ]
    const router = createRouterCore({ routes, storageAdapter: false, keepAlive: true })
    router.syncLocation({ pathname: '/lazy', search: '', hash: '' })
    const { container } = render(
      <MemoryRouter initialEntries={['/lazy']}>
        <RouterCoreProvider router={router}>
          <PageContent
            prefixCls="test-layout"
            pageLoading={{
              render: ({ pathname }) => (
                <div data-testid="custom-loading">Loading {pathname}</div>
              ),
            }}
          />
        </RouterCoreProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('custom-loading').textContent).toBe('Loading /lazy')
    await act(async () => {
      await Promise.resolve()
    })
    expect(loader).toHaveBeenCalledOnce()
    await act(async () => {
      resolveModule(module)
      await Promise.resolve()
    })
    expect((await screen.findByTestId('retained-page')).textContent).toBe('Retained page')

    act(() => {
      router.syncLocation({ pathname: '/other', search: '', hash: '' })
    })
    expect(await screen.findByTestId('other-page')).toBeTruthy()
    const retainedPage = screen.getByTestId('retained-page')
    const retainedPageBody = retainedPage.closest('.test-layout-page-body') as HTMLElement
    expect(retainedPage.isConnected).toBe(true)
    expect(retainedPageBody.style.display).toBe('none')

    act(() => {
      router.syncLocation({ pathname: '/lazy', search: '', hash: '' })
    })
    expect(retainedPageBody.style.display).toBe('block')
    expect(container.querySelector('[data-testid="custom-loading"]')).toBeNull()
    expect(loader).toHaveBeenCalledOnce()
  })

  it('hides the Suspense placeholder but still tracks loading when pageLoading is false', () => {
    vi.useFakeTimers()
    const LazyPage = lazyPage(
      () => new Promise<ProLayoutLazyPageModule>(() => undefined),
    )
    const router = createPageRouter('/lazy', LazyPage)
    router.syncLocation({ pathname: '/lazy', search: '', hash: '' })
    const { container } = render(
      <PageProgressProvider>
        <MemoryRouter initialEntries={['/lazy']}>
          <RouterCoreProvider router={router}>
            <PageContent prefixCls="test-layout" pageLoading={false} />
          </RouterCoreProvider>
        </MemoryRouter>
      </PageProgressProvider>,
    )

    expect(container.querySelector('.test-layout-page-loading')).toBeNull()
    act(() => vi.advanceTimersByTime(150))
    expect(NProgress.start).toHaveBeenCalledOnce()
  })

  it('stops for a pending KeepAlive page while inactive and resumes when it reactivates', async () => {
    vi.useFakeTimers()
    const module = createPageModule('pending-page', 'Pending page')
    let resolveModule!: (value: ProLayoutLazyPageModule) => void
    const LazyPage = lazyPage(
      () => new Promise<ProLayoutLazyPageModule>((resolve) => {
        resolveModule = resolve
      }),
    )
    const router = createRouterCore<ProLayoutRoute>({
      routes: [
        { path: '/lazy', title: 'Lazy', element: LazyPage },
        { path: '/other', title: 'Other', element: OtherPage },
      ],
      keepAlive: true,
      storageAdapter: false,
    })
    router.syncLocation({ pathname: '/lazy', search: '', hash: '' })
    render(
      <PageProgressProvider>
        <MemoryRouter initialEntries={['/lazy']}>
          <RouterCoreProvider router={router}>
            <PageContent prefixCls="test-layout" />
          </RouterCoreProvider>
        </MemoryRouter>
      </PageProgressProvider>,
    )
    await flushMicrotasks()

    act(() => vi.advanceTimersByTime(150))
    expect(NProgress.start).toHaveBeenCalledOnce()

    act(() => router.syncLocation({ pathname: '/other', search: '', hash: '' }))
    await flushMicrotasks()
    expect(NProgress.done).toHaveBeenCalledOnce()

    act(() => router.syncLocation({ pathname: '/lazy', search: '', hash: '' }))
    act(() => vi.advanceTimersByTime(150))
    expect(NProgress.start).toHaveBeenCalledTimes(2)

    await act(async () => {
      resolveModule(module)
      await Promise.resolve()
    })
    await flushMicrotasks()
    expect(screen.getByTestId('pending-page')).toBeTruthy()
    expect(NProgress.done).toHaveBeenCalledTimes(2)
  })

  it('finishes progress when a lazy page fails', async () => {
    vi.useFakeTimers()
    const error = new Error('lazy page failed')
    let rejectModule!: (error: Error) => void
    const onPageError = vi.fn()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    window.addEventListener('error', preventExpectedWindowError)
    const LazyPage = lazyPage(
      () => new Promise<ProLayoutLazyPageModule>((_resolve, reject) => {
        rejectModule = reject
      }),
    )
    const router = createPageRouter('/lazy', LazyPage)
    router.syncLocation({ pathname: '/lazy', search: '', hash: '' })
    render(
      <ZbyIntlProvider
        locale="zh-CN"
        fallbackLocale="zh-CN"
        resources={zbyProIntlResources}
      >
        <PageProgressProvider>
          <MemoryRouter initialEntries={['/lazy']}>
            <RouterCoreProvider router={router}>
              <PageContent
                prefixCls="test-layout"
                onPageError={onPageError}
              />
            </RouterCoreProvider>
          </MemoryRouter>
        </PageProgressProvider>
      </ZbyIntlProvider>,
    )
    await flushMicrotasks()
    act(() => vi.advanceTimersByTime(150))
    expect(NProgress.start).toHaveBeenCalledOnce()

    await act(async () => {
      rejectModule(error)
      await Promise.resolve()
    })
    await flushMicrotasks()

    expect(onPageError).toHaveBeenCalledOnce()
    expect(NProgress.done).toHaveBeenCalledOnce()
    consoleError.mockRestore()
  })
})

function createPageModule(testId: string, content: string): ProLayoutLazyPageModule {
  return {
    default: () => <div data-testid={testId}>{content}</div>,
  }
}

function createPageRouter(path: string, element: ProLayoutRoute['element']) {
  return createRouterCore<ProLayoutRoute>({
    routes: [{ path, title: path, element }],
    storageAdapter: false,
  })
}

function renderRecoverablePage(
  router: ReturnType<typeof createPageRouter>,
  pageLoading?: ProLayoutPageLoading,
) {
  return (
    <ZbyIntlProvider
      locale="zh-CN"
      fallbackLocale="zh-CN"
      resources={zbyProIntlResources}
    >
      <PageProgressProvider>
        <MemoryRouter initialEntries={[router.getState().currentPathname]}>
          <RouterCoreProvider router={router}>
            <PageContent
              prefixCls="test-layout"
              pageLoading={pageLoading}
            />
          </RouterCoreProvider>
        </MemoryRouter>
      </PageProgressProvider>
    </ZbyIntlProvider>
  )
}

function OtherPage() {
  return <div data-testid="other-page">Other page</div>
}

async function flushMicrotasks() {
  await act(async () => {
    for (let index = 0; index < 5; index += 1)
      await Promise.resolve()
  })
}

function preventExpectedWindowError(event: ErrorEvent) {
  event.preventDefault()
}

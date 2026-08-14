// @vitest-environment jsdom

import { createRouterCore } from '@zby/router-core'
import { RouterCoreProvider } from '@zby/router-core/react'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createLazyRouteComponent } from '../createLazyRouteComponent'
import PageContent from '../page/PageContent'
import type { ProLayoutLazyRouteModule } from '../createLazyRouteComponent'
import type { ProLayoutRoute } from '../types'

afterEach(cleanup)

describe('createLazyRouteComponent', () => {
  it('reuses one module request across preload and React rendering', async () => {
    const module = createPageModule('lazy-page', 'Lazy page')
    let resolveModule!: (value: ProLayoutLazyRouteModule) => void
    const loader = vi.fn(
      () => new Promise<ProLayoutLazyRouteModule>((resolve) => {
        resolveModule = resolve
      }),
    )
    const LazyPage = createLazyRouteComponent(loader)

    const firstPreload = LazyPage.preload()
    const secondPreload = LazyPage.preload()
    await Promise.resolve()
    expect(loader).toHaveBeenCalledOnce()

    resolveModule(module)
    await Promise.all([firstPreload, secondPreload])
    const router = createPageRouter('/lazy', LazyPage)
    router.syncLocation({ pathname: '/lazy', search: '', hash: '' })

    render(
      <RouterCoreProvider router={router}>
        <PageContent prefixCls="test-layout" />
      </RouterCoreProvider>,
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
    const LazyPage = createLazyRouteComponent(loader)

    await expect(LazyPage.preload()).rejects.toBe(error)
    expect(loader).toHaveBeenCalledOnce()

    const router = createPageRouter('/retry', LazyPage)
    router.syncLocation({ pathname: '/retry', search: '', hash: '' })
    render(
      <RouterCoreProvider router={router}>
        <PageContent prefixCls="test-layout" />
      </RouterCoreProvider>,
    )

    expect((await screen.findByTestId('retry-page')).textContent).toBe('Retry page')
    expect(loader).toHaveBeenCalledTimes(2)
  })

  it('uses the configured Suspense fallback and retains a loaded page across navigation', async () => {
    const module = createPageModule('retained-page', 'Retained page')
    let resolveModule!: (value: ProLayoutLazyRouteModule) => void
    const loader = vi.fn(
      () => new Promise<ProLayoutLazyRouteModule>((resolve) => {
        resolveModule = resolve
      }),
    )
    const LazyPage = createLazyRouteComponent(loader)
    const routes: ProLayoutRoute[] = [
      { path: '/lazy', title: 'Lazy', element: LazyPage },
      { path: '/other', title: 'Other', element: OtherPage },
    ]
    const router = createRouterCore({ routes, storageAdapter: false, keepAlive: true })
    router.syncLocation({ pathname: '/lazy', search: '', hash: '' })
    const { container } = render(
      <RouterCoreProvider router={router}>
        <PageContent
          prefixCls="test-layout"
          pageLoading={{
            render: ({ pathname }) => (
              <div data-testid="custom-loading">Loading {pathname}</div>
            ),
          }}
        />
      </RouterCoreProvider>,
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

  it('renders no Suspense placeholder when pageLoading is false', () => {
    const LazyPage = createLazyRouteComponent(
      () => new Promise<ProLayoutLazyRouteModule>(() => undefined),
    )
    const router = createPageRouter('/lazy', LazyPage)
    router.syncLocation({ pathname: '/lazy', search: '', hash: '' })
    const { container } = render(
      <RouterCoreProvider router={router}>
        <PageContent prefixCls="test-layout" pageLoading={false} />
      </RouterCoreProvider>,
    )

    expect(container.querySelector('.test-layout-page-loading')).toBeNull()
  })
})

function createPageModule(testId: string, content: string): ProLayoutLazyRouteModule {
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

function OtherPage() {
  return <div data-testid="other-page">Other page</div>
}

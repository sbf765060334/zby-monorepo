// @vitest-environment jsdom

import 'fake-indexeddb/auto'

import { ZbyIntlProvider } from '@zby/intl'
import { createRouterCore } from '@zby/router-core'
import { ConfigProvider, theme as antdTheme } from 'antd'
import { cleanup, render as testingLibraryRender, screen, waitFor, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  ReactRouterProLayout,
  useProLayoutMetrics,
} from '../index'
import { zbyProLocales } from '../../../locales'
import type { ProLayoutRoute } from '../types'

type LayoutBox = {
  header: { width: number; height: number }
  sider: { width: number; height: number }
  breadcrumb: { width: number; height: number }
}

let layoutBox: LayoutBox
const resizeObservers = new Set<ResizeObserverMock>()
const OriginalResizeObserver = globalThis.ResizeObserver
const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect

class ResizeObserverMock {
  private readonly elements = new Set<Element>()

  constructor(private readonly callback: ResizeObserverCallback) {
    resizeObservers.add(this)
  }

  observe(element: Element) {
    this.elements.add(element)
  }

  unobserve(element: Element) {
    this.elements.delete(element)
  }

  disconnect() {
    resizeObservers.delete(this)
    this.elements.clear()
  }

  trigger() {
    this.callback([], this as unknown as ResizeObserver)
  }

  observesProLayoutChrome() {
    return Array.from(this.elements).some((element) => {
      if (!(element instanceof HTMLElement)) return false

      return (
        element.classList.contains('zby-pro-layout-header') ||
        element.classList.contains('zby-pro-layout-sider') ||
        element.classList.contains('zby-pro-layout-breadcrumb')
      )
    })
  }
}

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverMock)
})

beforeEach(() => {
  layoutBox = {
    header: { width: 1200, height: 38 },
    sider: { width: 68, height: 800 },
    breadcrumb: { width: 1132, height: 32 },
  }

  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    if (this.classList.contains('zby-pro-layout-header'))
      return createRect(layoutBox.header)
    if (this.classList.contains('zby-pro-layout-sider'))
      return createRect(layoutBox.sider)
    if (this.classList.contains('zby-pro-layout-breadcrumb'))
      return createRect(layoutBox.breadcrumb)

    return originalGetBoundingClientRect.call(this)
  })
})

afterEach(() => {
  cleanup()
  resizeObservers.clear()
  vi.restoreAllMocks()
})

afterAll(() => {
  vi.stubGlobal('ResizeObserver', OriginalResizeObserver)
})

function createRect(size: { width: number; height: number }): DOMRect {
  return {
    bottom: size.height,
    height: size.height,
    left: 0,
    right: size.width,
    top: 0,
    width: size.width,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect
}

function triggerResize() {
  resizeObservers.forEach((observer) => {
    if (observer.observesProLayoutChrome())
      observer.trigger()
  })
}

function MetricsProbe() {
  const metrics = useProLayoutMetrics()

  return (
    <output data-testid="layout-metrics">
      {`${metrics.header.width},${metrics.header.height}|${metrics.sider.width},${metrics.sider.height}|${metrics.breadcrumb.width},${metrics.breadcrumb.height}`}
    </output>
  )
}

function Page() {
  return <div data-testid="metrics-page" />
}

function MetricsPage() {
  return <MetricsProbe />
}

function createMetricsRouter() {
  const routes: ProLayoutRoute[] = [
    { path: '/visible', title: 'Visible', element: Page },
    {
      path: '/hidden',
      title: 'Hidden',
      showBreadcrumb: false,
      element: Page,
    },
  ]

  return createRouterCore<ProLayoutRoute>({
    routes,
    defaultRedirectPath: '/visible',
    storageAdapter: false,
  })
}

function createNoBarRouter() {
  const routes: ProLayoutRoute[] = [
    { path: '/visible', title: 'Visible', element: MetricsPage },
  ]

  return createRouterCore<ProLayoutRoute>({
    routes,
    defaultRedirectPath: '/visible',
    storageAdapter: false,
  })
}

function renderLayout(router: ReturnType<typeof createMetricsRouter>, compact = false) {
  return testingLibraryRender(
    <ZbyIntlProvider locale="zh-CN" fallbackLocale="zh-CN" resources={zbyProLocales}>
      <ConfigProvider
        theme={{
          algorithm: compact ? antdTheme.compactAlgorithm : antdTheme.defaultAlgorithm,
        }}
      >
        <MemoryRouter initialEntries={['/visible']}>
          <ReactRouterProLayout
            router={router}
            title="Metrics"
            header={{ extra: <MetricsProbe /> }}
          />
        </MemoryRouter>
      </ConfigProvider>
    </ZbyIntlProvider>,
  )
}

function renderNoBarLayout(router: ReturnType<typeof createNoBarRouter>) {
  return testingLibraryRender(
    <ZbyIntlProvider locale="zh-CN" fallbackLocale="zh-CN" resources={zbyProLocales}>
      <MemoryRouter initialEntries={['/visible']}>
        <ReactRouterProLayout router={router} title="Metrics" noBar />
      </MemoryRouter>
    </ZbyIntlProvider>,
  )
}

function expectMetricText(value: string) {
  expect(screen.getByTestId('layout-metrics').textContent).toBe(value)
}

describe('ProLayout metrics hooks', () => {
  it('exposes measured header, sider and breadcrumb dimensions', async () => {
    const router = createMetricsRouter()
    renderLayout(router)

    await screen.findByTestId('layout-metrics')
    expectMetricText('1200,38|68,800|1132,32')

    layoutBox.header.width = 1024
    layoutBox.sider.width = 60
    layoutBox.breadcrumb.height = 28
    act(triggerResize)

    await waitFor(() => {
      expectMetricText('1024,38|60,800|1132,28')
    })
  })

  it('re-measures density changes and removes the hidden leaf breadcrumb', async () => {
    const router = createMetricsRouter()
    const view = renderLayout(router)

    await screen.findByTestId('layout-metrics')
    layoutBox.header.width = 1024
    layoutBox.header.height = 33
    layoutBox.sider.width = 60
    layoutBox.breadcrumb.height = 28
    view.rerender(
      <ZbyIntlProvider locale="zh-CN" fallbackLocale="zh-CN" resources={zbyProLocales}>
        <ConfigProvider theme={{ algorithm: antdTheme.compactAlgorithm }}>
          <MemoryRouter initialEntries={['/visible']}>
            <ReactRouterProLayout
              router={router}
              title="Metrics"
              header={{ extra: <MetricsProbe /> }}
            />
          </MemoryRouter>
        </ConfigProvider>
      </ZbyIntlProvider>,
    )

    await waitFor(() => {
      expectMetricText('1024,33|60,800|1132,28')
    })

    act(() => router.jumpTo('/hidden'))
    await waitFor(() => {
      expectMetricText('1024,33|60,800|0,0')
    })
  })

  it('reports zero header and sider dimensions when noBar is enabled', async () => {
    const router = createNoBarRouter()
    renderNoBarLayout(router)

    await screen.findByTestId('layout-metrics')
    expectMetricText('0,0|0,0|1132,32')
  })
})

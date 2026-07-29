// @vitest-environment jsdom

import 'fake-indexeddb/auto'

import { ZbyIntlProvider } from '@zby/intl'
import { createRouterCore } from '@zby/router-core'
import { ConfigProvider, theme as antdTheme } from 'antd'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import {
  ReactRouterProLayout,
  useProLayoutBreadcrumbHeight,
  useProLayoutContext,
  useProLayoutHeaderHeight,
  useProLayoutMetrics,
  useProLayoutSiderWidth,
} from '../index'
import { zbyProLocales } from '../../../locales'
import type { ReactElement } from 'react'
import { ProLayoutProvider } from '../metrics/ProLayoutMetricsContext'
import type { ProLayoutContextValue } from '../metrics'
import type { ProLayoutRoute } from '../types'

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  // Ant Design Tabs uses ResizeObserver internally; ProLayout metrics do not.
  vi.stubGlobal('ResizeObserver', ResizeObserverMock)
})

afterEach(cleanup)

afterAll(() => {
  vi.unstubAllGlobals()
})

function MetricsProbe() {
  const metrics = useProLayoutMetrics()
  const headerHeight = useProLayoutHeaderHeight()
  const breadcrumbHeight = useProLayoutBreadcrumbHeight()
  const siderWidth = useProLayoutSiderWidth()
  const visibility = useProLayoutContext((state) => `${state.noBar},${state.showBreadcrumb}`)

  return (
    <output data-testid="layout-metrics">
      {`${metrics.headerHeight},${metrics.breadcrumbHeight},${metrics.siderWidth}|${headerHeight},${breadcrumbHeight},${siderWidth}|${visibility}`}
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
      path: '/other',
      title: 'Other',
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
  const renderNode = (nextCompact: boolean) => (
    <ZbyIntlProvider locale="zh-CN" fallbackLocale="zh-CN" resources={zbyProLocales}>
      <ConfigProvider
        theme={{
          algorithm: nextCompact ? antdTheme.compactAlgorithm : antdTheme.defaultAlgorithm,
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
    </ZbyIntlProvider>
  )
  const view = render(renderNode(compact))

  return {
    ...view,
    rerenderDensity: (nextCompact: boolean) => view.rerender(renderNode(nextCompact)),
  }
}

function renderNoBarLayout(router: ReturnType<typeof createNoBarRouter>) {
  return render(
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

describe('ProLayout context metrics', () => {
  it('exposes default and compact token dimensions', async () => {
    const router = createMetricsRouter()
    const view = renderLayout(router)

    expectMetricText('38,32,68|38,32,68|false,true')

    view.rerenderDensity(true)

    await waitFor(() => {
      expectMetricText('33,28,60|33,28,60|false,true')
    })
  })

  it('keeps token dimensions and the global breadcrumb switch across navigation', async () => {
    const router = createMetricsRouter()
    renderLayout(router)

    act(() => router.jumpTo('/other'))

    await waitFor(() => {
      expectMetricText('38,32,68|38,32,68|false,true')
    })

    cleanup()
    renderNoBarLayout(createNoBarRouter())
    expectMetricText('38,32,68|38,32,68|true,true')
  })

  it('does not notify a selector when another context field changes', async () => {
    let renderCount = 0
    const probe = <SiderWidthProbe onRender={() => renderCount += 1} />
    const initialValue: ProLayoutContextValue = {
      breadcrumbHeight: 32,
      headerHeight: 38,
      noBar: false,
      showBreadcrumb: true,
      siderWidth: 68,
    }
    const view = renderProvider(initialValue, probe)

    expect(screen.getByTestId('sider-width').textContent).toBe('68')
    expect(renderCount).toBe(1)

    view.rerenderProvider({ ...initialValue, siderWidth: 60 })

    await waitFor(() => {
      expect(screen.getByTestId('sider-width').textContent).toBe('60')
      expect(renderCount).toBe(2)
    })

    view.rerenderProvider({ ...initialValue, showBreadcrumb: false, siderWidth: 60 })

    await waitFor(() => {
      expect(renderCount).toBe(2)
    })
  })
})

function SiderWidthProbe(props: { onRender: () => void }) {
  props.onRender()
  const siderWidth = useProLayoutContext((state) => state.siderWidth)

  return <output data-testid="sider-width">{siderWidth}</output>
}

function renderProvider(value: ProLayoutContextValue, children: ReactElement) {
  const view = render(<ProLayoutProvider value={value}>{children}</ProLayoutProvider>)

  return {
    ...view,
    rerenderProvider: (nextValue: ProLayoutContextValue) =>
      view.rerender(<ProLayoutProvider value={nextValue}>{children}</ProLayoutProvider>),
  }
}

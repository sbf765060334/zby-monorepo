// @vitest-environment jsdom

import { createRouterCore } from '@zby/router-core'
import { useRouterPageSelector } from '@zby/router-core/react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import ReactRouterProLayout from '../ReactRouterProLayout'
import type { ProLayoutRoute } from '../types'

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })

  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(window, 'ResizeObserver', { configurable: true, value: ResizeObserverMock })
  Object.defineProperty(globalThis, 'ResizeObserver', { configurable: true, value: ResizeObserverMock })
})

afterEach(() => cleanup())

describe('ReactRouterProLayout', () => {
  it('装配 router-core 并渲染全局页签、面包屑和页面 Context', async () => {
    const router = createTestRouter()

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ReactRouterProLayout router={router} title="数字化平台" />
      </MemoryRouter>,
    )

    expect((await screen.findByTestId('dashboard-page')).textContent).toContain('active')
    expect(screen.getByText('当前位置：')).toBeTruthy()
    expect(screen.getAllByText('工作台').length).toBeGreaterThan(0)
    await waitFor(() => expect(document.title).toBe('工作台 - 数字化平台'))
  })

  it('通过图标栏和 Drawer 导航，并复用 KeepAlive 页面实例', async () => {
    const router = createTestRouter()

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ReactRouterProLayout router={router} title="数字化平台" />
      </MemoryRouter>,
    )

    await screen.findByTestId('dashboard-page')
    fireEvent.click(screen.getByRole('button', { name: /订单管理/ }))
    fireEvent.click(await screen.findByRole('button', { name: /订单列表/ }))

    expect((await screen.findByTestId('orders-page')).textContent).toContain('active')
    expect(screen.getByTestId('dashboard-page').textContent).toContain('inactive')

    act(() => router.jumpTo('/dashboard'))
    await waitFor(() => expect(screen.getByTestId('dashboard-page').textContent).toContain('active'))
  })

  it('noBar 模式不渲染图标栏和全局页签', async () => {
    const router = createTestRouter()
    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ReactRouterProLayout router={router} title="数字化平台" noBar />
      </MemoryRouter>,
    )

    await screen.findByTestId('dashboard-page')
    expect(container.querySelector('.zby-pro-layout-sider')).toBeNull()
    expect(container.querySelector('.zby-pro-layout-header')).toBeNull()
  })
})

function DashboardPage() {
  const active = useRouterPageSelector((state) => state.active)
  return <div data-testid="dashboard-page">{active ? 'active' : 'inactive'}</div>
}

function OrdersPage() {
  const active = useRouterPageSelector((state) => state.active)
  return <div data-testid="orders-page">{active ? 'active' : 'inactive'}</div>
}

const routes: ProLayoutRoute[] = [
  {
    path: '/dashboard',
    title: '工作台',
    element: DashboardPage,
  },
  {
    path: '/orders',
    title: '订单管理',
    routes: [
      {
        path: '/orders/list',
        title: '订单列表',
        element: OrdersPage,
      },
    ],
  },
]

function createTestRouter() {
  return createRouterCore({
    routes,
    defaultRedirectPath: '/dashboard',
    storageAdapter: false,
    keepAlive: true,
  })
}

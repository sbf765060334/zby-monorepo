// @vitest-environment jsdom

import 'fake-indexeddb/auto'

import { createRouterCore } from '@zby/router-core'
import { useRouterPageSelector } from '@zby/router-core/react'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import * as favoriteStorage from '../favorites/storage'
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

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

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
    const orderHelpLink = await screen.findByRole('link', { name: '订单帮助' })
    expect(orderHelpLink.getAttribute('href')).toBe('/orders/help')
    expect(orderHelpLink.getAttribute('target')).toBe('_blank')
    fireEvent.click(await screen.findByRole('button', { name: '订单列表' }))

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

  it('为应用内新窗口菜单和可点击面包屑生成 basename-aware 原生链接', async () => {
    const router = createTestRouter()
    const jumpTo = vi.spyOn(router, 'jumpTo')

    render(
      <MemoryRouter
        basename="/platform"
        initialEntries={['/platform/reports/detail']}
      >
        <ReactRouterProLayout router={router} title="数字化平台" />
      </MemoryRouter>,
    )

    await screen.findByTestId('report-detail-page')
    const internalBlankLink = screen.getByRole('link', { name: /内部帮助/ })
    const externalBlankLink = screen.getByRole('link', { name: /外部文档/ })
    const breadcrumbLink = screen.getByRole('link', { name: '报表中心' })

    expect(internalBlankLink.getAttribute('href')).toBe('/platform/help')
    expect(internalBlankLink.getAttribute('target')).toBe('_blank')
    expect(internalBlankLink.getAttribute('rel')).toBe('noopener noreferrer')
    expect(externalBlankLink.getAttribute('href')).toBe('https://docs.example.com/guide')
    expect(breadcrumbLink.getAttribute('href')).toBe('/platform/reports')

    // jsdom 不实现跨文档导航；测试只阻止环境默认动作，不干预 React 的修饰键分支。
    breadcrumbLink.addEventListener('click', (event) => event.preventDefault(), { once: true })
    fireEvent.click(breadcrumbLink, { ctrlKey: true })
    expect(jumpTo).not.toHaveBeenCalled()

    fireEvent.click(breadcrumbLink)
    expect(jumpTo).toHaveBeenCalledWith('/reports')
  })

  it('收藏 Drawer 菜单且不触发导航，并在重新挂载后恢复和取消收藏', async () => {
    const storageKey = 'pro-layout-favorite-persistence'
    const firstRouter = createTestRouter(storageKey)
    const jumpTo = vi.spyOn(firstRouter, 'jumpTo')
    const firstRender = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ReactRouterProLayout router={firstRouter} title="数字化平台" />
      </MemoryRouter>,
    )

    await screen.findByTestId('dashboard-page')
    fireEvent.click(screen.getByRole('button', { name: /订单管理/ }))
    fireEvent.click(await screen.findByRole('button', { name: '收藏：订单列表' }))

    expect(jumpTo).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: '取消收藏：订单列表' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '收藏菜单' }))
    const collectionHeader = await screen.findByText('收藏的菜单（1）')
    const collectionPanel = collectionHeader.closest('.zby-pro-layout-collection-panel')
    expect(collectionPanel).toBeTruthy()
    fireEvent.click(within(collectionPanel as HTMLElement).getByRole('button', { name: '订单列表' }))
    expect(jumpTo).toHaveBeenCalledWith('/orders/list')
    await waitFor(async () => {
      expect(await favoriteStorage.loadFavoriteMenuPaths(storageKey)).toEqual(['/orders/list'])
    })

    firstRender.unmount()
    const secondRouter = createTestRouter(storageKey)
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ReactRouterProLayout router={secondRouter} title="数字化平台" />
      </MemoryRouter>,
    )

    await screen.findByTestId('dashboard-page')
    fireEvent.click(screen.getByRole('button', { name: '收藏菜单' }))
    expect(await screen.findByText('收藏的菜单（1）')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '取消收藏：订单列表' }))

    await waitFor(async () => {
      expect(await favoriteStorage.loadFavoriteMenuPaths(storageKey)).toEqual([])
    })
  })

  it('hydration 期间按用户选择的最终收藏状态合并，而不是重放裸 toggle', async () => {
    let resolveLoad!: (paths: string[]) => void
    const loadPromise = new Promise<string[]>((resolve) => {
      resolveLoad = resolve
    })
    vi.spyOn(favoriteStorage, 'loadFavoriteMenuPaths').mockReturnValueOnce(loadPromise)
    const router = createTestRouter('pro-layout-favorite-hydration')

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ReactRouterProLayout router={router} title="数字化平台" />
      </MemoryRouter>,
    )

    await screen.findByTestId('dashboard-page')
    fireEvent.click(screen.getByRole('button', { name: /订单管理/ }))
    fireEvent.click(await screen.findByRole('button', { name: '收藏：订单列表' }))
    expect(screen.getByRole('button', { name: '取消收藏：订单列表' })).toBeTruthy()

    await act(async () => {
      // IndexedDB 原本也已收藏该路径；用户看到未收藏状态后点击的意图仍然应当是“收藏”。
      resolveLoad(['/orders/list'])
      await loadPromise
    })

    expect(screen.getByRole('button', { name: '取消收藏：订单列表' })).toBeTruthy()
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

function ReportsPage() {
  return <div data-testid="reports-page">reports</div>
}

function ReportDetailPage() {
  return <div data-testid="report-detail-page">report-detail</div>
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
      {
        path: '/orders/help',
        title: '订单帮助',
        _blank: true,
      },
    ],
  },
  {
    path: '/reports',
    title: '报表中心',
    element: ReportsPage,
    ignore: true,
    routes: [
      {
        path: '/reports/detail',
        title: '报表详情',
        element: ReportDetailPage,
      },
    ],
  },
  {
    path: '/help',
    title: '内部帮助',
    _blank: true,
  },
  {
    path: 'https://docs.example.com/guide',
    title: '外部文档',
    _blank: true,
  },
]

let routerSequence = 0

function createTestRouter(storageKey = `pro-layout-test-${routerSequence += 1}`) {
  return createRouterCore({
    routes,
    defaultRedirectPath: '/dashboard',
    storageAdapter: false,
    storageKey,
    keepAlive: true,
  })
}

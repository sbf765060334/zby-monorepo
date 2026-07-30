// @vitest-environment jsdom

import 'fake-indexeddb/auto'

import { ZbyIntlProvider } from '@zby/intl'
import { createIndexedDBRouterStorageAdapter, createRouterCore } from '@zby/router-core'
import { RouterCoreProvider, useRouterPageSelector } from '@zby/router-core/react'
import { ConfigProvider, theme as antdTheme } from 'antd'
import {
  act,
  cleanup,
  fireEvent,
  render as testingLibraryRender,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { zbyProLocales } from '../../../locales'
import ReactRouterProLayout from '../ReactRouterProLayout'
import PageContent from '../page/PageContent'
import { ProRouteSearch } from '../search'
import type { ReactNode } from 'react'
import type { RouterStorageAdapter, RouterStorageState } from '@zby/router-core'
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

/** 测试与业务入口保持一致，默认使用中文并注册 @zby/pro 自带语言包。 */
function render(node: ReactNode, locale = 'zh-CN') {
  return testingLibraryRender(
    <ZbyIntlProvider locale={locale} fallbackLocale="zh-CN" resources={zbyProLocales}>
      {node}
    </ZbyIntlProvider>,
  )
}

describe('ReactRouterProLayout', () => {
  it('只在宿主地址落定后渲染 403/404', () => {
    const router = createTestRouter()

    render(
      <RouterCoreProvider router={router}>
        <PageContent prefixCls="zby-pro-layout" />
      </RouterCoreProvider>,
    )

    expect(router.getState().navigationStatus).toBe('bootstrapping')
    expect(screen.queryByText('403')).toBeNull()
    expect(screen.queryByText('404')).toBeNull()

    act(() => {
      router.syncLocation({ pathname: '/missing', search: '', hash: '' })
    })

    expect(router.getState().navigationStatus).toBe('settled')
    expect(screen.getByText('404')).toBeTruthy()
  })

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
    expect(screen.queryByRole('button', { name: '搜索页面（Ctrl+K）' })).toBeNull()
    await waitFor(() => expect(document.title).toBe('工作台 - 数字化平台'))
  })

  it('搜索权限内页面，展示并高亮完整路由路径，且保留最近搜索', async () => {
    const storageKey = 'pro-layout-route-search'
    const recentStorageKey = `zby-pro-layout:route-search:${storageKey}`
    window.localStorage.removeItem(recentStorageKey)
    const innerHeight = vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(1000)
    const searchRoutes: ProLayoutRoute[] = [
      {
        path: '/dashboard',
        title: '工作台',
        element: DashboardPage,
      },
      {
        path: '/business',
        title: '业务中心',
        routes: [
          {
            path: '/business/orders',
            title: '订单管理',
            routes: [
              {
                path: '/business/orders/list',
                title: '订单列表',
                element: OrdersPage,
              },
            ],
          },
          {
            path: '/business/restricted',
            title: '权限页面',
            auth: 'restricted',
            element: ReportsPage,
          },
          {
            path: '/business/hidden',
            title: '隐藏页面',
            ignore: true,
            element: ReportsPage,
          },
          {
            path: '/business/detail/:id',
            title: '动态详情',
            element: ReportDetailPage,
          },
          {
            path: '/business/help',
            title: '外部帮助',
            _blank: true,
          },
        ],
      },
    ]
    const createSearchRouter = () => createRouterCore({
      routes: searchRoutes,
      defaultRedirectPath: '/dashboard',
      hasAuth: () => false,
      storageAdapter: false,
      storageKey,
    })
    const firstRender = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ReactRouterProLayout
          router={createSearchRouter()}
          title="数字化平台"
          header={{ extra: <ProRouteSearch /> }}
        />
      </MemoryRouter>,
    )

    await screen.findByTestId('dashboard-page')
    fireEvent.click(screen.getByRole('button', { name: '搜索页面（Ctrl+K）' }))
    let dialog = await screen.findByRole('dialog')
    const searchBody = dialog.querySelector('.zby-pro-layout-search-body') as HTMLElement
    const searchResults = dialog.querySelector(
      '.zby-pro-layout-search-results',
    ) as HTMLElement
    await waitFor(() => expect(searchBody.style.maxHeight).toBe('692px'))
    expect(searchBody.style.height).toBe('')
    expect(searchBody.style.overflowY).toBe('hidden')
    expect(getComputedStyle(searchBody).display).toBe('flex')
    expect(getComputedStyle(searchResults).overflowY).toBe('auto')

    innerHeight.mockReturnValue(600)
    fireEvent(window, new Event('resize'))
    await waitFor(() => expect(searchBody.style.maxHeight).toBe('372px'))
    expect(within(dialog).getByText('最近搜索')).toBeTruthy()
    expect(within(dialog).getByText('暂无最近搜索')).toBeTruthy()

    const input = within(dialog).getByPlaceholderText('搜索页面名称或路径')
    fireEvent.change(input, { target: { value: '订单' } })
    expect(within(dialog).getByText('搜索结果')).toBeTruthy()
    const fullTitlePath = dialog.querySelector(
      '.zby-pro-layout-search-result-title',
    ) as HTMLElement
    expect(fullTitlePath.textContent).toBe('业务中心 / 订单管理 / 订单列表')
    expect(within(dialog).getByText('/business/orders/list')).toBeTruthy()
    expect(fullTitlePath.querySelectorAll('mark')).toHaveLength(2)
    expect(Array.from(fullTitlePath.querySelectorAll('mark')).map((item) => item.textContent))
      .toEqual(['订单', '订单'])

    fireEvent.change(input, { target: { value: '权限页面' } })
    expect(within(dialog).getByText('未找到匹配页面')).toBeTruthy()
    fireEvent.change(input, { target: { value: '动态详情' } })
    expect(within(dialog).getByText('未找到匹配页面')).toBeTruthy()

    fireEvent.change(input, { target: { value: '/business/orders' } })
    const pathResult = dialog.querySelector(
      '.zby-pro-layout-search-result-path',
    ) as HTMLElement
    expect(pathResult.textContent).toBe('/business/orders/list')
    expect(pathResult.querySelector('mark')?.textContent).toBe('/business/orders')
    fireEvent.click(pathResult.closest('button') as HTMLElement)
    expect((await screen.findByTestId('orders-page')).textContent).toContain('active')
    expect(JSON.parse(window.localStorage.getItem(recentStorageKey) || '[]'))
      .toEqual(['/business/orders/list'])

    firstRender.unmount()
    window.localStorage.setItem(
      recentStorageKey,
      JSON.stringify(['/business/orders/list', '/dashboard']),
    )
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ReactRouterProLayout
          router={createSearchRouter()}
          title="数字化平台"
          header={{ extra: <ProRouteSearch /> }}
        />
      </MemoryRouter>,
    )
    await screen.findByTestId('dashboard-page')
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true })
    dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('最近搜索')).toBeTruthy()
    expect(within(dialog).getByText('业务中心 / 订单管理 / 订单列表')).toBeTruthy()
    expect(within(dialog).getByText('工作台')).toBeTruthy()
    fireEvent.click(within(dialog).getByRole('button', {
      name: '删除最近搜索：业务中心 / 订单管理 / 订单列表',
    }))
    expect(within(dialog).queryByText('业务中心 / 订单管理 / 订单列表')).toBeNull()
    expect(within(dialog).getByText('工作台')).toBeTruthy()
    expect(JSON.parse(window.localStorage.getItem(recentStorageKey) || '[]'))
      .toEqual(['/dashboard'])

    fireEvent.click(within(dialog).getByRole('button', { name: '清空全部' }))
    expect(within(dialog).getByText('暂无最近搜索')).toBeTruthy()
    expect(JSON.parse(window.localStorage.getItem(recentStorageKey) || '[]')).toEqual([])
  })

  it('切换路由时始终由 ProLayout 总开关控制面包屑', async () => {
    const breadcrumbRoutes: ProLayoutRoute[] = [
      {
        path: '/breadcrumb',
        title: '面包屑父级',
        routes: [
          {
            path: '/breadcrumb/default',
            title: '默认显示页',
            element: ReportsPage,
          },
          {
            path: '/breadcrumb/another',
            title: '另一个页面',
            element: ReportDetailPage,
          },
        ],
      },
    ]
    const router = createRouterCore({
      routes: breadcrumbRoutes,
      defaultRedirectPath: '/breadcrumb/default',
      storageAdapter: false,
    })

    render(
      <MemoryRouter initialEntries={['/breadcrumb/default']}>
        <ReactRouterProLayout router={router} title="数字化平台" />
      </MemoryRouter>,
    )

    await screen.findByTestId('reports-page')
    expect(screen.getByText('当前位置：')).toBeTruthy()

    act(() => router.jumpTo('/breadcrumb/another'))
    await screen.findByTestId('report-detail-page')
    expect(screen.getByText('当前位置：')).toBeTruthy()
  })

  it('showBreadcrumb 总开关关闭时隐藏全局面包屑', async () => {
    const breadcrumbRoutes: ProLayoutRoute[] = [
      {
        path: '/breadcrumb/visible',
        title: '显示面包屑页',
        element: ReportsPage,
      },
    ]
    const router = createRouterCore({
      routes: breadcrumbRoutes,
      defaultRedirectPath: '/breadcrumb/visible',
      storageAdapter: false,
    })

    render(
      <MemoryRouter initialEntries={['/breadcrumb/visible']}>
        <ReactRouterProLayout
          router={router}
          title="数字化平台"
          showBreadcrumb={false}
        />
      </MemoryRouter>,
    )

    await screen.findByTestId('reports-page')
    expect(screen.queryByText('当前位置：')).toBeNull()
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

  it('按 Shuzhi 语义切换 Drawer，并渲染分栏菜单和页签分隔符', async () => {
    const router = createTestRouter()
    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ReactRouterProLayout router={router} title="数字化平台" />
      </MemoryRouter>,
    )

    await screen.findByTestId('dashboard-page')
    const main = container.querySelector('.zby-pro-layout-main') as HTMLElement
    const header = container.querySelector('.zby-pro-layout-header') as HTMLElement
    const menuContainer = container.querySelector('.zby-pro-layout-sider-menu-container')
    expect(main.style.paddingBlockStart).toBe('38px')
    expect(header.style.height).toBe('38px')
    expect(header.style.paddingInlineStart).toBe('68px')
    expect(menuContainer?.querySelector('.zby-pro-layout-sider-menu')).toBeTruthy()
    const siderMenuScroll = menuContainer?.querySelector(
      '.zby-pro-layout-sider-menu-scroll',
    ) as HTMLElement
    expect(siderMenuScroll.tagName).toBe('DIV')
    expect(siderMenuScroll.querySelector('.zby-pro-layout-sider-menu')).toBeTruthy()
    expect(siderMenuScroll.querySelector('[data-zby-scroll-area-viewport]')).toBeNull()
    const orderMenu = screen.getByRole('button', { name: /订单管理/ })
    fireEvent.click(orderMenu)

    const drawer = await screen.findByRole('dialog')
    expect(drawer.querySelector('.zby-pro-layout-menu-columns')).toBeTruthy()
    expect(drawer.querySelector('.zby-pro-layout-menu-scroll')).toBeNull()
    expect(drawer.querySelector('.zby-pro-layout-menu-entry')).toBeTruthy()
    const drawerBody = drawer.querySelector('.ant-drawer-body') as HTMLElement
    expect(drawerBody.style.overflowX).toBe('hidden')
    const menuGroupInner = drawer.querySelector(
      '.zby-pro-layout-menu-group-inner',
    ) as HTMLElement
    expect(menuGroupInner.style.maxHeight).toBe('')
    expect(drawer.querySelectorAll('[data-zby-scroll-area-viewport]')).toHaveLength(0)
    const drawerRoot = document.querySelector('.zby-pro-layout-menu-drawer.ant-drawer') as HTMLElement
    expect(drawerRoot.style.left).toBe('68px')
    expect(drawerRoot.style.overflow).toBe('hidden')
    expect(drawerRoot.style.zIndex).toBe('999')
    expect(menuContainer?.querySelector('.zby-pro-layout-menu-drawer')).toBeTruthy()
    const drawerWrapper = drawerRoot.querySelector('.ant-drawer-content-wrapper') as HTMLElement
    const openDrawerWidth = drawerWrapper.style.width

    // 再次点击当前一级目录会关闭 Drawer，不会重复创建一层菜单。
    fireEvent.click(orderMenu)
    expect(drawerWrapper.style.width).toBe(openDrawerWidth)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    act(() => router.jumpTo('/orders/list'))
    await screen.findByTestId('orders-page')

    const reportMenu = screen.getByRole('button', { name: /报表菜单/ })
    fireEvent.click(reportMenu)
    expect(await screen.findByRole('button', { name: '报表总览' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '收藏：报表总览' })).toBeTruthy()

    // 关闭动画期间继续保留报表菜单，不能闪回当前页面所属的订单菜单。
    fireEvent.click(reportMenu)
    expect(drawerRoot.textContent).toContain('报表总览')
    expect(drawerRoot.textContent).not.toContain('订单列表')

    act(() => router.jumpTo('/reports'))
    await screen.findByTestId('reports-page')
    const tabNodes = container.querySelectorAll('.zby-pro-layout-tab-node')
    const tabSplits = container.querySelectorAll('.zby-pro-layout-tab-split')
    expect(tabSplits).toHaveLength(tabNodes.length)
    expect(tabSplits[tabSplits.length - 1]?.classList.contains(
      'zby-pro-layout-tab-split-hidden',
    )).toBe(true)
    expect(container.querySelectorAll('.zby-pro-layout-tab-split-hidden')).toHaveLength(2)
    expect(container.querySelectorAll(
      '.zby-pro-layout-tab-split:not(.zby-pro-layout-tab-split-hidden)',
    )).toHaveLength(1)
  })

  it('在默认和紧凑主题间同步 Header、页签和内容顶部占位', async () => {
    const renderLayout = (compact: boolean) => {
      const router = createTestRouter()
      const renderNode = (nextCompact: boolean) => (
        <ConfigProvider
          theme={{
            algorithm: nextCompact
              ? antdTheme.compactAlgorithm
              : antdTheme.defaultAlgorithm,
            cssVar: { prefix: 'zby-pro-layout-test' },
          }}
        >
          <MemoryRouter initialEntries={['/dashboard']}>
            <ReactRouterProLayout router={router} title="数字化平台" />
          </MemoryRouter>
        </ConfigProvider>
      )
      const view = render(renderNode(compact))

      return {
        ...view,
        rerenderDensity: (nextCompact: boolean) => view.rerender(renderNode(nextCompact)),
      }
    }
    const expectLayoutSize = (
      container: HTMLElement,
      headerHeight: string,
      activeNodeHeight: string,
      siderWidth: string,
      siderItemHeight: string,
      siderIconSize: string,
    ) => {
      const main = container.querySelector('.zby-pro-layout-main') as HTMLElement
      const root = container.querySelector('.zby-pro-layout') as HTMLElement
      const header = container.querySelector('.zby-pro-layout-header') as HTMLElement
      const sider = container.querySelector('.zby-pro-layout-sider') as HTMLElement
      const siderItem = container.querySelector('.zby-pro-layout-sider-item') as HTMLElement
      const siderIcon = container.querySelector('.zby-pro-layout-sider-item dt') as HTMLElement
      const tabs = container.querySelector('.zby-pro-layout-tabs') as HTMLElement
      const breadcrumb = container.querySelector('.zby-pro-layout-breadcrumb') as HTMLElement
      const breadcrumbContent = breadcrumb.querySelector('.ant-breadcrumb') as HTMLElement
      const breadcrumbLabel = breadcrumb.querySelector(
        '.zby-pro-layout-breadcrumb-label',
      ) as HTMLElement
      const pageBody = container.querySelector('.zby-pro-layout-page-body') as HTMLElement
      const activeNode = container.querySelector(
        '.zby-pro-layout-tab-node-active',
      ) as HTMLElement
      const siderLabel = container.querySelector(
        '.zby-pro-layout-sider-item dd',
      ) as HTMLElement

      expect(main.style.paddingBlockStart).toBe(headerHeight)
      expect(main.style.paddingInlineStart).toBe(siderWidth)
      expect(header.style.height).toBe(headerHeight)
      expect(header.style.paddingInlineStart).toBe(siderWidth)
      expect(sider.style.width).toBe(siderWidth)
      expect(root.style.getPropertyValue('--zby-pro-layout-header-height')).toBe(
        headerHeight,
      )
      expect(root.style.getPropertyValue('--zby-pro-layout-header-tab-height')).toBe(
        activeNodeHeight,
      )
      expect(root.style.getPropertyValue('--zby-pro-layout-sider-width')).toBe(siderWidth)
      expect(root.style.getPropertyValue('--zby-pro-layout-sider-item-height')).toBe(
        siderItemHeight,
      )
      expect(root.style.getPropertyValue('--zby-pro-layout-sider-icon-size')).toBe(
        siderIconSize,
      )
      expect(getComputedStyle(tabs).maxHeight).toBe(
        'var(--zby-pro-layout-header-height)',
      )
      expect(getComputedStyle(activeNode).height).toBe(
        'var(--zby-pro-layout-header-tab-height)',
      )
      expect(getComputedStyle(siderItem).width).toBe(
        'var(--zby-pro-layout-sider-width)',
      )
      expect(getComputedStyle(siderItem).height).toBe(
        'var(--zby-pro-layout-sider-item-height)',
      )
      expect(getComputedStyle(siderIcon).fontSize).toBe(
        'var(--zby-pro-layout-sider-icon-size)',
      )
      expect(getComputedStyle(siderLabel).fontSize).toBe(getComputedStyle(main).fontSize)
      expect(getComputedStyle(breadcrumb).backgroundColor).toBe(
        getComputedStyle(pageBody).backgroundColor,
      )
      expect(getComputedStyle(breadcrumb).minHeight).toBe(
        'var(--zby-pro-layout-test-control-height)',
      )
      expect(getComputedStyle(breadcrumbContent).fontSize).toBe(
        'var(--zby-pro-layout-test-font-size-sm)',
      )
      expect(getComputedStyle(breadcrumbLabel).fontSize).toBe(
        'var(--zby-pro-layout-test-font-size-sm)',
      )
    }

    const defaultLayout = renderLayout(false)
    await screen.findByTestId('dashboard-page')
    expectLayoutSize(defaultLayout.container, '38px', '34px', '68px', '60px', '24px')

    const orderMenu = screen.getByRole('button', { name: /订单管理/ })
    fireEvent.click(orderMenu)
    await screen.findByRole('dialog')
    const getDrawerRoot = () => document.querySelector(
      '.zby-pro-layout-menu-drawer.ant-drawer',
    ) as HTMLElement
    const getMenuMeasure = () => document.querySelector(
      '.zby-pro-layout-menu-measure',
    ) as HTMLElement
    expect(getDrawerRoot().style.left).toBe('68px')
    expect(getMenuMeasure().style.width).toBe('232px')
    expect(getDrawerRoot().style.getPropertyValue(
      '--zby-pro-layout-menu-indent',
    )).toBe('12px')
    fireEvent.click(orderMenu)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    defaultLayout.rerenderDensity(true)
    await waitFor(() => {
      expectLayoutSize(defaultLayout.container, '33px', '29px', '60px', '52px', '20px')
    })
    fireEvent.click(screen.getByRole('button', { name: /订单管理/ }))
    await screen.findByRole('dialog')
    expect(getDrawerRoot().style.left).toBe('60px')
    expect(getMenuMeasure().style.width).toBe('204px')
    expect(getDrawerRoot().style.getPropertyValue(
      '--zby-pro-layout-menu-indent',
    )).toBe('8px')
    defaultLayout.unmount()

    const compactLayout = renderLayout(true)
    await screen.findByTestId('dashboard-page')
    expectLayoutSize(compactLayout.container, '33px', '29px', '60px', '52px', '20px')

    compactLayout.rerenderDensity(false)
    await waitFor(() => {
      expectLayoutSize(compactLayout.container, '38px', '34px', '68px', '60px', '24px')
    })
  })

  it('保持超高业务组完整，并由整个 Drawer 纵向滚动', async () => {
    const router = createMegaMenuTestRouter()
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ReactRouterProLayout router={router} title="数字化平台" />
      </MemoryRouter>,
    )

    await screen.findByTestId('dashboard-page')
    fireEvent.click(screen.getByRole('button', { name: /超级菜单/ }))

    const drawer = await screen.findByRole('dialog')
    const menuGroups = drawer.querySelectorAll('.zby-pro-layout-menu-group')
    expect(menuGroups).toHaveLength(1)
    expect(menuGroups[0]?.querySelectorAll('.zby-pro-layout-menu')).toHaveLength(22)
    expect(within(drawer).getByText('业务中心')).toBeTruthy()
    expect(within(drawer).getByText('订单处理')).toBeTruthy()
    expect(within(drawer).queryByText('业务中心 · 续')).toBeNull()
    expect(within(drawer).queryByText('订单处理 · 续')).toBeNull()
    expect(within(drawer).queryByText('空分组')).toBeNull()
    expect(within(drawer).getAllByText('履约管理')).toHaveLength(1)
    expect(within(drawer).getAllByRole('button', { name: '订单项 1' })).toHaveLength(1)
    const nestedMenu = within(drawer)
      .getByRole('button', { name: '订单项 1' })
      .closest('.zby-pro-layout-menu') as HTMLElement
    expect(nestedMenu.style.paddingInlineStart).toBe(
      'calc(var(--zby-pro-layout-menu-indent) * 2)',
    )
    const drawerBody = drawer.querySelector('.ant-drawer-body') as HTMLElement
    expect(drawerBody.style.overflowY).toBe('auto')
    expect(drawerBody.style.overflowX).toBe('hidden')
    expect(drawer.querySelectorAll('[data-zby-scroll-area-viewport]')).toHaveLength(0)
  })

  it('短暂划过一级菜单时不切换 Drawer，持续停留后才切换', async () => {
    const router = createTestRouter()
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ReactRouterProLayout router={router} title="数字化平台" />
      </MemoryRouter>,
    )

    await screen.findByTestId('dashboard-page')
    fireEvent.click(screen.getByRole('button', { name: /订单管理/ }))
    const drawer = await screen.findByRole('dialog')
    const reportMenu = screen.getByRole('button', { name: /报表菜单/ })
    expect(within(drawer).getByText('订单列表')).toBeTruthy()

    vi.useFakeTimers()
    try {
      fireEvent.mouseEnter(reportMenu)
      act(() => vi.advanceTimersByTime(199))
      expect(within(drawer).getByText('订单列表')).toBeTruthy()
      expect(within(drawer).queryByText('报表总览')).toBeNull()

      fireEvent.mouseLeave(reportMenu)
      act(() => vi.advanceTimersByTime(1))
      expect(within(drawer).getByText('订单列表')).toBeTruthy()

      fireEvent.mouseEnter(reportMenu)
      act(() => vi.advanceTimersByTime(200))
      expect(within(drawer).getByText('报表总览')).toBeTruthy()
      expect(within(drawer).queryByText('订单列表')).toBeNull()
    } finally {
      vi.useRealTimers()
    }
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

  it('打开外部系统时隔离新窗口的 opener', async () => {
    const router = createTestRouter()
    const openedWindow = { opener: window } as unknown as Window
    const openWindow = vi.spyOn(window, 'open').mockReturnValue(openedWindow)

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ReactRouterProLayout
          router={router}
          title="数字化平台"
          systemList={[{
            systemName: 'external',
            name: '外部系统',
            description: '外部系统',
            logo: '',
            url: 'https://external.example.com',
          }]}
        />
      </MemoryRouter>,
    )

    await screen.findByTestId('dashboard-page')
    fireEvent.mouseEnter(screen.getByRole('button', { name: '切换系统' }))
    fireEvent.click(await screen.findByRole('button', { name: '外部系统' }))

    expect(openWindow).toHaveBeenCalledWith(
      'https://external.example.com',
      '_blank',
      'noopener,noreferrer',
    )
    expect(openedWindow.opener).toBeNull()
  })

  it('透传 semantic 样式，并为页签固定和系统切换提供可访问按钮', async () => {
    const router = createTestRouter()
    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ReactRouterProLayout
          router={router}
          title="数字化平台"
          classNames={{
            breadcrumb: 'custom-breadcrumb',
            content: 'custom-content',
            page: 'custom-page',
          }}
          styles={{ breadcrumb: { backgroundColor: 'rgb(1, 2, 3)' } }}
          systemList={[{
            systemName: 'main',
            name: '主系统',
            description: '切换系统',
            logo: '/logo.svg',
            url: '/dashboard',
            active: true,
          }]}
        />
      </MemoryRouter>,
    )

    await screen.findByTestId('dashboard-page')
    expect(container.querySelector('.custom-content')).toBeTruthy()
    expect(container.querySelector('.custom-page')).toBeTruthy()
    expect((container.querySelector('.custom-breadcrumb') as HTMLElement).style.backgroundColor)
      .toBe('rgb(1, 2, 3)')
    expect(screen.getByRole('button', { name: '固定页签：工作台' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '切换系统' })).toBeTruthy()

    const pinButton = screen.getByRole('button', { name: '固定页签：工作台' })
    expect(pinButton.classList.contains('zby-pro-layout-fixed-icon-unfixed')).toBe(true)
    fireEvent.click(pinButton)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '取消固定页签：工作台' })
        .classList.contains('zby-pro-layout-fixed-icon-active')).toBe(true)
    })
    expect(await screen.findByText('页签固定成功')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '取消固定页签：工作台' }))
    expect(await screen.findByText('已取消页签固定')).toBeTruthy()
  })

  it('固定页签达到上限时显示提示且保持原固定状态', async () => {
    const router = createTestRouter(undefined, 1)
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ReactRouterProLayout router={router} title="数字化平台" />
      </MemoryRouter>,
    )

    await screen.findByTestId('dashboard-page')
    act(() => router.jumpTo('/orders/list'))
    await screen.findByTestId('orders-page')
    fireEvent.click(screen.getByRole('button', { name: '固定页签：订单列表' }))
    expect(await screen.findByText('页签固定成功')).toBeTruthy()

    act(() => router.jumpTo('/dashboard'))
    fireEvent.click(screen.getByRole('button', { name: '固定页签：工作台' }))
    expect(await screen.findByText('最多钉住1个标签，请先取消一个钉住标签')).toBeTruthy()
    expect(router.getState().fixedSet).toEqual(['/orders/list'])
  })

  it('使用 zby-pro 语言包切换 ProLayout 自有文案，路由标题仍由业务提供', async () => {
    const router = createTestRouter()
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ReactRouterProLayout
          router={router}
          title="Digital Platform"
          header={{ extra: <ProRouteSearch /> }}
        />
      </MemoryRouter>,
      'en-US',
    )

    await screen.findByTestId('dashboard-page')
    expect(screen.getByText('Current location:')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Pin tab: 工作台' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Search pages (Ctrl+K)' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /订单管理/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Add to favorites: 订单列表' }))
    expect(screen.getByRole('button', { name: 'Remove from favorites: 订单列表' })).toBeTruthy()
    expect(await screen.findByText('Added to favorites')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Favorite menus' }))
    expect(await screen.findByText('Favorite menus (1)')).toBeTruthy()
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
    const firstRouter = createPersistentTestRouter(storageKey)
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
    expect(await screen.findByText('收藏成功')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '收藏菜单' }))
    const collectionHeader = await screen.findByText('收藏的菜单（1）')
    const collectionPanel = collectionHeader.closest('.zby-pro-layout-collection-panel')
    expect(collectionPanel).toBeTruthy()
    fireEvent.click(within(collectionPanel as HTMLElement).getByRole('button', { name: '订单列表' }))
    expect(jumpTo).toHaveBeenCalledWith('/orders/list')
    await waitFor(async () => {
      expect(
        (await createIndexedDBRouterStorageAdapter().load(storageKey)).favoriteRoutePaths,
      ).toEqual(['/orders/list'])
    })

    firstRender.unmount()
    const secondRouter = createPersistentTestRouter(storageKey)
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ReactRouterProLayout router={secondRouter} title="数字化平台" />
      </MemoryRouter>,
    )

    await screen.findByTestId('dashboard-page')
    fireEvent.click(screen.getByRole('button', { name: '收藏菜单' }))
    expect(await screen.findByText('收藏的菜单（1）')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '取消收藏：订单列表' }))
    expect(await screen.findByText('取消收藏成功')).toBeTruthy()

    await waitFor(async () => {
      expect(
        (await createIndexedDBRouterStorageAdapter().load(storageKey)).favoriteRoutePaths,
      ).toEqual([])
    })
  })

  it('hydration 期间保留本地收藏修改，和固定页签冲突语义一致', async () => {
    let resolveLoad!: (state: Partial<RouterStorageState>) => void
    const loadPromise = new Promise<Partial<RouterStorageState>>((resolve) => {
      resolveLoad = resolve
    })
    const saveFavoriteRoutePaths = vi.fn(async () => undefined)
    const storageAdapter: RouterStorageAdapter = {
      load: vi.fn(() => loadPromise),
      saveFixedTabs: vi.fn(async () => undefined),
      saveFixedParamsPathMap: vi.fn(async () => undefined),
      saveFavoriteRoutePaths,
    }
    const router = createPersistentTestRouter(
      'pro-layout-favorite-hydration',
      storageAdapter,
    )

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
      resolveLoad({ favoriteRoutePaths: ['/orders/list'] })
      await loadPromise
    })

    expect(screen.getByRole('button', { name: '取消收藏：订单列表' })).toBeTruthy()
    expect(router.getState().favoriteRoutePaths).toEqual(['/orders/list'])
    expect(saveFavoriteRoutePaths).toHaveBeenCalledWith(
      'pro-layout-favorite-hydration',
      ['/orders/list'],
    )
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
    path: '/analytics',
    title: '报表菜单',
    routes: [
      {
        path: '/analytics/overview',
        title: '报表总览',
        element: ReportsPage,
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

function createTestRouter(
  storageKey = `pro-layout-test-${routerSequence += 1}`,
  maxFixedTabCount?: number,
) {
  return createRouterCore({
    routes,
    defaultRedirectPath: '/dashboard',
    storageAdapter: false,
    storageKey,
    keepAlive: true,
    maxFixedTabCount,
  })
}

function createPersistentTestRouter(
  storageKey: string,
  storageAdapter?: RouterStorageAdapter,
) {
  return createRouterCore({
    routes,
    defaultRedirectPath: '/dashboard',
    storageAdapter,
    storageKey,
    keepAlive: true,
  })
}

function createMegaMenuTestRouter() {
  const orderRoutes = Array.from({ length: 20 }, (_, index): ProLayoutRoute => ({
    path: `/mega/business/orders/${index + 1}`,
    title: `订单项 ${index + 1}`,
    element: ReportsPage,
  }))
  const megaMenuRoutes: ProLayoutRoute[] = [
    {
      path: '/dashboard',
      title: '工作台',
      element: DashboardPage,
    },
    {
      path: '/mega',
      title: '超级菜单',
      routes: [
        {
          path: '/mega/business',
          title: '业务中心',
          routes: [
            {
              path: '/mega/business/orders',
              title: '订单处理',
              routes: orderRoutes,
            },
            {
              path: '/mega/business/delivery',
              title: '履约管理',
              routes: [
                {
                  path: '/mega/business/delivery/pending',
                  title: '待发货订单',
                  element: ReportsPage,
                },
                {
                  path: '/mega/business/delivery/history',
                  title: '发货记录',
                  element: ReportsPage,
                },
              ],
            },
          ],
        },
        {
          path: '/mega/empty',
          title: '空分组',
          routes: [],
        },
      ],
    },
  ]

  return createRouterCore({
    routes: megaMenuRoutes,
    defaultRedirectPath: '/dashboard',
    storageAdapter: false,
    storageKey: `pro-layout-mega-menu-${routerSequence += 1}`,
    keepAlive: true,
  })
}

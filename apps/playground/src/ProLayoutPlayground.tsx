import {
  AppstoreOutlined,
  DashboardOutlined,
  NodeIndexOutlined,
} from '@ant-design/icons'
import { createRouterCore } from '@zby/router-core'
import { ReactRouterProLayout } from '@zby/pro'

import InputNumberRangePlayground from './InputNumberRangePlayground'
import PlaygroundHeaderActions from './PlaygroundHeaderActions'
import {
  DynamicOrderPlayground,
  OverviewPlayground,
  RouterStatePlayground,
} from './RouterCorePlayground'
import ScrollAreaPlayground from './ScrollAreaPlayground'
import { getPlaygroundRouteCopy } from './playgroundIntl'

import type { ProLayoutRoute } from '@zby/pro'
import type { PlaygroundLocale } from './playgroundIntl'

/**
 * 两套 RouterCore 都在 React 外创建，避免 render 导致 Store、页签和 KeepAlive 状态重建。
 * 路径和 storageKey 保持一致，使固定页签与收藏可以跨语言恢复；只有静态标题不同。
 */
const playgroundRouters = {
  'zh-CN': createPlaygroundRouter('zh-CN'),
  'en-US': createPlaygroundRouter('en-US'),
}

export interface ProLayoutPlaygroundProps {
  locale: PlaygroundLocale
}

/** 将稳定 RouterCore、React Router Adapter 和完整 ProLayout UI 装配成 Playground 主界面。 */
export default function ProLayoutPlayground(props: ProLayoutPlaygroundProps) {
  const copy = getPlaygroundRouteCopy(props.locale)

  return (
    <ReactRouterProLayout
      router={playgroundRouters[props.locale]}
      title={copy.appTitle}
      header={{
        logo: (
          <span
            style={{ color: '#fff', fontSize: 18, fontWeight: 700, letterSpacing: 1 }}
            title={copy.appTitle}
          >
            ZBY
          </span>
        ),
        extra: <PlaygroundHeaderActions />,
      }}
      theme={{
        enabled: true,
        defaultMode: 'auto',
        storageKey: 'zby-playground:pro-layout-theme',
      }}
      minimumContentWidth={900}
      styles={{
        page: {
          boxSizing: 'border-box',
          padding: 24,
        },
      }}
      onStorageError={(error, info) => {
        console.error(`[Playground] Router storage ${info.phase} failed.`, error)
      }}
    />
  )
}

function createPlaygroundRouter(locale: PlaygroundLocale) {
  return createRouterCore<ProLayoutRoute>({
    routes: createPlaygroundRoutes(locale),
    defaultRedirectPath: '/overview',
    keepAlive: { maxCachedPages: 8 },
    storageKey: 'zby-playground:pro-layout',
    maxFixedTabCount: 4,
  })
}

/**
 * 一级菜单严格遵守 ProLayout 约定：Overview 是直达页面且没有 children；Components
 * 与 Routing 是纯 Drawer 目录且没有 element。动态订单路由隐藏在菜单中，由演示按钮
 * 使用具体 pathname 打开，避免把带 :id 的 pattern 当成浏览器地址。
 */
function createPlaygroundRoutes(locale: PlaygroundLocale): ProLayoutRoute[] {
  const copy = getPlaygroundRouteCopy(locale)

  return [
    {
      path: '/overview',
      title: copy.overview,
      icon: DashboardOutlined,
      element: OverviewPlayground,
      tooltipProps: { title: copy.overview },
    },
    {
      path: '/components',
      title: copy.components,
      icon: AppstoreOutlined,
      tooltipProps: { title: copy.components },
      routes: [
        {
          path: '/input-number-range',
          title: 'InputNumberRange',
          element: InputNumberRangePlayground,
          tag: 'UI',
        },
        {
          path: '/scroll-area',
          title: 'ScrollArea',
          element: ScrollAreaPlayground,
          tag: 'UI',
        },
      ],
    },
    {
      path: '/routing',
      title: copy.routing,
      icon: NodeIndexOutlined,
      tooltipProps: { title: copy.routing },
      routes: [
        {
          path: '/router-core',
          title: copy.routerCore,
          element: RouterStatePlayground,
          tag: 'Core',
        },
        {
          path: '/orders/:id',
          title: copy.orderDetail,
          element: DynamicOrderPlayground,
          supportMultipleTabs: true,
          ignore: true,
        },
      ],
    },
  ]
}

import 'antd/dist/reset.css'
import { useIntl } from '@zby/intl'
import antdEnUS from 'antd/locale/en_US'
import antdMyMM from 'antd/locale/my_MM'
import antdViVN from 'antd/locale/vi_VN'
import antdZhCN from 'antd/locale/zh_CN'
import {
  isSameProLayoutTitle,
  ProRouteSearch,
  type ProLayoutLocaleConfig,
  type ProLayoutRoute,
  ReactRouterProLayout,
  UserMenu,
} from '@zby/pro'
import { mergeLocales } from '@zby/ui'
import uiEnUS from '@zby/ui/locale/en_US'
import uiMyMM from '@zby/ui/locale/my_MM'
import uiViVN from '@zby/ui/locale/vi_VN'
import uiZhCN from '@zby/ui/locale/zh_CN'
import proEnUS from '@zby/pro/locale/en_US'
import proMyMM from '@zby/pro/locale/my_MM'
import proViVN from '@zby/pro/locale/vi_VN'
import proZhCN from '@zby/pro/locale/zh_CN'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { playgroundEnUS, playgroundMyMM, playgroundViVN, playgroundZhCN } from './playgroundIntl'
import { createRouterCore } from '@zby/router-core'
import { appRouters } from './routes'

const perssmiosn = ['sample:input-range-input', 'sample:scroll-area']

const routers = createRouterCore<ProLayoutRoute>({
  routes: appRouters,
  defaultRedirectPath: '/dashboard',
  keepAlive: { maxCachedPages: 8 },
  storageKey: 'zby-playground:pro-layout',
  maxFixedTabCount: 4,
  hasAuth: (code) => perssmiosn.includes(code),
  // setTabLabel 传的是每次新建的描述符对象，没有这个比较器会让页签栏反复重渲染。
  isSameTitle: isSameProLayoutTitle,
})

const playgroundLocales: ProLayoutLocaleConfig[] = [
  {
    key: 'zh-CN',
    label: '简体中文',
    pack: mergeLocales({
      antd: antdZhCN,
      packs: [uiZhCN, proZhCN, playgroundZhCN],
    }),
  },
  {
    key: 'en-US',
    label: 'English',
    pack: mergeLocales({
      antd: antdEnUS,
      packs: [uiEnUS, proEnUS, playgroundEnUS],
    }),
  },
  {
    key: 'vi-VN',
    label: 'Tiếng Việt',
    pack: mergeLocales({
      antd: antdViVN,
      packs: [uiViVN, proViVN, playgroundViVN],
    }),
  },
  {
    key: 'my-MM',
    label: 'မြန်မာ',
    pack: mergeLocales({
      antd: antdMyMM,
      packs: [uiMyMM, proMyMM, playgroundMyMM],
    }),
  },
]

function PlaygroundUserMenu() {
  const intl = useIntl()

  return (
    <UserMenu
      name="沈彬峰"
      menus={[{
        key: 'logout',
        label: intl.getMessage('zby.pro.layout.logout', '退出登录'),
        onClick: () => {},
      }]}
    />
  )
}

function PlaygroundApp() {
  return (
    <ReactRouterProLayout
      router={routers}
      title={{ key: 'playground.appTitle', defaultMessage: '数字化平台' }}
      locales={playgroundLocales}
      defaultLocale="zh-CN"
      defaultTheme={{ mode: 'auto', density: 'default' }}
      configProvider={{
        prefixCls: 'zby',
        theme: { cssVar: { prefix: 'zby' } },
      }}
      showBreadcrumb={true}
      header={{
        logo: (
          <>
            <img
              aria-hidden
              alt=""
              src="https://shuzhi-cdn.shuzhi-inc.com/shuzhi-design/svg/sz_logo.svg"
            />
            <div style={{ color: '#fff' }}>Zibuyu</div>
          </>
        ),
        extra: (
          <>
            <ProRouteSearch />
            <PlaygroundUserMenu />
          </>
        ),
      }}
      minimumContentWidth={900}
      onStorageError={(error, info) => {
        console.error(`[Playground] Router storage ${info.phase} failed.`, error)
      }}
      systemList={
        [{
          systemName: '百度',
          name: '百度',
          url: 'https://www.baidu.com',
          description: '百度',
          logo: 'https://www.baidu.com/favicon.ico',
        }]
      }
    />
  )
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <PlaygroundApp />
    </BrowserRouter>
  </React.StrictMode>,
)

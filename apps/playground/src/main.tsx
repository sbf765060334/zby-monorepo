import 'antd/dist/reset.css'
import { useIntl } from '@zby/intl'
import { theme as antdTheme } from 'antd'
import antdEnUS from 'antd/locale/en_US'
import antdMyMM from 'antd/locale/my_MM'
import antdViVN from 'antd/locale/vi_VN'
import antdZhCN from 'antd/locale/zh_CN'
import {
  isSameProLayoutTitle,
  ProLocaleSwitch,
  ProRouteSearch,
  ProThemeSwitch,
  type ProLayoutRoute,
  ReactRouterProLayout,
  toThemeSeedToken,
  useLocalePreference,
  useThemePreference,
  useThemeSeedPreference,
  UserMenu,
} from '@zby/pro'
import { mergeLocales, ZbyConfigProvider } from '@zby/ui'
import uiEnUS from '@zby/ui/locale/en_US'
import uiMyMM from '@zby/ui/locale/my_MM'
import uiViVN from '@zby/ui/locale/vi_VN'
import uiZhCN from '@zby/ui/locale/zh_CN'
import proEnUS from '@zby/pro/locale/en_US'
import proMyMM from '@zby/pro/locale/my_MM'
import proViVN from '@zby/pro/locale/vi_VN'
import proZhCN from '@zby/pro/locale/zh_CN'
import React, { useLayoutEffect, useMemo } from 'react'
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

const playgroundLocales = {
  'zh-CN': mergeLocales({
    antd: antdZhCN,
    packs: [uiZhCN, proZhCN, playgroundZhCN],
  }),
  'en-US': mergeLocales({
    antd: antdEnUS,
    packs: [uiEnUS, proEnUS, playgroundEnUS],
  }),
  'vi-VN': mergeLocales({
    antd: antdViVN,
    packs: [uiViVN, proViVN, playgroundViVN],
  }),
  'my-MM': mergeLocales({
    antd: antdMyMM,
    packs: [uiMyMM, proMyMM, playgroundMyMM],
  }),
}

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

function PlaygroundLayout(props: {
  localePreference: ReturnType<typeof useLocalePreference>
  themePreference: ReturnType<typeof useThemePreference>
  themeSeed: ReturnType<typeof useThemeSeedPreference>
}) {
  const intl = useIntl()
  const { localePreference, themePreference, themeSeed } = props

  return (
    <ReactRouterProLayout
      router={routers}
      title={intl.getMessage('playground.appTitle', '数字化平台')}
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
            <ProLocaleSwitch
              value={localePreference.value}
              onChange={localePreference.setValue}
            />
            <ProThemeSwitch
              value={themePreference.value}
              appearance={themePreference.appearance}
              onChange={themePreference.setValue}
              seed={themeSeed.value}
              seedConfig={themeSeed.config}
              onSeedConfirm={themeSeed.setValue}
            />
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

function PlaygroundApp() {
  const localePreference = useLocalePreference({
    defaultValue: 'zh-CN',
  })

  const themePreference = useThemePreference({
    defaultValue: { mode: 'auto', density: 'default' },
  })
  const themeSeed = useThemeSeedPreference()

  useLayoutEffect(() => {
    const root = document.documentElement
    const previousColorScheme = root.style.colorScheme
    const previousTheme = root.dataset.theme
    root.style.colorScheme = themePreference.appearance
    root.dataset.theme = themePreference.appearance
    return () => {
      root.style.colorScheme = previousColorScheme
      if (previousTheme === undefined)
        delete root.dataset.theme
      else
        root.dataset.theme = previousTheme
    }
  }, [themePreference.appearance])

  const algorithm = useMemo(() => {
    const appearanceAlgorithm = themePreference.appearance === 'dark'
      ? antdTheme.darkAlgorithm
      : antdTheme.defaultAlgorithm

    return themePreference.value.density === 'compact'
      ? [appearanceAlgorithm, antdTheme.compactAlgorithm]
      : appearanceAlgorithm
  }, [themePreference.appearance, themePreference.value.density])

  return (
    <ZbyConfigProvider
      locale={playgroundLocales[localePreference.value]}
      theme={{
        algorithm,
        cssVar: { prefix: 'zby' },
        token: toThemeSeedToken(themeSeed.value, themePreference.appearance),
      }}
      prefixCls="zby"
    >
      <PlaygroundLayout
        localePreference={localePreference}
        themePreference={themePreference}
        themeSeed={themeSeed}
      />
    </ZbyConfigProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <PlaygroundApp />
    </BrowserRouter>
  </React.StrictMode>,
)

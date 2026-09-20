import 'antd/dist/reset.css'
import { theme as antdTheme } from 'antd'
import antdEnUS from 'antd/locale/en_US'
import antdZhCN from 'antd/locale/zh_CN'
import {
  isSameProLayoutTitle,
  ProLocaleSwitch,
  ProRouteSearch,
  ProThemeSwitch,
  type ProLayoutRoute,
  ReactRouterProLayout,
  useLocalePreference,
  useThemePreference,
} from '@zby/pro'
import { mergeLocales, ZbyConfigProvider } from '@zby/ui'
import uiEnUS from '@zby/ui/locale/en_US'
import uiZhCN from '@zby/ui/locale/zh_CN'
import proEnUS from '@zby/pro/locale/en_US'
import proZhCN from '@zby/pro/locale/zh_CN'
import React, { useLayoutEffect, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { playgroundEnUS, playgroundZhCN } from './playgroundIntl'
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
}

function PlaygroundApp() {
  const localePreference = useLocalePreference({
    defaultValue: 'zh-CN',
  })

  const themePreference = useThemePreference({
    defaultValue: { mode: 'auto', density: 'default' },
  })

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
      theme={{ algorithm, cssVar: { prefix: 'zby-playground' } }}
    >
      <ReactRouterProLayout
        router={routers}
        title="数字化平台"
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
              />
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

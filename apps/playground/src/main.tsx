import 'antd/dist/reset.css'
import { App as AntdApp, ConfigProvider, theme as antdTheme } from 'antd'
import antdEnUS from 'antd/locale/en_US'
import antdZhCN from 'antd/locale/zh_CN'
import { mergeIntlResources, ZbyIntlProvider } from '@zby/intl'
import {
  ProLocaleSwitch,
  ProThemeSwitch,
  type ProLayoutRoute,
  ReactRouterProLayout,
  useLocalePreference,
  useThemePreference,
  zbyProLocales,
} from '@zby/pro'
import { zbyUiLocales } from '@zby/ui'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { playgroundLocales } from './playgroundIntl'
import { createRouterCore } from '@zby/router-core'
import { appRouters } from './routes'

const routers = createRouterCore<ProLayoutRoute>({
  routes: appRouters,
  defaultRedirectPath: '/dashboard',
  keepAlive: { maxCachedPages: 8 },
  storageKey: 'zby-playground:pro-layout',
  maxFixedTabCount: 4,
})

const resources = mergeIntlResources(zbyUiLocales, zbyProLocales, playgroundLocales)

const antdLocales = {
  'zh-CN': antdZhCN,
  'en-US': antdEnUS,
}

function PlaygroundApp() {
  const localePreference = useLocalePreference({
    defaultValue: 'zh-CN',
    storageKey: 'zby-playground:locale-preference',
  })
  const locale = localePreference.value

  const themePreference = useThemePreference({
    defaultValue: { mode: 'auto', density: 'default' },
    storageKey: 'zby-playground:theme-preference',
  })

  const algorithm = React.useMemo(() => {
    const appearanceAlgorithm = themePreference.appearance === 'dark'
      ? antdTheme.darkAlgorithm
      : antdTheme.defaultAlgorithm

    return themePreference.value.density === 'compact'
      ? [appearanceAlgorithm, antdTheme.compactAlgorithm]
      : appearanceAlgorithm
  }, [themePreference.appearance, themePreference.value.density])

  return (
    <ConfigProvider
      locale={antdLocales[locale]}
      theme={{ algorithm, cssVar: { prefix: 'zby-playground' } }}
    >
      <AntdApp>
        <ZbyIntlProvider
          locale={locale}
          fallbackLocale="zh-CN"
          resources={resources}
          onLocaleChange={(nextLocale) => {
            localePreference.setValue(nextLocale === 'en-US' ? 'en-US' : 'zh-CN')
          }}
        >
          <ReactRouterProLayout
            router={routers}
            title="ZBY"
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
                  <ProLocaleSwitch
                    value={locale}
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
        </ZbyIntlProvider>
      </AntdApp>
    </ConfigProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <PlaygroundApp />
    </BrowserRouter>
  </React.StrictMode>,
)

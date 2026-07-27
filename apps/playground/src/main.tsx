import 'antd/dist/reset.css'
import { App as AntdApp, ConfigProvider } from 'antd'
import antdEnUS from 'antd/locale/en_US'
import antdZhCN from 'antd/locale/zh_CN'
import { mergeIntlResources, ZbyIntlProvider } from '@zby/intl'
import { type ProLayoutRoute, ReactRouterProLayout, zbyProLocales } from '@zby/pro'
import { zbyUiLocales } from '@zby/ui'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { playgroundLocales } from './playgroundIntl'
import type { PlaygroundLocale } from './playgroundIntl'
import { createRouterCore } from '@zby/router-core'
import { appRouters } from './routes'
import PlaygroundHeaderActions from './PlaygroundHeaderActions'

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
  const [locale, setLocale] = React.useState<PlaygroundLocale>('zh-CN')

  return (
    <ConfigProvider
      locale={antdLocales[locale]}
      theme={{ cssVar: { prefix: 'zby-playground' } }}
    >
      <AntdApp>
        <ZbyIntlProvider
          locale={locale}
          fallbackLocale="zh-CN"
          resources={resources}
          onLocaleChange={(nextLocale) => {
            setLocale(nextLocale === 'en-US' ? 'en-US' : 'zh-CN')
          }}
        >
          <ReactRouterProLayout
            router={routers}
            title="ZBY"
            header={{
              logo: (
                <span
                  style={{ color: '#fff', fontSize: 18, fontWeight: 700, letterSpacing: 1 }}
                  title="ZBY"
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

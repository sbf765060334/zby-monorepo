import 'antd/dist/reset.css'

import { App as AntdApp, ConfigProvider } from 'antd'
import antdEnUS from 'antd/locale/en_US'
import antdZhCN from 'antd/locale/zh_CN'
import { mergeIntlResources, ZbyIntlProvider } from '@zby/intl'
import { zbyProLocales } from '@zby/pro'
import { zbyUiLocales } from '@zby/ui'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import ProLayoutPlayground from './ProLayoutPlayground'
import { playgroundLocales } from './playgroundIntl'
import type { PlaygroundLocale } from './playgroundIntl'

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
          <ProLayoutPlayground locale={locale} />
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

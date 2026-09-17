import { DEFAULT_LOCALE, ZbyIntlProvider } from '@zby/intl'
import { App, ConfigProvider } from 'antd'
import type { AppProps, ConfigProviderProps } from 'antd'
import React from 'react'

import { toIntlResources } from './mergeLocales'
import type { ZbyLocalePack } from '../locale/types'

export type ZbyConfigProviderProps = Omit<ConfigProviderProps, 'locale'> & {
  locale: ZbyLocalePack
  fallbackLocale?: string
  app?: boolean | AppProps
}

export function ZbyConfigProvider(props: ZbyConfigProviderProps) {
  const {
    locale,
    fallbackLocale = DEFAULT_LOCALE,
    app = true,
    children,
    ...configProviderProps
  } = props

  const resources = React.useMemo(() => toIntlResources(locale), [locale])
  const intlNode = (
    <ZbyIntlProvider
      locale={locale.locale}
      fallbackLocale={fallbackLocale}
      resources={resources}
    >
      {children}
    </ZbyIntlProvider>
  )

  const appNode = app === false
    ? intlNode
    : <App {...(typeof app === 'object' ? app : {})}>{intlNode}</App>

  return (
    <ConfigProvider {...configProviderProps} locale={locale.antd}>
      {appNode}
    </ConfigProvider>
  )
}

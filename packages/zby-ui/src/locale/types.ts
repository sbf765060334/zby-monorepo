import type { LocaleMessages } from '@zby/intl'
import type { ConfigProviderProps } from 'antd'

export type AntdLocale = NonNullable<ConfigProviderProps['locale']>

export interface ZbyLocalePack {
  locale: string
  antd?: AntdLocale
  zby?: LocaleMessages
  [key: string]: unknown
}

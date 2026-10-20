import type { LocaleMessages } from '@zby/intl'
import type { ConfigProviderProps } from 'antd'

/** antd `ConfigProvider` 接收的语言包。 */
export type AntdLocale = NonNullable<ConfigProviderProps['locale']>

/**
 * 一种语言的完整材料。
 *
 * `locale` 是这份材料的语言码，例如 `zh-CN`。
 * `antd` 只交给 antd `ConfigProvider`，不能混进 `getMessage`。
 * 其余字段是文案树。`zby` 放组件库文案，业务也可以加自己的顶层字段。
 */
export interface ZbyLocalePack {
  locale: string
  antd?: AntdLocale
  zby?: LocaleMessages
  [key: string]: unknown
}

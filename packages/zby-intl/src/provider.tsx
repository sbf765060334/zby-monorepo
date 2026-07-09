import type { i18n } from 'i18next'
import React from 'react'
import { I18nextProvider } from 'react-i18next'
import { DEFAULT_LOCALE, DEFAULT_NAMESPACE } from './constants'
import { createI18n } from './createI18n'
import { normalizeResources } from './resources'
import type { IntlProviderProps, IntlResources } from './types'

// 这层 Context 只放 zby-intl 自己额外需要的配置。
// 真正的 i18next 实例由 react-i18next 的 I18nextProvider 提供，避免重复造一套上下文。
export const IntlConfigContext = React.createContext<{
  fallbackLocale: string
  defaultNamespace: string
  onLocaleChange?: (locale: string) => void
}>({
  fallbackLocale: DEFAULT_LOCALE,
  defaultNamespace: DEFAULT_NAMESPACE,
})

// 将外部传入的语言包同步到 i18next 实例。
// Provider 支持 resources 后续变化，所以这里使用 addResourceBundle 追加/覆盖资源。
function syncResources(instance: i18n, resources: IntlResources, defaultNamespace: string) {
  const normalizedResources = normalizeResources(resources, defaultNamespace)

  Object.keys(normalizedResources).forEach((locale) => {
    const namespaces = normalizedResources[locale] || {}

    Object.keys(namespaces).forEach((namespace) => {
      // deep=true 表示深合并已有 namespace；overwrite=true 表示同名 key 以后传入的为准。
      instance.addResourceBundle(locale, namespace, namespaces[namespace], true, true)
    })
  })
}

// 应用级国际化 Provider。
// 业务应用通常在根节点包一层，把 locale、fallbackLocale、合并后的 resources 传进来。
export function ZbyIntlProvider(props: IntlProviderProps) {
  const {
    children,
    locale,
    fallbackLocale = DEFAULT_LOCALE,
    resources = {},
    defaultNamespace = DEFAULT_NAMESPACE,
    i18n: customI18n,
    onLocaleChange,
  } = props

  // i18next 实例只在 Provider 首次挂载时创建一次。
  // 如果业务传了 customI18n，就复用业务已有实例；否则使用 zby-intl 的默认配置创建。
  const [instance] = React.useState<i18n>(
    () =>
      customI18n ??
      createI18n({
        locale,
        fallbackLocale,
        resources,
        defaultNamespace,
      }),
  )

  // 当业务异步加载语言包，或者组件库语言包变更时，把新 resources 合并进 i18next。
  React.useEffect(() => {
    syncResources(instance, resources, defaultNamespace)
  }, [defaultNamespace, instance, resources])

  // locale 是受控入参。外部状态变化后，这里同步通知 i18next 切换语言。
  React.useEffect(() => {
    instance.changeLanguage(locale)
  }, [instance, locale])

  // 这些配置供 useIntl 创建 IntlShape 使用。
  // useMemo 可以避免每次渲染都让下游组件拿到新的 context value。
  const contextValue = React.useMemo(
    () => ({ fallbackLocale, defaultNamespace, onLocaleChange }),
    [defaultNamespace, fallbackLocale, onLocaleChange],
  )

  return (
    // 外层放 zby-intl 的补充配置，内层放 react-i18next 所需的 i18next 实例。
    <IntlConfigContext.Provider value={contextValue}>
      <I18nextProvider i18n={instance}>{children}</I18nextProvider>
    </IntlConfigContext.Provider>
  )
}

export const IntlProvider = ZbyIntlProvider

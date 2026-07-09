import type { i18n } from 'i18next'
import React from 'react'
import { I18nextProvider } from 'react-i18next'
import { DEFAULT_LOCALE, DEFAULT_NAMESPACE } from './constants'
import { createI18n } from './createI18n'
import { normalizeResources } from './resources'
import type { IntlProviderProps, IntlResources } from './types'

export const IntlConfigContext = React.createContext<{
  fallbackLocale: string
  defaultNamespace: string
  onLocaleChange?: (locale: string) => void
}>({
  fallbackLocale: DEFAULT_LOCALE,
  defaultNamespace: DEFAULT_NAMESPACE,
})

function syncResources(instance: i18n, resources: IntlResources, defaultNamespace: string) {
  const normalizedResources = normalizeResources(resources, defaultNamespace)

  Object.keys(normalizedResources).forEach((locale) => {
    const namespaces = normalizedResources[locale] || {}

    Object.keys(namespaces).forEach((namespace) => {
      instance.addResourceBundle(locale, namespace, namespaces[namespace], true, true)
    })
  })
}

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

  React.useEffect(() => {
    syncResources(instance, resources, defaultNamespace)
  }, [defaultNamespace, instance, resources])

  React.useEffect(() => {
    instance.changeLanguage(locale)
  }, [instance, locale])

  const contextValue = React.useMemo(
    () => ({ fallbackLocale, defaultNamespace, onLocaleChange }),
    [defaultNamespace, fallbackLocale, onLocaleChange],
  )

  return (
    <IntlConfigContext.Provider value={contextValue}>
      <I18nextProvider i18n={instance}>{children}</I18nextProvider>
    </IntlConfigContext.Provider>
  )
}

export const IntlProvider = ZbyIntlProvider

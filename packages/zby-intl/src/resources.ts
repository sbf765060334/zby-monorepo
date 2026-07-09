import type { Resource } from 'i18next'
import { DEFAULT_NAMESPACE } from './constants'
import type { IntlResources, LocaleMessages, LocaleMessageValue } from './types'

function isPlainMessageObject(value: LocaleMessageValue | undefined): value is LocaleMessages {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function mergeLocaleMessages(base: LocaleMessages, override: LocaleMessages): LocaleMessages {
  return Object.keys(override).reduce<LocaleMessages>(
    (current, key) => {
      const baseValue = current[key]
      const overrideValue = override[key]

      current[key] =
        isPlainMessageObject(baseValue) && isPlainMessageObject(overrideValue)
          ? mergeLocaleMessages(baseValue, overrideValue)
          : overrideValue

      return current
    },
    { ...base },
  )
}

export function mergeIntlResources(
  ...resourcesList: Array<IntlResources | undefined>
): IntlResources {
  return resourcesList.reduce<IntlResources>((current, resources) => {
    if (!resources) {
      return current
    }

    Object.keys(resources).forEach((locale) => {
      current[locale] = mergeLocaleMessages(current[locale] || {}, resources[locale])
    })

    return current
  }, {})
}

export function normalizeResources(
  resources: IntlResources = {},
  defaultNamespace = DEFAULT_NAMESPACE,
): Resource {
  return Object.keys(resources).reduce<Resource>((current, locale) => {
    current[locale] = {
      [defaultNamespace]: resources[locale] as LocaleMessages,
    }
    return current
  }, {})
}

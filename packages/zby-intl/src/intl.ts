import type { i18n } from 'i18next'
import { DEFAULT_LOCALE, DEFAULT_NAMESPACE } from './constants'
import { createI18n } from './createI18n'
import { formatDate, formatNumber } from './format'
import type { CreateIntlOptions, FormatValues, IntlShape, TranslateOptions } from './types'

function getCurrentLocale(instance: i18n, fallbackLocale: string): string {
  return instance.resolvedLanguage || instance.language || fallbackLocale
}

export function createIntlShape(
  instance: i18n,
  fallbackLocale = DEFAULT_LOCALE,
  onLocaleChange?: (locale: string) => void,
  defaultNamespace = DEFAULT_NAMESPACE,
): IntlShape {
  const getLocale = () => getCurrentLocale(instance, fallbackLocale)

  const t = (id: string, options?: TranslateOptions) => {
    const translateOptions: TranslateOptions = { ns: defaultNamespace, ...(options || {}) }

    return instance.t(id, translateOptions) as string
  }

  const getMessage = (id: string, defaultMessage = id, values?: FormatValues) => {
    const translateOptions: FormatValues & { ns: string } = {
      ns: defaultNamespace,
      ...(values || {}),
    }

    return instance.t(id, defaultMessage, translateOptions) as string
  }

  const changeLocale = async (locale: string) => {
    await instance.changeLanguage(locale)
    onLocaleChange?.(locale)
  }

  return {
    get locale() {
      return getLocale()
    },
    fallbackLocale,
    i18n: instance,
    t,
    getMessage,
    formatMessage: (id, values, defaultMessage = id) => getMessage(id, defaultMessage, values),
    formatDate: (value, options) => formatDate(getLocale(), value, options),
    formatNumber: (value, options) => formatNumber(getLocale(), value, options),
    changeLocale,
  }
}

export function createIntl(options: CreateIntlOptions): IntlShape {
  const fallbackLocale = options.fallbackLocale || DEFAULT_LOCALE
  const defaultNamespace = options.defaultNamespace || DEFAULT_NAMESPACE
  const instance =
    options.i18n ||
    createI18n({
      locale: options.locale,
      fallbackLocale,
      resources: options.resources,
      defaultNamespace,
    })

  return createIntlShape(instance, fallbackLocale, undefined, defaultNamespace)
}

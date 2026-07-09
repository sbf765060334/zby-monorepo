import type { i18n } from 'i18next'
import { DEFAULT_LOCALE, DEFAULT_NAMESPACE } from './constants'
import { createI18n } from './createI18n'
import { formatDate, formatNumber } from './format'
import type { CreateIntlOptions, FormatValues, IntlShape, TranslateOptions } from './types'

// i18next 在不同阶段可能分别提供 resolvedLanguage 或 language。
// 这里集中做兜底，避免调用方拿到空语言。
function getCurrentLocale(instance: i18n, fallbackLocale: string): string {
  return instance.resolvedLanguage || instance.language || fallbackLocale
}

// 把底层 i18next 实例包装成 zby-intl 对外暴露的 IntlShape。
// 这样组件库内部不需要直接依赖 i18next API，后续要换实现或补能力也更集中。
export function createIntlShape(
  instance: i18n,
  fallbackLocale = DEFAULT_LOCALE,
  onLocaleChange?: (locale: string) => void,
  defaultNamespace = DEFAULT_NAMESPACE,
): IntlShape {
  const getLocale = () => getCurrentLocale(instance, fallbackLocale)

  // 保留接近 i18next.t 的方法，适合需要传复杂 i18next options 的场景。
  const t = (id: string, options?: TranslateOptions) => {
    const translateOptions: TranslateOptions = { ns: defaultNamespace, ...(options || {}) }

    return instance.t(id, translateOptions) as string
  }

  // 组件库推荐优先使用 getMessage。
  // defaultMessage 用来兜底，避免语言包漏配时界面直接显示 'zby.xxx.xxx'。
  const getMessage = (id: string, defaultMessage = id, values?: FormatValues) => {
    const translateOptions: FormatValues & { ns: string } = {
      ns: defaultNamespace,
      ...(values || {}),
    }

    return instance.t(id, defaultMessage, translateOptions) as string
  }

  // 切换语言后额外触发 onLocaleChange，交给业务保存到 localStorage、接口或全局状态。
  const changeLocale = async (locale: string) => {
    await instance.changeLanguage(locale)
    onLocaleChange?.(locale)
  }

  return {
    // 使用 getter，保证每次读取 locale 都是 i18next 当前最新状态。
    get locale() {
      return getLocale()
    },
    fallbackLocale,
    i18n: instance,
    t,
    getMessage,
    // formatMessage 是 getMessage 的语义化别名，参数顺序更贴近“id + values + 默认文案”。
    formatMessage: (id, values, defaultMessage = id) => getMessage(id, defaultMessage, values),
    // 日期和数字格式化跟随当前语言自动变化。
    formatDate: (value, options) => formatDate(getLocale(), value, options),
    formatNumber: (value, options) => formatNumber(getLocale(), value, options),
    changeLocale,
  }
}

// 非 React 场景使用的创建入口。
// 比如工具函数、测试、服务端预处理等地方没有 React Provider，也可以手动创建 IntlShape。
export function createIntl(options: CreateIntlOptions): IntlShape {
  const fallbackLocale = options.fallbackLocale || DEFAULT_LOCALE
  const defaultNamespace = options.defaultNamespace || DEFAULT_NAMESPACE
  const instance =
    options.i18n ||
    // 没传 i18n 实例时，使用同一套 createI18n 默认规则创建。
    createI18n({
      locale: options.locale,
      fallbackLocale,
      resources: options.resources,
      defaultNamespace,
    })

  return createIntlShape(instance, fallbackLocale, undefined, defaultNamespace)
}

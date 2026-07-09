import i18next, { type i18n } from 'i18next'
import { initReactI18next } from 'react-i18next'
import { DEFAULT_LOCALE, DEFAULT_NAMESPACE } from './constants'
import { normalizeResources } from './resources'
import type { CreateI18nOptions } from './types'

// 创建一份独立的 i18next 实例。
// 组件库场景里不直接使用全局 i18next 单例，是为了避免和业务项目已有的 i18n 配置互相污染。
export function createI18n(options: CreateI18nOptions): i18n {
  const {
    locale,
    fallbackLocale = DEFAULT_LOCALE,
    resources,
    defaultNamespace = DEFAULT_NAMESPACE,
  } = options

  const instance = i18next.createInstance()

  // initReactI18next 会把 i18next 实例接入 react-i18next，
  // 这样后续 I18nextProvider/useTranslation/useIntl 才能在 React 组件树中工作。
  instance.use(initReactI18next).init({
    // 当前语言。
    lng: locale,
    // 当前语言缺失文案时的兜底语言。
    fallbackLng: fallbackLocale,
    // 默认 namespace，配合 useTranslation(defaultNamespace) 使用。
    defaultNS: defaultNamespace,
    ns: [defaultNamespace],
    // 注册初始语言包。外部的轻量资源结构会在这里转换成 i18next 结构。
    resources: normalizeResources(resources, defaultNamespace),
    debug: false,
    showSupportNotice: false,
    interpolation: {
      // React 默认会做 XSS 转义，这里关闭 i18next 的额外转义，避免重复处理。
      escapeValue: false,
    },
    // 缺失文案时不要返回 null，便于 getMessage 使用默认文案兜底。
    returnNull: false,
    // 同步初始化，保证 Provider 首次渲染时就能立即读取已传入的本地语言包。
    initImmediate: false,
  })

  return instance
}

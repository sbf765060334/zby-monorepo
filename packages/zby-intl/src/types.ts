import type { i18n, TOptions } from 'i18next'
import type React from 'react'

// 语言标识。这里保持 string，而不是写死联合类型，是为了让业务可以扩展
// zh-CN、en-US、id-ID、th-TH 等任意公司需要支持的地区语言。
export type Locale = string

// 单条语言文案可以是字符串，也可以是嵌套对象。
// 嵌套对象用于支持 'zby.ui.button.ok' 这种层级 key。
export type LocaleMessageValue =
  string | number | boolean | null | LocaleMessages | LocaleMessageValue[]

// 一个 locale 下的完整语言对象，例如 zh-CN 对应的一整棵文案树。
export interface LocaleMessages {
  [key: string]: LocaleMessageValue
}

// 所有语言资源的入口结构：
// {
//   'zh-CN': { ... },
//   'en-US': { ... },
// }
export type IntlResources = Record<Locale, LocaleMessages>

// 插值参数。比如文案是 'Hello, {{name}}'，调用时 values 传 { name: 'ZBY' }。
// context 预留给 i18next 的上下文能力，例如性别、业务场景等差异化文案。
export type FormatValues = Record<string, string | number | boolean | Date | null | undefined> & {
  context?: string
}

// 日期格式化支持 Date，也支持能被 new Date(...) 解析的字符串或时间戳。
export type DateInput = Date | string | number

// 暴露给业务的翻译参数。这里复用 i18next 的 TOptions，
// 但把 context 收紧成我们自己的轻量类型，避免业务代码直接感知过多 i18next 细节。
export type TranslateOptions = Omit<TOptions<Record<string, unknown>>, 'context'> & {
  context?: string
}

// 组件和业务真正拿到的 intl 对象。
// 它把 i18next 的能力包了一层，统一提供翻译和日期/数字格式化等能力。
export type IntlShape = {
  // 当前生效语言。优先取 i18next 解析后的语言，其次取 language，最后取 fallbackLocale。
  locale: Locale
  // 当前 Provider 配置的兜底语言。
  fallbackLocale: Locale
  // 原始 i18next 实例。保留它是为了高级场景可以直接访问底层能力。
  i18n: i18n
  // 轻量翻译方法，更接近 i18next.t。
  t: (id: string, options?: TranslateOptions) => string
  // 组件库推荐使用的方法：支持默认文案，语言包缺失时不至于直接展示 key。
  getMessage: (id: string, defaultMessage?: string, values?: FormatValues) => string
  // 语义化别名，适合业务代码表达“格式化一条文案”。
  formatMessage: (id: string, values?: FormatValues, defaultMessage?: string) => string
  // 根据当前语言格式化日期。
  formatDate: (value: DateInput, options?: Intl.DateTimeFormatOptions) => string
  // 根据当前语言格式化数字、金额、百分比等。
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string
}

// Provider 的入参。业务应用通常在应用入口配置一次。
export type IntlProviderProps = {
  children?: React.ReactNode
  // 当前语言，由业务状态控制，例如从 localStorage、用户配置或后端返回值读取。
  locale: Locale
  // 当前语言缺失某条文案时使用的兜底语言。
  fallbackLocale?: Locale
  // 注册进 i18next 的语言包。通常由组件库语言包和业务语言包合并得到。
  resources?: IntlResources
  // 默认 namespace。绝大多数场景不需要改。
  defaultNamespace?: string
  // 允许业务传入已有 i18next 实例，便于接入公司已有国际化体系。
  i18n?: i18n
}

// 创建 i18next 实例时需要的配置。
export type CreateI18nOptions = {
  locale: Locale
  fallbackLocale?: Locale
  resources?: IntlResources
  defaultNamespace?: string
}

// 创建 IntlShape 时的配置。相比 CreateI18nOptions，多了复用已有 i18n 实例的能力。
export type CreateIntlOptions = CreateI18nOptions & {
  i18n?: i18n
}

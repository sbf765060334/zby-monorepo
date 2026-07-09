import type { Resource } from 'i18next'
import { DEFAULT_NAMESPACE } from './constants'
import type { IntlResources, LocaleMessages, LocaleMessageValue } from './types'

// 判断一个文案值是否还能继续向下深合并。
// 数组在语言包里更适合作为完整叶子值处理，所以这里不把数组当成对象继续递归。
function isPlainMessageObject(value: LocaleMessageValue | undefined): value is LocaleMessages {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

// 合并同一个 locale 下的两棵文案树。
// 如果 base 和 override 的同一个 key 都是对象，就继续递归合并；
// 否则直接用 override 覆盖 base，保证后传入的语言包优先级更高。
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

// 合并多份语言资源，典型用法：
// mergeIntlResources(zbyUiLocales, zbyProLocales, appLocales)
// 后面的资源优先级更高，所以业务项目可以覆盖组件库默认文案。
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

// 把当前包对外暴露的轻量资源结构转换成 i18next 需要的 Resource 结构。
// 外部传入：{ 'zh-CN': { zby: { ui: { ok: '确定' } } } }
// i18next 需要：{ 'zh-CN': { translation: { zby: { ui: { ok: '确定' } } } } }
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

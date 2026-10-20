import { mergeIntlResources } from '@zby/intl'
import type { IntlResources, LocaleMessages } from '@zby/intl'

import type { AntdLocale, ZbyLocalePack } from './types'

export type { AntdLocale, ZbyLocalePack }

/** `mergeLocales` 的入参。同一次调用里的 pack 必须是同一种语言。 */
export interface MergeLocalesOptions {
  /** 当前语言的 antd 语言包。省略时结果里没有 `antd`。 */
  antd?: AntdLocale
  /** ui、pro 和业务语言包。至少要有一份带 `locale` 的 pack。 */
  packs?: ZbyLocalePack[]
}

/**
 * 把一份语言包收成 i18next 要的 `{ [locale]: 文案树 }`。
 *
 * `locale` 和 `antd` 是包装字段，不进入文案树。
 * ProLayout 会把每一份结果再合并进同一个 intl 实例。
 */
export function toIntlResources(pack: ZbyLocalePack): IntlResources {
  return {
    [pack.locale]: omitPackMeta(pack),
  }
}

/**
 * 把 antd 语言包和多份 Zby 语言包收成当前语言的一份材料。
 *
 * 后写入的 pack 覆盖先写入的同名文案。antd 语言包单独留在 `antd`，
 * 不会和 `Pagination` 这类 antd 字段一起进入 `getMessage`。
 */
export function mergeLocales(options: MergeLocalesOptions): ZbyLocalePack {
  const packs = options.packs || []
  const antd = unwrapAntdLocale(options.antd)
  const locale = resolveLocale(antd, packs)
  const messages = mergeIntlResources(...packs.map((pack) => ({
    [locale]: omitPackMeta(pack),
  })))[locale] || {}

  return antd
    ? { locale, antd, ...messages }
    : { locale, ...messages }
}

/** 去掉包装字段，只留下可以深合并的文案。 */
function omitPackMeta(pack: ZbyLocalePack): LocaleMessages {
  const { locale: _locale, antd: _antd, ...messages } = pack
  return messages as LocaleMessages
}

/**
 * 从 pack 上取唯一语言码，并核对 antd 语言包是不是同一种语言。
 *
 * 没有 pack，或 pack 上的语言码不一致，都直接失败。
 * 静默选一个语言会让 antd 和 `getMessage` 各说各的。
 */
function resolveLocale(antd: AntdLocale | undefined, packs: ZbyLocalePack[]): string {
  const packCodes = Array.from(new Set(packs.map((pack) => pack.locale).filter(Boolean)))
  if (packCodes.length === 0) {
    throw new Error('mergeLocales requires at least one pack with locale')
  }

  if (packCodes.length > 1) {
    throw new Error(`mergeLocales received mixed locales: ${packCodes.join(', ')}`)
  }

  const locale = packCodes[0]
  if (antd?.locale && !localesMatch(antd.locale, locale)) {
    throw new Error(`mergeLocales: antd.locale "${antd.locale}" does not match pack locale "${locale}"`)
  }

  return locale
}

/**
 * 去掉 CJS/ESM 互操作多包的那一层 `default`。
 *
 * `antd/locale/zh_CN` 在部分打包结果里是 `{ default: 真正的语言包 }`。
 * 不拆开的话，`ConfigProvider` 读不到 `locale` 字段。
 */
function unwrapAntdLocale(antd?: AntdLocale): AntdLocale | undefined {
  if (!antd || typeof antd !== 'object') {
    return antd
  }

  const nested = (antd as { default?: AntdLocale }).default
  if (nested && typeof nested === 'object' && typeof nested.locale === 'string') {
    return nested
  }

  return antd
}

/**
 * 比较 antd 语言码和 Zby 语言码。
 *
 * 两边写法不完全一样：antd 的 `en_US` 把 `locale` 写成 `en`，
 * `zh_CN` 写成 `zh-cn`。区域可以省略，大小写和 `_` / `-` 也不要求一致。
 */
function localesMatch(antdLocale: string, packLocale: string) {
  const antd = normalizeLocale(antdLocale)
  const pack = normalizeLocale(packLocale)
  if (antd === pack) {
    return true
  }

  return pack.startsWith(`${antd}-`) || antd.startsWith(`${pack}-`)
}

/** 把 `zh_CN`、`zh-cn` 收成同一种可比形式。 */
function normalizeLocale(code: string) {
  return code.toLowerCase().replace(/_/g, '-')
}

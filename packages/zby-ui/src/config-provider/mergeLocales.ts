import { mergeIntlResources } from '@zby/intl'
import type { IntlResources, LocaleMessages } from '@zby/intl'

import type { AntdLocale, ZbyLocalePack } from '../locale/types'

export type { AntdLocale, ZbyLocalePack }

export interface MergeLocalesOptions {
  antd?: AntdLocale
  packs?: ZbyLocalePack[]
}

export function toIntlResources(pack: ZbyLocalePack): IntlResources {
  return {
    [pack.locale]: omitPackMeta(pack),
  }
}

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

function omitPackMeta(pack: ZbyLocalePack): LocaleMessages {
  const { locale: _locale, antd: _antd, ...messages } = pack
  return messages as LocaleMessages
}

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

function unwrapAntdLocale(antd?: AntdLocale): AntdLocale | undefined {
  if (!antd || typeof antd !== 'object') {
    return antd
  }

  // antd/locale/zh_CN 在部分 CJS/ESM 互操作下会多包一层 default。
  const nested = (antd as { default?: AntdLocale }).default
  if (nested && typeof nested === 'object' && typeof nested.locale === 'string') {
    return nested
  }

  return antd
}

function localesMatch(antdLocale: string, packLocale: string) {
  const antd = normalizeLocale(antdLocale)
  const pack = normalizeLocale(packLocale)
  if (antd === pack) {
    return true
  }

  // antd en_US 的 locale 字段是 "en"，zby pack 使用 "en-US"。
  return pack.startsWith(`${antd}-`) || antd.startsWith(`${pack}-`)
}

function normalizeLocale(code: string) {
  // antd 语言包的 locale 字段是 zh-cn，zby pack 使用 zh-CN。
  return code.toLowerCase().replace(/_/g, '-')
}

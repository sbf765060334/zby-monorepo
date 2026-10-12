import { mergeIntlResources } from '@zby/intl'
import type { IntlResources, LocaleMessages } from '@zby/intl'

import enUS from './en_US'
import myMM from './my_MM'
import viVN from './vi_VN'
import zhCN from './zh_CN'

function toIntlResources(pack: { locale: string }): IntlResources {
  const { locale, ...messages } = pack
  return { [locale]: messages as LocaleMessages }
}

export const zbyProIntlResources = mergeIntlResources(
  toIntlResources(zhCN),
  toIntlResources(enUS),
  toIntlResources(viVN),
  toIntlResources(myMM),
)

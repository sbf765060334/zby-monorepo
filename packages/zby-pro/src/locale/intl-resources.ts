import { mergeIntlResources } from '@zby/intl'
import type { IntlResources, LocaleMessages } from '@zby/intl'

import { enUS, myMM, viVN, zhCN } from '../locales'

/**
 * ProLayout 的内置文案。应用没传某种语言的 pack 时，布局自己的句子仍从这里取。
 * 组件测试也复用这份资源。不从包入口导出。
 */
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

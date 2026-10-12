import { mergeIntlResources } from '@zby/intl'

import { toIntlResources } from '../config-provider/mergeLocales'
import enUS from './en_US'
import myMM from './my_MM'
import viVN from './vi_VN'
import zhCN from './zh_CN'

export const zbyUiIntlResources = mergeIntlResources(
  toIntlResources(zhCN),
  toIntlResources(enUS),
  toIntlResources(viVN),
  toIntlResources(myMM),
)

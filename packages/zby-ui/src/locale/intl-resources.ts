import { mergeIntlResources } from '@zby/intl'

import { enUS, myMM, viVN, zhCN } from '../locales'
import { toIntlResources } from './mergeLocales'

/**
 * 只给组件测试用，不从包入口导出。
 *
 * 把四种语言收成一份 `{ 'zh-CN': 文案树, ... }`，测试里交给 ZbyIntlProvider。
 * 业务应用继续从 `@zby/ui/locale/zh_CN` 引入单份语言包，再用 mergeLocales 合成。
 */
export const zbyUiIntlResources = mergeIntlResources(
  toIntlResources(zhCN),
  toIntlResources(enUS),
  toIntlResources(viVN),
  toIntlResources(myMM),
)

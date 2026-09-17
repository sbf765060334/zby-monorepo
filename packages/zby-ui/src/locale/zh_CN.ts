import { zhCN as actionText } from '../components/action-text/locales'
import { zhCN as inputNumberRange } from '../components/input-number-range/locales'
import type { ZbyLocalePack } from './types'

const zhCN = {
  locale: 'zh-CN',
  zby: {
    ui: {
      actionText,
      inputNumberRange,
    },
  },
} satisfies ZbyLocalePack

export default zhCN

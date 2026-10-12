import { viVN as actionText } from '../components/action-text/locales'
import { viVN as inputNumberRange } from '../components/input-number-range/locales'
import type { ZbyLocalePack } from './types'

const viVN = {
  locale: 'vi-VN',
  zby: {
    ui: {
      actionText,
      inputNumberRange,
    },
  },
} satisfies ZbyLocalePack

export default viVN

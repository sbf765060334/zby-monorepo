import { myMM as actionText } from '../components/action-text/locales'
import { myMM as inputNumberRange } from '../components/input-number-range/locales'
import type { ZbyLocalePack } from './types'

const myMM = {
  locale: 'my-MM',
  zby: {
    ui: {
      actionText,
      inputNumberRange,
    },
  },
} satisfies ZbyLocalePack

export default myMM

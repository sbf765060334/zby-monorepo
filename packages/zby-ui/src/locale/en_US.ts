import { enUS as actionText } from '../components/action-text/locales'
import { enUS as inputNumberRange } from '../components/input-number-range/locales'
import type { ZbyLocalePack } from './types'

const enUS = {
  locale: 'en-US',
  zby: {
    ui: {
      actionText,
      inputNumberRange,
    },
  },
} satisfies ZbyLocalePack

export default enUS

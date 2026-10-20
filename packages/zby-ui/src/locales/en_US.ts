import type { ZbyLocalePack } from '../locale/types'

/** @zby/ui 的英文文案。key 与 zh_CN 保持一致。 */
const enUS = {
  locale: 'en-US',
  zby: {
    ui: {
      actionText: {
        copy: 'Copy',
        copied: 'Copied',
      },
      inputNumberRange: {
        startPlaceholder: 'Min Value',
        endPlaceholder: 'Max Value',
        clear: 'Clear',
      },
    },
  },
} satisfies ZbyLocalePack

export default enUS

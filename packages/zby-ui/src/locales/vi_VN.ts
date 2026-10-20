import type { ZbyLocalePack } from '../locale/types'

/** @zby/ui 的越南文文案。key 与 zh_CN 保持一致。 */
const viVN = {
  locale: 'vi-VN',
  zby: {
    ui: {
      actionText: {
        copy: 'Sao chép',
        copied: 'Đã sao chép',
      },
      inputNumberRange: {
        startPlaceholder: 'Giá trị nhỏ nhất',
        endPlaceholder: 'Giá trị lớn nhất',
        clear: 'Xóa',
      },
    },
  },
} satisfies ZbyLocalePack

export default viVN

import type { ZbyLocalePack } from '../locale/types'

/**
 * @zby/ui 的简体中文文案。
 *
 * 组件运行时只按 `zby.ui.*` 取文案，不从这里 import。
 * 新增一种语言时，复制这份结构到新文件，并在 index.ts 里导出。
 */
const zhCN = {
  locale: 'zh-CN',
  zby: {
    ui: {
      actionText: {
        copy: '复制',
        copied: '已复制',
      },
      inputNumberRange: {
        startPlaceholder: '最小值',
        endPlaceholder: '最大值',
        clear: '清空',
      },
    },
  },
} satisfies ZbyLocalePack

export default zhCN

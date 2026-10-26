import type { ScrollAreaProps } from '@zby/ui'
import type { ModalProps } from 'antd'

export type ProModalBodyHeightMode = 'max-height' | 'height'

export interface ProModalProps extends Omit<ModalProps, 'prefixCls'> {
  /**
   * 内容区高度模式。
   * `max-height`：自然高度，超出视口预算后由 ScrollArea 滚动。
   * `height`：撑满视口预算，适合内部布局需要 `height: 100%` 的场景。
   */
  bodyHeightMode?: ProModalBodyHeightMode
  /**
   * 传给内容区 ScrollArea 的属性。children 由 ProModal 接管。
   */
  scrollAreaProps?: Omit<ScrollAreaProps, 'children'>
  /**
   * 弹窗盒子的最大高度，接受任意 CSS 高度。
   * 数字按像素处理。要跟着视口走，传 `calc(100vh - 120px)` 或 `70vh`，不用自己量当前视口像素。
   * 未传时桌面端为 `calc(100vh - 200px)`，窄屏为 `calc(100vh - marginXS * 2)`。
   * 传入后两种宽度都使用该值。
   */
  viewportMaxHeight?: React.CSSProperties['maxHeight']
  /**
   * ProModal 根节点类名前缀；未传时为 ConfigProvider.getPrefixCls('pro-modal')。
   * 不转发给内部 antd Modal，Modal 自身前缀仍走 ConfigProvider。
   */
  prefixCls?: string
}

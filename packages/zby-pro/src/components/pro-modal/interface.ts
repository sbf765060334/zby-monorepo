import type { ModalProps } from 'antd'

export type ProModalBodyHeightMode = 'max-height' | 'height'

export interface ProModalProps extends ModalProps {
  /**
   * 内容区高度模式。
   * `max-height`：自然高度，超出视口预算后仅 body 内滚动。
   * `height`：撑满视口预算，适合内部布局需要 `height: 100%` 的场景。
   */
  bodyHeightMode?: ProModalBodyHeightMode
}

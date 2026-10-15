import {
  CheckOutlined,
  CopyOutlined,
  LoadingOutlined,
} from '@ant-design/icons'
import { useIntl } from '@zby/intl'
import * as React from 'react'

import ActionIcon from '../action-icon'
import type { ActionIconProps } from '../action-icon'
import type { ActionTextCopyConfig } from './ActionText'
import useCopyAction from './useCopyAction'

/**
 * icon 允许传“单值”或“复制前、复制后”两个值。
 * false 明确表示两个阶段都关闭对应内容。
 */
const toCopyConfigList = <T,>(value: T | readonly T[]) => {
  if (value === false) return [false, false]

  return Array.isArray(value) ? value : [value]
}

/**
 * 合并调用方节点和系统默认节点。
 * true/undefined 表示使用默认值；needNode 用于保证图标区域始终有可渲染内容。
 */
const getNode = (
  node: React.ReactNode,
  defaultNode: React.ReactNode,
  needNode = false,
) => {
  if (node === true || node === undefined) return defaultNode

  return node || (needNode ? defaultNode : node)
}

/** 内置复制按钮只接收 ActionIcon 的视觉属性，复制行为统一由 copyable 配置控制。 */
export interface ActionTextCopyActionProps extends Pick<
  ActionIconProps,
  'className' | 'style' | 'size'
> {
  /** true 使用默认复制配置，对象形式允许覆盖文本、提示、图标和回调。 */
  copyable: true | ActionTextCopyConfig
  /** 未配置 copyable.text 时作为默认复制内容。 */
  children?: React.ReactNode
}

const ActionTextCopyAction: React.FC<ActionTextCopyActionProps> = (props) => {
  const { copyable, children, className, style, size = 'small' } = props
  const intl = useIntl()
  // copyable=true 启用全部默认行为；对象形式覆盖文本、图标、提示和回调。
  const copyConfig = copyable === true ? {} : copyable
  const { copied, copyLoading, onClick } = useCopyAction(copyConfig, children)

  // 数组第 0 项对应复制前，第 1 项对应复制成功后。
  const iconNodes = toCopyConfigList(copyConfig.icon)

  // 内置文案统一来自 zby-intl，业务显式传入 tooltips 时优先作为原生 title。
  const copyText = intl.getMessage('zby.ui.actionText.copy', '复制')
  const copiedText = intl.getMessage('zby.ui.actionText.copied', '已复制')
  const systemStr = copied ? copiedText : copyText
  const tooltips = copyConfig.tooltips
  const copyTitle =
    tooltips === false
      ? undefined
      : (Array.isArray(tooltips) ? tooltips : [tooltips])[copied ? 1 : 0] ?? systemStr
  const ariaLabel = copyTitle ?? systemStr

  return (
    <ActionIcon
      size={size}
      className={className}
      style={style}
      icon={
        copied
          ? getNode(iconNodes[1], <CheckOutlined />, true)
          : getNode(
              iconNodes[0],
              copyLoading ? <LoadingOutlined /> : <CopyOutlined />,
              true,
            )
      }
      onClick={onClick}
      aria-label={ariaLabel}
      title={copyTitle}
      tabIndex={copyConfig.tabIndex}
      data-action-text-copy
      // 该属性用于测试和业务自动化识别成功状态，不承担视觉样式职责。
      data-action-text-copy-success={copied || undefined}
    />
  )
}

export default ActionTextCopyAction

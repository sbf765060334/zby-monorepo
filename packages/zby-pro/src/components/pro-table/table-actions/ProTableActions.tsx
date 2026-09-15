import * as React from 'react'
import { EllipsisOutlined } from '@ant-design/icons'
import { useIntl } from '@zby/intl'
import { Button, Dropdown, Popconfirm, Space, Tooltip } from 'antd'
import type { MenuProps, TooltipProps } from 'antd'
import { clsx } from 'clsx'

import type { ProTableActionInfo, ProTableActionItem, ProTableActionsProps, ProTableActionTooltip } from '../interface'

const DEFAULT_MORE_ICON = <EllipsisOutlined />

function isTooltipProps(tooltip: ProTableActionTooltip): tooltip is Omit<TooltipProps, 'children'> {
  return (
    typeof tooltip === 'object' &&
    tooltip !== null &&
    !Array.isArray(tooltip) &&
    !React.isValidElement(tooltip)
  )
}

function renderTooltip(node: React.ReactElement, tooltip: ProTableActionTooltip | undefined) {
  if (!tooltip) return node
  const tooltipProps: Omit<TooltipProps, 'children'> = isTooltipProps(tooltip)
    ? tooltip
    : { title: tooltip }
  if (!tooltipProps.title && !tooltipProps.overlay) return node
  return <Tooltip {...tooltipProps}>{node}</Tooltip>
}

export function ProTableActions<RecordType>({
  actions,
  record,
  index,
  visibleCount = 0,
  moreText,
  moreButtonProps,
  dropdownProps,
  className,
  style,
  prefixCls = 'zby-pro-table',
}: ProTableActionsProps<RecordType>) {
  const intl = useIntl()
  const moreHint = intl.getMessage('zby.pro.table.moreActions', '更多操作')
  const items = actions.filter((item): item is ProTableActionItem<RecordType> => Boolean(item && !item.hidden))
  const visible = items.slice(0, Math.max(0, visibleCount))
  const overflow = items.slice(Math.max(0, visibleCount))
  const info = (item: ProTableActionItem<RecordType>): ProTableActionInfo<RecordType> => ({ record, index, key: item.key })
  const run = (item: ProTableActionItem<RecordType>) => {
    if (!item.disabled) void item.onClick?.(info(item))
  }
  const menuItems: MenuProps['items'] = overflow.map((item) => ({
    key: String(item.key),
    label: item.label,
    disabled: item.disabled,
    danger: item.danger,
    onClick: () => run(item),
  }))
  const moreButton = (
    <Button
      {...moreButtonProps}
      type={moreButtonProps?.type ?? 'link'}
      size={moreButtonProps?.size ?? 'small'}
      className={clsx(`${prefixCls}-actions-more`, moreButtonProps?.className)}
      icon={moreButtonProps?.icon ?? (moreText === undefined ? DEFAULT_MORE_ICON : undefined)}
      title={moreButtonProps?.title ?? (moreText === undefined ? moreHint : undefined)}
      aria-label={
        moreButtonProps?.['aria-label'] ??
        (moreText === undefined ? moreHint : undefined)
      }
    >
      {moreText}
    </Button>
  )

  return (
    <Space className={className ?? `${prefixCls}-actions`} size={4} style={style}>
      {visible.map((item) => {
        const { key, label, hidden: _hidden, tooltip: _tooltip, popconfirm, onClick, ...buttonProps } = item
        const button = <Button {...buttonProps} type={buttonProps.type ?? 'link'} size={buttonProps.size ?? 'small'} onClick={popconfirm ? undefined : () => run(item)}>{label}</Button>
        const content = popconfirm ? (
          <Popconfirm {...popconfirm} onConfirm={() => void (popconfirm.onConfirm?.(info(item)) ?? onClick?.(info(item)))}>
            {button}
          </Popconfirm>
        ) : button
        return <React.Fragment key={String(key)}>{renderTooltip(content, item.tooltip)}</React.Fragment>
      })}
      {overflow.length > 0 && (
        <Dropdown {...dropdownProps} menu={{ items: menuItems }} trigger={dropdownProps?.trigger ?? ['hover']}>
          {moreButton}
        </Dropdown>
      )}
    </Space>
  )
}

export default ProTableActions

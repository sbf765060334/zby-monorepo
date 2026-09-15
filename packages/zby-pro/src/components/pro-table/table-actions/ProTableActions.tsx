import * as React from 'react'
import { DownOutlined } from '@ant-design/icons'
import { Button, Dropdown, Popconfirm, Space, Tooltip } from 'antd'
import type { MenuProps } from 'antd'
import { useIntl } from '@zby/intl'

import type { ProTableActionInfo, ProTableActionItem, ProTableActionsProps, ProTableActionTooltip } from '../interface'

function isTooltipProps(tooltip: ProTableActionTooltip): tooltip is Omit<React.ComponentProps<typeof Tooltip>, 'children'> {
  return typeof tooltip === 'object' && tooltip !== null && !Array.isArray(tooltip) && !React.isValidElement(tooltip)
}

function renderTooltip(node: React.ReactElement, tooltip: ProTableActionTooltip | undefined) {
  if (!tooltip) return node
  const props = isTooltipProps(tooltip) ? tooltip : { title: tooltip }
  return <Tooltip {...props}>{node}</Tooltip>
}

export function ProTableActions<RecordType>({
  actions,
  record,
  index,
  visibleCount = 0,
  moreButtonProps,
  dropdownProps,
  className,
  style,
  prefixCls = 'zby-pro-table',
}: ProTableActionsProps<RecordType>) {
  const intl = useIntl()
  const moreLabel = intl.getMessage('zby.pro.table.more', '更多')
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

  return (
    <Space className={className ?? `${prefixCls}-actions`} size={4} style={style}>
      {visible.map((item) => {
        const { key, label, hidden: _hidden, tooltip: _tooltip, popconfirm, onClick, ...buttonProps } = item
        const button = <Button {...buttonProps} type={buttonProps.type ?? 'link'} size={buttonProps.size ?? 'small'} onClick={popconfirm ? undefined : () => run(item)}>{label}</Button>
        const content = item.popconfirm ? (
          <Popconfirm {...item.popconfirm} onConfirm={() => void (item.popconfirm?.onConfirm?.(info(item)) ?? onClick?.(info(item)))}>
            {button}
          </Popconfirm>
        ) : button
        return <React.Fragment key={String(key)}>{renderTooltip(content as React.ReactElement, item.tooltip)}</React.Fragment>
      })}
      {overflow.length > 0 && (
        <Dropdown {...dropdownProps} menu={{ items: menuItems }} trigger={dropdownProps?.trigger ?? ['click']}>
          <Button
            {...moreButtonProps}
            type={moreButtonProps?.type ?? 'link'}
            size={moreButtonProps?.size ?? 'small'}
            className={moreButtonProps?.className ?? `${prefixCls}-actions-more`}
            icon={<DownOutlined />}
            iconPlacement="end"
          >
            {moreLabel}
          </Button>
        </Dropdown>
      )}
    </Space>
  )
}

export default ProTableActions

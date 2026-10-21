import * as React from 'react'
import { EllipsisOutlined } from '@ant-design/icons'
import { useIntl } from '@zby/intl'
import { Button, ConfigProvider, Dropdown, Popconfirm, Space, Tooltip } from 'antd'
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

function isActionShown<RecordType>(
  item: ProTableActionItem<RecordType>,
  record: RecordType | undefined,
  index: number | undefined,
) {
  const show = typeof item.show === 'function'
    ? item.show({ record, index, key: item.key })
    : item.show
  return show !== false
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
  prefixCls: customizePrefixCls,
}: ProTableActionsProps<RecordType>) {
  const { getPrefixCls } = React.useContext(ConfigProvider.ConfigContext)
  const prefixCls = getPrefixCls('pro-table', customizePrefixCls)
  const intl = useIntl()
  const moreHint = intl.getMessage('zby.pro.table.moreActions', '更多操作')
  const items = actions.filter((item): item is ProTableActionItem<RecordType> => {
    if (!item) return false
    return isActionShown(item, record, index)
  })
  const visible = items.slice(0, Math.max(0, visibleCount))
  const overflow = items.slice(Math.max(0, visibleCount))
  const holdOpenRef = React.useRef(false)
  const [holdingConfirm, setHoldingConfirm] = React.useState(false)
  const [moreOpen, setMoreOpen] = React.useState(false)
  const isOpenControlled = Boolean(dropdownProps && 'open' in dropdownProps)
  const info = (item: ProTableActionItem<RecordType>): ProTableActionInfo<RecordType> => ({ record, index, key: item.key })
  const executeClick = (item: ProTableActionItem<RecordType>) => {
    if (!item.disabled) void item.onClick?.(info(item))
  }
  const executeConfirm = (item: ProTableActionItem<RecordType>) => {
    if (item.disabled || !item.popconfirm) return
    if (item.popconfirm.onConfirm) {
      void item.popconfirm.onConfirm(info(item))
      return
    }
    void item.onClick?.(info(item))
  }
  const wrapAction = (
    item: ProTableActionItem<RecordType>,
    trigger: React.ReactElement,
    overlay?: boolean,
  ) => {
    const popconfirm = item.popconfirm
    const content = popconfirm ? (
      <Popconfirm
        {...popconfirm}
        onOpenChange={(open) => {
          popconfirm.onOpenChange?.(open)
          if (!overlay) return
          holdOpenRef.current = open
          setHoldingConfirm(open)
          if (!open) {
            setMoreOpen(false)
          }
        }}
        onConfirm={() => executeConfirm(item)}
      >
        {trigger}
      </Popconfirm>
    ) : trigger
    return renderTooltip(content, item.tooltip)
  }
  const menuItems: MenuProps['items'] = overflow.map((item) => ({
    key: String(item.key),
    label: wrapAction(
      item,
      <span onClick={item.popconfirm ? (event) => event.stopPropagation() : undefined}>
        {item.label}
      </span>,
      true,
    ),
    disabled: item.disabled,
    danger: item.danger,
    onClick: item.popconfirm ? undefined : () => executeClick(item),
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
        const { key, label, show: _show, tooltip: _tooltip, popconfirm, onClick: _onClick, ...buttonProps } = item
        const button = (
          <Button
            {...buttonProps}
            type={buttonProps.type ?? 'link'}
            size={buttonProps.size ?? 'small'}
            onClick={popconfirm ? undefined : () => executeClick(item)}
          >
            {label}
          </Button>
        )
        return <React.Fragment key={String(key)}>{wrapAction(item, button)}</React.Fragment>
      })}
      {overflow.length > 0 && (
        <Dropdown
          {...dropdownProps}
          menu={{ items: menuItems }}
          trigger={dropdownProps?.trigger ?? ['hover']}
          open={isOpenControlled ? dropdownProps?.open : holdingConfirm || moreOpen}
          onOpenChange={(open, openInfo) => {
            dropdownProps?.onOpenChange?.(open, openInfo)
            if (isOpenControlled) return
            if (!open && holdOpenRef.current) return
            setMoreOpen(open)
          }}
        >
          {moreButton}
        </Dropdown>
      )}
    </Space>
  )
}

export default ProTableActions

import * as React from 'react'
import { Button, Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import { useIntl } from '@zby/intl'

export interface ProTableBatchActionInfo<RecordType = Record<string, unknown>> {
  key: React.Key
  selectedRowKeys: React.Key[]
  selectedRows?: RecordType[]
}

export interface ProTableBatchActionItem<RecordType = Record<string, unknown>> {
  key: React.Key
  label: React.ReactNode
  hidden?: boolean
  danger?: boolean
  disabled?: boolean | ((info: ProTableBatchActionInfo<RecordType>) => boolean)
  onClick?: (info: ProTableBatchActionInfo<RecordType>) => void | Promise<void>
}

export interface ProTableBatchActionsProps<RecordType = Record<string, unknown>> {
  actions: Array<ProTableBatchActionItem<RecordType> | false | null | undefined>
  selectedRowKeys: React.Key[]
  selectedRows?: RecordType[]
  text?: React.ReactNode | ((count: number) => React.ReactNode)
  className?: string
}

export function ProTableBatchActions<RecordType>({ actions, selectedRowKeys, selectedRows, text, className }: ProTableBatchActionsProps<RecordType>) {
  const intl = useIntl()
  const items = actions.filter((item): item is ProTableBatchActionItem<RecordType> => Boolean(item && !item.hidden))
  if (items.length === 0) return null
  const count = selectedRowKeys.length
  const resolvedText =
    typeof text === 'function'
      ? text(count)
      : (text ??
        intl.getMessage('zby.pro.table.batchActions', '批量操作（已选 {{count}} 个）', { count }))
  const menuItems: MenuProps['items'] = items.map((item) => {
    const info = { key: item.key, selectedRowKeys, selectedRows }
    const disabled = count === 0 || (typeof item.disabled === 'function' ? item.disabled(info) : item.disabled)
    return {
      key: String(item.key),
      label: item.label,
      disabled,
      danger: item.danger,
      onClick: () => {
        if (!disabled) void item.onClick?.(info)
      },
    }
  })
  return <Dropdown menu={{ items: menuItems }} trigger={['click']}><Button className={className} disabled={count === 0}>{resolvedText}</Button></Dropdown>
}

export default ProTableBatchActions

import * as React from 'react'
import { Button, Dropdown, Space } from 'antd'
import type { MenuProps } from 'antd'
import { useIntl } from '@zby/intl'

import type { ProTableController, ProTableToolbarActionItem, ProTableToolbarActionInfo } from '../interface'
import { ProTableBatchActions } from '../batch-actions'

export interface ProTableToolbarActionsProps<
  RecordType = Record<string, unknown>,
  Query extends Record<string, unknown> = Record<string, unknown>,
  Summary = unknown,
> {
  actions: Array<ProTableToolbarActionItem<RecordType, Query, Summary> | false | null | undefined>
  controller?: ProTableController<RecordType, Query, Summary>
  loading?: boolean
  selectedRowKeys: React.Key[]
  selectedRows?: RecordType[]
  maxVisible?: number
  moreText?: React.ReactNode
}

function isBatchAction<RecordType, Query extends Record<string, unknown>, Summary>(item: ProTableToolbarActionItem<RecordType, Query, Summary>): item is Extract<ProTableToolbarActionItem<RecordType, Query, Summary>, { type: 'batch' }> {
  return item.type === 'batch'
}

export function ProTableToolbarActions<RecordType, Query extends Record<string, unknown>, Summary>({ actions, controller, loading, selectedRowKeys, selectedRows, maxVisible = 3, moreText }: ProTableToolbarActionsProps<RecordType, Query, Summary>) {
  const intl = useIntl()
  const resolvedMoreText = moreText ?? intl.getMessage('zby.pro.table.more', '更多')
  const items = actions.filter((item): item is ProTableToolbarActionItem<RecordType, Query, Summary> => Boolean(item && !item.hidden))
  const batch = items.filter(isBatchAction)
  const buttons = items.filter((item): item is Exclude<typeof item, { type: 'batch' }> => !isBatchAction(item))
  const visible = buttons.filter((item) => !item.overflow).slice(0, Math.max(0, maxVisible))
  const overflow = buttons.filter((item) => item.overflow || !visible.includes(item))
  const info = (item: any): ProTableToolbarActionInfo<RecordType, Query, Summary> => ({ key: item.key, controller, loading, selectedRowKeys, selectedRows })
  const menuItems: MenuProps['items'] = overflow.map((item) => {
    const actionInfo = info(item)
    const disabled = typeof item.disabled === 'function' ? item.disabled(actionInfo) : item.disabled
    return {
      key: String(item.key),
      label: item.label,
      disabled,
      onClick: () => {
        if (!disabled) void item.onClick?.(actionInfo)
      },
    }
  })
  return (
    <Space>
      {visible.map((item) => {
        const actionInfo = info(item)
        const disabled = typeof item.disabled === 'function' ? item.disabled(actionInfo) : item.disabled
        return (
          <Button
            key={String(item.key)}
            type={item.type === 'primary' ? 'primary' : 'default'}
            disabled={disabled}
            onClick={() => {
              if (!disabled) void item.onClick?.(actionInfo)
            }}
          >
            {item.label}
          </Button>
        )
      })}
      {batch.map((item) => (
        <ProTableBatchActions
          key={String(item.key)}
          actions={item.actions}
          selectedRowKeys={selectedRowKeys}
          selectedRows={selectedRows}
        />
      ))}
      {overflow.length > 0 && (
        <Dropdown menu={{ items: menuItems }} trigger={['click']}>
          <Button>{resolvedMoreText}</Button>
        </Dropdown>
      )}
    </Space>
  )
}

export default ProTableToolbarActions

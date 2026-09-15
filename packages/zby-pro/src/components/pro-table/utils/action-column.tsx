import * as React from 'react'
import type { ProTableActionColumnConfig, ProTableColumnType, ProTableController } from '../interface'
import { ProTableActions } from '../table-actions'

export function buildActionColumn<RecordType, Query extends Record<string, unknown>, Summary>(
  actionColumn: false | ProTableActionColumnConfig<RecordType, Query, Summary> | undefined,
  controller: ProTableController<RecordType, Query, Summary>,
  title?: React.ReactNode,
): ProTableColumnType<RecordType> | null {
  if (!actionColumn) return null
  const { actions, actionsProps, render, ...columnProps } = actionColumn
  return {
    title: title ?? '操作',
    key: '__actions',
    align: 'center',
    width: 88,
    fixed: 'right',
    ...columnProps,
    fieldConfig: false,
    render: render ?? ((_value: unknown, record: RecordType, index: number) => {
      const items = typeof actions === 'function' ? actions({ record, index, controller }) : actions
      return items?.length ? <ProTableActions {...actionsProps} actions={items} record={record} index={index} /> : null
    }),
  } as ProTableColumnType<RecordType>
}

export function appendActionColumn<RecordType, Query extends Record<string, unknown>, Summary>(
  columns: ProTableColumnType<RecordType>[] | undefined,
  actionColumn: false | ProTableActionColumnConfig<RecordType, Query, Summary> | undefined,
  controller: ProTableController<RecordType, Query, Summary>,
  title?: React.ReactNode,
) {
  const action = buildActionColumn(actionColumn, controller, title)
  return action ? [...(columns ?? []), action] : (columns ?? [])
}

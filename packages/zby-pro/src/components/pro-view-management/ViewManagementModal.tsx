import { useIntl } from '@zby/intl'
import * as React from 'react'

import { ProModal } from '../pro-modal'
import { SortableList } from '../pro-sortable-list'
import type { ProViewManagementView } from './interface'
import { ViewManagementRow } from './ViewManagementRow'

type ViewManagementModalProps<TSnapshot> = {
  customViews: ProViewManagementView<TSnapshot>[]
  editingViewId: string | null
  open: boolean
  prefixCls: string
  rootClassName?: string
  systemViews: ProViewManagementView<TSnapshot>[]
  onCancel: () => void
  onCancelEdit: () => void
  onDelete: (viewId: string) => void
  onRename: (viewId: string, name: string) => Promise<void>
  onReorder: (orderedViewIds: string[]) => void
  onStartEdit: (viewId: string) => void
  validateName: (
    viewId: string,
    name: string,
  ) => string | void | Promise<string | void>
}

export function ViewManagementModal<TSnapshot>({
  customViews,
  editingViewId,
  onCancel,
  onCancelEdit,
  onDelete,
  onRename,
  onReorder,
  onStartEdit,
  open,
  prefixCls,
  rootClassName,
  systemViews,
  validateName,
}: ViewManagementModalProps<TSnapshot>) {
  const intl = useIntl()

  return (
    <ProModal
      open={open}
      title={intl.getMessage(
        'zby.pro.viewManagement.viewManagementTitle',
        '视图管理',
      )}
      width={420}
      rootClassName={rootClassName}
      bodyHeightMode="height"
      okText={intl.getMessage('zby.pro.viewManagement.confirm', '确定')}
      cancelText={intl.getMessage('zby.pro.viewManagement.cancel', '取消')}
      onCancel={onCancel}
      onOk={onCancel}
    >
      <div className={`${prefixCls}-manager-list`}>
        {systemViews.map((view) => (
          <ViewManagementRow
            key={view.id}
            editing={false}
            onCancelEdit={onCancelEdit}
            onDelete={onDelete}
            onRename={onRename}
            onStartEdit={onStartEdit}
            prefixCls={prefixCls}
            validateName={validateName}
            view={view}
          />
        ))}
        <SortableList
          items={customViews}
          getKey={(view) => view.id}
          onReorder={onReorder}
          renderItem={(
            view,
            { dragHandleProps, rowRef, dragging, style },
          ) => (
            <ViewManagementRow
              key={view.id}
              dragHandleProps={dragHandleProps}
              dragging={dragging}
              rowRef={rowRef}
              style={style}
              editing={editingViewId === view.id}
              onCancelEdit={onCancelEdit}
              onDelete={onDelete}
              onRename={onRename}
              onStartEdit={onStartEdit}
              prefixCls={prefixCls}
              validateName={validateName}
              view={view}
            />
          )}
        />
      </div>
    </ProModal>
  )
}

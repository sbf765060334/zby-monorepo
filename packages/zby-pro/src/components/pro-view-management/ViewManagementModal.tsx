import { useIntl } from '@zby/intl'
import * as React from 'react'

import { ProModal } from '../pro-modal'
import { SortableList } from '../pro-sortable-list'
import { restrictToFirstScrollableAncestor } from '../pro-sortable-list/restrict-transform'
import type { ProViewManagementView } from './interface'
import {
  normalizeCustomViews,
  validateRenameViewName,
  type ViewNameValidationMessages,
} from './utils'
import { ViewManagementRow } from './ViewManagementRow'

const viewDragModifiers = [restrictToFirstScrollableAncestor]

type ViewManagementModalProps<TSnapshot> = {
  customViews: ProViewManagementView<TSnapshot>[]
  open: boolean
  prefixCls: string
  rootClassName?: string
  systemViews: ProViewManagementView<TSnapshot>[]
  onCancel: () => void
  onConfirm: (
    views: ProViewManagementView<TSnapshot>[],
  ) => void | Promise<void>
}

export function ViewManagementModal<TSnapshot>({
  customViews,
  onCancel,
  onConfirm,
  open,
  prefixCls,
  rootClassName,
  systemViews,
}: ViewManagementModalProps<TSnapshot>) {
  const intl = useIntl()
  const [draftViews, setDraftViews] = React.useState(customViews)
  const [editingViewId, setEditingViewId] = React.useState<string | null>(null)
  const customViewsRef = React.useRef(customViews)
  customViewsRef.current = customViews
  const validationMessages = React.useMemo<ViewNameValidationMessages>(
    () => ({
      required: intl.getMessage(
        'zby.pro.viewManagement.viewRequired',
        '请输入视图名称',
      ),
      duplicated: intl.getMessage(
        'zby.pro.viewManagement.viewDuplicated',
        '视图名称已存在',
      ),
      maxCustomViews: (count) =>
        intl.getMessage(
          'zby.pro.viewManagement.maxCustomViews',
          '最多只能创建 {{count}} 个自定义视图',
          { count },
        ),
    }),
    [intl],
  )

  React.useEffect(() => {
    if (!open) {
      return
    }

    setDraftViews(customViewsRef.current.map((view) => ({ ...view })))
    setEditingViewId(null)
  }, [open])

  const handleRename = async (viewId: string, name: string) => {
    const validationMessage = validateRenameViewName(
      {
        customViews: draftViews,
        name,
        systemViews,
        viewId,
      },
      validationMessages,
    )

    if (validationMessage) {
      throw new Error(validationMessage)
    }

    setDraftViews((current) =>
      normalizeCustomViews(
        current.map((view) => (view.id === viewId ? { ...view, name } : view)),
      ),
    )
    setEditingViewId(null)
  }

  const handleDelete = (viewId: string) => {
    setDraftViews((current) =>
      normalizeCustomViews(current.filter((view) => view.id !== viewId)),
    )
    setEditingViewId((current) => (current === viewId ? null : current))
  }

  const handleReorder = (orderedViewIds: string[]) => {
    const orderLookup = new Map(
      orderedViewIds.map((viewId, index) => [viewId, index]),
    )

    setDraftViews((current) =>
      normalizeCustomViews(
        current.map((view, index) => ({
          ...view,
          order: orderLookup.get(view.id) ?? index,
        })),
      ),
    )
  }

  const validateName = (viewId: string, name: string) =>
    validateRenameViewName(
      {
        customViews: draftViews,
        name,
        systemViews,
        viewId,
      },
      validationMessages,
    )

  return (
    <ProModal
      open={open}
      title={intl.getMessage(
        'zby.pro.viewManagement.viewManagementTitle',
        '视图管理',
      )}
      width={420}
      rootClassName={rootClassName}
      bodyHeightMode="fill"
      okText={intl.getMessage('zby.pro.viewManagement.confirm', '确定')}
      cancelText={intl.getMessage('zby.pro.viewManagement.cancel', '取消')}
      onCancel={onCancel}
      onOk={() => onConfirm(draftViews)}
    >
      <div className={`${prefixCls}-manager-list`}>
        {systemViews.map((view) => (
          <ViewManagementRow
            key={view.id}
            editing={false}
            onCancelEdit={() => setEditingViewId(null)}
            onDelete={handleDelete}
            onRename={handleRename}
            onStartEdit={setEditingViewId}
            prefixCls={prefixCls}
            validateName={validateName}
            view={view}
          />
        ))}
        <SortableList
          items={draftViews}
          getKey={(view) => view.id}
          modifiers={viewDragModifiers}
          onReorder={handleReorder}
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
              onCancelEdit={() => setEditingViewId(null)}
              onDelete={handleDelete}
              onRename={handleRename}
              onStartEdit={setEditingViewId}
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

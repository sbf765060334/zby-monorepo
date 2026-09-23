import { PlusOutlined, SettingOutlined } from '@ant-design/icons'
import { useEvent } from '@rc-component/util'
import { useIntl } from '@zby/intl'
import type { SelectProps } from 'antd'
import { Button, Select, Typography } from 'antd'
import { clsx } from 'clsx'
import * as React from 'react'

import type { ProViewManagementView } from './interface'

const DEFAULT_POPUP_WIDTH = 220

type ViewSelectorProps<TSnapshot> = {
  actionsDisabled?: boolean
  activeView: ProViewManagementView<TSnapshot> | null
  counts: Record<string, number | undefined | null>
  disabled?: boolean
  customViewsDisabled?: boolean
  loadError?: unknown
  loading?: boolean
  prefixCls: string
  popupWidth?: number
  popupRootClassName?: string
  showCount: boolean
  systemViews: ProViewManagementView<TSnapshot>[]
  customViews: ProViewManagementView<TSnapshot>[]
  onCreate: () => void
  onManage: () => void
  onSelect: (viewId: string) => void
}

type ViewSelectOption<TSnapshot> = {
  disabled?: boolean
  label: string
  title?: string
  value?: string
  view?: ProViewManagementView<TSnapshot>
  count?: number | undefined | null
  options?: ViewSelectOption<TSnapshot>[]
  [key: string]: unknown
}

function renderOptionLabel<TSnapshot>(
  view: ProViewManagementView<TSnapshot>,
  count: number | undefined | null,
  showCount: boolean,
  prefixCls: string,
) {
  return (
    <span className={`${prefixCls}-selector-option`}>
      <span className={`${prefixCls}-selector-option-name`} title={view.name}>
        {view.name}
      </span>
      {showCount && count !== undefined && count !== null ? (
        <span className={`${prefixCls}-selector-option-count`}>{count}</span>
      ) : null}
    </span>
  )
}

function renderSelectorLabel<TSnapshot>(
  activeView: ProViewManagementView<TSnapshot>,
  activeCount: number | undefined | null,
  showCount: boolean,
  prefixCls: string,
) {
  const showActiveCount =
    showCount && activeCount !== undefined && activeCount !== null

  return (
    <span className={`${prefixCls}-selector-label`}>
      <Typography.Text
        className={`${prefixCls}-selector-label-name`}
        ellipsis={{ tooltip: true }}
      >
        {activeView.name}
      </Typography.Text>
      {showActiveCount ? (
        <span className={`${prefixCls}-selector-label-count`}>
          ({activeCount})
        </span>
      ) : null}
    </span>
  )
}

export function ViewSelector<TSnapshot>({
  actionsDisabled = false,
  activeView,
  counts,
  customViews,
  customViewsDisabled = false,
  disabled = false,
  loadError,
  loading = false,
  onCreate,
  onManage,
  onSelect,
  prefixCls,
  popupWidth,
  popupRootClassName,
  showCount,
  systemViews,
}: ViewSelectorProps<TSnapshot>) {
  const intl = useIntl()
  const [open, setOpen] = React.useState(false)
  const selectDisabled = disabled || loading
  const footerActionsDisabled = selectDisabled || actionsDisabled
  const options: SelectProps<string, ViewSelectOption<TSnapshot>>['options'] =
    React.useMemo(
      () =>
        [
          systemViews.length > 0
            ? {
                label: intl.getMessage(
                  'zby.pro.viewManagement.systemViews',
                  '系统视图',
                ),
                title: intl.getMessage(
                  'zby.pro.viewManagement.systemViews',
                  '系统视图',
                ),
                options: systemViews.map((view) => ({
                  label: view.name,
                  title: view.name,
                  value: view.id,
                  view,
                  count: counts[view.id],
                })),
              }
            : null,
          customViews.length > 0
            ? {
                label: intl.getMessage(
                  'zby.pro.viewManagement.customViews',
                  '自定义视图',
                ),
                title: intl.getMessage(
                  'zby.pro.viewManagement.customViews',
                  '自定义视图',
                ),
                options: customViews.map((view) => ({
                  disabled: customViewsDisabled,
                  label: view.name,
                  title: view.name,
                  value: view.id,
                  view,
                  count: counts[view.id],
                })),
              }
            : null,
        ].filter(Boolean) as ViewSelectOption<TSnapshot>[],
      [counts, customViews, customViewsDisabled, intl, systemViews],
    )
  const activeCount = activeView ? counts[activeView.id] : undefined
  const selectClassNames: SelectProps<
    string,
    ViewSelectOption<TSnapshot>
  >['classNames'] = React.useMemo(
    () => ({
      popup: {
        root: clsx(popupRootClassName, `${prefixCls}-selector-popup`),
      },
    }),
    [popupRootClassName, prefixCls],
  )

  const handleOpenChange = useEvent((nextOpen: boolean) => {
    if (selectDisabled) {
      setOpen(false)
      return
    }

    setOpen(nextOpen)
  })

  const handleSelect = useEvent((value: string) => {
    if (selectDisabled) {
      return
    }

    const nextSystemView = systemViews.find((view) => view.id === value)

    if (!nextSystemView && customViewsDisabled) {
      return
    }

    setOpen(false)
    onSelect(value)
  })

  const handleCreate = useEvent(() => {
    if (footerActionsDisabled) {
      return
    }

    setOpen(false)
    onCreate()
  })

  const handleManage = useEvent(() => {
    if (footerActionsDisabled) {
      return
    }

    setOpen(false)
    onManage()
  })

  const optionRender: SelectProps<
    string,
    ViewSelectOption<TSnapshot>
  >['optionRender'] = useEvent((option) => {
    const { view, count } = option.data

    if (!view) {
      return option.label
    }

    return renderOptionLabel(view, count, showCount, prefixCls)
  })
  const labelRender: SelectProps<
    string,
    ViewSelectOption<TSnapshot>
  >['labelRender'] = useEvent(() => {
    if (!activeView) {
      return null
    }

    return renderSelectorLabel(activeView, activeCount, showCount, prefixCls)
  })

  return (
    <Select<string, ViewSelectOption<TSnapshot>>
      className={`${prefixCls}-selector`}
      classNames={selectClassNames}
      labelRender={labelRender}
      listHeight={320}
      disabled={selectDisabled}
      loading={loading}
      open={selectDisabled ? false : open}
      optionRender={optionRender}
      options={options}
      placeholder={
        loading
          ? intl.getMessage(
              'zby.pro.viewManagement.loadingViews',
              '加载视图中',
            )
          : loadError
            ? intl.getMessage(
                'zby.pro.viewManagement.loadViewsError',
                '视图加载失败',
              )
            : intl.getMessage(
                'zby.pro.viewManagement.selectView',
                '请选择视图',
              )
      }
      popupMatchSelectWidth={popupWidth ?? DEFAULT_POPUP_WIDTH}
      popupRender={(originNode) => (
        <>
          {originNode}
          <div className={`${prefixCls}-selector-footer`}>
            <Button
              type="text"
              autoInsertSpace={false}
              disabled={footerActionsDisabled}
              icon={<PlusOutlined />}
              onClick={handleCreate}
            >
              {intl.getMessage(
                'zby.pro.viewManagement.createView',
                '新建视图',
              )}
            </Button>
            <Button
              type="text"
              autoInsertSpace={false}
              disabled={footerActionsDisabled}
              icon={<SettingOutlined />}
              onClick={handleManage}
            >
              {intl.getMessage(
                'zby.pro.viewManagement.viewManagementTitle',
                '视图管理',
              )}
            </Button>
          </div>
        </>
      )}
      showSearch={{
        optionFilterProp: 'label',
      }}
      value={activeView?.id}
      onChange={(value) => handleSelect(value)}
      onOpenChange={handleOpenChange}
      status={loadError ? 'error' : undefined}
      variant="filled"
    />
  )
}

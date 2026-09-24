import React, { memo, useCallback, useMemo } from 'react'
import { FullscreenExitOutlined, FullscreenOutlined, ReloadOutlined, SettingOutlined } from '@ant-design/icons'
import { useIntl } from '@zby/intl'
import { ActionIcon } from '@zby/ui'
import { clsx } from 'clsx'

import type { ProTableController, ProTableProps } from '../interface'
import { shallow, useControllerSelector, useViewStoreSelector } from '../hooks'
import type { ProTableViewStore } from '../store'

const RELOAD_ICON = <ReloadOutlined />
const SETTING_ICON = <SettingOutlined />
const FULLSCREEN_ICON = <FullscreenOutlined />
const FULLSCREEN_EXIT_ICON = <FullscreenExitOutlined />

type ToolbarConfigValue<RecordType, Query extends Record<string, unknown>, Summary> = Exclude<
  ProTableProps<RecordType, Query, Summary>['toolbar'],
  boolean | undefined
>

type ToolbarRegionProps<RecordType, Query extends Record<string, unknown>, Summary> = {
  controller: ProTableController<RecordType, Query, Summary>
  toolbar: ToolbarConfigValue<RecordType, Query, Summary>
  columnSettingEnabled: boolean
  fullscreenEnabled: boolean
  viewStore: ProTableViewStore
  prefixCls: string
  className?: string
  style?: React.CSSProperties
}

function resolveNode<NodeContext, Value>(
  candidate: Value | ((context: NodeContext) => Value) | undefined,
  context: NodeContext,
) {
  return typeof candidate === 'function'
    ? (candidate as (context: NodeContext) => Value)(context)
    : candidate
}

const ToolbarRefreshButton = memo(
  ({
    controller,
    loading,
  }: {
    controller: ProTableController<any, any, any>
    loading: boolean
  }) => {
    const intl = useIntl()
    const handleReload = useCallback(() => {
      void controller.reload()
    }, [controller])
    const label = intl.getMessage('zby.pro.table.refresh', '刷新')

    return (
      <ActionIcon
        size="small"
        disabled={loading}
        icon={RELOAD_ICON}
        title={label}
        aria-label={label}
        onClick={handleReload}
      />
    )
  },
)

ToolbarRefreshButton.displayName = 'ProTableToolbarRefreshButton'

const ToolbarColumnsStateButton = memo(({ viewStore }: { viewStore: ProTableViewStore }) => {
  const intl = useIntl()
  const columnsModalOpen = useViewStoreSelector(viewStore, (state) => state.columnsModalOpen)
  const handleOpenColumnsModal = useCallback(() => {
    viewStore.getState().setColumnsModalOpen(true)
  }, [viewStore])
  const label = intl.getMessage('zby.pro.table.columnSetting', '列设置')

  return (
    <ActionIcon
      size="small"
      icon={SETTING_ICON}
      title={label}
      aria-label={label}
      selected={columnsModalOpen}
      onClick={handleOpenColumnsModal}
    />
  )
})

ToolbarColumnsStateButton.displayName = 'ProTableToolbarColumnsStateButton'

const ToolbarFullscreenButton = memo(({ viewStore }: { viewStore: ProTableViewStore }) => {
  const intl = useIntl()
  const fullscreenActive = useViewStoreSelector(viewStore, (state) => state.fullscreenActive)
  const handleToggleFullscreen = useCallback(() => {
    viewStore.getState().setFullscreenActive(!viewStore.getState().fullscreenActive)
  }, [viewStore])
  const fullscreenLabel = fullscreenActive
    ? intl.getMessage('zby.pro.table.exitFullScreen', '退出全屏')
    : intl.getMessage('zby.pro.table.fullScreen', '全屏')

  return (
    <ActionIcon
      size="small"
      icon={fullscreenActive ? FULLSCREEN_EXIT_ICON : FULLSCREEN_ICON}
      title={fullscreenLabel}
      aria-label={fullscreenLabel}
      selected={fullscreenActive}
      onClick={handleToggleFullscreen}
    />
  )
})

ToolbarFullscreenButton.displayName = 'ProTableToolbarFullscreenButton'

function ToolbarRegionInner<RecordType, Query extends Record<string, unknown>, Summary>({
  controller,
  toolbar,
  columnSettingEnabled,
  fullscreenEnabled,
  viewStore,
  prefixCls,
  className,
  style,
}: ToolbarRegionProps<RecordType, Query, Summary>) {
  const toolbarState = useControllerSelector(
    controller,
    (state) => ({
      loading: state.loading,
      selectedRowKeys: state.selectedRowKeys,
    }),
    shallow,
  )
  const actions = useMemo(
    () => ({
      controller,
      loading: toolbarState.loading,
      selectedRowKeys: toolbarState.selectedRowKeys,
    }),
    [controller, toolbarState.loading, toolbarState.selectedRowKeys],
  )

  const left = resolveNode(toolbar.actions, actions)
  const right = resolveNode(toolbar.extra, actions)
  const showRefresh = toolbar.refresh !== false
  const showColumnSetting = columnSettingEnabled
  const showFullscreen = fullscreenEnabled && toolbar.fullscreen !== false

  if (!left && !right && !showRefresh && !showColumnSetting && !showFullscreen) {
    return null
  }

  return (
    <div className={clsx(`${prefixCls}-toolbar`, className)} style={style}>
      <div className={`${prefixCls}-toolbar-actions`}>{left}</div>
      <div className={`${prefixCls}-toolbar-extra`}>
        {right}
        {showRefresh && (
          <ToolbarRefreshButton controller={controller} loading={toolbarState.loading} />
        )}
        {showColumnSetting && <ToolbarColumnsStateButton viewStore={viewStore} />}
        {showFullscreen && <ToolbarFullscreenButton viewStore={viewStore} />}
      </div>
    </div>
  )
}

const MemoToolbarRegion = memo(ToolbarRegionInner) as typeof ToolbarRegionInner & {
  displayName?: string
}

MemoToolbarRegion.displayName = 'ProTableToolbarRegion'

export const ToolbarRegion = MemoToolbarRegion
export default ToolbarRegion

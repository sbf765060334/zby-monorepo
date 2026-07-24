import { preloadRoute } from '@zby/router-core'
import { useRouterCore, useRouterCoreSelector } from '@zby/router-core/react'
import { CloseOutlined, PushpinFilled, PushpinOutlined } from '@ant-design/icons'
import { Flex, Tooltip } from 'antd'
import { clsx } from 'clsx'
import { memo, useMemo } from 'react'

import type { RouterCoreState } from '@zby/router-core'
import type { TabsProps } from 'antd'
import type { ProLayoutRoute } from '../types'
import SortableTabs from './SortableTabs'

export interface PageTabsProps {
  prefixCls: string
}

/** 全局路由页签，只通过 RouterCore 命令改变领域状态。 */
function PageTabs(props: PageTabsProps) {
  const { prefixCls } = props
  const router = useRouterCore<ProLayoutRoute>()
  const tabs = useRouterCoreSelector(
    (state: RouterCoreState<ProLayoutRoute>) => state.tabs,
  )
  const pages = useRouterCoreSelector(
    (state: RouterCoreState<ProLayoutRoute>) => state.pages,
  )
  const activeKey = useRouterCoreSelector(
    (state: RouterCoreState<ProLayoutRoute>) => state.activeTabKey,
  )
  const fixedKeys = useRouterCoreSelector(
    (state: RouterCoreState<ProLayoutRoute>) => state.fixedSet,
  )
  const descriptions = useRouterCoreSelector(
    (state: RouterCoreState<ProLayoutRoute>) => state.pathnameDescriptionMap,
  )
  const items = useMemo<NonNullable<TabsProps['items']>>(
    () => tabs.map((tab) => {
      const fixed = fixedKeys.includes(tab.key)
      const pathname = pages.find((page) => page.key === tab.key)?.pathname || tab.key
      const description = descriptions[pathname]
      const label = (
        <Flex
          align="center"
          gap={4}
          className={clsx(`${prefixCls}-tab-label-wrap`, {
            [`${prefixCls}-tab-label-wrap-fixed`]: fixed,
          })}
        >
          {fixed ? (
            <PushpinFilled
              className={`${prefixCls}-fixed-icon`}
              onPointerDown={stopEvent}
              onClick={(event) => {
                stopEvent(event)
                router.toggleFixed(tab.key)
              }}
            />
          ) : (
            <PushpinOutlined
              className={`${prefixCls}-fixed-icon`}
              onPointerDown={stopEvent}
              onClick={(event) => {
                stopEvent(event)
                router.toggleFixed(tab.key)
              }}
            />
          )}
          <span className={`${prefixCls}-tab-label`}>{tab.label}</span>
        </Flex>
      )

      return {
        key: tab.key,
        label: description ? (
          <Tooltip placement="bottomLeft" title={description}>
            {label}
          </Tooltip>
        ) : label,
        closable: true,
      }
    }),
    [descriptions, fixedKeys, pages, prefixCls, router, tabs],
  )

  const handleEdit: NonNullable<TabsProps['onEdit']> = (key, action) => {
    if (action === 'remove')
      void router.closeTab(String(key))
  }

  const handlePreload = (tabKey: string) => {
    const pathname = pages.find((page) => page.key === tabKey)?.pathname || tabKey
    const leaf = router.registry.resolveLeafRoute(pathname, { withinAuth: true })
    preloadRoute(leaf?.route)
  }

  return (
    <SortableTabs
      prefixCls={prefixCls}
      items={items}
      fixedKeys={fixedKeys}
      activeKey={activeKey || undefined}
      type={items.length <= 1 ? 'card' : 'editable-card'}
      size="small"
      hideAdd
      removeIcon={<CloseOutlined onPointerDown={stopEvent} />}
      onChange={(key) => router.jumpTo(key)}
      onEdit={handleEdit}
      onPreload={handlePreload}
      onReorder={(keys) => router.reorderTabs(keys)}
    />
  )
}

function stopEvent(event: { stopPropagation: () => void }) {
  event.stopPropagation()
}

export default memo(PageTabs)

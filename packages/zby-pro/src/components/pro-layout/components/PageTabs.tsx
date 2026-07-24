import { preloadRoute } from '@zby/router-core'
import { useRouterCore, useRouterCoreSelector } from '@zby/router-core/react'
import { CloseOutlined, PushpinFilled, PushpinOutlined } from '@ant-design/icons'
import { useIntl } from '@zby/intl'
import { Flex, Tooltip } from 'antd'
import { clsx } from 'clsx'
import { memo, useMemo } from 'react'

import type { RouterCoreState } from '@zby/router-core'
import type { TabsProps } from 'antd'
import type { ProLayoutRoute } from '../types'
import FavoriteMenuPanel from './FavoriteMenuPanel'
import SortableTabs from './SortableTabs'

export interface PageTabsProps {
  prefixCls: string
  hashId: string
}

/** 全局路由页签，只通过 RouterCore 命令改变领域状态。 */
function PageTabs(props: PageTabsProps) {
  const { hashId, prefixCls } = props
  const intl = useIntl()
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
  const fixedKeySet = useMemo(() => new Set(fixedKeys), [fixedKeys])
  const pagePathnameMap = useMemo(
    () => new Map(pages.map((page) => [page.key, page.pathname])),
    [pages],
  )
  const items = useMemo<NonNullable<TabsProps['items']>>(
    () => tabs.map((tab) => {
      const fixed = fixedKeySet.has(tab.key)
      const pathname = pagePathnameMap.get(tab.key) || tab.key
      const description = descriptions[pathname]
      const PinIcon = fixed ? PushpinFilled : PushpinOutlined
      const pinLabel = fixed
        ? intl.getMessage('zby.pro.layout.tabs.unpin', '取消固定页签：{{title}}', {
            title: tab.label,
          })
        : intl.getMessage('zby.pro.layout.tabs.pin', '固定页签：{{title}}', {
            title: tab.label,
          })
      const label = (
        <Flex
          align="center"
          className={clsx(`${prefixCls}-tab-label-wrap`, {
            [`${prefixCls}-tab-label-wrap-fixed`]: fixed,
            [`${prefixCls}-tab-label-wrap-unfixed`]: !fixed,
          })}
        >
          <button
            type="button"
            className={clsx(`${prefixCls}-fixed-icon`, {
              [`${prefixCls}-fixed-icon-active`]: fixed,
              [`${prefixCls}-fixed-icon-unfixed`]: !fixed,
            })}
            aria-label={pinLabel}
            aria-pressed={fixed}
            title={pinLabel}
            onKeyDown={stopEvent}
            onPointerDown={stopEvent}
            onClick={(event) => {
              stopEvent(event)
              router.toggleFixed(tab.key)
            }}
          >
            <PinIcon />
          </button>
          <span
            className={clsx(`${prefixCls}-tab-label`, {
              [`${prefixCls}-tab-label-fixed`]: fixed,
              [`${prefixCls}-tab-label-unfixed`]: !fixed,
            })}
          >
            {tab.label}
          </span>
        </Flex>
      )

      return {
        key: tab.key,
        label: description ? (
          <Tooltip arrow={false} placement="bottomLeft" title={description}>
            {label}
          </Tooltip>
        ) : label,
        closable: true,
      }
    }),
    [descriptions, fixedKeySet, intl, pagePathnameMap, prefixCls, router, tabs],
  )

  const handleEdit: NonNullable<TabsProps['onEdit']> = (key, action) => {
    if (action === 'remove')
      void router.closeTab(String(key))
  }

  const handlePreload = (tabKey: string) => {
    const pathname = pagePathnameMap.get(tabKey) || tabKey
    const leaf = router.registry.resolveLeafRoute(pathname, { withinAuth: true })
    preloadRoute(leaf?.route)
  }

  const tabType = items.length <= 1 ? 'card' : 'editable-card'

  return (
    <SortableTabs
      key={tabType}
      prefixCls={prefixCls}
      items={items}
      fixedKeys={fixedKeys}
      activeKey={activeKey || undefined}
      type={tabType}
      size="small"
      hideAdd
      removeIcon={<CloseOutlined onPointerDown={stopEvent} />}
      onChange={(key) => router.jumpTo(key)}
      onEdit={handleEdit}
      onPreload={handlePreload}
      onReorder={(keys) => router.reorderTabs(keys)}
      tabBarExtraContent={<FavoriteMenuPanel prefixCls={prefixCls} hashId={hashId} />}
      style={{ maxWidth: '100%' }}
    />
  )
}

function stopEvent(event: { stopPropagation: () => void }) {
  event.stopPropagation()
}

export default memo(PageTabs)

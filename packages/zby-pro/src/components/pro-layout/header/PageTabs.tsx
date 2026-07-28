import { preloadRoute } from '@zby/router-core'
import { useRouterCore, useRouterCoreSelector } from '@zby/router-core/react'
import { CloseOutlined, PushpinFilled, PushpinOutlined } from '@ant-design/icons'
import { useIntl } from '@zby/intl'
import { Flex, message, Tooltip } from 'antd'
import { clsx } from 'clsx'
import { memo, useMemo } from 'react'

import type { RouterCoreState } from '@zby/router-core'
import type { TabsProps } from 'antd'
import type { ProLayoutRoute } from '../types'
import FavoriteMenuPanel from './FavoriteMenuPanel'
import SortableTabs from './SortableTabs'

/** Header 专属的 RouterCore 全局页签属性。 */
export interface PageTabsProps {
  prefixCls: string
  hashId: string
}

/** 全局路由页签，只通过 RouterCore 命令改变领域状态。 */
function PageTabs(props: PageTabsProps) {
  const { hashId, prefixCls } = props
  const intl = useIntl()
  const [messageApi, messageContextHolder] = message.useMessage()
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
  const maxFixedTabCount = useRouterCoreSelector(
    (state: RouterCoreState<ProLayoutRoute>) => state.maxFixedTabCount,
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
              if (!fixed && fixedKeys.length >= maxFixedTabCount) {
                void messageApi.info(
                  intl.getMessage(
                    'zby.pro.layout.tabs.maxFixedTabs',
                    '最多钉住{{count}}个标签，请先取消一个钉住标签',
                    { count: maxFixedTabCount },
                  ),
                )
                return
              }
              if (router.toggleFixed(tab.key)) {
                void messageApi.success(
                  fixed
                    ? intl.getMessage(
                        'zby.pro.layout.tabs.unfixedSuccess',
                        '已取消页签固定',
                      )
                    : intl.getMessage(
                        'zby.pro.layout.tabs.fixedSuccess',
                        '页签固定成功',
                      ),
                )
              }
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
    [descriptions, fixedKeySet, fixedKeys.length, intl, maxFixedTabCount, messageApi, pagePathnameMap, prefixCls, router, tabs],
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
    <>
      {messageContextHolder}
      <SortableTabs
        key={tabType}
        prefixCls={prefixCls}
        items={items}
        fixedKeys={fixedKeys}
        activeKey={activeKey || undefined}
        type={tabType}
        size="middle"
        hideAdd
        classNames={{
          popup: {
            root: clsx(`${prefixCls}-tabs-dropdown`, hashId),
          },
        }}
        removeIcon={<CloseOutlined onPointerDown={stopEvent} />}
        onChange={(key) => router.jumpTo(key)}
        onEdit={handleEdit}
        onPreload={handlePreload}
        onReorder={(keys) => router.reorderTabs(keys)}
        onReorderRejected={(reason) => {
          void messageApi.info(
            reason === 'unfixedBeforeFixed'
              ? intl.getMessage(
                  'zby.pro.layout.tabs.unfixedBeforeFixed',
                  '非固定标签不能拖动到固定标签之前',
                )
              : intl.getMessage(
                  'zby.pro.layout.tabs.fixedAfterUnfixed',
                  '固定标签不能拖动到非固定标签之后',
                ),
          )
        }}
        tabBarExtraContent={<FavoriteMenuPanel prefixCls={prefixCls} hashId={hashId} />}
        style={{ maxWidth: '100%' }}
      />
    </>
  )
}

function stopEvent(event: { stopPropagation: () => void }) {
  event.stopPropagation()
}

export default memo(PageTabs)

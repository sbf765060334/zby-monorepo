import { preloadRoute } from '@zby/router-core'
import { useRouterCore, useRouterCoreSelector } from '@zby/router-core/react'
import { CloseOutlined, PushpinFilled, PushpinOutlined } from '@ant-design/icons'
import { useIntl } from '@zby/intl'
import { Flex, message } from 'antd'
import { clsx } from 'clsx'
import { memo, useMemo } from 'react'

import { resolveProLayoutTitle } from '../title'

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
  const storageSettled = useRouterCoreSelector(
    (state: RouterCoreState<ProLayoutRoute>) =>
      state.storageHydrated || state.storageLoadError !== undefined,
  )
  const fixedKeySet = useMemo(() => new Set(fixedKeys), [fixedKeys])
  const pagePathnameMap = useMemo(
    () => new Map(pages.map((page) => [page.key, page.pathname])),
    [pages],
  )
  const items = useMemo<NonNullable<TabsProps['items']>>(
    () => tabs.map((tab) => {
      const fixed = fixedKeySet.has(tab.key)
      const PinIcon = fixed ? PushpinFilled : PushpinOutlined
      // tab.label 是描述符而不是成品文案，必须先解释再参与拼接和展示。
      const tabTitle = resolveProLayoutTitle(intl, tab.label)
      const pinLabel = fixed
        ? intl.getMessage('zby.pro.layout.tabs.unpin', '取消固定页签：{{title}}', {
            title: tabTitle,
          })
        : intl.getMessage('zby.pro.layout.tabs.pin', '固定页签：{{title}}', {
            title: tabTitle,
          })
      const label = (
        <Flex
          align="center"
          flex={1}
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
            title={tabTitle}
          >
            {tabTitle}
          </span>
        </Flex>
      )

      return {
        key: tab.key,
        label,
        closable: true,
      }
    }),
    // intl.locale 必须在依赖里：切换语言时 intl 本身的引用不变，只有它会变化。
    [
      fixedKeySet,
      fixedKeys.length,
      intl,
      intl.locale,
      maxFixedTabCount,
      messageApi,
      prefixCls,
      router,
      tabs,
    ],
  )

  const handleEdit: NonNullable<TabsProps['onEdit']> = (key, action) => {
    if (action !== 'remove')
      return

    void router.closeTab(String(key)).catch((error) => {
      console.error('[ProLayout] Failed to close tab.', error)
      void messageApi.error(
        intl.getMessage(
          'zby.pro.layout.tabs.closeFailed',
          '页签关闭失败，请稍后重试',
        ),
      )
    })
  }

  const handlePreload = (tabKey: string) => {
    const pathname = pagePathnameMap.get(tabKey) || tabKey
    const leaf = router.registry.resolveLeafRoute(pathname, { withinAuth: true })
    preloadRoute(leaf?.route)
  }

  const tabType = items.length <= 1 ? 'card' : 'editable-card'

  if (!storageSettled)
    return null

  return (
    <>
      {messageContextHolder}
      <SortableTabs
        prefixCls={prefixCls}
        items={items}
        fixedKeys={fixedKeys}
        activeKey={activeKey ?? ''}
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

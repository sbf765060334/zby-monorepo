import { useRouterCore, useRouterCoreSelector } from '@zby/router-core/react'
import { CloseOutlined, PushpinFilled, PushpinOutlined } from '@ant-design/icons'
import { useIntl } from '@zby/intl'
import { Flex, message } from 'antd'
import { clsx } from 'clsx'
import { memo, useMemo, useRef } from 'react'

import { resolveProLayoutTitle } from '../title'

import type { RouterCoreState } from '@zby/router-core'
import type { MenuProps, TabsProps } from 'antd'
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
  const orderedKeys = useMemo(
    () => orderTabKeys(tabs.map((tab) => tab.key), fixedKeys),
    [fixedKeys, tabs],
  )
  const batchCloseAwaitingGuard = useRouterCoreSelector(
    (state: RouterCoreState<ProLayoutRoute>) => state.batchCloseAwaitingGuard,
  )
  const closingBatchRef = useRef(false)
  const reportCloseFailure = (error: unknown, batch = false) => {
    console.error('[ProLayout] Failed to close tab.', error)
    void messageApi.error(batch
      ? intl.getMessage(
          'zby.pro.layout.tabs.closeBatchFailed',
          '有页签未能关闭',
        )
      : intl.getMessage(
          'zby.pro.layout.tabs.closeFailed',
          '页签关闭失败，请稍后重试',
        ))
  }
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
    if (action !== 'remove' || closingBatchRef.current || batchCloseAwaitingGuard)
      return

    void router.closeTab(String(key)).catch(reportCloseFailure)
  }

  const handleTabContextAction = (anchorKey: string, action: string) => {
    if (closingBatchRef.current || batchCloseAwaitingGuard || !isTabContextAction(action))
      return
    const disabled = getTabContextMenuDisabled(orderedKeys, anchorKey)
    if (disabled[action])
      return
    if (action === 'close') {
      void router.closeTab(anchorKey).catch(reportCloseFailure)
      return
    }

    const keys = getTabCloseKeys(orderedKeys, anchorKey, action)
    closingBatchRef.current = true
    void router.closeTabs(keys, { anchorKey })
      .catch((error) => reportCloseFailure(error, true))
      .finally(() => {
        closingBatchRef.current = false
      })
  }

  const tabContextMenu = {
    className: clsx(`${prefixCls}-tab-context-menu`, hashId),
    getItems: (tabKey: string) => {
      const disabled = getTabContextMenuDisabled(orderedKeys, tabKey)
      const items: NonNullable<MenuProps['items']> = [
        {
          key: 'close',
          label: intl.getMessage('zby.pro.layout.tabs.close', '关闭'),
          disabled: batchCloseAwaitingGuard || disabled.close,
        },
        {
          key: 'closeOthers',
          label: intl.getMessage('zby.pro.layout.tabs.closeOthers', '关闭其他页签'),
          disabled: batchCloseAwaitingGuard || disabled.closeOthers,
        },
        {
          key: 'closeRight',
          label: intl.getMessage('zby.pro.layout.tabs.closeRight', '关闭右侧页签'),
          disabled: batchCloseAwaitingGuard || disabled.closeRight,
        },
        {
          key: 'closeLeft',
          label: intl.getMessage('zby.pro.layout.tabs.closeLeft', '关闭左侧页签'),
          disabled: batchCloseAwaitingGuard || disabled.closeLeft,
        },
      ]
      return items
    },
    onAction: handleTabContextAction,
  }

  const tabType = items.length <= 1 ? 'card' : 'editable-card'

  if (!storageSettled)
    return null

  return (
    <>
      {messageContextHolder}
      <SortableTabs
        prefixCls={prefixCls}
        className={batchCloseAwaitingGuard ? `${prefixCls}-tabs-close-disabled` : undefined}
        items={items}
        fixedKeys={fixedKeys}
        tabContextMenu={tabContextMenu}
        activeKey={activeKey ?? ''}
        type={tabType}
        size="middle"
        hideAdd
        classNames={{
          popup: {
            root: clsx(
              `${prefixCls}-tabs-dropdown`,
              hashId,
              batchCloseAwaitingGuard && `${prefixCls}-tabs-close-disabled`,
            ),
          },
        }}
        removeIcon={<CloseOutlined onPointerDown={stopEvent} />}
        onChange={(key) => router.jumpTo(key)}
        onEdit={handleEdit}
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

type TabContextAction = 'close' | 'closeLeft' | 'closeRight' | 'closeOthers'

function isTabContextAction(action: string): action is TabContextAction {
  return action === 'close' ||
    action === 'closeLeft' ||
    action === 'closeRight' ||
    action === 'closeOthers'
}

/** 固定页签在前，其余页签保持打开顺序，和页签栏上看到的顺序一致。 */
function orderTabKeys(tabKeys: readonly string[], fixedKeys: readonly string[]) {
  const present = new Set(tabKeys)
  const fixed = new Set(fixedKeys)
  return [
    ...fixedKeys.filter((key) => present.has(key)),
    ...tabKeys.filter((key) => !fixed.has(key)),
  ]
}

/** 只剩一页时四项都不可用；已在最左或最右时，对应方向不可用。 */
function getTabContextMenuDisabled(
  orderedKeys: readonly string[],
  anchorKey: string,
): Record<TabContextAction, boolean> {
  const index = orderedKeys.indexOf(anchorKey)
  if (index < 0 || orderedKeys.length <= 1) {
    return {
      close: true,
      closeLeft: true,
      closeRight: true,
      closeOthers: true,
    }
  }
  return {
    close: false,
    closeLeft: index === 0,
    closeRight: index === orderedKeys.length - 1,
    closeOthers: false,
  }
}

/** 批量关闭按页签栏从左到右的顺序，不包含右键点中的那一页。 */
function getTabCloseKeys(
  orderedKeys: readonly string[],
  anchorKey: string,
  action: Exclude<TabContextAction, 'close'>,
) {
  const index = orderedKeys.indexOf(anchorKey)
  if (index < 0)
    return []
  if (action === 'closeLeft')
    return orderedKeys.slice(0, index)
  if (action === 'closeRight')
    return orderedKeys.slice(index + 1)
  return orderedKeys.filter((key) => key !== anchorKey)
}

export default memo(PageTabs)

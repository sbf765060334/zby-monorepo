import { PlusOutlined, StarFilled, StarOutlined } from '@ant-design/icons'
import { useIntl } from '@zby/intl'
import { useRouterCore, useRouterCoreSelector } from '@zby/router-core/react'
import { Button, Dropdown, Empty } from 'antd'
import { clsx } from 'clsx'
import { memo, useMemo, useState } from 'react'

import {
  isFavoriteMenuRoute,
  useFavoriteMenusSelector,
  useToggleFavoriteMenu,
} from '../favorites'

import type { RouterCoreState } from '@zby/router-core'
import type { ProLayoutRoute } from '../types'

export interface FavoriteMenuPanelProps {
  prefixCls: string
  hashId: string
}

/** Header 专属的收藏菜单面板，显示在全局页签右侧，视觉结构与 Shuzhi 保持一致。 */
function FavoriteMenuPanel(props: FavoriteMenuPanelProps) {
  const { hashId, prefixCls } = props
  const intl = useIntl()
  const router = useRouterCore<ProLayoutRoute>()
  const currentPathname = useRouterCoreSelector(
    (state: RouterCoreState<ProLayoutRoute>) => state.currentPathname,
  )
  const favoritePaths = useFavoriteMenusSelector((state) => state.favoritePaths)
  const toggleFavorite = useToggleFavoriteMenu()
  const [open, setOpen] = useState(false)

  const visibleFavorites = useMemo(() => favoritePaths.flatMap((path) => {
    // 使用权限路由表生成展示项：无权限收藏暂时隐藏，但不会从持久化数据中误删。
    const route = router.registry.routeMapping[path]
    return isFavoriteMenuRoute(router, route) ? [{ path, route }] : []
  }), [favoritePaths, router])

  const panel = (
    <div className={clsx(`${prefixCls}-collection-panel`, hashId)}>
      <div className={`${prefixCls}-collection-header`}>
        {intl.getMessage(
          'zby.pro.layout.favorites.title',
          '收藏的菜单（{{count}}）',
          { count: visibleFavorites.length },
        )}
      </div>
      <div className={`${prefixCls}-collection-body`}>
        {visibleFavorites.length === 0 ? (
          <Empty
            description={intl.getMessage('zby.pro.layout.favorites.empty', '暂未收藏菜单')}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : null}
        {visibleFavorites.map(({ path, route }) => (
          <div
            key={path}
            className={clsx(`${prefixCls}-collection-item`, {
              [`${prefixCls}-collection-item-active`]: currentPathname === path,
            })}
          >
            <button
              type="button"
              className={`${prefixCls}-collection-item-main`}
              title={route.title}
              onClick={() => {
                if (path === currentPathname)
                  return
                router.jumpTo(path)
                setOpen(false)
              }}
            >
              {route.title}
            </button>
            <button
              type="button"
              className={`${prefixCls}-collection-remove`}
              aria-label={intl.getMessage(
                'zby.pro.layout.favorites.remove',
                '取消收藏：{{title}}',
                { title: route.title },
              )}
              title={intl.getMessage(
                'zby.pro.layout.favorites.remove',
                '取消收藏：{{title}}',
                { title: route.title },
              )}
              onClick={() => toggleFavorite(path)}
            >
              <StarFilled />
            </button>
          </div>
        ))}
      </div>
      <div className={`${prefixCls}-collection-footer`}>
        <StarOutlined className={`${prefixCls}-collection-footer-icon`} />
        {intl.getMessage(
          'zby.pro.layout.favorites.hint',
          '点击菜单中的星标即可完成收藏',
        )}
      </div>
    </div>
  )

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      trigger={['click']}
      placement="bottom"
      rootClassName={hashId}
      popupRender={() => panel}
    >
      <Button
        type="text"
        size="small"
        icon={<PlusOutlined />}
        className={`${prefixCls}-collection-trigger`}
        aria-label={intl.getMessage('zby.pro.layout.favorites.trigger', '收藏菜单')}
        title={intl.getMessage('zby.pro.layout.favorites.trigger', '收藏菜单')}
      />
    </Dropdown>
  )
}

export default memo(FavoriteMenuPanel)

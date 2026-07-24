import { PlusOutlined, StarFilled, StarOutlined } from '@ant-design/icons'
import { useRouterCore, useRouterCoreSelector } from '@zby/router-core/react'
import { Button, Dropdown, Empty } from 'antd'
import { clsx } from 'clsx'
import { memo, useMemo, useState } from 'react'

import {
  isFavoriteMenuRoute,
  useFavoriteMenusSelector,
  useToggleFavoriteMenu,
} from '../favorites/FavoriteMenusProvider'

import type { RouterCoreState } from '@zby/router-core'
import type { ProLayoutRoute } from '../types'

export interface FavoriteMenuPanelProps {
  prefixCls: string
  hashId: string
}

/** Header 页签右侧的收藏菜单面板，视觉结构与 Shuzhi 保持一致。 */
function FavoriteMenuPanel(props: FavoriteMenuPanelProps) {
  const { hashId, prefixCls } = props
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
        收藏的菜单（{visibleFavorites.length}）
      </div>
      <div className={`${prefixCls}-collection-body`}>
        {visibleFavorites.length === 0 ? (
          <Empty description="暂未收藏菜单" image={Empty.PRESENTED_IMAGE_SIMPLE} />
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
              aria-label={`取消收藏：${route.title}`}
              title={`取消收藏：${route.title}`}
              onClick={() => toggleFavorite(path)}
            >
              <StarFilled />
            </button>
          </div>
        ))}
      </div>
      <div className={`${prefixCls}-collection-footer`}>
        <StarOutlined className={`${prefixCls}-collection-footer-icon`} />
        点击菜单中的星标即可完成收藏
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
        aria-label="收藏菜单"
        title="收藏菜单"
      />
    </Dropdown>
  )
}

export default memo(FavoriteMenuPanel)

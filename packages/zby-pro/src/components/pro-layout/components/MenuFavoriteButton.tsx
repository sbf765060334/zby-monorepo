import { StarFilled, StarOutlined } from '@ant-design/icons'
import { clsx } from 'clsx'
import { memo } from 'react'

export interface MenuFavoriteButtonProps {
  prefixCls: string
  title: string
  favorite: boolean
  onToggle: () => void
}

/** Drawer 菜单项中的收藏按钮；独立阻止事件，避免收藏操作同时触发页面导航。 */
function MenuFavoriteButton(props: MenuFavoriteButtonProps) {
  const { favorite, onToggle, prefixCls, title } = props
  const label = favorite ? `取消收藏：${title}` : `收藏：${title}`
  const Icon = favorite ? StarFilled : StarOutlined

  return (
    <button
      type="button"
      className={clsx(`${prefixCls}-menu-favorite`, {
        [`${prefixCls}-menu-favorite-active`]: favorite,
      })}
      aria-label={label}
      aria-pressed={favorite}
      title={label}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onToggle()
      }}
    >
      <Icon />
    </button>
  )
}

export default memo(MenuFavoriteButton)

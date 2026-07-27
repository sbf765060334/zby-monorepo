import { StarFilled, StarOutlined } from '@ant-design/icons'
import { useIntl } from '@zby/intl'
import { clsx } from 'clsx'
import { memo } from 'react'

export interface MenuFavoriteButtonProps {
  prefixCls: string
  title: string
  favorite: boolean
  onToggle: () => void
}

/** 收藏域提供给 Drawer 菜单项的按钮；独立阻止事件，避免收藏操作同时触发页面导航。 */
function MenuFavoriteButton(props: MenuFavoriteButtonProps) {
  const { favorite, onToggle, prefixCls, title } = props
  const intl = useIntl()
  const label = favorite
    ? intl.getMessage('zby.pro.layout.favorites.remove', '取消收藏：{{title}}', { title })
    : intl.getMessage('zby.pro.layout.favorites.add', '收藏：{{title}}', { title })
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

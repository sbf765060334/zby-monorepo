import { UserOutlined } from '@ant-design/icons'
import { useIntl } from '@zby/intl'
import { ConfigProvider, Dropdown } from 'antd'
import { clsx } from 'clsx'
import { useContext } from 'react'

import type { MenuProps } from 'antd'
import type { ReactNode } from 'react'
import useUserMenuStyles from './style'

/** 下拉菜单的一项。点击后只执行该项的 onClick。 */
export interface UserMenuItem {
  key: string
  label: ReactNode
  onClick?: () => void
}

/** 顶栏用户按钮。菜单内容和顺序由业务通过 menus 决定。 */
export interface UserMenuProps {
  /** 按钮上的姓名。空字符串时头像改用默认图标。 */
  name: string
  /** 下拉菜单。不传或为空时只显示按钮。 */
  menus?: UserMenuItem[]
  /** 生成样式类名的前缀；未传时使用 ConfigProvider.getPrefixCls('pro-layout')。 */
  prefixCls?: string
  /** 附加到触发按钮上的业务类名。 */
  className?: string
}

/** 取姓名的第一个可见字符。空姓名返回空字符串，由调用方改用默认图标。 */
function firstCharacter(name: string) {
  const text = name.trim()
  if (!text)
    return ''
  return Array.from(text)[0]
}

/** 只负责顶栏用户按钮和下拉菜单，不处理退出地址或个人信息页。 */
export default function UserMenu(props: UserMenuProps) {
  const {
    className,
    menus = [],
    name,
    prefixCls: customizePrefixCls,
  } = props
  const { getPrefixCls } = useContext(ConfigProvider.ConfigContext)
  const prefixCls = getPrefixCls('pro-layout', customizePrefixCls)
  const intl = useIntl()
  const hashId = useUserMenuStyles(prefixCls)
  const initial = firstCharacter(name)
  const title = intl.getMessage('zby.pro.layout.userMenu.trigger', '用户菜单')
  const label = name.trim()
  const trigger = (
    <button
      type="button"
      className={clsx(`${prefixCls}-user-menu`, hashId, className)}
      aria-label={label ? `${label} ${title}` : title}
    >
      <span className={`${prefixCls}-user-menu-avatar`} aria-hidden>
        {initial || <UserOutlined />}
      </span>
      {label ? <span className={`${prefixCls}-user-menu-name`}>{label}</span> : null}
    </button>
  )

  if (!menus.length)
    return trigger

  const items: NonNullable<MenuProps['items']> = menus.map((item) => ({
    key: item.key,
    label: item.label,
  }))

  return (
    <Dropdown
      trigger={['hover', 'click']}
      placement="bottomRight"
      destroyOnHidden
      menu={{
        items,
        onClick: ({ key }) => {
          menus.find((item) => item.key === key)?.onClick?.()
        },
      }}
    >
      {trigger}
    </Dropdown>
  )
}

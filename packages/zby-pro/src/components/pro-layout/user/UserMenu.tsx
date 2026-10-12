import { UserOutlined } from '@ant-design/icons'
import { useIntl } from '@zby/intl'
import { ConfigProvider, Dropdown } from 'antd'
import { clsx } from 'clsx'
import { useContext, useEffect, useState } from 'react'

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

const GREETING_HOURS = [5, 11, 13, 18, 23]

type GreetingKey = 'morning' | 'noon' | 'afternoon' | 'evening' | 'lateNight'

const greetingFallback: Record<GreetingKey, string> = {
  morning: '上午好~',
  noon: '中午好~',
  afternoon: '下午好~',
  evening: '晚上好~',
  lateNight: '夜深了，早点休息~',
}

/** 按本地小时划分问候档。23 点到次日 5 点算深夜。 */
function greetingKey(date: Date): GreetingKey {
  const hour = date.getHours()
  if (hour >= 23 || hour < 5)
    return 'lateNight'
  if (hour < 11)
    return 'morning'
  if (hour < 13)
    return 'noon'
  if (hour < 18)
    return 'afternoon'
  return 'evening'
}

/** 距离下一档的毫秒数。结果非正时退到 1 分钟，避免时钟误差造成连续刷新。 */
function msUntilNextBoundary(date: Date) {
  const next = new Date(date)
  const nextHour = GREETING_HOURS.find((hour) => hour > date.getHours())
  if (nextHour === undefined) {
    next.setDate(next.getDate() + 1)
    next.setHours(5, 0, 0, 0)
  } else {
    next.setHours(nextHour, 0, 0, 0)
  }
  const delay = next.getTime() - date.getTime()
  return delay > 0 ? delay : 60_000
}

/** 挂载时取当前档，到下一分界点再按当时时间重算。切回前台时也重算。 */
function useGreetingKey() {
  const [key, setKey] = useState(() => greetingKey(new Date()))

  useEffect(() => {
    let timer = 0
    const schedule = () => {
      window.clearTimeout(timer)
      const now = new Date()
      const nextKey = greetingKey(now)
      setKey((current) => (current === nextKey ? current : nextKey))
      timer = window.setTimeout(schedule, msUntilNextBoundary(now))
    }
    timer = window.setTimeout(schedule, msUntilNextBoundary(new Date()))
    const onVisible = () => {
      if (document.visibilityState === 'visible')
        schedule()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return key
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
  const greeting = useGreetingKey()
  const initial = firstCharacter(name)
  const title = intl.getMessage('zby.pro.layout.userMenu.trigger', '用户菜单')
  const greetingText = intl.getMessage(`zby.pro.layout.userMenu.${greeting}`, greetingFallback[greeting])
  const label = name.trim()
  const accessibleName = label ? `${greetingText} ${label} ${title}` : `${greetingText} ${title}`
  const trigger = (
    <button
      type="button"
      className={clsx(`${prefixCls}-user-menu`, hashId, className)}
      aria-label={accessibleName}
    >
      <span className={`${prefixCls}-user-menu-avatar`} aria-hidden>
        {initial || <UserOutlined />}
      </span>
      <span className={`${prefixCls}-user-menu-greeting`}>{greetingText}</span>
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

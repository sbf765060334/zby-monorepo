import { clsx } from 'clsx'
import { memo } from 'react'

import type { ReactNode } from 'react'
import type { ProLayoutClassNames, ProLayoutStyles } from '../types'
import PageTabs from './PageTabs'
import { ThemeSwitch, useProLayoutTheme } from './ThemeProvider'

export interface HeaderProps {
  prefixCls: string
  extra?: ReactNode
  classNames?: ProLayoutClassNames
  styles?: ProLayoutStyles
}

/** 顶部全局页签栏及业务扩展区域。 */
function Header(props: HeaderProps) {
  const { classNames, extra, prefixCls, styles } = props
  const { enabled: themeEnabled } = useProLayoutTheme()

  return (
    <header
      className={clsx(`${prefixCls}-header`, classNames?.header)}
      style={{
        display: 'flex',
        height: 38,
        minHeight: 38,
        alignItems: 'stretch',
        ...styles?.header,
      }}
    >
      <div
        className={clsx(`${prefixCls}-tabs`, classNames?.tabs)}
        style={{ minWidth: 0, flex: 1, ...styles?.tabs }}
      >
        <PageTabs prefixCls={prefixCls} />
      </div>
      {themeEnabled || (extra !== undefined && extra !== null && extra !== false) ? (
        <div
          className={clsx(`${prefixCls}-header-extra`, classNames?.headerExtra)}
          style={{ display: 'flex', alignItems: 'center', ...styles?.headerExtra }}
        >
          <ThemeSwitch prefixCls={prefixCls} />
          {extra}
        </div>
      ) : null}
    </header>
  )
}

export default memo(Header)

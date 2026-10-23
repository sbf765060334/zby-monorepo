import { clsx } from 'clsx'
import { memo } from 'react'

import type { ReactNode } from 'react'
import { useProLayoutBreadcrumbRendered } from '../metrics/ProLayoutMetricsContext'
import type { ProLayoutClassNames, ProLayoutStyles } from '../types'
import PageTabs from './PageTabs'

export interface HeaderProps {
  prefixCls: string
  hashId: string
  height: number
  paddingLeft: number
  scrolled?: boolean
  extra?: ReactNode
  /** 顶栏内置的语言、主题和搜索按钮。 */
  tools?: ReactNode
  classNames?: ProLayoutClassNames
  styles?: ProLayoutStyles
}

/** 顶部全局页签栏及业务扩展区域。 */
const Header = (props: HeaderProps) => {
  const { classNames, extra, hashId, height, paddingLeft, prefixCls, scrolled, styles, tools } = props
  const breadcrumbRendered = useProLayoutBreadcrumbRendered()
  const showShadow = Boolean(scrolled) && !breadcrumbRendered

  return (
    <header
      className={clsx(
        `${prefixCls}-header`,
        showShadow && `${prefixCls}-header-scrolled`,
        classNames?.header,
      )}
      style={{
        ...styles?.header,
        position: 'absolute',
        insetBlockStart: 0,
        insetInlineStart: 0,
        width: '100%',
        minWidth: '100%',
        maxWidth: '100%',
        height,
        minHeight: height,
        maxHeight: height,
        boxSizing: 'border-box',
        paddingInlineStart: paddingLeft,
      }}
    >
      <div
        className={clsx(`${prefixCls}-tabs`, classNames?.tabs)}
        style={{ minWidth: 0, flex: 1, height: '100%', ...styles?.tabs }}
      >
        <PageTabs prefixCls={prefixCls} hashId={hashId} />
      </div>
      <div
        className={clsx(`${prefixCls}-header-extra`, classNames?.headerExtra)}
        style={{ display: 'flex', alignItems: 'center', ...styles?.headerExtra }}
      >
        {tools}
        {extra}
      </div>
    </header>
  )
}

Header.displayName = 'Header'

export default memo(Header)

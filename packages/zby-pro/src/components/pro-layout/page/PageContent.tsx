import { useRouterCore, useRouterCoreSelector } from '@zby/router-core/react'
import { useIntl } from '@zby/intl'
import { clsx } from 'clsx'
import { memo, useMemo } from 'react'

import type { RouterCoreState } from '@zby/router-core'
import type { CSSProperties } from 'react'
import type { ProLayoutRoute } from '../types'
import ExceptionPage from './ExceptionPage'
import PageContainer from './PageContainer'

/** 页面渲染域对 ProLayout 暴露的组合属性。 */
export interface PageContentProps {
  prefixCls: string
  pageClassName?: string
  pageStyle?: CSSProperties
}

/** 根据 core 保留的页面实例渲染 KeepAlive 页面，并处理当前地址的 403/404。 */
function PageContent(props: PageContentProps) {
  const { pageClassName, pageStyle, prefixCls } = props
  const router = useRouterCore<ProLayoutRoute>()
  const pages = useRouterCoreSelector(
    (state: RouterCoreState<ProLayoutRoute>) => state.pages,
  )
  const activePage = useRouterCoreSelector(
    (state: RouterCoreState<ProLayoutRoute>) => state.activePage,
  )
  const pathname = useRouterCoreSelector(
    (state: RouterCoreState<ProLayoutRoute>) => state.currentPathname,
  )
  const navigationStatus = useRouterCoreSelector(
    (state: RouterCoreState<ProLayoutRoute>) => state.navigationStatus,
  )
  const authorizedLeaf = useMemo(
    () => router.registry.resolveLeafRoute(pathname, { withinAuth: true }),
    [pathname, router],
  )
  const fullLeaf = useMemo(
    () => router.registry.resolveLeafRoute(pathname),
    [pathname, router],
  )
  const isPage = router.registry.isPageRoute(authorizedLeaf?.route)

  return (
    <div
      className={`${prefixCls}-pages`}
      style={{
        position: 'relative',
        display: 'flex',
        minWidth: 0,
        minHeight: 0,
        flex: 1,
        overflow: 'hidden',
      }}
    >
      {pages.map((page) => (
        <PageContainer
          key={page.key}
          prefixCls={prefixCls}
          page={page}
          active={isPage && page.key === activePage}
          className={clsx(`${prefixCls}-page-body`, pageClassName)}
          style={pageStyle}
        />
      ))}
      {navigationStatus === 'settled' && !isPage ? (
        <ExceptionContent
          prefixCls={prefixCls}
          className={pageClassName}
          status={pathname === '/' || fullLeaf ? '403' : '404'}
          style={pageStyle}
        />
      ) : null}
    </div>
  )
}

function ExceptionContent(props: {
  prefixCls: string
  className?: string
  status: '403' | '404'
  style?: CSSProperties
}) {
  const intl = useIntl()
  const description = props.status === '403'
    ? intl.getMessage(
        'zby.pro.layout.exception.forbidden',
        '暂无权限查看当前页面，若需当前页面权限，请联系管理员。',
      )
    : intl.getMessage(
        'zby.pro.layout.exception.notFound',
        '访问的页面暂时不存在，请输入正确的地址。',
      )

  return (
    <div
      className={clsx(`${props.prefixCls}-page-body`, props.className)}
      style={{ width: '100%', height: '100%', overflow: 'auto', ...props.style }}
    >
      <ExceptionPage
        prefixCls={props.prefixCls}
        status={props.status}
        description={description}
      />
    </div>
  )
}

export default memo(PageContent)

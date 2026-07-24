import { useRouterCore, useRouterCoreSelector } from '@zby/router-core/react'
import { memo, useMemo } from 'react'

import type { RouterCoreState } from '@zby/router-core'
import type { CSSProperties } from 'react'
import type { ProLayoutRoute } from '../types'
import ExceptionPage from './ExceptionPage'
import PageContainer from './PageContainer'

export interface PageContentProps {
  prefixCls: string
  pageStyle?: CSSProperties
}

/** 根据 core 保留的页面实例渲染 KeepAlive 页面，并处理当前地址的 403/404。 */
function PageContent(props: PageContentProps) {
  const { pageStyle, prefixCls } = props
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
          className={`${prefixCls}-page-body`}
          style={pageStyle}
        />
      ))}
      {!isPage ? (
        <ExceptionContent
          prefixCls={prefixCls}
          status={pathname === '/' || fullLeaf ? '403' : '404'}
          style={pageStyle}
        />
      ) : null}
    </div>
  )
}

function ExceptionContent(props: {
  prefixCls: string
  status: '403' | '404'
  style?: CSSProperties
}) {
  const description = props.status === '403'
    ? '暂无权限查看当前页面，若需当前页面权限，请联系管理员。'
    : '访问的页面暂时不存在，请输入正确的地址。'

  return (
    <div
      className={`${props.prefixCls}-page-body`}
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

import { useRouterCore, useRouterCoreSelector } from '@zby/router-core/react'
import { useIntl } from '@zby/intl'
import { clsx } from 'clsx'
import { memo, useEffect, useMemo } from 'react'

import type { RouterCoreState } from '@zby/router-core'
import type { CSSProperties } from 'react'
import type {
  ProLayoutPageErrorHandler,
  ProLayoutPageLoading,
  ProLayoutRoute,
} from '../types'
import ExceptionPage from './ExceptionPage'
import KeepAlivePage from './KeepAlivePage'
import { PageCommitReporter } from '../navigation-progress/NavigationProgress'

/** 页面渲染域对 ProLayout 暴露的组合属性。 */
export interface PageContentProps {
  prefixCls: string
  onPageError?: ProLayoutPageErrorHandler
  pageLoading?: false | ProLayoutPageLoading
  onScrollStateChange?: (scrolled: boolean) => void
  pageClassName?: string
  pageStyle?: CSSProperties
}

/** 根据 core 保留的页面实例渲染 KeepAlive 页面，并处理当前地址的 403/404。 */
function PageContent(props: PageContentProps) {
  const {
    onPageError,
    onScrollStateChange,
    pageClassName,
    pageLoading,
    pageStyle,
    prefixCls,
  } = props
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
        <KeepAlivePage
          key={page.key}
          prefixCls={prefixCls}
          page={page}
          active={isPage && page.key === activePage}
          onPageError={onPageError}
          pageLoading={pageLoading}
          onScrollStateChange={onScrollStateChange}
          className={clsx(`${prefixCls}-page-body`, pageClassName)}
          style={pageStyle}
        />
      ))}
      {navigationStatus === 'settled' && !isPage ? (
        <ExceptionContent
          prefixCls={prefixCls}
          className={pageClassName}
          onScrollStateChange={onScrollStateChange}
          pathname={pathname}
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
  onScrollStateChange?: (scrolled: boolean) => void
  pathname: string
  status: '403' | '404'
  style?: CSSProperties
}) {
  const intl = useIntl()
  const { onScrollStateChange, pathname, status } = props
  const description = status === '403'
    ? intl.getMessage(
        'zby.pro.layout.exception.forbidden',
        '暂无权限查看当前页面，若需当前页面权限，请联系管理员。',
      )
    : intl.getMessage(
        'zby.pro.layout.exception.notFound',
        '访问的页面暂时不存在，请输入正确的地址。',
      )

  useEffect(() => {
    onScrollStateChange?.(false)
  }, [onScrollStateChange, status])

  return (
    <div
      className={clsx(`${props.prefixCls}-page-body`, props.className)}
      onScroll={onScrollStateChange
        ? (event) => onScrollStateChange(event.currentTarget.scrollTop > 0)
        : undefined}
      style={{ width: '100%', height: '100%', overflow: 'auto', ...props.style }}
    >
      <PageCommitReporter pathname={pathname} />
      <ExceptionPage
        prefixCls={props.prefixCls}
        status={status}
        description={description}
      />
    </div>
  )
}

export default memo(PageContent)

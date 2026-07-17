import { memo, useMemo } from 'react'

import { useProLayoutStoreSelector } from '../context'
import type { ProLayoutStyles } from '../interface'
import ExceptionPage from './ExceptionPage'
import PageContainer from './PageContainer'

export interface ProLayoutContentProps {
  prefixCls: string
  pageClassName?: string
  styles?: ProLayoutStyles
  pathname: string
}

/**
 * 根据 Store 中保留的 pages 渲染 KeepAlive 页面，并为当前不可展示地址提供 403/404。
 *
 * Registry 是路由存在性、权限和 element 的唯一查询源。它变化时即使 pathname 未变，
 * 当前页面判定也必须重新计算，避免继续显示旧组件或把无权限页面渲染成空白。
 */
function ProLayoutContent(props: ProLayoutContentProps) {
  const { prefixCls, pageClassName, styles, pathname } = props
  const pages = useProLayoutStoreSelector((state) => state.pages)
  const activePage = useProLayoutStoreSelector((state) => state.activePage)
  const noBar = useProLayoutStoreSelector((state) => state.noBar)
  const headerHeight = useProLayoutStoreSelector((state) => state.headerHeight)
  const intl = useProLayoutStoreSelector((state) => state.intl)
  const registry = useProLayoutStoreSelector((state) => state.registry)
  const authorizedLeaf = useMemo(
    () => registry.resolveLeafRoute(pathname, { withinAuth: true }),
    [pathname, registry],
  )
  const fullLeaf = useMemo(
    () => registry.resolveLeafRoute(pathname),
    [pathname, registry],
  )
  const isLeafPage = registry.isPageRoute(authorizedLeaf?.route)
  const effectiveActivePage = isLeafPage ? activePage : null
  const fallbackContentHeight = useMemo(
    () => noBar ? '100vh' : `calc(100vh - ${headerHeight}px)`,
    [headerHeight, noBar],
  )

  const fallback = useMemo(() => {
    if (isLeafPage)
      return null

    if (pathname === '/') {
      return (
        <ExceptionPage
          prefixCls={prefixCls}
          status="403"
          description={intl.getMessage(
            'proLayout.systemNoPermission',
            '暂无权限，若需当前系统权限，请联系管理员。',
          )}
        />
      )
    }

    if (registry.isPageRoute(fullLeaf?.route) || registry.routeMapping[pathname]) {
      return (
        <ExceptionPage
          prefixCls={prefixCls}
          status="403"
          description={intl.getMessage(
            'proLayout.pageNoPermission',
            '暂无权限查看当前页面，若需当前页面权限，请联系管理员。',
          )}
        />
      )
    }

    return (
      <ExceptionPage
        prefixCls={prefixCls}
        status="404"
        description={intl.getMessage(
          'proLayout.pageNotFound',
          '访问的页面暂时不存在，请输入正确的地址',
        )}
      />
    )
  }, [fullLeaf, intl, isLeafPage, pathname, prefixCls, registry])

  return (
    <>
      {pages.map((page) => (
        <PageContainer
          key={page.key}
          prefixCls={prefixCls}
          data={page}
          active={page.key === effectiveActivePage}
          headerHeight={headerHeight}
          noBar={noBar}
          className={pageClassName}
          bodyStyle={styles?.page}
        />
      ))}
      {!isLeafPage
        ? (
            <div
              className={`${prefixCls}-page-body`}
              style={{
                position: 'relative',
                height: fallbackContentHeight,
                overflow: 'auto',
                ...styles?.page,
              }}
            >
              {fallback}
            </div>
          )
        : null}
    </>
  )
}

export default memo(ProLayoutContent)

import { useRouterCoreSelector } from '@zby/router-core/react'
import { Layout } from 'antd'
import { clsx } from 'clsx'
import { memo, useEffect } from 'react'

import Header from './header'
import IconDrawerMenu from './menu'
import { Breadcrumb, PageContent } from './page'
import useProLayoutStyles from './styles'
import { PRO_LAYOUT_THEME_VIEW_TRANSITION_NAME } from './theme/constants'
import type { ProLayoutProps } from './types'

const DEFAULT_PREFIX_CLS = 'zby-pro-layout'

/**
 * ProLayout 的纯 UI 外壳。
 *
 * 这里不创建 Store，也不接收 routes 等 core 固定配置。菜单、页签、面包屑和页面内容
 * 会按迁移阶段接入同一个 RouterCore 实例。
 */
function ProLayout(props: ProLayoutProps) {
  const {
    beforeUnload,
    className,
    classNames,
    header,
    minimumContentWidth,
    noBar = false,
    prefixCls = DEFAULT_PREFIX_CLS,
    rootClassName,
    setPage,
    showBreadcrumb = true,
    style,
    styles,
    systemList,
    title,
  } = props
  const currentRoutes = useRouterCoreSelector((state) => state.currentRoutes)
  const { hashId, headerHeight, layoutCSSVariables } = useProLayoutStyles(prefixCls)
  const pathnameDescriptionMap = useRouterCoreSelector((state) => state.pathnameDescriptionMap)
  const currentPathname = useRouterCoreSelector((state) => state.currentPathname)
  const currentRoute = currentRoutes[currentRoutes.length - 1]
  const currentPageTitle = currentRoute
    ? pathnameDescriptionMap[currentRoute.realPath] || currentRoute.route.title
    : ''

  useEffect(() => {
    if (typeof document === 'undefined')
      return

    document.title = currentPageTitle ? `${currentPageTitle} - ${title}` : title
    setPage?.(currentPageTitle)
  }, [currentPageTitle, setPage, title])

  useEffect(() => {
    if (!beforeUnload || typeof window === 'undefined')
      return undefined

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      const shouldBlock = typeof beforeUnload === 'function' ? beforeUnload() : beforeUnload
      if (!shouldBlock)
        return

      event.preventDefault()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [beforeUnload])

  return (
    <Layout
      className={clsx(prefixCls, hashId, classNames?.root, rootClassName, className)}
      style={{
        minHeight: '100vh',
        viewTransitionName: PRO_LAYOUT_THEME_VIEW_TRANSITION_NAME,
        ...styles?.root,
        ...style,
        ...layoutCSSVariables,
      }}
      data-current-pathname={currentPathname}
    >
      {!noBar ? (
        <IconDrawerMenu
          prefixCls={prefixCls}
          hashId={hashId}
          logo={header?.logo}
          systemList={systemList}
          classNames={classNames}
          styles={styles}
        />
      ) : null}
      <Layout
        className={`${prefixCls}-main`}
        style={{
          width: '100%',
          minWidth: minimumContentWidth,
          paddingInlineStart: noBar ? 0 : 60,
          paddingBlockStart: noBar ? 0 : headerHeight,
        }}
      >
        {!noBar ? (
          <Header
            prefixCls={prefixCls}
            hashId={hashId}
            height={headerHeight}
            extra={header?.extra}
            paddingLeft={60}
            classNames={classNames}
            styles={styles}
          />
        ) : null}
        <Layout.Content
          className={clsx(`${prefixCls}-content`, classNames?.content)}
          style={{
            display: 'flex',
            minWidth: 0,
            minHeight: 0,
            flex: 1,
            flexDirection: 'column',
            ...styles?.content,
          }}
        >
          {showBreadcrumb ? (
            <Breadcrumb
              prefixCls={prefixCls}
              className={classNames?.breadcrumb}
              style={styles?.breadcrumb}
            />
          ) : null}
          <PageContent
            prefixCls={prefixCls}
            pageClassName={classNames?.page}
            pageStyle={styles?.page}
          />
        </Layout.Content>
      </Layout>
    </Layout>
  )
}

export default memo(ProLayout)

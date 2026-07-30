import { CloseOutlined, SearchOutlined } from '@ant-design/icons'
import { useIntl } from '@zby/intl'
import { useRouterCore } from '@zby/router-core/react'
import { Button, Empty, Input, Modal } from 'antd'
import { clsx } from 'clsx'
import { memo, useEffect, useMemo, useRef, useState } from 'react'

import useRouteSearchStyles from './style'

import type { InputRef } from 'antd'
import type { KeyboardEvent, ReactNode } from 'react'
import type { RouterCore } from '@zby/router-core'
import type { ProLayoutRoute } from '../types'

const DEFAULT_PREFIX_CLS = 'zby-pro-layout'
const MAX_RECENT_ROUTE_COUNT = 8
const RECENT_ROUTE_STORAGE_PREFIX = 'zby-pro-layout:route-search:'

interface SearchableRoute {
  path: string
  titlePath: string
  searchText: string
}

export interface ProRouteSearchProps {
  /** 生成样式类名的前缀，默认与 ProLayout 一致。 */
  prefixCls?: string
  /** 附加到搜索触发按钮上的业务类名。 */
  className?: string
}

/** 在权限路由树中搜索可直接进入的页面，并通过现有 RouterCore 页签命令打开结果。 */
function RouteSearch(props: ProRouteSearchProps) {
  const {
    className,
    prefixCls = DEFAULT_PREFIX_CLS,
  } = props
  const intl = useIntl()
  const router = useRouterCore<ProLayoutRoute>()
  const hashId = useRouteSearchStyles(prefixCls)
  const inputRef = useRef<InputRef>(null)
  const storageKey = router.getState().storageKey
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const [recentPaths, setRecentPaths] = useState<string[]>(
    () => readRecentRoutePaths(storageKey),
  )

  const searchableRoutes = useMemo(
    () => collectSearchableRoutes(router),
    [router],
  )
  const routeMap = useMemo(
    () => new Map(searchableRoutes.map((item) => [item.path, item])),
    [searchableRoutes],
  )
  const normalizedQuery = normalizeSearchText(query)
  const matchedRoutes = useMemo(
    () => normalizedQuery
      ? searchableRoutes.filter((item) => item.searchText.includes(normalizedQuery))
      : [],
    [normalizedQuery, searchableRoutes],
  )
  const recentRoutes = useMemo(
    () => recentPaths.flatMap((path) => {
      const item = routeMap.get(path)
      return item ? [item] : []
    }),
    [recentPaths, routeMap],
  )
  const visibleRoutes = normalizedQuery ? matchedRoutes : recentRoutes
  const triggerTitle = intl.getMessage(
    'zby.pro.layout.search.trigger',
    '搜索页面（Ctrl+K）',
  )

  useEffect(() => {
    const handleShortcut = (event: globalThis.KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'k')
        return

      event.preventDefault()
      setOpen(true)
      setActiveIndex(recentRoutes.length > 0 ? 0 : -1)
    }

    document.addEventListener('keydown', handleShortcut)
    return () => document.removeEventListener('keydown', handleShortcut)
  }, [recentRoutes.length])

  const closeSearch = () => {
    setOpen(false)
    setQuery('')
    setActiveIndex(-1)
  }

  const showSearch = () => {
    setOpen(true)
    setActiveIndex(recentRoutes.length > 0 ? 0 : -1)
  }

  const changeQuery = (value: string) => {
    const nextQuery = normalizeSearchText(value)
    const hasResults = nextQuery
      ? searchableRoutes.some((item) => item.searchText.includes(nextQuery))
      : recentRoutes.length > 0
    setQuery(value)
    setActiveIndex(hasResults ? 0 : -1)
  }

  const openRoute = (item: SearchableRoute) => {
    setRecentPaths((currentPaths) => {
      const nextPaths = [
        item.path,
        ...currentPaths.filter((path) => path !== item.path),
      ].slice(0, MAX_RECENT_ROUTE_COUNT)
      saveRecentRoutePaths(storageKey, nextPaths)
      return nextPaths
    })
    router.jumpTo(item.path)
    closeSearch()
  }

  const removeRecentRoute = (item: SearchableRoute) => {
    const nextPaths = recentPaths.filter((path) => path !== item.path)
    setRecentPaths(nextPaths)
    saveRecentRoutePaths(storageKey, nextPaths)
    setActiveIndex(nextPaths.length > 0 ? 0 : -1)
  }

  const clearRecentRoutes = () => {
    setRecentPaths([])
    saveRecentRoutePaths(storageKey, [])
    setActiveIndex(-1)
  }

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (visibleRoutes.length === 0)
      return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) => (current + 1) % visibleRoutes.length)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) =>
        current <= 0 ? visibleRoutes.length - 1 : current - 1,
      )
      return
    }

    if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault()
      openRoute(visibleRoutes[activeIndex])
    }
  }

  return (
    <>
      <Button
        type="text"
        size="small"
        icon={<SearchOutlined />}
        className={clsx(`${prefixCls}-search-trigger`, hashId, className)}
        aria-label={triggerTitle}
        title={triggerTitle}
        onClick={showSearch}
      />
      <Modal
        open={open}
        width={680}
        footer={null}
        title={intl.getMessage('zby.pro.layout.search.title', '搜索页面')}
        className={`${prefixCls}-search-dialog`}
        rootClassName={clsx(`${prefixCls}-search-modal`, hashId)}
        destroyOnHidden
        onCancel={closeSearch}
        afterOpenChange={(visible) => {
          if (visible)
            inputRef.current?.focus()
        }}
      >
        <Input
          ref={inputRef}
          value={query}
          size="large"
          allowClear
          prefix={<SearchOutlined />}
          placeholder={intl.getMessage(
            'zby.pro.layout.search.placeholder',
            '搜索页面名称或路径',
          )}
          onChange={(event) => changeQuery(event.target.value)}
          onKeyDown={handleInputKeyDown}
        />
        <div className={`${prefixCls}-search-section-header`}>
          <span className={`${prefixCls}-search-section-title`}>
            {normalizedQuery
              ? intl.getMessage('zby.pro.layout.search.results', '搜索结果')
              : intl.getMessage('zby.pro.layout.search.recent', '最近搜索')}
          </span>
          {!normalizedQuery && recentPaths.length > 0 ? (
            <button
              type="button"
              className={`${prefixCls}-search-clear`}
              onClick={clearRecentRoutes}
            >
              {intl.getMessage('zby.pro.layout.search.clearAll', '清空全部')}
            </button>
          ) : null}
        </div>
        <div className={`${prefixCls}-search-results`}>
          {visibleRoutes.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={normalizedQuery
                ? intl.getMessage('zby.pro.layout.search.emptyResults', '未找到匹配页面')
                : intl.getMessage('zby.pro.layout.search.emptyRecent', '暂无最近搜索')}
            />
          ) : null}
          {visibleRoutes.map((item, index) => (
            <div
              key={item.path}
              className={clsx(`${prefixCls}-search-result`, {
                [`${prefixCls}-search-result-active`]: index === activeIndex,
                [`${prefixCls}-search-result-recent`]: !normalizedQuery,
              })}
              title={item.titlePath}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <button
                type="button"
                className={`${prefixCls}-search-result-main`}
                onClick={() => openRoute(item)}
              >
                <span className={`${prefixCls}-search-result-title`}>
                  {highlightMatch(item.titlePath, query, prefixCls)}
                </span>
                <span className={`${prefixCls}-search-result-path`}>
                  {highlightMatch(item.path, query, prefixCls)}
                </span>
              </button>
              {!normalizedQuery ? (
                <button
                  type="button"
                  className={`${prefixCls}-search-remove`}
                  aria-label={intl.getMessage(
                    'zby.pro.layout.search.removeRecent',
                    '删除最近搜索：{{title}}',
                    { title: item.titlePath },
                  )}
                  title={intl.getMessage(
                    'zby.pro.layout.search.removeRecent',
                    '删除最近搜索：{{title}}',
                    { title: item.titlePath },
                  )}
                  onClick={() => removeRecentRoute(item)}
                >
                  <CloseOutlined />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </Modal>
    </>
  )
}

function collectSearchableRoutes(router: RouterCore<ProLayoutRoute>): SearchableRoute[] {
  const items: SearchableRoute[] = []

  const walk = (routes: readonly ProLayoutRoute[], parentTitles: readonly string[]) => {
    routes.forEach((route) => {
      // ignore 与菜单保持同一语义：隐藏节点及其后代不进入全局搜索。
      if (route.ignore)
        return

      const titlePath = [...parentTitles, route.title]
      if (isSearchableRoute(router, route)) {
        const joinedTitlePath = titlePath.join(' / ')
        items.push({
          path: route.path,
          titlePath: joinedTitlePath,
          searchText: normalizeSearchText(`${joinedTitlePath} ${route.path}`),
        })
      }

      if (route.routes?.length)
        walk(route.routes, titlePath)
    })
  }

  walk(router.registry.permissionRoutes, [])
  return items
}

function isSearchableRoute(
  router: RouterCore<ProLayoutRoute>,
  route: ProLayoutRoute,
) {
  return Boolean(
    router.registry.isPageRoute(route) &&
    !route.prompt &&
    !route._blank &&
    isConcreteInternalPath(route.path),
  )
}

function isConcreteInternalPath(path: string) {
  return path.startsWith('/') && path
    .split('/')
    .every((part) => !part.startsWith(':') && part !== '*')
}

function highlightMatch(text: string, query: string, prefixCls: string): ReactNode {
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery)
    return text

  const normalizedText = text.toLocaleLowerCase()
  const parts: ReactNode[] = []
  let start = 0
  let matchIndex = normalizedText.indexOf(normalizedQuery)

  while (matchIndex >= 0) {
    if (matchIndex > start)
      parts.push(text.slice(start, matchIndex))
    parts.push(
      <mark key={`${matchIndex}-${normalizedQuery}`} className={`${prefixCls}-search-highlight`}>
        {text.slice(matchIndex, matchIndex + normalizedQuery.length)}
      </mark>,
    )
    start = matchIndex + normalizedQuery.length
    matchIndex = normalizedText.indexOf(normalizedQuery, start)
  }

  if (start < text.length)
    parts.push(text.slice(start))

  return parts
}

function normalizeSearchText(value: string) {
  return value.trim().toLocaleLowerCase()
}

function readRecentRoutePaths(storageKey: string): string[] {
  if (typeof window === 'undefined')
    return []

  try {
    const value = JSON.parse(
      window.localStorage.getItem(`${RECENT_ROUTE_STORAGE_PREFIX}${storageKey}`) || '[]',
    )
    if (!Array.isArray(value))
      return []
    return Array.from(new Set(
      value.filter((item): item is string => typeof item === 'string' && item.length > 0),
    )).slice(0, MAX_RECENT_ROUTE_COUNT)
  } catch {
    return []
  }
}

function saveRecentRoutePaths(storageKey: string, paths: readonly string[]) {
  if (typeof window === 'undefined')
    return

  try {
    window.localStorage.setItem(
      `${RECENT_ROUTE_STORAGE_PREFIX}${storageKey}`,
      JSON.stringify(paths),
    )
  } catch {
    // 搜索记录属于辅助体验；存储不可用时仍允许本次搜索和导航正常完成。
  }
}

export default memo(RouteSearch)

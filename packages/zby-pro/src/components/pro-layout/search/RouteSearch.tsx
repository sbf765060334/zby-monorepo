import { CloseCircleFilled, CloseOutlined, SearchOutlined } from '@ant-design/icons'
import { useIntl } from '@zby/intl'
import { useRouterCore } from '@zby/router-core/react'
import { ConfigProvider, Empty, Modal } from 'antd'
import { clsx } from 'clsx'
import { Command } from 'cmdk'
import { memo, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'

import { resolveProLayoutTitle } from '../title'
import useRouteSearchStyles from './style'

import type { IntlShape } from '@zby/intl'
import type { ReactNode } from 'react'
import type { RouterCore } from '@zby/router-core'
import type { ProLayoutRoute } from '../types'

/** 最近搜索只保留有限数量，避免长期使用后无界增长。 */
const MAX_RECENT_ROUTE_COUNT = 8
/** 搜索记录不区分应用、用户或租户，统一使用固定空间。 */
const RECENT_ROUTE_STORAGE_KEY = 'zby-pro-layout:route-search'
/** 内容区最多使用视口高度的 80%，为 Modal 外围留出安全空间。 */
const SEARCH_BODY_VIEWPORT_RATIO = 0.8
/** 为标题、内边距以及视口上下留白预留的固定高度。 */
const SEARCH_BODY_RESERVED_HEIGHT = 108
/** 极小视口下仍保留基本可操作空间。 */
const SEARCH_BODY_MIN_MAX_HEIGHT = 200
/** resize 高频触发时延迟合并计算，避免连续更新 React 状态。 */
const RESIZE_DEBOUNCE_MS = 200

/** 从权限路由树预计算出的单个搜索候选项。 */
interface SearchableRoute {
  /** 可直接交给 RouterCore 导航的具体内部路径。 */
  path: string
  /** 从一级目录到页面的完整标题路径，例如“工作台 / 履约管理 / 订单履约”。 */
  titlePath: string
  /** 已标准化的匹配文本，合并标题路径和真实 pathname。 */
  searchText: string
}

interface RecentRouteState {
  router: RouterCore<ProLayoutRoute>
  paths: string[]
  shouldCleanStorage: boolean
}

export interface ProRouteSearchProps {
  /** 生成样式类名的前缀；未传时使用 ConfigProvider.getPrefixCls('pro-layout')。 */
  prefixCls?: string
  /** 附加到搜索触发按钮上的业务类名。 */
  className?: string
}

/**
 * 顶栏内置的全局路由搜索。不从包入口导出。
 *
 * 有顶栏时由 ProLayout 渲染。弹窗内容少时按自然高度渲染；内容超过视口允许范围后，
 * 内容包装层负责限制总高度，只有搜索结果或最近搜索列表提供原生纵向滚动。
 */
function RouteSearch(props: ProRouteSearchProps) {
  const {
    className,
    prefixCls: customizePrefixCls,
  } = props
  const { getPrefixCls } = useContext(ConfigProvider.ConfigContext)
  const prefixCls = getPrefixCls('pro-layout', customizePrefixCls)
  const intl = useIntl()
  // 搜索、权限过滤、页签打开均复用宿主已经创建的 RouterCore 实例。
  const router = useRouterCore<ProLayoutRoute>()
  // 搜索弹窗通过 Portal 渲染，需要独立 hashId 才能命中作用域样式。
  const hashId = useRouteSearchStyles(prefixCls)
  // Modal 完成打开动画后把焦点交给搜索输入框。
  const inputRef = useRef<HTMLInputElement>(null)
  // 保存 resize 防抖定时器，组件卸载时必须一并清理。
  const resizeTimerRef = useRef<number | null>(null)
  // 弹窗和搜索交互的最小状态集合。
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  // undefined 使 SSR 与客户端首次渲染保持一致；挂载后再读取真实视口高度。
  const [bodyMaxHeight, setBodyMaxHeight] = useState<number>()

  // 权限路由树在 RouterCore 生命周期内固定，但索引里的标题文本跟随语言变化，
  // 因此 intl.locale 也是这份派生结果的输入。每种语言只会重建一次。
  const searchableRoutes = useMemo(
    () => collectSearchableRoutes(router, intl),
    [intl, intl.locale, router],
  )
  // 最近记录只保存 pathname，展示数据始终从最新权限路由表中恢复。
  const routeMap = useMemo(
    () => new Map(searchableRoutes.map((item) => [item.path, item])),
    [searchableRoutes],
  )
  const [recentRouteState, setRecentRouteState] = useState<RecentRouteState>(() => {
    const storedPaths = readRecentRoutePaths()
    const paths = storedPaths.filter((path) => routeMap.has(path))
    return {
      router,
      paths,
      shouldCleanStorage: paths.length !== storedPaths.length,
    }
  })
  let recentPaths = recentRouteState.paths

  if (recentRouteState.router !== router) {
    recentPaths = recentRouteState.paths.filter((path) => routeMap.has(path))
    setRecentRouteState({
      router,
      paths: recentPaths,
      shouldCleanStorage: recentPaths.length !== recentRouteState.paths.length,
    })
  }

  useEffect(() => {
    if (recentRouteState.shouldCleanStorage)
      saveRecentRoutePaths(recentRouteState.paths)
  }, [recentRouteState])
  const normalizedQuery = normalizeSearchText(query)
  // 有关键词时仅显示当前匹配项；空关键词时不提前返回全部页面。
  const matchedRoutes = useMemo(
    () => normalizedQuery
      ? searchableRoutes.filter((item) => item.searchText.includes(normalizedQuery))
      : [],
    [normalizedQuery, searchableRoutes],
  )
  // 最近记录已经按当前权限路由表清理，此处只恢复对应的展示数据。
  const recentRoutes = useMemo(
    () => recentPaths.flatMap((path) => {
      const item = routeMap.get(path)
      // flatMap 让不存在的路径自然被过滤，同时保留最近顺序。
      return item ? [item] : []
    }),
    [recentPaths, routeMap],
  )
  // 搜索态和最近态共用同一套命令列表交互。
  const visibleRoutes = normalizedQuery ? matchedRoutes : recentRoutes
  const triggerTitle = intl.getMessage(
    'zby.pro.layout.search.trigger',
    '搜索页面（Ctrl+K）',
  )
  const dialogTitle = intl.getMessage(
    'zby.pro.layout.search.title',
    '搜索页面',
  )
  const sectionTitle = normalizedQuery
    ? intl.getMessage('zby.pro.layout.search.results', '搜索结果')
    : intl.getMessage('zby.pro.layout.search.recent', '最近搜索')

  /**
   * 初始化并维护视口相关的内容区最大高度。
   *
   * 这里只更新 maxHeight，不设置固定 height：内容少时包装层保持自然高度，只有内容
   * 真正超过上限时才压缩列表区域，并由列表区域产生滚动。
   */
  useEffect(() => {
    if (typeof window === 'undefined')
      return undefined

    const updateBodyMaxHeight = () => {
      const nextHeight = getSearchBodyMaxHeight(window.innerHeight)
      // 相同高度不产生无意义渲染，resize 只在跨像素变化时提交状态。
      setBodyMaxHeight((currentHeight) =>
        currentHeight === nextHeight ? currentHeight : nextHeight,
      )
    }

    const handleResize = () => {
      // 连续拖动窗口时只保留最后一次计算任务。
      if (resizeTimerRef.current !== null)
        window.clearTimeout(resizeTimerRef.current)

      resizeTimerRef.current = window.setTimeout(() => {
        resizeTimerRef.current = null
        updateBodyMaxHeight()
      }, RESIZE_DEBOUNCE_MS)
    }

    // 首次挂载立即建立正确上限，不需要等待第一次 resize。
    updateBodyMaxHeight()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      // 防止组件卸载后延迟任务继续尝试更新状态。
      if (resizeTimerRef.current !== null)
        window.clearTimeout(resizeTimerRef.current)
    }
  }, [])

  /** 注册跨平台快捷键；库默认不在表单控件和可编辑区域中触发。 */
  useHotkeys(
    'mod+k',
    () => setOpen(true),
    { preventDefault: true },
    [],
  )

  /** 关闭时同步清空临时查询，下次打开固定回到最近搜索。 */
  const closeSearch = () => {
    setOpen(false)
    setQuery('')
  }

  /** 通过搜索触发器打开搜索。 */
  const showSearch = () => {
    setOpen(true)
  }

  /** 打开页面并把它提升到最近搜索首位。 */
  const openRoute = (item: SearchableRoute) => {
    setRecentRouteState((current) => {
      // 先去重再放到首位，最后统一裁剪到记录上限。
      const nextPaths = [
        item.path,
        ...current.paths.filter((path) => path !== item.path),
      ].slice(0, MAX_RECENT_ROUTE_COUNT)
      saveRecentRoutePaths(nextPaths)
      return { router, paths: nextPaths, shouldCleanStorage: false }
    })
    // jumpTo 会复用已经打开的页签，或按 RouterCore 规则创建新页签。
    router.jumpTo(item.path)
    closeSearch()
  }

  /** 删除一条最近记录，不影响当前路由和已经打开的页签。 */
  const removeRecentRoute = (item: SearchableRoute) => {
    const nextPaths = recentPaths.filter((path) => path !== item.path)
    setRecentRouteState({ router, paths: nextPaths, shouldCleanStorage: false })
    saveRecentRoutePaths(nextPaths)
  }

  /** 清空全部最近记录。 */
  const clearRecentRoutes = () => {
    setRecentRouteState({ router, paths: [], shouldCleanStorage: false })
    saveRecentRoutePaths([])
  }

  return (
    <>
      {/* 业务将该触发器与语言、主题组件并列放入 header.extra。 */}
      <button
        type="button"
        className={clsx(`${prefixCls}-search-trigger`, hashId, className)}
        aria-label={triggerTitle}
        title={triggerTitle}
        onClick={showSearch}
      >
        <SearchOutlined aria-hidden="true" />
        <span className={`${prefixCls}-search-trigger-hint`}>CTRL + K</span>
      </button>
      {/* Modal 只负责标题和外壳，视口高度约束交给 body 内部包装层。 */}
      <Modal
        open={open}
        width={680}
        footer={null}
        title={dialogTitle}
        className={`${prefixCls}-search-dialog`}
        rootClassName={clsx(`${prefixCls}-search-modal`, hashId)}
        destroyOnHidden
        focusable={{ trap: true, focusTriggerAfterClose: true }}
        onCancel={closeSearch}
        afterOpenChange={(visible) => {
          // 等待 Portal 和打开动画完成后再聚焦，避免焦点被 Modal 自己的关闭按钮抢走。
          if (visible)
            inputRef.current?.focus()
        }}
      >
        {/*
         * 只设置 maxHeight，不设置 height：
         * - 结果较少时由实际内容自然撑开；
         * - 内容超过视口上限时，这一层只限制并隐藏溢出，不承担滚动；
         * - 搜索框和分区标题不参与收缩，始终固定在列表上方；
         * - 剩余空间交给结果容器，由结果容器显示浏览器原生纵向滚动条。
         */}
        <Command
          label={dialogTitle}
          shouldFilter={false}
          loop
          vimBindings={false}
          className={`${prefixCls}-search-body`}
          style={{ maxHeight: bodyMaxHeight, overflowY: 'hidden' }}
        >
          {/* Command.Input 提供 combobox 语义，并把方向键导航交给 cmdk。 */}
          <div className={`${prefixCls}-search-input-wrapper`}>
            <SearchOutlined
              aria-hidden="true"
              className={`${prefixCls}-search-input-prefix`}
            />
            <Command.Input
              ref={inputRef}
              value={query}
              className={`${prefixCls}-search-input`}
              placeholder={intl.getMessage(
                'zby.pro.layout.search.placeholder',
                '搜索页面名称或路径',
              )}
              onValueChange={setQuery}
            />
            {query ? (
              <button
                type="button"
                className={`${prefixCls}-search-input-clear`}
                aria-label={intl.getMessage(
                  'zby.pro.layout.search.clearInput',
                  '清空搜索',
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setQuery('')
                  inputRef.current?.focus()
                }}
              >
                <CloseCircleFilled />
              </button>
            ) : null}
          </div>
          {/* 空关键词展示最近搜索标题；有关键词后切换成搜索结果标题。 */}
          <div className={`${prefixCls}-search-section-header`}>
            <span className={`${prefixCls}-search-section-title`}>
              {sectionTitle}
            </span>
            {/* 清空入口只属于最近搜索态，搜索结果态不展示记录管理操作。 */}
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
          {/*
           * 搜索结果与最近搜索共用这个列表容器：内容较少时保持自然高度；内容较多时在
           * Flex 布局中收缩到剩余空间，并由自身提供原生滚动，避免划走上方搜索框。
           */}
          <Command.List
            label={sectionTitle}
            className={`${prefixCls}-search-results`}
          >
            {/* 根据当前模式提供不同空状态，避免把“没有历史”误解成搜索无结果。 */}
            {visibleRoutes.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={normalizedQuery
                  ? intl.getMessage('zby.pro.layout.search.emptyResults', '未找到匹配页面')
                  : intl.getMessage('zby.pro.layout.search.emptyRecent', '暂无最近搜索')}
              />
            ) : null}
            {visibleRoutes.map((item) => (
              <div key={item.path} className={`${prefixCls}-search-result-row`}>
                <Command.Item
                  value={item.path}
                  className={clsx(`${prefixCls}-search-result`, {
                    // 最近态为选项右侧的独立删除按钮预留空间。
                    [`${prefixCls}-search-result-recent`]: !normalizedQuery,
                  })}
                  title={item.titlePath}
                  onSelect={() => openRoute(item)}
                >
                  {/* 标题行展示完整层级路径，命中内容由 mark 标签强调。 */}
                  <span className={`${prefixCls}-search-result-title`}>
                    {highlightMatch(item.titlePath, query, prefixCls)}
                  </span>
                  {/* pathname 单独成行，支持通过真实 URL 片段搜索页面。 */}
                  <span className={`${prefixCls}-search-result-path`}>
                    {highlightMatch(item.path, query, prefixCls)}
                  </span>
                </Command.Item>
                {/* 单条删除只管理最近记录，不应出现在普通搜索结果中。 */}
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
          </Command.List>
        </Command>
      </Modal>
    </>
  )
}

/**
 * 将权限路由树拍平成稳定的搜索候选列表。
 *
 * 遍历顺序沿用业务声明顺序，因此搜索结果天然保持与菜单一致的业务顺序。
 */
function collectSearchableRoutes(
  router: RouterCore<ProLayoutRoute>,
  intl: IntlShape,
): SearchableRoute[] {
  const items: SearchableRoute[] = []

  /** 递归时携带父级标题，构造用户可理解的完整页面路径。 */
  const walk = (routes: readonly ProLayoutRoute[], parentTitles: readonly string[]) => {
    routes.forEach((route) => {
      // ignore 与菜单保持同一语义：隐藏节点及其后代不进入全局搜索。
      if (route.ignore)
        return

      const titlePath = [...parentTitles, resolveProLayoutTitle(intl, route.title)]
      if (isSearchableRoute(router, route)) {
        const joinedTitlePath = titlePath.join(' / ')
        // 展示数据和搜索数据一次生成，输入过程中只做轻量 includes 匹配。
        items.push({
          path: route.path,
          titlePath: joinedTitlePath,
          searchText: normalizeSearchText(`${joinedTitlePath} ${route.path}`),
        })
      }

      // 目录本身不可搜索时仍需继续遍历，寻找其下可直接访问的页面。
      if (route.routes?.length)
        walk(route.routes, titlePath)
    })
  }

  // permissionRoutes 已经应用 RouterCore 创建时的权限判断，不再重复推断权限。
  walk(router.registry.permissionRoutes, [])
  return items
}

/** 只允许能够由当前 RouterCore 直接打开的普通内部页面进入搜索结果。 */
function isSearchableRoute(
  router: RouterCore<ProLayoutRoute>,
  route: ProLayoutRoute,
) {
  return Boolean(
    // 目录没有页面实例，不能作为最终搜索结果打开。
    router.registry.isPageRoute(route) &&
    // prompt 和外链拥有不同交互语义，不交给普通页签搜索处理。
    !route.prompt &&
    !route._blank &&
    // 未提供参数值的动态 pattern 无法生成一个确定的浏览器地址。
    isConcreteInternalPath(route.path),
  )
}

/** 判断路径是否为不含参数占位符和通配符的站内绝对路径。 */
function isConcreteInternalPath(path: string) {
  return path.startsWith('/') && path
    .split('/')
    .every((part) => !part.startsWith(':') && part !== '*')
}

/**
 * 按视口计算搜索内容区最大高度。
 *
 * 结果只作为 maxHeight 使用，所以返回值不会强迫少量内容撑满弹窗。
 */
function getSearchBodyMaxHeight(viewportHeight: number) {
  const availableHeight = viewportHeight * SEARCH_BODY_VIEWPORT_RATIO -
    SEARCH_BODY_RESERVED_HEIGHT
  // 小视口下保留最低操作高度，避免输入框和首条结果被压缩到不可用。
  return Math.max(SEARCH_BODY_MIN_MAX_HEIGHT, availableHeight)
}

/** 把查询命中的所有片段替换为 mark 节点，未命中内容保持原始顺序。 */
function highlightMatch(text: string, query: string, prefixCls: string): ReactNode {
  const normalizedQuery = normalizeSearchText(query)
  // 空关键词属于最近搜索态，不应对整段文字生成无意义高亮。
  if (!normalizedQuery)
    return text

  const normalizedText = text.toLocaleLowerCase()
  const parts: ReactNode[] = []
  let start = 0
  let matchIndex = normalizedText.indexOf(normalizedQuery)

  while (matchIndex >= 0) {
    // 先保留本次命中之前的普通文本。
    if (matchIndex > start)
      parts.push(text.slice(start, matchIndex))
    // mark 只包裹实际命中字符，样式层负责使用主题色强调。
    parts.push(
      <mark key={`${matchIndex}-${normalizedQuery}`} className={`${prefixCls}-search-highlight`}>
        {text.slice(matchIndex, matchIndex + normalizedQuery.length)}
      </mark>,
    )
    // 从当前命中结束位置继续寻找，支持同一文本多次命中。
    start = matchIndex + normalizedQuery.length
    matchIndex = normalizedText.indexOf(normalizedQuery, start)
  }

  // 最后一次命中后的尾部文本需要原样补回。
  if (start < text.length)
    parts.push(text.slice(start))

  return parts
}

/** 搜索统一忽略首尾空白和大小写，但不改变用户输入框中的原始值。 */
function normalizeSearchText(value: string) {
  return value.trim().toLocaleLowerCase()
}

/** 从 localStorage 恢复并清洗最近路径。 */
function readRecentRoutePaths(): string[] {
  if (typeof window === 'undefined')
    return []

  try {
    const value = JSON.parse(
      window.localStorage.getItem(RECENT_ROUTE_STORAGE_KEY) || '[]',
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

/** 持久化完整的最近路径快照；失败时降级为当前会话内存状态。 */
function saveRecentRoutePaths(paths: readonly string[]) {
  if (typeof window === 'undefined')
    return

  try {
    window.localStorage.setItem(RECENT_ROUTE_STORAGE_KEY, JSON.stringify(paths))
  } catch {
    // localStorage 不可用时仍允许本次搜索和导航正常完成。
  }
}

export default memo(RouteSearch)

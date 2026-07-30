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
/** 最近搜索只保留有限数量，避免长期使用后无界增长。 */
const MAX_RECENT_ROUTE_COUNT = 8
/** 使用 RouterCore 的 storageKey 作为后缀，隔离不同应用和用户空间。 */
const RECENT_ROUTE_STORAGE_PREFIX = 'zby-pro-layout:route-search:'
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

export interface ProRouteSearchProps {
  /** 生成样式类名的前缀，默认与 ProLayout 一致。 */
  prefixCls?: string
  /** 附加到搜索触发按钮上的业务类名。 */
  className?: string
}

/**
 * 独立的全局路由搜索入口。
 *
 * 组件只依赖当前 RouterCore 与国际化上下文，由业务自行放入 ProLayout 的
 * `header.extra`。弹窗内容少时按自然高度渲染；内容超过视口允许范围后，内容包装层
 * 负责限制总高度，只有搜索结果或最近搜索列表提供原生纵向滚动。
 */
function RouteSearch(props: ProRouteSearchProps) {
  const {
    className,
    prefixCls = DEFAULT_PREFIX_CLS,
  } = props
  const intl = useIntl()
  // 搜索、权限过滤、页签打开均复用宿主已经创建的 RouterCore 实例。
  const router = useRouterCore<ProLayoutRoute>()
  // 搜索弹窗通过 Portal 渲染，需要独立 hashId 才能命中作用域样式。
  const hashId = useRouteSearchStyles(prefixCls)
  // Modal 完成打开动画后把焦点交给搜索输入框。
  const inputRef = useRef<InputRef>(null)
  // 保存 resize 防抖定时器，组件卸载时必须一并清理。
  const resizeTimerRef = useRef<number | null>(null)
  const storageKey = router.getState().storageKey

  // 弹窗和搜索交互的最小状态集合。
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  // undefined 使 SSR 与客户端首次渲染保持一致；挂载后再读取真实视口高度。
  const [bodyMaxHeight, setBodyMaxHeight] = useState<number>()
  // 最近记录在首次渲染时同步读取，打开弹窗即可直接展示。
  const [recentPaths, setRecentPaths] = useState<string[]>(
    () => readRecentRoutePaths(storageKey),
  )

  // 权限路由树在 RouterCore 生命周期内固定，只需在 router 实例变化时重新生成。
  const searchableRoutes = useMemo(
    () => collectSearchableRoutes(router),
    [router],
  )
  // 最近记录只保存 pathname，展示数据始终从最新权限路由表中恢复。
  const routeMap = useMemo(
    () => new Map(searchableRoutes.map((item) => [item.path, item])),
    [searchableRoutes],
  )
  const normalizedQuery = normalizeSearchText(query)
  // 有关键词时仅显示当前匹配项；空关键词时不提前返回全部页面。
  const matchedRoutes = useMemo(
    () => normalizedQuery
      ? searchableRoutes.filter((item) => item.searchText.includes(normalizedQuery))
      : [],
    [normalizedQuery, searchableRoutes],
  )
  // 权限已失效或路由已删除的历史路径暂时隐藏，不渲染脏记录。
  const recentRoutes = useMemo(
    () => recentPaths.flatMap((path) => {
      const item = routeMap.get(path)
      // flatMap 让不存在的路径自然被过滤，同时保留最近顺序。
      return item ? [item] : []
    }),
    [recentPaths, routeMap],
  )
  // 搜索态和最近态共用同一套列表与键盘导航逻辑。
  const visibleRoutes = normalizedQuery ? matchedRoutes : recentRoutes
  const triggerTitle = intl.getMessage(
    'zby.pro.layout.search.trigger',
    '搜索页面（Ctrl+K）',
  )

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

  /** 注册全局 Ctrl/Cmd + K 快捷键，并在组件卸载时解除监听。 */
  useEffect(() => {
    const handleShortcut = (event: globalThis.KeyboardEvent) => {
      // 同时兼容 Windows/Linux 的 Ctrl 和 macOS 的 Command。
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'k')
        return

      // 阻止浏览器或宿主应用占用同一快捷键。
      event.preventDefault()
      setOpen(true)
      // 有最近记录时默认选中第一项，Enter 可以直接打开。
      setActiveIndex(recentRoutes.length > 0 ? 0 : -1)
    }

    document.addEventListener('keydown', handleShortcut)
    return () => document.removeEventListener('keydown', handleShortcut)
  }, [recentRoutes.length])

  /** 关闭时同步清空临时查询和键盘选中态，下次打开固定回到最近搜索。 */
  const closeSearch = () => {
    setOpen(false)
    setQuery('')
    setActiveIndex(-1)
  }

  /** 通过右侧放大镜打开搜索，并恢复最近列表的默认键盘选中项。 */
  const showSearch = () => {
    setOpen(true)
    setActiveIndex(recentRoutes.length > 0 ? 0 : -1)
  }

  /** 更新关键词，并让键盘选中态始终与新结果集保持一致。 */
  const changeQuery = (value: string) => {
    const nextQuery = normalizeSearchText(value)
    // 这里只判断是否至少存在一项，不额外构造第二份过滤数组。
    const hasResults = nextQuery
      ? searchableRoutes.some((item) => item.searchText.includes(nextQuery))
      : recentRoutes.length > 0
    setQuery(value)
    // 新结果存在时从第一项开始，否则取消选择，避免 Enter 命中过期索引。
    setActiveIndex(hasResults ? 0 : -1)
  }

  /** 打开页面并把它提升到最近搜索首位。 */
  const openRoute = (item: SearchableRoute) => {
    setRecentPaths((currentPaths) => {
      // 先去重再放到首位，最后统一裁剪到记录上限。
      const nextPaths = [
        item.path,
        ...currentPaths.filter((path) => path !== item.path),
      ].slice(0, MAX_RECENT_ROUTE_COUNT)
      // 状态与持久化使用同一份快照，避免展示顺序和下次恢复顺序不一致。
      saveRecentRoutePaths(storageKey, nextPaths)
      return nextPaths
    })
    // jumpTo 会复用已经打开的页签，或按 RouterCore 规则创建新页签。
    router.jumpTo(item.path)
    closeSearch()
  }

  /** 删除一条最近记录，不影响当前路由和已经打开的页签。 */
  const removeRecentRoute = (item: SearchableRoute) => {
    const nextPaths = recentPaths.filter((path) => path !== item.path)
    setRecentPaths(nextPaths)
    saveRecentRoutePaths(storageKey, nextPaths)
    // 删除后重新从首项开始，避免 activeIndex 指向已经不存在的记录。
    setActiveIndex(nextPaths.length > 0 ? 0 : -1)
  }

  /** 清空当前 storageKey 下的全部最近记录。 */
  const clearRecentRoutes = () => {
    setRecentPaths([])
    saveRecentRoutePaths(storageKey, [])
    setActiveIndex(-1)
  }

  /** 在输入框保持焦点的情况下支持上下方向键选择和 Enter 打开。 */
  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // 空列表不消费按键，保留输入框和 Modal 的原生行为。
    if (visibleRoutes.length === 0)
      return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      // 到达末项后回到第一项，形成循环导航。
      setActiveIndex((current) => (current + 1) % visibleRoutes.length)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      // 在首项继续向上时跳到最后一项。
      setActiveIndex((current) =>
        current <= 0 ? visibleRoutes.length - 1 : current - 1,
      )
      return
    }

    if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault()
      // activeIndex 只会指向当前 visibleRoutes，直接复用鼠标打开流程。
      openRoute(visibleRoutes[activeIndex])
    }
  }

  return (
    <>
      {/* 业务将该触发器与语言、主题组件并列放入 header.extra。 */}
      <Button
        type="text"
        size="small"
        icon={<SearchOutlined />}
        className={clsx(`${prefixCls}-search-trigger`, hashId, className)}
        aria-label={triggerTitle}
        title={triggerTitle}
        onClick={showSearch}
      />
      {/* Modal 只负责标题和外壳，视口高度约束交给 body 内部包装层。 */}
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
        <div
          className={`${prefixCls}-search-body`}
          style={{ maxHeight: bodyMaxHeight, overflowY: 'hidden' }}
        >
          {/* 搜索框始终是内容区的首个元素，并承载完整键盘导航。 */}
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
          {/* 空关键词展示最近搜索标题；有关键词后切换成搜索结果标题。 */}
          <div className={`${prefixCls}-search-section-header`}>
            <span className={`${prefixCls}-search-section-title`}>
              {normalizedQuery
                ? intl.getMessage('zby.pro.layout.search.results', '搜索结果')
                : intl.getMessage('zby.pro.layout.search.recent', '最近搜索')}
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
          <div className={`${prefixCls}-search-results`}>
            {/* 根据当前模式提供不同空状态，避免把“没有历史”误解成搜索无结果。 */}
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
                  // active 同时服务鼠标悬浮反馈和键盘方向键选择。
                  [`${prefixCls}-search-result-active`]: index === activeIndex,
                  // 最近态为主按钮预留右侧删除按钮空间。
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
                  {/* 标题行展示完整层级路径，命中内容由 mark 标签强调。 */}
                  <span className={`${prefixCls}-search-result-title`}>
                    {highlightMatch(item.titlePath, query, prefixCls)}
                  </span>
                  {/* pathname 单独成行，支持通过真实 URL 片段搜索页面。 */}
                  <span className={`${prefixCls}-search-result-path`}>
                    {highlightMatch(item.path, query, prefixCls)}
                  </span>
                </button>
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
          </div>
        </div>
      </Modal>
    </>
  )
}

/**
 * 将权限路由树拍平成稳定的搜索候选列表。
 *
 * 遍历顺序沿用业务声明顺序，因此搜索结果天然保持与菜单一致的业务顺序。
 */
function collectSearchableRoutes(router: RouterCore<ProLayoutRoute>): SearchableRoute[] {
  const items: SearchableRoute[] = []

  /** 递归时携带父级标题，构造用户可理解的完整页面路径。 */
  const walk = (routes: readonly ProLayoutRoute[], parentTitles: readonly string[]) => {
    routes.forEach((route) => {
      // ignore 与菜单保持同一语义：隐藏节点及其后代不进入全局搜索。
      if (route.ignore)
        return

      const titlePath = [...parentTitles, route.title]
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

/** 从 localStorage 恢复并清洗当前 RouterCore 空间的最近路径。 */
function readRecentRoutePaths(storageKey: string): string[] {
  // SSR 或禁用浏览器 API 的环境直接使用空记录。
  if (typeof window === 'undefined')
    return []

  try {
    const value = JSON.parse(
      window.localStorage.getItem(`${RECENT_ROUTE_STORAGE_PREFIX}${storageKey}`) || '[]',
    )
    // 不信任历史存储结构，非数组值直接丢弃。
    if (!Array.isArray(value))
      return []
    // 只保留非空字符串，按首次出现顺序去重，并应用统一数量上限。
    return Array.from(new Set(
      value.filter((item): item is string => typeof item === 'string' && item.length > 0),
    )).slice(0, MAX_RECENT_ROUTE_COUNT)
  } catch {
    // JSON 损坏或 localStorage 不可读不应阻断搜索入口渲染。
    return []
  }
}

/** 持久化完整的最近路径快照；失败时降级为当前会话内存状态。 */
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

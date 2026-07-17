import { buildUrlForTab } from './url'
import { enforceKeepAliveLimit, shouldRefreshPageTouchedAt } from './keepAlive'
import {
  persistCollection,
  persistFixedTabs,
} from './persistence'
import type { ProLayoutStoreRuntime } from './runtime'
import { sortTabs } from './tabModel'
import type {
  GetProLayoutStoreState,
  ProLayoutTab,
  SetProLayoutStoreState,
} from './types'
import type { ProLayoutCloseOptions } from '../interface'

/**
 * 确保 pathname 对应的页签和页面状态已经存在并处于活动状态。
 *
 * 路由解析和 tabKey 计算统一委托给 Registry；普通参数路由共享页签时，真实
 * pathname 额外写入 Cache。页面集合随后应用 KeepAlive 过滤和 LRU 上限。
 */
export function ensureTabStateForPathname(
  set: SetProLayoutStoreState,
  get: GetProLayoutStoreState,
  pathname: string,
  options?: { ensurePage?: boolean },
) {
  const state = get()
  // 页面实例只能从权限索引创建。完整索引仍用于识别 403 和恢复旧页签身份，但不能
  // 进入 pages，否则直接 URL、固定页签或 KeepAlive 都可能绕过最新权限快照。
  const leaf = state.resolveLeafRoute(pathname, true)
  const route = leaf?.route
  if (!route || !state.registry.isPageRoute(route))
    return null

  // 普通动态路由返回注册 pattern 作为共享 key；supportMultipleTabs 路由返回真实
  // pathname。后续 tabs、pages、Hook 和 Cache 都统一以这个 key 关联。
  const tabKey = state.getTabKey(pathname)
  if (!tabKey)
    return null

  const ensurePage = options?.ensurePage ?? true

  set((previous) => {
    // 仅把实际变化的切片放入 next；如果页签已经激活且页面无需变化，则返回旧 state。
    const next: Partial<ReturnType<GetProLayoutStoreState>> = {}
    let tabs = previous.tabs
    let pages = previous.pages

    if (!tabs.some((tab) => tab.key === tabKey)) {
      // 新页签先追加，再由 sortTabs 恢复“固定在前、组内稳定”的顺序。
      tabs = sortTabs(
        tabs.concat({ key: tabKey, label: route.title, labelCustomized: false }),
        previous.fixedSet,
      )
      next.tabs = tabs
    }

    if (previous.activeTabKey !== tabKey)
      next.activeTabKey = tabKey

    if (ensurePage) {
      const now = Date.now()
      const pageIndex = pages.findIndex((page) => page.key === tabKey)

      if (pageIndex < 0) {
        // 页签可能来自 hydration 的固定项但尚未渲染过，此时才创建页面实例描述。
        pages = pages.concat({
          key: tabKey,
          pathname,
          route,
          touchedAt: now,
        })
      } else if (pages[pageIndex].pathname !== pathname) {
        // 共享动态页签访问了新的实际地址：保留 page key/React 实例身份，同时替换
        // pathname、匹配路由和 LRU 时间。
        pages = pages.map((page) =>
          page.key === tabKey
            ? { ...page, pathname, route, touchedAt: now }
            : page,
        )
      } else if (shouldRefreshPageTouchedAt(previous.keepAlive)) {
        // 只有启用有限 LRU 时重访才需要更新时间；无限缓存不为无效时间戳触发更新。
        pages = pages.map((page) =>
          page.key === tabKey && page.touchedAt !== now
            ? { ...page, touchedAt: now }
            : page,
        )
      }

      // 先完成当前页的创建/刷新，再以当前 tabKey 为不可淘汰活动项执行过滤和 LRU。
      pages = enforceKeepAliveLimit(
        pages,
        tabKey,
        previous.keepAlive,
        previous.fixedSet,
      )

      if (previous.pages !== pages)
        next.pages = pages
      if (previous.activePage !== tabKey)
        next.activePage = tabKey
    }

    return Object.keys(next).length > 0 ? next : previous
  })

  // 共享动态页签的 key 只是路由 pattern，真实 pathname 另存 Cache，供重新激活、关闭
  // 回调和跨持久化来源恢复使用；多页签模式的 key 已是 pathname，无需重复映射。
  if (tabKey !== pathname && !route.supportMultipleTabs)
    get().cache.setParamsPath(tabKey, pathname)

  return tabKey
}

/**
 * 替换页签顺序，并在固定页签组内顺序确实变化时同步持久化。
 *
 * 拖拽组件即使没有产生有效重排，也可能返回一个内容相同的新数组，因此不能只比较
 * 数组引用。普通页签之间的顺序不属于持久化数据；只有固定页签的相对顺序变化时，
 * 才同时更新 fixedSet 并写入 Storage Adapter。
 */
export function setTabs(
  set: SetProLayoutStoreState,
  get: GetProLayoutStoreState,
  runtime: ProLayoutStoreRuntime,
  tabs: ProLayoutTab[],
) {
  const state = get()
  // 内容相等的新数组常见于无效拖拽；直接跳过可避免状态更新和持久化写入。
  if (areTabsEqual(state.tabs, tabs))
    return

  // fixedSet 的数组顺序就是固定页签的持久化顺序。只从新 tabs 中抽取固定项，普通
  // 页签如何重排都不会触发 fixedTabs 保存。
  const orderedFixedTabs = tabs
    .filter((tab) => state.fixedSet.includes(tab.key))
    .map((tab) => tab.key)
  const fixedOrderChanged = !areStringArraysEqual(
    state.fixedSet,
    orderedFixedTabs,
  )

  if (fixedOrderChanged)
    persistFixedTabs(set, get, runtime, orderedFixedTabs)

  // 固定顺序改变时，内存 fixedSet 与 tabs 必须在同一次提交中保持一致。
  set({
    tabs,
    ...(fixedOrderChanged ? { fixedSet: orderedFixedTabs } : {}),
  })
}

/** 收藏或取消收藏路由，并保持参考实现的成功提示。 */
export function toggleCollection(
  set: SetProLayoutStoreState,
  get: GetProLayoutStoreState,
  runtime: ProLayoutStoreRuntime,
  path: string,
) {
  const state = get()
  const isCollected = state.collectionSet.includes(path)
  // 使用新数组而不原地修改，既满足 Zustand 订阅比较，也让 Adapter 得到稳定快照。
  const next = isCollected
    ? state.collectionSet.filter((item) => item !== path)
    : state.collectionSet.concat(path)

  // persist 会先标记字段 mutation version，随后 UI 状态立即更新；外部存储失败不阻塞
  // 当前交互，统一通过 onStorageLoadError 暴露。
  persistCollection(set, get, runtime, next)
  set({ collectionSet: next })
  state.messageApi?.success?.(
    isCollected
      ? state.intl.getMessage('proLayout.uncollectSuccess', '取消收藏成功')
      : state.intl.getMessage('proLayout.collectSuccess', '收藏成功'),
  )
}

/** 固定或取消固定页签，并执行最大固定数量限制。 */
export function toggleFixed(
  set: SetProLayoutStoreState,
  get: GetProLayoutStoreState,
  runtime: ProLayoutStoreRuntime,
  path: string,
) {
  const state = get()
  const isFixed = state.fixedSet.includes(path)

  // 只有新增固定项受数量上限约束；取消固定始终允许，确保用户可以释放名额。
  if (!isFixed && state.fixedSet.length >= state.maxFixedTabCount) {
    state.messageApi?.open?.({
      type: 'info',
      content: state.intl.getMessage(
        'proLayout.maxFixedTabs',
        '最多钉住{{count}}个标签，请先取消一个钉住标签',
        { count: state.maxFixedTabCount },
      ),
    })
    return
  }

  const next = isFixed
    ? state.fixedSet.filter((item) => item !== path)
    : state.fixedSet.concat(path)

  persistFixedTabs(set, get, runtime, next)
  // fixedSet 与 tabs 排序同步提交，视图不会短暂出现“状态已固定但位置尚未移动”。
  set({ fixedSet: next, tabs: sortTabs(state.tabs, next) })
  state.messageApi?.success?.(
    isFixed
      ? state.intl.getMessage('proLayout.unfixedSuccess', '已取消页签固定')
      : state.intl.getMessage('proLayout.fixedSuccess', '页签固定成功'),
  )
}

/**
 * 关闭页签并清理其页面、URL Cache、事件发射器和关闭前 Hook。
 *
 * Hook 完成后会重新检查页签是否仍存在，避免两个并发关闭操作重复清理和重复触发
 * afterTabClose。固定页签允许沿用现有关闭交互，但关闭时会同步取消固定并持久化，
 * 防止隐藏 key 继续占用固定数量或在下次挂载时重新出现。
 */
export async function closeTab(
  set: SetProLayoutStoreState,
  get: GetProLayoutStoreState,
  runtime: ProLayoutStoreRuntime,
  tabKey: string,
  options?: ProLayoutCloseOptions,
) {
  const initialState = get()
  // 关闭动作可能来自重复点击或跨窗口消息；不存在的 key 不执行 Hook 和回调。
  if (!initialState.tabs.some((tab) => tab.key === tabKey))
    return false

  if (!options?.skipBeforeClose) {
    // 同一页签的守卫并行执行，只有每个 Hook 都显式返回 true 才允许关闭；undefined、
    // false 或 rejection 都不会被当成同意。rejection 继续交给调用方处理。
    const hooks = runtime.beforeTabCloseMap.get(tabKey) || []
    if (hooks.length > 0) {
      const results = await Promise.all(hooks.map((hook) => hook()))
      if (!results.every((result) => result === true))
        return false
    }
  }

  // 等待异步 Hook 期间另一个关闭操作可能已经完成，必须基于最新状态再次确认。
  const state = get()
  if (!state.tabs.some((tab) => tab.key === tabKey))
    return false

  const closedIndex = state.tabs.findIndex((tab) => tab.key === tabKey)
  const nextTabs = state.tabs.filter((tab) => tab.key !== tabKey)
  // 关闭活动页时优先激活左侧相邻页；关闭首项时退到删除后同索引（原右侧）页签。
  // 关闭非活动页时保持当前激活状态，因此 nextActive 使用 null 表示“不需要切换”。
  const nextActive =
    state.activeTabKey === tabKey
      ? nextTabs[Math.max(0, closedIndex - 1)] || nextTabs[closedIndex] || null
      : null
  // 共享动态页签对外回调应携带最后一次真实 pathname，而不是注册 pattern。
  const closedPathname = state.cache.getParamsPathByTabKey(tabKey) || tabKey
  const wasFixed = state.fixedSet.includes(tabKey)
  const nextFixedSet = wasFixed
    ? state.fixedSet.filter((key) => key !== tabKey)
    : state.fixedSet

  if (wasFixed)
    persistFixedTabs(set, get, runtime, nextFixedSet)

  set((previous) => {
    // 共享动态页签会为多个真实 pathname 保存描述。关闭时必须按 tabKey 清理全部历史
    // 地址，不能只删除 Cache 中最后一次访问的 closedPathname。
    const pathnameDescriptionMap = { ...previous.pathnameDescriptionMap }
    Object.keys(pathnameDescriptionMap).forEach((pathname) => {
      if (previous.registry.getTabKey(pathname) === tabKey)
        delete pathnameDescriptionMap[pathname]
    })
    const pages = previous.pages.filter((page) => page.key !== tabKey)

    return {
      tabs: nextTabs,
      // 关闭页签与 KeepAlive 配置无关，对应页面实例必须立即从缓存集合移除。
      pages,
      fixedSet: nextFixedSet,
      activeTabKey: nextActive
        ? nextActive.key
        : previous.activeTabKey === tabKey
          ? null
          : previous.activeTabKey,
      activePage: nextActive
        ? pages.some((page) => page.key === nextActive.key)
          ? nextActive.key
          : null
        : previous.activePage === tabKey
          ? null
          : previous.activePage,
      pathnameDescriptionMap,
    }
  })

  const latest = get()
  // Zustand 状态提交后再清理命令资源和 URL Cache，确保回调读取到的是关闭后的快照。
  runtime.beforeTabCloseMap.delete(tabKey)
  runtime.pageLocationEmitterMap.delete(tabKey)
  latest.cache.clearTab(tabKey)
  latest.afterTabClose?.(tabKey, { pathname: closedPathname })

  if (nextActive) {
    // 回退页签可能是共享动态路由，必须恢复其真实 pathname、查询参数和 hash。
    const path = latest.cache.getParamsPathByTabKey(nextActive.key) || nextActive.key
    latest.navigate?.(
      buildUrlForTab({
        pathname: path,
        searchParams: latest.cache.getSearchParamsForTabKey(nextActive.key),
        hash: latest.cache.getHashForTabKey(nextActive.key),
      }),
    )
  } else if (latest.activeTabKey === null) {
    // 最后一个活动页签关闭后回到根路径，由 bootstrap 流程决定默认可访问页面。
    latest.navigate?.('/')
  }

  return true
}

/** 比较页签领域数据，过滤只因调用方创建新数组或新对象产生的无效更新。 */
function areTabsEqual(left: ProLayoutTab[], right: ProLayoutTab[]) {
  return left === right || (
    left.length === right.length &&
    left.every(
      (tab, index) =>
        tab.key === right[index]?.key &&
        tab.label === right[index]?.label &&
        tab.labelCustomized === right[index]?.labelCustomized,
    )
  )
}

/** 按顺序比较固定页签 key，顺序变化本身就是需要持久化的业务状态。 */
function areStringArraysEqual(left: string[], right: string[]) {
  return left === right || (
    left.length === right.length &&
    left.every((item, index) => item === right[index])
  )
}

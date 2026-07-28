import { useIntl } from '@zby/intl'
import { message } from 'antd'
import { createContext, useCallback, useContext, useEffect, useMemo } from 'react'
import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'

import { loadFavoriteMenuPaths, saveFavoriteMenuPaths } from './storage'

import type { RouterCore } from '@zby/router-core'
import type { ReactNode } from 'react'
import type { StoreApi } from 'zustand/vanilla'
import type { ProLayoutRoute } from '../types'

interface FavoriteMenusState {
  /** 只保存稳定的路由 path；标题、图标等展示数据始终从当前路由表读取。 */
  favoritePaths: readonly string[]
  /** 标识首次 IndexedDB 加载已经结束，内部用它区分加载期间和加载后的用户操作。 */
  hydrated: boolean
}

interface FavoriteMenusController {
  store: StoreApi<FavoriteMenusState>
  hydrate: () => Promise<void>
  toggleFavorite: (path: string) => void
}

const FavoriteMenusContext = createContext<FavoriteMenusController | null>(null)

/**
 * 为单个 ProLayout 实例创建收藏 Store。
 * Store 跟随 router 实例存在，不使用模块级全局状态，避免多个应用或测试之间互相污染。
 */
export function FavoriteMenusProvider(props: {
  router: RouterCore<ProLayoutRoute>
  children: ReactNode
}) {
  const { children, router } = props
  const intl = useIntl()
  const [messageApi, messageContextHolder] = message.useMessage()
  const reportStorageError = useCallback((error: unknown, phase: 'load' | 'save') => {
    console.error(`[ProLayout] Failed to ${phase} favorite menus.`, error)
    void messageApi.error(
      phase === 'load'
        ? intl.getMessage('zby.pro.layout.favorites.loadError', '菜单收藏加载失败')
        : intl.getMessage('zby.pro.layout.favorites.saveError', '菜单收藏保存失败'),
    )
  }, [intl, messageApi])
  const reportFavoriteChange = useCallback((favorite: boolean) => {
    void messageApi.success(
      favorite
        ? intl.getMessage('zby.pro.layout.favorites.collectSuccess', '收藏成功')
        : intl.getMessage('zby.pro.layout.favorites.uncollectSuccess', '取消收藏成功'),
    )
  }, [intl, messageApi])
  const controller = useMemo(
    () => createFavoriteMenusController(router, reportStorageError, reportFavoriteChange),
    [reportFavoriteChange, reportStorageError, router],
  )

  useEffect(() => {
    // hydrate 内部会隔离读写错误；这里不再额外产生未处理的 Promise rejection。
    void controller.hydrate()
  }, [controller])

  return (
    <FavoriteMenusContext.Provider value={controller}>
      {messageContextHolder}
      {children}
    </FavoriteMenusContext.Provider>
  )
}

/** 使用 selector 订阅收藏状态，只有选中结果变化的组件才会重新渲染。 */
export function useFavoriteMenusSelector<Selected>(
  selector: (state: FavoriteMenusState) => Selected,
): Selected {
  const controller = useFavoriteMenusController()
  return useStore(controller.store, selector)
}

/** 返回稳定的收藏切换命令，菜单组件不需要接触 Store 的写入能力。 */
export function useToggleFavoriteMenu() {
  return useFavoriteMenusController().toggleFavorite
}

/**
 * 只有普通页面菜单可以收藏。
 * prompt 和隐藏路由不显示收藏入口。
 */
export function isFavoriteMenuRoute(
  router: RouterCore<ProLayoutRoute>,
  route?: ProLayoutRoute | null,
): route is ProLayoutRoute {
  return Boolean(
    route &&
    !route.ignore &&
    !route.prompt &&
    router.registry.isPageRoute(route),
  )
}

function useFavoriteMenusController() {
  const controller = useContext(FavoriteMenusContext)
  if (!controller)
    throw new Error('[ProLayout] Favorite menu hooks must be used inside FavoriteMenusProvider.')
  return controller
}

function createFavoriteMenusController(
  router: RouterCore<ProLayoutRoute>,
  onStorageError: (error: unknown, phase: 'load' | 'save') => void,
  onFavoriteChange: (favorite: boolean) => void,
): FavoriteMenusController {
  const storageKey = router.getState().storageKey
  const store = createStore<FavoriteMenusState>(() => ({
    favoritePaths: [],
    hydrated: false,
  }))
  let hydrated = false
  let hydrationPromise: Promise<void> | null = null
  const pendingFavoriteStates = new Map<string, boolean>()

  const isValidPath = (path: string) => isFavoriteMenuRoute(
    router,
    router.registry.fullRouteMapping[path],
  )

  const persist = (favoritePaths: readonly string[]) => {
    void saveFavoriteMenuPaths(storageKey, favoritePaths).catch((error) => {
      onStorageError(error, 'save')
    })
  }

  const toggleFavorite = (path: string) => {
    // 收藏命令只接受当前完整路由表中的普通页面，避免把外链、提示菜单或脏路径写入存储。
    if (!isValidPath(path))
      return

    const currentPaths = store.getState().favoritePaths
    const favorite = !currentPaths.includes(path)
    if (!hydrated)
      pendingFavoriteStates.set(path, favorite)

    const nextPaths = setFavorite(currentPaths, path, favorite)
    store.setState({ favoritePaths: nextPaths })
    onFavoriteChange(favorite)

    // 加载期间的操作会在 hydrate 中重放到持久化快照上，不能提前用空内存覆盖已有收藏。
    if (hydrated)
      persist(nextPaths)
  }

  const hydrate = () => {
    if (hydrationPromise)
      return hydrationPromise

    hydrationPromise = (async () => {
      let loadedPaths: string[]
      try {
        loadedPaths = await loadFavoriteMenuPaths(storageKey)
      } catch (error) {
        hydrated = true
        pendingFavoriteStates.clear()
        store.setState({ hydrated: true })
        onStorageError(error, 'load')
        return
      }

      // 删除已经不存在或已不再属于普通页面菜单的历史脏数据；暂时无权限的路径仍会保留。
      const validLoadedPaths = loadedPaths.filter(isValidPath)
      // 加载期间记录的是用户在当时 UI 中选择的最终状态，而不是裸 toggle。
      // 即使 IndexedDB 中原本已经收藏该路径，也不会把一次“收藏”点击错误重放成“取消收藏”。
      const mergedPaths = Array.from(pendingFavoriteStates).reduce(
        (paths, [path, favorite]) => setFavorite(paths, path, favorite),
        validLoadedPaths,
      )
      pendingFavoriteStates.clear()
      hydrated = true
      store.setState({ favoritePaths: mergedPaths, hydrated: true })

      // 只有清理脏数据或合并了加载期间操作时才回写，普通 hydration 不制造额外写入。
      if (!areStringArraysEqual(loadedPaths, mergedPaths))
        persist(mergedPaths)
    })()

    return hydrationPromise
  }

  return { store, hydrate, toggleFavorite }
}

function setFavorite(paths: readonly string[], path: string, favorite: boolean): string[] {
  if (favorite)
    return paths.includes(path) ? [...paths] : [...paths, path]
  return paths.filter((item) => item !== path)
}

function areStringArraysEqual(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((item, index) => item === right[index])
}

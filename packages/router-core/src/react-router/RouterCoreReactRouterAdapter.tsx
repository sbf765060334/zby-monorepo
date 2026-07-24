import { useLayoutEffect, useMemo, useRef } from 'react'
import { useHref, useLocation, useNavigate } from 'react-router-dom'

import type { ReactNode } from 'react'
import type { RouterHost, RouterNavigate } from '../types'
import { useRouterCore } from '../react/RouterCoreProvider'

/** React Router 与当前 RouterCore 实例之间的适配边界参数。 */
export interface RouterCoreReactRouterAdapterProps {
  /**
   * 同时位于 React Router 和 RouterCoreProvider 内的业务 React 子树。
   *
   * Adapter 只建立宿主连接，不创建 RouterCore，也不生成额外 DOM。
   */
  children: ReactNode
}

/**
 * 把 React Router 的 location 与 navigate 能力接入当前 RouterCore。
 *
 * 本组件必须同时位于 React Router（BrowserRouter、MemoryRouter 等）和
 * RouterCoreProvider 内部。挂载后，Core 的 jumpTo、smartNavigate 等命令会交给
 * React Router 改变真实地址；React Router 确认的新地址再统一进入 syncLocation，
 * 由 Core 创建或激活页签和页面实例。
 */
export function RouterCoreReactRouterAdapter(
  props: RouterCoreReactRouterAdapterProps,
) {
  const { children } = props
  const router = useRouterCore()
  const location = useLocation()
  const reactRouterNavigate = useNavigate()
  const navigateRef = useRef(reactRouterNavigate)

  useLayoutEffect(() => {
    // BrowserRouter/MemoryRouter 的 useNavigate 引用可能随 pathname 变化。Host 代表的
    // 是 Adapter 生命周期而不是单次地址快照，因此只更新底层函数，不重新解绑 Host。
    navigateRef.current = reactRouterNavigate
  }, [reactRouterNavigate])

  const host = useMemo<RouterHost>(() => {
    const navigate: RouterNavigate = (target, options) => {
      // React Router 6/7 都接受与 RouterNavigateTarget 兼容的 string 或 pathname 对象。
      // 返回的 Promise（仅部分 Data Router 实现存在）不属于 Core 的同步宿主契约。
      void navigateRef.current(target, options)
    }

    return { navigate }
  }, [])

  useLayoutEffect(() => {
    // Core 只保存当前 Adapter 提供的宿主引用；重新绑定不会重建 Core 或修改领域状态。
    router.bindHost(host)

    return () => {
      // Adapter 卸载后必须清除失效的 React Router navigate 闭包，避免业务命令继续向
      // 已经卸载的 Router 发起导航。一个 Core 实例应只挂载一个宿主 Adapter。
      router.bindHost(null)
    }
  }, [host, router])

  useLayoutEffect(() => {
    // 地址必须以 React Router 最终确认的 location 为准。Core 命令只负责请求导航，
    // 浏览器前进后退、外部跳转和命令导航都会在这里汇合成同一条状态同步链路。
    router.syncLocation({
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
    })
  }, [location.hash, location.pathname, location.search, router])

  return <>{children}</>
}

/**
 * 返回能够为任意应用内路径生成原生 href 的稳定函数。
 *
 * href 属于 React Router 的渲染期能力，不进入 RouterCore Host 或状态。Hook 直接读取
 * 当前 Router 的 basename/Hash 前缀，因此首屏渲染即可用于 `<a href>`，无需等待
 * Adapter 在 layout effect 中绑定 Host。
 */
export function useRouterCoreCreateHref(): (path: string) => string {
  const rootHref = useHref('/')

  return useMemo(
    () => (path: string) => createHrefFromRoot(rootHref, path),
    [rootHref],
  )
}

/**
 * 将应用内绝对路径拼接到 React Router 的根 href。
 *
 * `useHref('/')` 已经包含 BrowserRouter/MemoryRouter 的 basename，HashRouter 下也会
 * 包含 `#` 路由前缀。非 `/` 开头的地址不属于 Core 注册路径，保持原值交给上层处理。
 */
function createHrefFromRoot(rootHref: string, path: string) {
  if (!path.startsWith('/'))
    return path

  const normalizedRoot = rootHref.endsWith('/')
    ? rootHref.slice(0, -1)
    : rootHref
  return `${normalizedRoot}${path}`
}

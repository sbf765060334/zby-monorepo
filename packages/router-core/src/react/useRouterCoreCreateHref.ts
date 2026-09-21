/**
 * 文件职责：用 React Router 的 basename / Hash 前缀生成应用内原生 href。
 *
 * href 属于渲染期能力，不进入 RouterCore Host 或状态。Hook 直接读取当前 Router
 * 的前缀，因此首屏即可用于 `<a href>`，无需等待 Provider 绑定 navigate。
 */
import { useMemo } from 'react'
import { useHref } from 'react-router-dom'

/** 返回能够为任意应用内路径生成原生 href 的稳定函数。 */
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

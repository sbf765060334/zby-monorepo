/**
 * 文件职责：把「标题描述符怎么变成文本」这件事从 core 交到渲染层手里。
 *
 * core 只存放 route.title、tab.label 和 pathnameDescriptionMap 这些描述符，从不解释
 * 它们。本文件提供一个不依赖任何 i18n 库的中性 Context：业务注入 resolve，菜单、
 * 页签、面包屑等组件通过 Hook 取用。语言切换只更新这个 Context，不触碰 core 状态，
 * 因此已打开的页签和 KeepAlive 页面实例都不会受影响。
 */
import { createContext, useContext, useMemo } from 'react'

import type { ReactNode } from 'react'
import type { RouterTitle } from '../types'

/** 渲染层解释标题描述符所需的全部能力。 */
export interface RouterTitleContextValue {
  /**
   * 把标题描述符解释成当前语言的纯文本。
   *
   * 返回 string 而不是 ReactNode：`document.title`、`aria-label`、`title` 属性和
   * 搜索索引都只能使用纯文本，放开成节点会让这些场景全部退化。
   */
  resolve: (title: RouterTitle) => string
  /**
   * 当前渲染视图的缓存键，通常直接传当前语言。
   *
   * 标题不在 Store 里，所以依赖标题的 `useMemo`／派生结构无法靠 core 状态失效。
   * 把它加进依赖数组，语言变化时这些派生结果才会重算。
   */
  viewKey: string
}

/** 没有 Provider 时的兜底：只认纯字符串描述符，其余一律返回空串。 */
const defaultContextValue: RouterTitleContextValue = {
  resolve: (title) => (typeof title === 'string' ? title : ''),
  viewKey: '',
}

const RouterTitleContext = createContext<RouterTitleContextValue>(defaultContextValue)

export interface RouterTitleProviderProps extends RouterTitleContextValue {
  children: ReactNode
}

/**
 * 向子树提供标题解释能力。
 *
 * `resolve` 必须在同一个 viewKey 内保持稳定引用（例如用 `useCallback` 绑定当前
 * intl），否则每次渲染都会让下游依赖它的 memo 失效。
 */
export function RouterTitleProvider(props: RouterTitleProviderProps) {
  const { children, resolve, viewKey } = props
  const value = useMemo(() => ({ resolve, viewKey }), [resolve, viewKey])

  return (
    <RouterTitleContext.Provider value={value}>
      {children}
    </RouterTitleContext.Provider>
  )
}

/**
 * 读取当前子树的标题解释能力。
 *
 * 没有 Provider 时返回兜底实现，因此菜单、页签这类组件可以无条件调用；但要支持
 * 对象形式的描述符，必须由上层提供 Provider。
 */
export function useRouterTitle(): RouterTitleContextValue {
  return useContext(RouterTitleContext)
}

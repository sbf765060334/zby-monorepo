import { useMemo, useState } from 'react'

import type { ProLayoutProps, ProLayoutRoute } from '../interface'
import { createRouteRegistry } from '../route'
import type { ProLayoutRouteRegistry } from '../route'

export interface UseProLayoutAuthorizationParams {
  /** 创建完整索引和权限索引使用的路由树。 */
  routes: ProLayoutRoute[]
  /** 当前渲染收到的权限函数；只有版本变化时才会提交。 */
  hasAuth: ProLayoutProps['hasAuth']
  /** 当前权限版本；undefined 表示使用挂载时的静态权限快照。 */
  authVersion: ProLayoutProps['authVersion']
  /** 根路径优先使用的默认跳转地址。 */
  defaultRedirectPath?: string
}

export interface ProLayoutAuthorizationSnapshot {
  /** 已提交的权限版本。 */
  authVersion: ProLayoutProps['authVersion']
  /** 已提交的权限函数；同一版本内始终保持原引用。 */
  hasAuth: ProLayoutProps['hasAuth']
  /** 使用已提交权限函数创建的路由注册表。 */
  registry: ProLayoutRouteRegistry
}

interface CommittedAuthorization {
  authVersion: ProLayoutProps['authVersion']
  hasAuth: ProLayoutProps['hasAuth']
}

/**
 * 为 ProLayout Core 生成版本化权限快照。
 *
 * 这里故意不把 hasAuth 引用本身作为更新信号。业务组件很容易在 JSX 中传入内联
 * 函数，如果每个新引用都重建 Registry，无关渲染也会反复遍历路由树。相反，首次
 * 渲染会提交一次 hasAuth，之后只有 authVersion 使用 Object.is 比较发生变化时，
 * 才提交当前 hasAuth。authVersion 一直为 undefined 时，权限在本次挂载期保持静态。
 *
 * Registry 仍会在 routes 或 defaultRedirectPath 变化时重建，但会继续使用当前已提交
 * 的权限函数。普通动态 routes 更新后的旧页签清理尚未确认，因此这里只重建查询索引，
 * 页面收敛由 Store 严格限定在 authVersion 变化时执行。
 */
export function useProLayoutAuthorization(
  params: UseProLayoutAuthorizationParams,
): ProLayoutAuthorizationSnapshot {
  const { authVersion, defaultRedirectPath, hasAuth, routes } = params
  const committed = useCommittedAuthorization(hasAuth, authVersion)

  const registry = useMemo(
    () =>
      createRouteRegistry({
        routes,
        hasAuth: committed.hasAuth,
        defaultRedirectPath,
      }),
    [committed, defaultRedirectPath, routes],
  )

  return useMemo(
    () => ({
      authVersion: committed.authVersion,
      hasAuth: committed.hasAuth,
      registry,
    }),
    [committed, registry],
  )
}

/**
 * 保存当前已经正式提交的权限输入。
 *
 * React 官方允许组件在渲染期间根据上一次渲染结果更新自身 state；React 会立即用
 * 新 state 重试当前渲染，不会把旧快照提交给子组件。相比在 layout effect 中更新，
 * 这种方式不会先让菜单和页面看到一帧旧 Registry，也不需要在 ref 中保存并发渲染
 * 期间可能提前泄漏的未提交权限。
 */
function useCommittedAuthorization(
  hasAuth: ProLayoutProps['hasAuth'],
  authVersion: ProLayoutProps['authVersion'],
) {
  const [committed, setCommitted] = useState<CommittedAuthorization>(() => ({
    authVersion,
    hasAuth,
  }))

  if (!Object.is(committed.authVersion, authVersion)) {
    const next = { authVersion, hasAuth }
    setCommitted(next)
    return next
  }

  return committed
}

import { useMemo, useState } from 'react'

import type { ProLayoutProps, ProLayoutRoute } from '../interface'
import { createRouteRegistry } from '../route'
import type { ProLayoutRouteRegistry } from '../route'

export interface UseProLayoutAuthorizationParams {
  /** 创建完整索引和权限索引使用的路由树。 */
  routes: ProLayoutRoute[]
  /** 当前渲染收到的权限函数；只有首次挂载时会保存。 */
  hasAuth: ProLayoutProps['hasAuth']
  /** 根路径优先使用的默认跳转地址。 */
  defaultRedirectPath?: string
}

export interface ProLayoutAuthorizationSnapshot {
  /** 首次挂载时保存的权限函数；整个挂载期保持原引用。 */
  hasAuth: ProLayoutProps['hasAuth']
  /** 使用首次权限函数和当前 routes 创建的路由注册表。 */
  registry: ProLayoutRouteRegistry
}

/**
 * 为 ProLayout Core 生成挂载期稳定的权限快照。
 *
 * 注意：hasAuth 只在首次渲染保存一次。后续替换函数引用或改变函数背后的权限数据
 * 都不会刷新权限索引；用户、租户或权限上下文变化时，调用方必须重新挂载 ProLayout。
 *
 * Registry 仍会在 routes 或 defaultRedirectPath 变化时重建，以支持调用方在外部完成
 * 多语言转换后提交新的路由元数据快照，但始终复用首次 hasAuth。
 */
export function useProLayoutAuthorization(
  params: UseProLayoutAuthorizationParams,
): ProLayoutAuthorizationSnapshot {
  const { defaultRedirectPath, hasAuth, routes } = params
  const [stableHasAuth] = useState<ProLayoutProps['hasAuth']>(() => hasAuth)

  const registry = useMemo(
    () =>
      createRouteRegistry({
        routes,
        hasAuth: stableHasAuth,
        defaultRedirectPath,
      }),
    [defaultRedirectPath, routes, stableHasAuth],
  )

  return useMemo(
    () => ({
      hasAuth: stableHasAuth,
      registry,
    }),
    [registry, stableHasAuth],
  )
}

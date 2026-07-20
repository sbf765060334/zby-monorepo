import { useState } from 'react'

import type { ProLayoutProps, ProLayoutRoute } from '../interface'
import { createRouteRegistry } from '../route'
import type { ProLayoutRouteRegistry } from '../route'

export interface UseProLayoutAuthorizationParams {
  /** 创建完整索引和权限索引的首次路由快照。 */
  routes: ProLayoutRoute[]
  /** 当前渲染收到的权限函数；只有首次挂载时会保存。 */
  hasAuth: ProLayoutProps['hasAuth']
  /** 首次挂载时使用的根路径优先跳转地址。 */
  defaultRedirectPath?: string
}

export interface ProLayoutAuthorizationSnapshot {
  /** 首次挂载时保存的权限函数；整个挂载期保持原引用。 */
  hasAuth: ProLayoutProps['hasAuth']
  /** 使用首次 routes、hasAuth 和 defaultRedirectPath 创建的稳定 Registry。 */
  registry: ProLayoutRouteRegistry
}

/**
 * 为 ProLayout Core 生成挂载期稳定的权限和路由快照。
 *
 * 注意：routes、hasAuth 和 defaultRedirectPath 都只在首次挂载时读取一次。后续替换
 * 数组、函数或默认跳转地址不会刷新 Registry；路由结构、用户权限或租户上下文变化时，
 * 调用方必须重新挂载 ProLayout。
 *
 * 调用方也不能原地修改首次传入的 routes 或其中的路由对象。这里保持原有引用而不做
 * 深拷贝或冻结，避免引入额外运行时成本；“更新路由”只能通过重新挂载完成。
 */
export function useProLayoutAuthorization(
  params: UseProLayoutAuthorizationParams,
): ProLayoutAuthorizationSnapshot {
  const [snapshot] = useState<ProLayoutAuthorizationSnapshot>(() => ({
    hasAuth: params.hasAuth,
    registry: createRouteRegistry({
      routes: params.routes,
      hasAuth: params.hasAuth,
      defaultRedirectPath: params.defaultRedirectPath,
    }),
  }))

  return snapshot
}

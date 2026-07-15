import type { ReactNode } from 'react'

export type ProLayoutAuthCode = string | string[]
export type ProLayoutAuthMode = 'all' | 'some'

export interface UseProLayoutAuthOptions {
  /** 多个权限码的匹配方式；`all` 要求全部满足，`some` 要求任意一个满足。 */
  mode?: ProLayoutAuthMode
}

export interface ProLayoutAuthProps {
  /** 需要校验的单个权限码或权限码列表；为空时按有权限处理。 */
  code?: ProLayoutAuthCode | null
  /** 多个权限码的匹配方式。 */
  mode?: ProLayoutAuthMode
  /** 权限校验不通过时渲染的替代内容。 */
  fallback?: ReactNode
  /** 有权限时渲染的内容，也可以传入根据授权结果返回内容的函数。 */
  children?: ReactNode | ((authed: boolean) => ReactNode)
}

import { useProLayoutStoreSelector } from '../context'
import type { ProLayoutAuthCode, UseProLayoutAuthOptions } from './interface'

/** 使用 ProLayout 首次挂载时保存的权限函数判断页面内操作权限。 */
export function useProLayoutAuth(
  code?: ProLayoutAuthCode | null,
  options?: UseProLayoutAuthOptions,
) {
  const hasAuth = useProLayoutStoreSelector((state) => state.hasAuth)

  const codes = normalizeAuthCodes(code)
  // 空权限码和未启用权限过滤都遵循路由层的默认允许契约。
  if (codes.length === 0 || !hasAuth)
    return true

  return options?.mode === 'some'
    ? codes.some(hasAuth)
    : codes.every(hasAuth)
}

/** 过滤空字符串和运行时异常值，保证 hasAuth 只接收有效权限码。 */
function normalizeAuthCodes(code?: ProLayoutAuthCode | null) {
  if (Array.isArray(code))
    return code.filter((item) => typeof item === 'string' && item.length > 0)

  return typeof code === 'string' && code.length > 0 ? [code] : []
}

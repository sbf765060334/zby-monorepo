import { useProLayoutStoreSelector } from '../context'
import type { ProLayoutAuthCode, UseProLayoutAuthOptions } from './interface'

/**
 * 使用 ProLayout 当前已经提交的权限快照判断页面内操作权限。
 *
 * authRevision 虽然不直接参与权限计算，但必须进入订阅：稳定的 hasAuth 函数可能在
 * authVersion 变化后继续保持相同引用，例如它读取外部权限服务。Store 递增 revision
 * 后，本 Hook 才会重新执行该函数并得到新结果。
 */
export function useProLayoutAuth(
  code?: ProLayoutAuthCode | null,
  options?: UseProLayoutAuthOptions,
) {
  const hasAuth = useProLayoutStoreSelector((state) => state.hasAuth)
  useProLayoutStoreSelector((state) => state.authRevision)

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

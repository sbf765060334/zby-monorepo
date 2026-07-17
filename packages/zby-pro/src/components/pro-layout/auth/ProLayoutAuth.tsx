import type { ProLayoutAuthProps } from './interface'
import { useProLayoutAuth } from './useProLayoutAuth'

/** 根据 ProLayout 已提交权限快照选择业务内容或无权限占位。 */
export default function ProLayoutAuth(props: ProLayoutAuthProps) {
  const { children, code, fallback = null, mode } = props
  const authed = useProLayoutAuth(code, { mode })

  // 函数 children 允许业务在同一节点中自定义禁用、只读等非二元权限表现。
  if (typeof children === 'function')
    return <>{children(authed)}</>

  return <>{authed ? children : fallback}</>
}

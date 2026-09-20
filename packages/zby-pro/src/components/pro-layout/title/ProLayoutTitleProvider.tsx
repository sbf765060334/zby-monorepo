/**
 * 文件职责：把 ProLayout 的标题解释规则接到 router-core 的中性 Context 上。
 *
 * 这一层是 ProLayout 与 @zby/intl 的唯一耦合点；router-core 本身不认识 i18n。
 */
import { useIntl } from '@zby/intl'
import { RouterTitleProvider } from '@zby/router-core/react'
import { useCallback } from 'react'

import type { RouterTitle } from '@zby/router-core'
import type { ReactNode } from 'react'
import { resolveProLayoutTitle } from './resolveProLayoutTitle'

export interface ProLayoutTitleProviderProps {
  children: ReactNode
}

/**
 * 向 ProLayout 子树提供标题解释能力。
 *
 * `useIntl` 返回的 intl 实例在切换语言时引用不变（只有内部 i18next 语言状态变化），
 * 所以 resolve 也保持稳定，靠 `viewKey` 通知下游派生结果失效。依赖标题的 `useMemo`
 * 必须把 viewKey 写进依赖数组，否则语言切换后拿到的仍是旧文案。
 */
export function ProLayoutTitleProvider(props: ProLayoutTitleProviderProps) {
  const intl = useIntl()
  const resolve = useCallback(
    (title: RouterTitle) => resolveProLayoutTitle(intl, title),
    [intl],
  )

  return (
    <RouterTitleProvider resolve={resolve} viewKey={intl.locale}>
      {props.children}
    </RouterTitleProvider>
  )
}

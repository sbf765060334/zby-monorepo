import type { ReactNode } from 'react'
import { useIntl } from '@zby/intl'
import { Popover, theme } from 'antd'

export function SearchTagOverflowText({
  children,
  count,
  full,
}: {
  children: ReactNode
  count: number
  full: ReactNode
}) {
  const intl = useIntl()
  const { token } = theme.useToken()
  const overflow = intl.getMessage('zby.pro.table.tagOverflow', '等{{count}}项', { count })

  return (
    <Popover
      arrow={{ pointAtCenter: true }}
      color={token.colorBgElevated}
      content={full}
      mouseEnterDelay={0.1}
      placement="bottom"
      styles={{
        container: {
          maxWidth: 360,
          padding: token.paddingXS,
          color: token.colorText,
          boxShadow: token.boxShadowSecondary,
        },
        content: {
          maxHeight: 240,
          overflow: 'auto',
          whiteSpace: 'normal',
          wordBreak: 'break-word',
        },
      }}
      trigger="hover"
    >
      <span>
        {children}
        {overflow}
      </span>
    </Popover>
  )
}

import type { ReactNode } from 'react'
import { Popover, theme } from 'antd'

export function SearchTagOverflowText({
  children,
  full,
}: {
  children: ReactNode
  full: ReactNode
}) {
  const { token } = theme.useToken()

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
      <span>{children}</span>
    </Popover>
  )
}

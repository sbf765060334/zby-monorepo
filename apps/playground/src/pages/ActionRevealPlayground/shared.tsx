import { SearchOutlined } from '@ant-design/icons'
import type { ActionRevealContentRender } from '@zby/ui'
import { Input, type InputRef } from 'antd'
import type * as React from 'react'

export function renderInputContent(
  placeholder: string,
  prefix: React.ReactNode = <SearchOutlined />,
): ActionRevealContentRender {
  return ({ contentProps }) => (
    <Input
      ref={contentProps.ref as React.Ref<InputRef>}
      className={contentProps.className}
      style={contentProps.style}
      hidden={contentProps.hidden}
      onBlur={contentProps.onBlur}
      prefix={prefix}
      placeholder={placeholder}
    />
  )
}

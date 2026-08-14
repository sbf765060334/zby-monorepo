import { SearchOutlined } from '@ant-design/icons'
import { ActionReveal } from '@zby/ui'
import { Input, Typography, type InputRef } from 'antd'
import * as React from 'react'
import { PlaygroundCase } from '../../../components/ComponentPlayground'

const { Text } = Typography

export default function CompoundSearchExample() {
  const [lastSearch, setLastSearch] = React.useState('')
  return (
    <PlaygroundCase
      title="复合 Input.Search"
      description="输入框与搜索按钮之间移动焦点时保持展开。"
    >
      <ActionReveal
        triggerIcon={<SearchOutlined />}
        actionIconProps={{ 'aria-label': '打开复合搜索' }}
        width={320}
        content={({ contentProps }) => (
          <Input.Search
            ref={contentProps.ref as React.Ref<InputRef>}
            className={contentProps.className}
            style={contentProps.style}
            hidden={contentProps.hidden}
            onBlur={contentProps.onBlur}
            enterButton="搜索"
            placeholder="输入后按 Tab"
            onSearch={setLastSearch}
          />
        )}
      />
      <Text type="secondary">最近搜索：{lastSearch || '—'}</Text>
    </PlaygroundCase>
  )
}

import { SearchOutlined } from '@ant-design/icons'
import { ActionReveal } from '@zby/ui'
import * as React from 'react'
import {
  PlaygroundCase,
  PlaygroundStatus,
} from '../../../components/ComponentPlayground'
import { renderInputContent } from '../shared'

export default function ExplicitWidthExample() {
  const [status, setStatus] = React.useState('等待展开')
  return (
    <PlaygroundCase
      title="显式 width"
      description="点击图标展开为 240px，焦点离开后自动收起。"
    >
      <PlaygroundStatus>{status}</PlaygroundStatus>
      <ActionReveal
        triggerIcon={<SearchOutlined />}
        actionIconProps={{ 'aria-label': '打开基础搜索' }}
        width={240}
        onOpenChange={(open) =>
          setStatus(open ? '基础搜索已展开' : '基础搜索已收起')
        }
        content={renderInputContent('搜索门店')}
      />
    </PlaygroundCase>
  )
}

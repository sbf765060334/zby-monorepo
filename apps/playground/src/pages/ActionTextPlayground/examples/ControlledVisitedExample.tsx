import { ActionText } from '@zby/ui'
import { Button, Space } from 'antd'
import * as React from 'react'
import { PlaygroundCase } from '../../../components/ComponentPlayground'

export default function ControlledVisitedExample() {
  const [visited, setVisited] = React.useState(false)
  return (
    <PlaygroundCase title="受控 visited">
      <Space orientation="vertical">
        <ActionText
          clickable={{ visited, onVisitedChange: setVisited }}
          ellipsis={false}
        >
          受控访问状态：{visited ? '已访问' : '未访问'}
        </ActionText>
        <Button size="small" onClick={() => setVisited(false)}>
          重置 visited
        </Button>
      </Space>
    </PlaygroundCase>
  )
}

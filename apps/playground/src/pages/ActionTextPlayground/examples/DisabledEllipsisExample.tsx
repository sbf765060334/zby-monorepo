import { ActionText } from '@zby/ui'
import { Space } from 'antd'
import { PlaygroundCase } from '../../../components/ComponentPlayground'
import { LONG_SHOP_NAME } from '../shared'

export default function DisabledEllipsisExample() {
  return (
    <PlaygroundCase title="不写 ellipsis" description="省略默认关闭，文本按内容换行。">
      <Space orientation="vertical">
        <ActionText>{LONG_SHOP_NAME}</ActionText>
        <ActionText>{20260804}</ActionText>
      </Space>
    </PlaygroundCase>
  )
}

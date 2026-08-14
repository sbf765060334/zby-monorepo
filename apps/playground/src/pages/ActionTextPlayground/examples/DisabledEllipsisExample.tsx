import { ActionText } from '@zby/ui'
import { Space } from 'antd'
import { PlaygroundCase } from '../../../components/ComponentPlayground'
import { LONG_SHOP_NAME } from '../shared'

export default function DisabledEllipsisExample() {
  return (
    <PlaygroundCase title="关闭省略">
      <Space orientation="vertical">
        <ActionText ellipsis={false}>{LONG_SHOP_NAME}</ActionText>
        <ActionText ellipsis={false}>{20260804}</ActionText>
      </Space>
    </PlaygroundCase>
  )
}

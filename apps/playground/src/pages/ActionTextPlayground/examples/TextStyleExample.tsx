import { ActionText } from '@zby/ui'
import { Space } from 'antd'
import { PlaygroundCase } from '../../../components/ComponentPlayground'

export default function TextStyleExample() {
  return (
    <PlaygroundCase title="语义色和加粗" description="primary 使用主题色，其余 type 沿用 antd Typography 的语义色。strong 加粗文本。">
      <Space orientation="vertical">
        <ActionText type="primary">主题色文本</ActionText>
        <ActionText type="secondary">次要文本</ActionText>
        <ActionText type="success" strong>
          成功文本
        </ActionText>
        <ActionText type="warning">警告文本</ActionText>
        <ActionText type="danger" strong>
          危险文本
        </ActionText>
      </Space>
    </PlaygroundCase>
  )
}

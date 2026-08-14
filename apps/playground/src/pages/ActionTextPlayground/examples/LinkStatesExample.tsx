import { ActionText } from '@zby/ui'
import { Space } from 'antd'
import { PlaygroundCase } from '../../../components/ComponentPlayground'

export default function LinkStatesExample() {
  return (
    <PlaygroundCase title="链接、默认访问与禁用">
      <Space orientation="vertical">
        <ActionText
          clickable={{
            href: '#action-text-link-preview',
            onClick: (event) => event.preventDefault(),
          }}
          ellipsis={false}
        >
          链接
        </ActionText>
        <ActionText clickable={{ defaultVisited: true }} ellipsis={false}>
          默认已访问
        </ActionText>
        <ActionText clickable={{ disabled: true }} ellipsis={false}>
          禁用点击
        </ActionText>
      </Space>
    </PlaygroundCase>
  )
}

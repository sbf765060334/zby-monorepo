import { ActionText } from '@zby/ui'
import { App } from 'antd'
import { PlaygroundCase } from '../../../components/ComponentPlayground'

export default function ButtonClickExample() {
  const { message } = App.useApp()
  return (
    <PlaygroundCase title="按钮语义">
      <ActionText
        clickable={{
          onClick: () => void message.success('普通可点击文本被点击'),
        }}
        ellipsis={false}
      >
        查看门店经营概览
      </ActionText>
    </PlaygroundCase>
  )
}

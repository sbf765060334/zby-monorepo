import { CheckOutlined, CopyOutlined } from '@ant-design/icons'
import { ActionText } from '@zby/ui'
import { App } from 'antd'
import { PlaygroundCase } from '../../../components/ComponentPlayground'

export default function AsyncCopyExample() {
  const { message } = App.useApp()
  return (
    <PlaygroundCase title="异步文本 + 自定义反馈">
      <ActionText
        actionsVisibleOn="always"
        copyable={{
          text: async () => {
            await new Promise((resolve) => setTimeout(resolve, 500))
            return `异步门店编号-${Date.now()}`
          },
          icon: [<CopyOutlined key="copy" />, <CheckOutlined key="done" />],
          tooltips: ['复制动态编号', '动态编号已复制'],
          onCopy: () => void message.success('异步文本复制成功'),
        }}
      >
        点击复制动态门店编号
      </ActionText>
    </PlaygroundCase>
  )
}

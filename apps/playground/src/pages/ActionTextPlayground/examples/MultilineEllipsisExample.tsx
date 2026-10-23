import { ActionText } from '@zby/ui'
import { App, Space } from 'antd'
import { PlaygroundCase } from '../../../components/ComponentPlayground'
import { LONG_SHOP_NAME } from '../shared'

export default function MultilineEllipsisExample() {
  const { message } = App.useApp()

  return (
    <PlaygroundCase
      title="两行省略"
      description="ellipsis.rows 为 2 时最多展示两行。无 href 的可点击文本同样截断，悬停 title 展示全文。"
    >
      <Space orientation="vertical" style={{ width: '100%' }}>
        <div style={{ width: '100%', maxWidth: 360, minWidth: 0 }}>
          <ActionText ellipsis={{ rows: 2 }}>{LONG_SHOP_NAME}</ActionText>
        </div>
        <div style={{ width: '100%', maxWidth: 360, minWidth: 0 }}>
          <ActionText
            ellipsis={{ rows: 2 }}
            copyable
            clickable={{
              onClick: () => void message.success('两行可点击文本被点击'),
            }}
          >
            {LONG_SHOP_NAME}
          </ActionText>
        </div>
      </Space>
    </PlaygroundCase>
  )
}

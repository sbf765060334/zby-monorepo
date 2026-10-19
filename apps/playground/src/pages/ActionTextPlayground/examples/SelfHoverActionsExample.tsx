import { DeleteOutlined, EyeOutlined } from '@ant-design/icons'
import { ActionIcon, ActionText } from '@zby/ui'
import { App } from 'antd'
import { PlaygroundCase } from '../../../components/ComponentPlayground'

export default function SelfHoverActionsExample() {
  const { message } = App.useApp()
  return (
    <PlaygroundCase title="自身 hover 展示">
      <ActionText
        copyable
        clickable={{
          href: '#self-hover',
          onClick: (event) => event.preventDefault(),
        }}
        actionsVisibleOn="self-hover"
        actions={
          <>
            <ActionIcon
              size="small"
              icon={<EyeOutlined />}
              aria-label="查看"
              color="primary"
              onClick={() => void message.info('查看')}
            />
            <ActionIcon
              size="small"
              icon={<DeleteOutlined />}
              aria-label="删除"
              title="删除"
              danger
            />
          </>
        }
      >
        鼠标移入显示完整操作区
      </ActionText>
    </PlaygroundCase>
  )
}

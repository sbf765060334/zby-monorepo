import { DeleteOutlined, EyeOutlined } from '@ant-design/icons'
import { ActionText } from '@zby/ui'
import { App } from 'antd'
import { PlaygroundCase } from '../../../components/ComponentPlayground'

export default function SelfHoverActionsExample() {
  const { message } = App.useApp()
  return (
    <PlaygroundCase title="自身 hover 展示">
      <ActionText
        copyable
        editable={{ text: 'Hover 门店' }}
        clickable={{
          href: '#self-hover',
          onClick: (event) => event.preventDefault(),
        }}
        actionsVisibleOn="self-hover"
        actions={[
          {
            key: 'view',
            icon: <EyeOutlined />,
            label: '查看',
            color: 'primary',
            onClick: () => void message.info('查看'),
          },
          {
            key: 'delete',
            icon: <DeleteOutlined />,
            title: '删除',
            danger: true,
          },
        ]}
      >
        鼠标移入显示完整操作区
      </ActionText>
    </PlaygroundCase>
  )
}

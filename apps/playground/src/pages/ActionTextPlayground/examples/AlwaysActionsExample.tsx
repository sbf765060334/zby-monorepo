import { EditOutlined, MoreOutlined, StarOutlined } from '@ant-design/icons'
import { ActionText } from '@zby/ui'
import { PlaygroundCase } from '../../../components/ComponentPlayground'

export default function AlwaysActionsExample() {
  return (
    <PlaygroundCase title="始终展示 + ActionIcon 属性">
      <ActionText
        actionsVisibleOn="always"
        actions={[
          {
            key: 'edit',
            icon: <EditOutlined />,
            label: '编辑',
            color: 'primary',
            variant: 'filled',
          },
          {
            key: 'star',
            icon: <StarOutlined />,
            label: '收藏',
            color: 'green',
            variant: 'outlined',
          },
          {
            key: 'disabled',
            icon: <MoreOutlined />,
            label: '禁用操作',
            disabled: true,
          },
        ]}
      >
        始终展示操作按钮
      </ActionText>
    </PlaygroundCase>
  )
}

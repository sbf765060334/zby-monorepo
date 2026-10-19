import { EditOutlined, MoreOutlined, StarOutlined } from '@ant-design/icons'
import { ActionIcon, ActionText } from '@zby/ui'
import { PlaygroundCase } from '../../../components/ComponentPlayground'

export default function AlwaysActionsExample() {
  return (
    <PlaygroundCase title="始终展示 + ActionIcon">
      <ActionText
        actionsVisibleOn="always"
        actions={
          <>
            <ActionIcon
              size="small"
              icon={<EditOutlined />}
              aria-label="编辑"
              color="primary"
              variant="filled"
            />
            <ActionIcon
              size="small"
              icon={<StarOutlined />}
              aria-label="收藏"
              color="green"
              variant="outlined"
            />
            <ActionIcon size="small" icon={<MoreOutlined />} aria-label="禁用操作" disabled />
          </>
        }
      >
        始终展示操作按钮
      </ActionText>
    </PlaygroundCase>
  )
}

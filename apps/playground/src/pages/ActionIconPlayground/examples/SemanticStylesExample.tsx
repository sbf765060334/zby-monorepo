import { StarOutlined } from '@ant-design/icons'
import { ActionIcon } from '@zby/ui'
import { theme } from 'antd'
import { PlaygroundCase } from '../../../components/ComponentPlayground'

export default function SemanticStylesExample() {
  const { token } = theme.useToken()
  return (
    <PlaygroundCase title="classNames / styles 回调">
      <ActionIcon
        icon={<StarOutlined />}
        selected
        color="primary"
        variant="filled"
        aria-label="语义样式图标"
        classNames={({ props }) => ({
          root: props.selected ? 'action-icon-semantic-root' : undefined,
          icon: 'action-icon-semantic-icon',
        })}
        styles={({ props }) => ({
          root: {
            boxShadow: props.selected
              ? `0 0 0 2px ${token.colorPrimaryBorder}`
              : undefined,
          },
          icon: { transform: 'rotate(-12deg)' },
        })}
      />
    </PlaygroundCase>
  )
}

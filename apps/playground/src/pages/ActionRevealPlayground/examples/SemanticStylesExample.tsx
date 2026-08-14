import { SearchOutlined } from '@ant-design/icons'
import { ActionReveal } from '@zby/ui'
import { theme } from 'antd'
import { PlaygroundCase } from '../../../components/ComponentPlayground'
import { renderInputContent } from '../shared'

export default function SemanticStylesExample() {
  const { token } = theme.useToken()
  return (
    <PlaygroundCase title="classNames / styles 回调">
      <ActionReveal
        className="action-reveal-content-class"
        rootClassName="action-reveal-root-class"
        style={{ borderRadius: token.borderRadius }}
        width={280}
        triggerIcon={<SearchOutlined />}
        actionIconProps={{ 'aria-label': '打开语义样式内容' }}
        classNames={({ props }) => ({
          trigger: props.open ? undefined : 'action-reveal-semantic-trigger',
          content: props.open ? 'action-reveal-semantic-content' : undefined,
        })}
        styles={({ props }) => ({
          trigger: {
            color: props.disabled
              ? token.colorTextDisabled
              : token.colorPrimary,
          },
          content: {
            border: `${token.lineWidth}px ${token.lineType} ${token.colorPrimaryBorder}`,
            background: token.colorPrimaryBg,
          },
        })}
        content={renderInputContent('语义样式输入框')}
      />
    </PlaygroundCase>
  )
}

import { FilterOutlined } from '@ant-design/icons'
import { ActionReveal } from '@zby/ui'
import { theme } from 'antd'
import { PlaygroundCase } from '../../../components/ComponentPlayground'
import { renderInputContent } from '../shared'

export default function StyledWidthExample() {
  const { token } = theme.useToken()
  return (
    <PlaygroundCase
      title="styles.content 提供宽度"
      description="语义样式中的宽度、溢出和动画由调用方控制。"
    >
      <ActionReveal
        triggerIcon={<FilterOutlined />}
        actionIconProps={{ 'aria-label': '打开语义样式筛选' }}
        styles={{
          content: {
            width: 280,
            overflow: 'visible',
            transition: `width ${token.motionDurationSlow} ${token.motionEaseInOut}`,
          },
        }}
        content={renderInputContent('筛选条件', <FilterOutlined />)}
      />
    </PlaygroundCase>
  )
}

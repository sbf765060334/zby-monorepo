import { SearchOutlined } from '@ant-design/icons'
import { ActionReveal } from '@zby/ui'
import { Space } from 'antd'
import { PlaygroundCase } from '../../../components/ComponentPlayground'
import { renderInputContent } from '../shared'

export default function SizesExample() {
  return (
    <PlaygroundCase
      title="small / middle / large"
      description="关闭态复用 ActionIcon，三档尺寸保持一致。"
    >
      <Space wrap>
        {(['small', 'middle', 'large'] as const).map((size) => (
          <ActionReveal
            key={size}
            size={size}
            width={size === 'small' ? 180 : size === 'large' ? 260 : 220}
            triggerIcon={<SearchOutlined />}
            actionIconProps={{ 'aria-label': `打开 ${size} 搜索`, title: size }}
            content={renderInputContent(`${size} 搜索`)}
          />
        ))}
      </Space>
    </PlaygroundCase>
  )
}

import { SearchOutlined } from '@ant-design/icons'
import { ActionIcon } from '@zby/ui'
import { Space, Typography } from 'antd'
import { PlaygroundCase } from '../../../components/ComponentPlayground'

const { Text } = Typography
export default function SizesExample() {
  return (
    <PlaygroundCase title="外框 22 / 26 / 30px">
      <Space wrap size="large">
        {(['small', 'middle', 'large', 'medium'] as const).map((size) => (
          <Space key={size} orientation="vertical" align="center">
            <ActionIcon
              size={size}
              icon={<SearchOutlined />}
              aria-label={`${size} 尺寸`}
            />
            <Text code>{size}</Text>
          </Space>
        ))}
      </Space>
    </PlaygroundCase>
  )
}

import { SearchOutlined } from '@ant-design/icons'
import { ActionIcon } from '@zby/ui'
import { Space, Typography } from 'antd'
import { PlaygroundCase } from '../../../components/ComponentPlayground'
import { presetColors } from '../shared'

const { Text } = Typography
export default function ColorExample() {
  return (
    <PlaygroundCase title="颜色">
      <Space wrap>
        {presetColors.map((color) => (
          <Space key={color} orientation="vertical" align="center">
            <ActionIcon
              icon={<SearchOutlined />}
              color={color}
              variant="filled"
              aria-label={`${color} 颜色`}
            />
            <Text code>{color}</Text>
          </Space>
        ))}
      </Space>
    </PlaygroundCase>
  )
}

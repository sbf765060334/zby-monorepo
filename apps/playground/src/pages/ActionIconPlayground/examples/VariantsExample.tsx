import { SearchOutlined } from '@ant-design/icons'
import { ActionIcon } from '@zby/ui'
import { Space, Typography } from 'antd'
import { PlaygroundCase } from '../../../components/ComponentPlayground'
import { variants } from '../shared'

const { Text } = Typography
export default function VariantsExample() {
  return (
    <PlaygroundCase title="全部 variant">
      <Space wrap>
        {variants.map((variant) => (
          <Space key={variant} orientation="vertical" align="center">
            <ActionIcon
              icon={<SearchOutlined />}
              color="primary"
              variant={variant}
              aria-label={`${variant} 变体`}
            />
            <Text code>{variant}</Text>
          </Space>
        ))}
      </Space>
    </PlaygroundCase>
  )
}

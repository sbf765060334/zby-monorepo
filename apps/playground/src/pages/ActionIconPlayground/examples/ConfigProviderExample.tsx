import { SearchOutlined } from '@ant-design/icons'
import { ActionIcon } from '@zby/ui'
import { ConfigProvider, Space, Tag } from 'antd'
import { PlaygroundCase } from '../../../components/ComponentPlayground'

export default function ConfigProviderExample() {
  return (
    <PlaygroundCase title="ConfigProvider 继承">
      <ConfigProvider
        componentSize="large"
        button={{ shape: 'circle', color: 'green', variant: 'filled' }}
      >
        <ActionIcon icon={<SearchOutlined />} aria-label="继承按钮配置" />
      </ConfigProvider>
      <Space wrap>
        <Tag color="green">large</Tag>
        <Tag color="purple">circle</Tag>
        <Tag color="blue">green filled</Tag>
      </Space>
    </PlaygroundCase>
  )
}

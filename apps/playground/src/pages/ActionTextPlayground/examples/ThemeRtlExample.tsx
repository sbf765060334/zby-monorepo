import { MoreOutlined } from '@ant-design/icons'
import { ActionText } from '@zby/ui'
import { ConfigProvider, Space, Tag, theme } from 'antd'
import { PlaygroundCase } from '../../../components/ComponentPlayground'

export default function ThemeRtlExample() {
  const { token } = theme.useToken()
  return (
    <PlaygroundCase title="暗色 + RTL + 自定义前缀">
      <ConfigProvider
        prefixCls="preview"
        direction="rtl"
        theme={{
          algorithm: theme.darkAlgorithm,
          cssVar: { key: 'action-text-preview-dark' },
        }}
      >
        <div
          style={{
            minWidth: 0,
            padding: 16,
            borderRadius: token.borderRadiusLG,
            background: '#141414',
          }}
        >
          <ActionText
            copyable
            actionsVisibleOn="always"
            actions={[
              { key: 'rtl-more', icon: <MoreOutlined />, label: '更多' },
            ]}
          >
            RTL、暗色主题、CSS Variables 与自定义 prefixCls
          </ActionText>
        </div>
      </ConfigProvider>
      <Space wrap>
        <Tag color="blue">prefixCls=preview</Tag>
        <Tag color="purple">RTL</Tag>
        <Tag color="geekblue">darkAlgorithm</Tag>
      </Space>
    </PlaygroundCase>
  )
}

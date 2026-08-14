import { SearchOutlined } from '@ant-design/icons'
import { ActionReveal } from '@zby/ui'
import { ConfigProvider, Space, Tag, theme } from 'antd'
import { PlaygroundCase } from '../../../components/ComponentPlayground'
import { renderInputContent } from '../shared'

export default function DarkRtlExample() {
  const { token } = theme.useToken()
  return (
    <PlaygroundCase title="暗色 + RTL + 自定义前缀">
      <ConfigProvider
        prefixCls="preview"
        direction="rtl"
        theme={{
          algorithm: theme.darkAlgorithm,
          cssVar: { key: 'action-reveal-dark' },
        }}
      >
        <div
          style={{
            padding: 16,
            borderRadius: token.borderRadiusLG,
            background: '#141414',
          }}
        >
          <ActionReveal
            prefixCls="preview-action-reveal"
            width={260}
            triggerIcon={<SearchOutlined />}
            actionIconProps={{ 'aria-label': '打开 RTL 搜索' }}
            content={renderInputContent('RTL 暗色搜索')}
          />
        </div>
      </ConfigProvider>
      <Space wrap>
        <Tag color="purple">RTL</Tag>
        <Tag color="geekblue">darkAlgorithm</Tag>
        <Tag color="cyan">CSS Variables</Tag>
      </Space>
    </PlaygroundCase>
  )
}

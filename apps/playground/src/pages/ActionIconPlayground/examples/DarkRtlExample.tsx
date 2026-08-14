import { SearchOutlined } from '@ant-design/icons'
import { ActionIcon } from '@zby/ui'
import { ConfigProvider, theme } from 'antd'
import { PlaygroundCase } from '../../../components/ComponentPlayground'

export default function DarkRtlExample() {
  const { token } = theme.useToken()
  return (
    <PlaygroundCase title="暗色 + RTL + 自定义前缀">
      <ConfigProvider
        prefixCls="preview"
        direction="rtl"
        theme={{
          algorithm: theme.darkAlgorithm,
          cssVar: { key: 'action-icon-dark' },
        }}
      >
        <div
          style={{
            padding: 16,
            borderRadius: token.borderRadiusLG,
            background: '#141414',
          }}
        >
          <ActionIcon
            prefixCls="preview-action-icon"
            color="primary"
            variant="filled"
            icon={<SearchOutlined />}
            aria-label="RTL 暗色图标"
          />
        </div>
      </ConfigProvider>
    </PlaygroundCase>
  )
}

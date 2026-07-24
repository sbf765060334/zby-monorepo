import { GlobalOutlined } from '@ant-design/icons'
import { useIntl } from '@zby/intl'
import { Button, Space, Tag } from 'antd'

/**
 * ProLayout Header 的业务扩展区。
 * 主题切换由 ProLayout 自带入口演示，这里只保留应用级语言切换，避免重复控制主题。
 */
export default function PlaygroundHeaderActions() {
  const intl = useIntl()
  const nextLocale = intl.locale === 'zh-CN' ? 'en-US' : 'zh-CN'
  const switchLabel = intl.getMessage(
    'playground.proLayout.switchLanguage',
    nextLocale === 'en-US' ? '切换为 English' : 'Switch to 中文',
  )

  return (
    <Space size={4}>
      <Tag color="blue" style={{ marginInlineEnd: 0 }}>
        {intl.getMessage('playground.proLayout.badge', 'ProLayout preview')}
      </Tag>
      <Button
        type="text"
        size="small"
        icon={<GlobalOutlined />}
        aria-label={switchLabel}
        title={switchLabel}
        onClick={() => void intl.changeLocale(nextLocale)}
      >
        {nextLocale === 'en-US' ? 'EN' : '中文'}
      </Button>
    </Space>
  )
}

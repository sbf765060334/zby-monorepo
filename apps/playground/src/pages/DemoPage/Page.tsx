import { ProLayoutContentContainer } from '@zby/pro'
import { useIntl } from '@zby/intl'
import { Typography } from 'antd'

export default function HomePage() {
  const intl = useIntl()

  return (
    <ProLayoutContentContainer mode="stack">
      <ProLayoutContentContainer.Item>
        <Typography.Title level={3} style={{ marginTop: 0 }}>
          {intl.getMessage('playground.proLayout.overview.title', '组件预览')}
        </Typography.Title>
        <Typography.Paragraph type="secondary">
          {intl.getMessage(
            'playground.proLayout.overview.subtitle',
            '从左侧打开示例页面，预览组件能力。',
          )}
        </Typography.Paragraph>
        <Typography.Paragraph>
          {intl.getMessage(
            'playground.proLayout.overview.guide',
            '从左侧打开示例页面，再通过顶部页签切换、固定、关闭和拖拽页面。',
          )}
        </Typography.Paragraph>
      </ProLayoutContentContainer.Item>
    </ProLayoutContentContainer>
  )
}

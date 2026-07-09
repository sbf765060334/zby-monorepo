import 'antd/dist/reset.css'

import { Button, ConfigProvider, Space, Typography } from 'antd'
import { mergeIntlResources, useIntl, ZbyIntlProvider } from '@zby/intl'
import { zbyProLocales } from '@zby/pro'
import { zbyUiLocales } from '@zby/ui'
import React from 'react'
import { createRoot } from 'react-dom/client'

const { Text, Title } = Typography

const resources = mergeIntlResources(zbyUiLocales, zbyProLocales)

type PlaygroundLocale = 'zh-CN' | 'en-US'

function IntlPreview() {
  const intl = useIntl()
  const nextLocale: PlaygroundLocale = intl.locale === 'zh-CN' ? 'en-US' : 'zh-CN'

  return (
    <main style={{ maxWidth: 720, padding: 24 }}>
      <Space orientation="vertical" size={16}>
        <Title level={3} style={{ margin: 0 }}>
          zby-monorepo playground
        </Title>

        <Text>Current locale: {intl.locale}</Text>

        <section>
          <Title level={5}>zby-ui</Title>
          <Text>
            {intl.getMessage('zby.ui.inputNumberRange.startPlaceholder', '最小值')} /{' '}
            {intl.getMessage('zby.ui.inputNumberRange.endPlaceholder', '最大值')}
          </Text>
        </section>

        <section>
          <Title level={5}>zby-pro</Title>
          <Space direction="vertical" size={4}>
            <Text>{intl.getMessage('zby.pro.layout.title', '控制台')}</Text>
            <Text>{intl.getMessage('zby.pro.layout.logout', '退出登录')}</Text>
            <Text>
              {intl.getMessage('zby.pro.layout.menuCollapse', '收起菜单')} /{' '}
              {intl.getMessage('zby.pro.layout.menuExpand', '展开菜单')}
            </Text>
          </Space>
        </section>

        <Button type="primary" onClick={() => void intl.changeLocale(nextLocale)}>
          Switch to {nextLocale}
        </Button>
      </Space>
    </main>
  )
}

function PlaygroundApp() {
  const [locale, setLocale] = React.useState<PlaygroundLocale>('zh-CN')

  return (
    <ConfigProvider>
      <ZbyIntlProvider
        locale={locale}
        fallbackLocale="zh-CN"
        resources={resources}
        onLocaleChange={(nextLocale) => setLocale(nextLocale as PlaygroundLocale)}
      >
        <IntlPreview />
      </ZbyIntlProvider>
    </ConfigProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PlaygroundApp />
  </React.StrictMode>,
)

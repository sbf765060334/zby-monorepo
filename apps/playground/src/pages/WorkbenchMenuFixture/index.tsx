import { ProLayoutContentContainer, resolveProLayoutTitle } from '@zby/pro'
import { useIntl } from '@zby/intl'
import { useRouterPage } from '@zby/router-core/react'
import { Typography } from 'antd'

export default function WorkbenchMenuFixturePage() {
  const intl = useIntl()
  const page = useRouterPage()
  const currentRoute = page.currentRoutes[page.currentRoutes.length - 1]
  const currentTitle = currentRoute
    ? resolveProLayoutTitle(intl, currentRoute.route.title)
    : page.pathname

  return (
    <ProLayoutContentContainer mode="stack">
      <ProLayoutContentContainer.Item>
        <Typography.Title level={3} style={{ marginTop: 0 }}>
          {intl.getMessage('playground.proLayout.menuFixture.title', '工作台菜单夹具')}
        </Typography.Title>
        <Typography.Paragraph type="secondary">
          {intl.getMessage(
            'playground.proLayout.menuFixture.subtitle',
            '工作台的叶子菜单都打开这一页，用来观察 ProLayout 在大批量菜单、分列 Drawer 和页签下的表现。',
          )}
        </Typography.Paragraph>
        <Typography.Paragraph>
          {intl.getMessage('playground.proLayout.menuFixture.menuTitle', '当前菜单')}
          {`：${currentTitle}`}
        </Typography.Paragraph>
        <Typography.Paragraph>
          {intl.getMessage('playground.proLayout.menuFixture.pathname', '当前路径')}
          {`：${page.pathname}`}
        </Typography.Paragraph>
      </ProLayoutContentContainer.Item>
    </ProLayoutContentContainer>
  )
}

import { ProLayoutContentContainer, resolveProLayoutTitle } from '@zby/pro'
import { useIntl } from '@zby/intl'
import { useRouterCore, useRouterPage } from '@zby/router-core/react'
import { Modal, Typography } from 'antd'
import { useEffect, useRef } from 'react'

/** 带关闭守卫的独立页面。打开后关闭页签会先弹出确认框。 */
export default function GuardedClosePage() {
  const intl = useIntl()
  const router = useRouterCore()
  const page = useRouterPage()
  const currentRoute = page.currentRoutes[page.currentRoutes.length - 1]
  const currentTitle = currentRoute
    ? resolveProLayoutTitle(intl, currentRoute.route.title)
    : page.pathname
  const titleRef = useRef(currentTitle)
  const intlRef = useRef(intl)
  titleRef.current = currentTitle
  intlRef.current = intl

  useEffect(() => {
    const handler = () => new Promise<boolean>((resolve) => {
      const currentIntl = intlRef.current
      let settled = false
      const finish = (accepted: boolean) => {
        if (settled)
          return
        settled = true
        resolve(accepted)
      }
      Modal.confirm({
        title: currentIntl.getMessage(
          'playground.proLayout.guardedClose.confirmTitle',
          '关闭这个页签？',
        ),
        content: currentIntl.getMessage(
          'playground.proLayout.guardedClose.confirmContent',
          '「{{title}}」有关闭守卫。确定后才会关闭。',
          { title: titleRef.current },
        ),
        okText: currentIntl.getMessage(
          'playground.proLayout.guardedClose.confirmOk',
          '关闭',
        ),
        cancelText: currentIntl.getMessage(
          'playground.proLayout.guardedClose.confirmCancel',
          '留下',
        ),
        onOk: () => finish(true),
        onCancel: () => finish(false),
      })
    })
    router.addBeforeCloseHook(handler, page.pathname)
    return () => router.clearBeforeCloseHook(page.pathname, handler)
  }, [page.pathname, router])

  return (
    <ProLayoutContentContainer mode="stack">
      <ProLayoutContentContainer.Item>
        <Typography.Title level={3} style={{ marginTop: 0 }}>
          {intl.getMessage('playground.proLayout.guardedClose.title', '关闭守卫页面')}
        </Typography.Title>
        <Typography.Paragraph type="secondary">
          {intl.getMessage(
            'playground.proLayout.guardedClose.subtitle',
            '关闭这个页签前会先打开本页，并弹出确认框。点「留下」会停在这里。',
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

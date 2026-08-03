// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { memo } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { createI18n } from '../createI18n'
import { ZbyIntlProvider } from '../provider'
import { useIntl } from '../useIntl'

afterEach(cleanup)

const resources = {
  'zh-CN': { greeting: '你好' },
  'en-US': { greeting: 'Hello' },
}

function LocaleProbe() {
  const intl = useIntl()

  return (
    <output data-testid="locale">
      {intl.locale}:{intl.getMessage('greeting')}
    </output>
  )
}

const MemoLocaleProbe = memo(LocaleProbe)

describe('ZbyIntlProvider', () => {
  it('follows the controlled locale prop', async () => {
    const view = render(
      <ZbyIntlProvider locale="zh-CN" resources={resources}>
        <LocaleProbe />
      </ZbyIntlProvider>,
    )

    expect(screen.getByTestId('locale').textContent).toBe('zh-CN:你好')

    view.rerender(
      <ZbyIntlProvider locale="en-US" resources={resources}>
        <LocaleProbe />
      </ZbyIntlProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('locale').textContent).toBe('en-US:Hello')
    })
  })

  it('updates memoized consumers when current locale resources change', async () => {
    const view = render(
      <ZbyIntlProvider
        locale="zh-CN"
        resources={{ 'zh-CN': { greeting: '旧文案' } }}
      >
        <MemoLocaleProbe />
      </ZbyIntlProvider>,
    )

    expect(screen.getByTestId('locale').textContent).toBe('zh-CN:旧文案')

    view.rerender(
      <ZbyIntlProvider
        locale="zh-CN"
        resources={{ 'zh-CN': { greeting: '新文案' } }}
      >
        <MemoLocaleProbe />
      </ZbyIntlProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('locale').textContent).toBe('zh-CN:新文案')
    })
  })

  it('re-resolves the active locale when fallbackLocale changes', async () => {
    const view = render(
      <ZbyIntlProvider
        locale="fr-FR"
        fallbackLocale="zh-CN"
        resources={resources}
      >
        <LocaleProbe />
      </ZbyIntlProvider>,
    )

    expect(screen.getByTestId('locale').textContent).toBe('zh-CN:你好')

    view.rerender(
      <ZbyIntlProvider
        locale="fr-FR"
        fallbackLocale="en-US"
        resources={resources}
      >
        <LocaleProbe />
      </ZbyIntlProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('locale').textContent).toBe('en-US:Hello')
    })
  })

  it('uses the latest custom i18n instance and syncs resources only to it', async () => {
    const instanceA = createI18n({
      locale: 'zh-CN',
      resources: { 'zh-CN': { greeting: 'Instance A' } },
    })
    const instanceB = createI18n({
      locale: 'zh-CN',
      resources: { 'zh-CN': { greeting: 'Instance B' } },
    })
    const view = render(
      <ZbyIntlProvider locale="zh-CN" i18n={instanceA}>
        <LocaleProbe />
      </ZbyIntlProvider>,
    )

    expect(screen.getByTestId('locale').textContent).toBe('zh-CN:Instance A')

    view.rerender(
      <ZbyIntlProvider
        locale="zh-CN"
        i18n={instanceB}
        resources={{ 'zh-CN': { greeting: 'Instance B updated' } }}
      >
        <LocaleProbe />
      </ZbyIntlProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('locale').textContent).toBe(
        'zh-CN:Instance B updated',
      )
    })
    expect(instanceA.t('greeting')).toBe('Instance A')
  })
})

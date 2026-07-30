// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ZbyIntlProvider } from './provider'
import { useIntl } from './useIntl'

afterEach(cleanup)

const resources = {
  'zh-CN': { greeting: '你好' },
  'en-US': { greeting: 'Hello' },
}

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
})

function LocaleProbe() {
  const intl = useIntl()

  return (
    <output data-testid="locale">
      {intl.locale}:{intl.getMessage('greeting')}
    </output>
  )
}

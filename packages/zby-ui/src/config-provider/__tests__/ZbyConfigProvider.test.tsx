// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { useIntl } from '@zby/intl'
import { afterEach, describe, expect, it } from 'vitest'

import { ZbyConfigProvider } from '../ZbyConfigProvider'
import { mergeLocales } from '../mergeLocales'

afterEach(cleanup)

const uiZhCN = {
  locale: 'zh-CN',
  zby: {
    ui: {
      actionText: { copy: '复制' },
    },
  },
}

function CopyProbe() {
  const intl = useIntl()
  return <output>{intl.getMessage('zby.ui.actionText.copy')}</output>
}

describe('ZbyConfigProvider', () => {
  it('registers merged pack messages for useIntl', () => {
    render(
      <ZbyConfigProvider
        locale={mergeLocales({ packs: [uiZhCN] })}
        app={false}
      >
        <CopyProbe />
      </ZbyConfigProvider>,
    )

    expect(screen.getByRole('status').textContent).toBe('复制')
    expect(document.querySelector('.ant-app')).toBeNull()
  })

  it('wraps antd App by default', () => {
    const { container } = render(
      <ZbyConfigProvider locale={uiZhCN}>
        <span>child</span>
      </ZbyConfigProvider>,
    )

    expect(container.querySelector('.ant-app')).not.toBeNull()
  })
})

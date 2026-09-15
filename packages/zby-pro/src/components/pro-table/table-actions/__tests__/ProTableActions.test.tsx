// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { ZbyIntlProvider } from '@zby/intl'
import { ConfigProvider } from 'antd'
import * as React from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { zbyProLocales } from '../../../../locales'
import { ProTableActions } from '..'

afterEach(() => {
  cleanup()
})

const actions = [
  { key: 'view', label: '查看' },
  { key: 'edit', label: '编辑' },
]

function renderActions(ui: React.ReactElement) {
  return render(
    <ZbyIntlProvider locale="zh-CN" resources={zbyProLocales}>
      <ConfigProvider>{ui}</ConfigProvider>
    </ZbyIntlProvider>,
  )
}

describe('ProTableActions', () => {
  it('renders a horizontal ellipsis more trigger without copy by default', () => {
    renderActions(<ProTableActions actions={actions} />)

    expect(screen.queryByText('更多')).toBeNull()
    const moreButton = screen.getByRole('button', { name: '更多操作' })
    expect(moreButton).toBeTruthy()
    expect(moreButton.getAttribute('title')).toBe('更多操作')
  })

  it('renders moreText as provided without the default aria-label', () => {
    renderActions(<ProTableActions actions={actions} moreText="更多" />)

    expect(screen.getByRole('button', { name: '更多' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: '更多操作' })).toBeNull()
  })

  it('accepts a ReactNode moreText', () => {
    renderActions(
      <ProTableActions
        actions={actions}
        moreText={<span>更多操作组合</span>}
      />,
    )

    expect(screen.getByText('更多操作组合')).toBeTruthy()
  })
})

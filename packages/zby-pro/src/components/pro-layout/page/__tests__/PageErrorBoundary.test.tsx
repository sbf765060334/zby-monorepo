// @vitest-environment jsdom

import { ZbyIntlProvider } from '@zby/intl'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { zbyProLocales } from '../../../../locales'
import PageErrorBoundary from '../PageErrorBoundary'

import type { ErrorInfo, ReactNode } from 'react'

beforeEach(() => {
  // React 会把已由 ErrorBoundary 接管的异常同步写入控制台，测试只断言应用行为。
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  window.addEventListener('error', preventExpectedWindowError)
})

afterEach(() => {
  window.removeEventListener('error', preventExpectedWindowError)
  cleanup()
  vi.restoreAllMocks()
})

describe('PageErrorBoundary', () => {
  it('不向用户暴露原始异常，但把完整诊断信息交给宿主', async () => {
    const error = new Error('internal-token=secret-value')
    const onError = vi.fn<(error: unknown, info: ErrorInfo) => void>()

    renderBoundary(
      <BrokenPage error={error} />,
      ['/broken', BrokenPage],
      onError,
    )

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('页面加载失败')
    expect(alert.textContent).toContain('请重试；如果问题持续存在，请联系管理员。')
    expect(document.body.textContent).not.toContain('internal-token')
    expect(document.body.textContent).not.toContain('secret-value')

    await waitFor(() => expect(onError).toHaveBeenCalledOnce())
    expect(onError.mock.calls[0][0]).toBe(error)
    expect(onError.mock.calls[0][1].componentStack).toContain('BrokenPage')
  })

  it('允许用户在错误原因消失后手动重试', async () => {
    let shouldThrow = true
    function RecoverablePage() {
      if (shouldThrow)
        throw new Error('temporary render error')
      return <div>recovered page</div>
    }

    renderBoundary(
      <RecoverablePage />,
      ['/recoverable', RecoverablePage],
      undefined,
      'en-US',
    )
    await screen.findByText('Page failed to load')

    shouldThrow = false
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('recovered page')).toBeTruthy()
  })

  it('错误态响应 resetKeys 变化，健康态变化不重建业务组件', async () => {
    let shouldThrow = true
    let instanceCount = 0
    function StatefulPage() {
      if (shouldThrow)
        throw new Error('pathname-specific render error')
      const [instance] = useState(() => instanceCount += 1)
      return <div data-testid="page-instance">instance-{instance}</div>
    }

    const view = renderBoundary(
      <StatefulPage />,
      ['/detail/1', StatefulPage],
    )
    await screen.findByText('页面加载失败')

    shouldThrow = false
    view.rerender(createBoundaryNode(
      <StatefulPage />,
      ['/detail/2', StatefulPage],
    ))
    expect((await screen.findByTestId('page-instance')).textContent).toBe('instance-1')

    view.rerender(createBoundaryNode(
      <StatefulPage />,
      ['/detail/3', StatefulPage],
    ))
    expect(screen.getByTestId('page-instance').textContent).toBe('instance-1')
    expect(instanceCount).toBe(1)
  })
})

function BrokenPage(props: { error: Error }): never {
  throw props.error
}

function preventExpectedWindowError(event: ErrorEvent) {
  event.preventDefault()
}

function renderBoundary(
  children: ReactNode,
  resetKeys: unknown[],
  onError?: (error: unknown, info: ErrorInfo) => void,
  locale = 'zh-CN',
) {
  return render(createBoundaryNode(children, resetKeys, onError, locale))
}

function createBoundaryNode(
  children: ReactNode,
  resetKeys: unknown[],
  onError?: (error: unknown, info: ErrorInfo) => void,
  locale = 'zh-CN',
) {
  return (
    <ZbyIntlProvider
      locale={locale}
      fallbackLocale="zh-CN"
      resources={zbyProLocales}
    >
      <PageErrorBoundary
        prefixCls="zby-pro-layout"
        resetKeys={resetKeys}
        onError={onError}
      >
        {children}
      </PageErrorBoundary>
    </ZbyIntlProvider>
  )
}

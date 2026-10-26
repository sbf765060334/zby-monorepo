// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { ConfigProvider } from 'antd'
import * as React from 'react'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { ProModal } from '..'

const originalResizeObserver = globalThis.ResizeObserver
const originalMatchMedia = window.matchMedia

class TestResizeObserver implements ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', TestResizeObserver)
  window.matchMedia = vi.fn().mockImplementation((media: string) => ({
    matches: false,
    media,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia
})

afterAll(() => {
  vi.stubGlobal('ResizeObserver', originalResizeObserver)
  window.matchMedia = originalMatchMedia
})

afterEach(() => {
  cleanup()
})

function renderModal(ui: React.ReactElement) {
  return render(<ConfigProvider>{ui}</ConfigProvider>)
}

describe('ProModal', () => {
  it('defaults to max-height body mode', () => {
    const { container } = renderModal(
      <ProModal open getContainer={false} title="Demo">
        body
      </ProModal>,
    )

    const root = container.querySelector('.ant-pro-modal')
    expect(root?.className).toContain('ant-pro-modal-body-height-mode-max-height')
    expect(screen.getByText('body')).toBeTruthy()
  })

  it('applies height body mode class', () => {
    const { container } = renderModal(
      <ProModal open getContainer={false} bodyHeightMode="height" title="Demo">
        body
      </ProModal>,
    )

    const root = container.querySelector('.ant-pro-modal')
    expect(root?.className).toContain('ant-pro-modal-body-height-mode-height')
  })

  it('inherits ConfigProvider prefixCls for the modal shell', () => {
    const { container } = render(
      <ConfigProvider prefixCls="zby">
        <ProModal open getContainer={false} title="Demo">
          body
        </ProModal>
      </ConfigProvider>,
    )

    expect(container.querySelector('.zby-pro-modal')).toBeTruthy()
    expect(container.querySelector('.ant-pro-modal')).toBeNull()
  })

  it('renders body content inside ScrollArea and forwards scrollAreaProps', () => {
    const { container } = renderModal(
      <ProModal
        open
        getContainer={false}
        title="Demo"
        scrollAreaProps={{ className: 'custom-scroll', scrollbar: 'always' }}
      >
        body
      </ProModal>,
    )

    const viewport = container.querySelector('[data-zby-scroll-area-viewport]')
    const scroll = container.querySelector('.ant-pro-modal-scroll')

    expect(viewport?.textContent).toContain('body')
    expect(scroll?.className).toContain('custom-scroll')
    expect(container.querySelector('.ant-modal-body')?.contains(scroll)).toBe(true)
  })

  it('sets the viewport max-height variable from viewportMaxHeight', () => {
    const { container } = renderModal(
      <ProModal open getContainer={false} title="Demo" viewportMaxHeight={480}>
        body
      </ProModal>,
    )

    expect(container.querySelector('.ant-modal')?.getAttribute('style')).toContain(
      '--ant-pro-modal-max-height: 480px',
    )
  })
})

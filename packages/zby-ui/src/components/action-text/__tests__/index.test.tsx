// @vitest-environment jsdom

import { CopyOutlined, EditOutlined } from '@ant-design/icons'
import { createCache, extractStyle, StyleProvider } from '@ant-design/cssinjs'
import { cleanup, fireEvent, render as renderNode, waitFor } from '@testing-library/react'
import { ZbyIntlProvider } from '@zby/intl'
import { ConfigProvider, theme } from 'antd'
import * as React from 'react'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { zbyUiLocales } from '../../../locales'
import ActionText from '../index'

const originalResizeObserver = globalThis.ResizeObserver
const originalMatchMedia = window.matchMedia

class TestResizeObserver implements ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const render = (node: React.ReactElement, locale = 'zh-CN') =>
  renderNode(
    <ZbyIntlProvider locale={locale} resources={zbyUiLocales}>
      {node}
    </ZbyIntlProvider>,
  )

beforeAll(() => {
  Object.defineProperty(globalThis, 'ResizeObserver', {
    configurable: true,
    value: TestResizeObserver,
  })
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string): MediaQueryList =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }) as MediaQueryList,
  })
})

afterAll(() => {
  if (originalResizeObserver) {
    Object.defineProperty(globalThis, 'ResizeObserver', {
      configurable: true,
      value: originalResizeObserver,
    })
  } else {
    delete (globalThis as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver
  }
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: originalMatchMedia,
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('ActionText', () => {
  it('renders text and small ActionIcon actions', () => {
    const { container } = render(
      <ActionText
        actions={[
          { key: 'copy', icon: <CopyOutlined />, label: 'Copy' },
          { key: 'edit', icon: <EditOutlined />, label: 'Edit', color: 'primary' },
        ]}
      >
        Shop name
      </ActionText>,
    )

    expect(container.querySelector('.ant-action-text')).not.toBeNull()
    expect(container.querySelector('.ant-action-text-text')?.textContent).toBe('Shop name')
    expect(container.querySelectorAll('.ant-action-text-action')).toHaveLength(2)
    expect(container.querySelectorAll('.ant-action-icon-sm')).toHaveLength(2)
    expect(container.querySelector('[aria-label="Copy"]')).not.toBeNull()
  })

  it('passes ellipsis rows to Typography.Paragraph and resets text margin', () => {
    const { container } = render(
      <ActionText ellipsis={{ rows: 2, tooltip: true }}>
        Very very very long shop name
      </ActionText>,
    )
    const text = container.querySelector<HTMLElement>('.ant-action-text-text')!

    expect(text.classList.contains('ant-typography-ellipsis-multiple-line')).toBe(true)
    expect(text.style.margin).toBe('0px')
    expect(text.style.webkitLineClamp).toBe('2')
  })

  it('supports self hover and always visible modes', () => {
    const { container } = render(
      <>
        <ActionText
          actions={[{ key: 'copy', icon: <CopyOutlined />, label: 'Copy' }]}
          actionsVisibleOn="self-hover"
        >
          Self
        </ActionText>
        <ActionText
          actions={[{ key: 'copy', icon: <CopyOutlined />, label: 'Copy' }]}
          actionsVisibleOn="always"
        >
          Always
        </ActionText>
      </>,
    )

    expect(container.querySelector('.ant-action-text-actions-self-hover')).not.toBeNull()
    expect(container.querySelector('.ant-action-text-actions-always')).not.toBeNull()
  })

  it('supports semantic callbacks with normalized props', () => {
    const { container } = render(
      <ActionText
        actionsVisibleOn="always"
        classNames={({ props }) => ({
          root: props.actionsVisibleOn === 'always' ? 'custom-root' : undefined,
          text: 'custom-text',
          actions: 'custom-actions',
          action: 'custom-action',
        })}
        styles={({ props }) => ({
          root: { width: props.actionsVisibleOn === 'always' ? 240 : undefined },
          text: { color: 'rgb(255, 0, 0)' },
        })}
        actions={[{ key: 'copy', icon: <CopyOutlined />, label: 'Copy' }]}
      >
        Styled shop
      </ActionText>,
    )

    const root = container.querySelector<HTMLElement>('.custom-root')!
    const text = container.querySelector<HTMLElement>('.custom-text')!
    expect(root.style.width).toBe('240px')
    expect(text.style.color).toBe('rgb(255, 0, 0)')
    expect(container.querySelector('.custom-actions')).not.toBeNull()
    expect(container.querySelector('.custom-action')).not.toBeNull()
  })

  it('supports built-in copyable action', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    const onCopy = vi.fn()
    const { container } = render(
      <ActionText
        copyable={{
          text: 'Copied shop',
          tooltips: ['复制门店名称', '门店名称已复制'],
          onCopy,
        }}
      >
        Shop name
      </ActionText>,
    )

    const copyAction = container.querySelector('[data-action-text-copy]')!
    expect(copyAction.getAttribute('title')).toBe('复制门店名称')
    expect(copyAction.getAttribute('aria-label')).toBe('复制门店名称')

    fireEvent.click(copyAction)

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('Copied shop')
      expect(onCopy).toHaveBeenCalledTimes(1)
      expect(container.querySelector('[data-action-text-copy-success="true"]')).not.toBeNull()
      expect(copyAction.getAttribute('title')).toBe('门店名称已复制')
      expect(copyAction.getAttribute('aria-label')).toBe('门店名称已复制')
    })
    expect(container.querySelector('[data-action-text-copy]')?.classList.contains('ant-action-icon-sm')).toBe(true)
  })

  it('keeps an accessible label when the native copy title is disabled', () => {
    const { container } = render(
      <ActionText copyable={{ tooltips: false }}>Shop name</ActionText>,
    )
    const copyAction = container.querySelector('[data-action-text-copy]')!

    expect(copyAction.getAttribute('title')).toBeNull()
    expect(copyAction.getAttribute('aria-label')).toBe('复制')
    expect(container.querySelector('.ant-tooltip')).toBeNull()
  })

  it('uses zby intl messages for built-in action labels', async () => {
    const { container, getByText } = render(
      <ConfigProvider theme={{ token: { motion: false } }}>
        <ActionText copyable editable>
          Shop name
        </ActionText>
      </ConfigProvider>,
      'en-US',
    )

    expect(container.querySelector('[data-action-text-copy]')?.getAttribute('aria-label')).toBe(
      'Copy',
    )
    expect(container.querySelector('[data-action-text-edit]')?.getAttribute('aria-label')).toBe(
      'Edit',
    )

    fireEvent.click(container.querySelector('[data-action-text-edit]')!)
    await waitFor(() => {
      expect(getByText('OK')).not.toBeNull()
      expect(getByText('Cancel')).not.toBeNull()
    })
  })

  it('opens the editable popover and submits the form', async () => {
    const onConfirm = vi.fn()
    const { container, getByText } = render(
      <ConfigProvider theme={{ token: { motion: false } }}>
        <ActionText
          editable={{
            text: 'Shop name',
            title: 'Edit shop',
            confirmText: 'Save',
            cancelText: 'Cancel',
            onConfirm,
          }}
        >
          Shop name
        </ActionText>
      </ConfigProvider>,
    )

    fireEvent.click(container.querySelector('[data-action-text-edit]')!)
    await waitFor(() => {
      expect(document.querySelector('.ant-input')).not.toBeNull()
    })
    const input = document.querySelector<HTMLInputElement>('.ant-input')!
    expect(input.value).toBe('Shop name')

    fireEvent.change(input, { target: { value: 'New shop' } })
    fireEvent.click(getByText('Save'))

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith(
        'New shop',
        expect.objectContaining({ values: { value: 'New shop' } }),
      )
    })
  })

  it('uses Form initialValues without duplicating Form.Item initialValue', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { container } = render(
      <ConfigProvider theme={{ token: { motion: false } }}>
        <ActionText editable={{ text: 'Initial shop' }}>Shop name</ActionText>
      </ConfigProvider>,
    )

    fireEvent.click(container.querySelector('[data-action-text-edit]')!)
    await waitFor(() => {
      expect(document.querySelector<HTMLInputElement>('.ant-input')?.value).toBe(
        'Initial shop',
      )
    })

    expect(consoleError.mock.calls.flat().join(' ')).not.toContain(
      'Form already set \'initialValues\'',
    )
  })

  it('supports clickable links and visited state', () => {
    const onClick = vi.fn((event: React.MouseEvent<HTMLElement>) => {
      event.preventDefault()
    })
    const onVisitedChange = vi.fn()
    const { container } = render(
      <ActionText
        clickable={{
          href: '/shops/1',
          target: '_blank',
          onClick,
          onVisitedChange,
        }}
      >
        Shop name
      </ActionText>,
    )
    const link = container.querySelector<HTMLAnchorElement>('.ant-action-text-text-link')!

    expect(link.rel).toBe('noopener noreferrer')
    fireEvent.click(link)
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onVisitedChange).toHaveBeenCalledTimes(1)
    expect(onVisitedChange).toHaveBeenCalledWith(true)
    expect(link.classList.contains('ant-action-text-text-link-visited')).toBe(true)

    fireEvent.click(link, { ctrlKey: true })
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onVisitedChange).toHaveBeenCalledTimes(1)
  })

  it('emits controlled editable open changes once', async () => {
    const onOpenChange = vi.fn()
    const { container } = render(
      <ConfigProvider theme={{ token: { motion: false } }}>
        <ActionText editable={{ open: false, onOpenChange }}>Shop name</ActionText>
      </ConfigProvider>,
    )

    fireEvent.click(container.querySelector('[data-action-text-edit]')!)

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledTimes(1)
      expect(onOpenChange).toHaveBeenCalledWith(true)
    })
  })

  it('keeps defined state semantics when switching to uncontrolled mode', () => {
    const Demo = () => {
      const [controlled, setControlled] = React.useState(true)

      return (
        <>
          <ActionText
            clickable={{
              defaultVisited: true,
              ...(controlled ? { visited: false } : {}),
            }}
          >
            Shop name
          </ActionText>
          <button type="button" onClick={() => setControlled(false)}>
            Uncontrol
          </button>
        </>
      )
    }
    const { container, getByText } = render(<Demo />)

    fireEvent.click(getByText('Uncontrol'))

    expect(
      container
        .querySelector('.ant-action-text-text-button')
        ?.classList
        .contains('ant-action-text-text-button-visited'),
    ).toBe(false)
  })

  it('inherits prefix, RTL, dark theme and CSS variable conventions from antd', () => {
    const { container } = render(
      <ConfigProvider
        prefixCls="custom"
        direction="rtl"
        theme={{ algorithm: theme.darkAlgorithm, cssVar: { key: 'action-text-dark' } }}
      >
        <ActionText copyable>Shop name</ActionText>
      </ConfigProvider>,
    )
    const root = container.querySelector('.custom-action-text')!

    expect(root.classList.contains('custom-action-text-rtl')).toBe(true)
    expect(root.classList.contains('action-text-dark')).toBe(true)
    expect(container.querySelector('.custom-action-icon-sm')).not.toBeNull()
    expect(document.head.textContent).toContain('--custom-color-bg-base:#000')
  })

  it('registers the constrained flex and hover styles', () => {
    const cache = createCache()

    render(
      <StyleProvider cache={cache}>
        <ActionText actions={[{ key: 'copy', icon: <CopyOutlined />, label: 'Copy' }]}>
          Very very very long shop name
        </ActionText>
      </StyleProvider>,
    )
    const styleText = extractStyle(cache)

    expect(styleText).toContain('.ant-action-text')
    expect(styleText).toContain('display:inline-flex')
    expect(styleText).toContain('.ant-action-text-text')
    expect(styleText).toContain('.ant-action-text-actions-self-hover')
    expect(styleText).toContain('.ant-action-text-edit-popover')
  })
})

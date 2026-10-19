// @vitest-environment jsdom

import { CopyOutlined, EditOutlined } from '@ant-design/icons'
import { createCache, extractStyle, StyleProvider } from '@ant-design/cssinjs'
import { cleanup, fireEvent, render as renderNode, waitFor } from '@testing-library/react'
import { ZbyIntlProvider } from '@zby/intl'
import { ConfigProvider, theme } from 'antd'
import * as React from 'react'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { zbyUiIntlResources } from '../../../locale/intl-resources'
import ActionIcon from '../../action-icon'
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
    <ZbyIntlProvider locale={locale} resources={zbyUiIntlResources}>
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
  it('renders text and custom actions', () => {
    const { container } = render(
      <ActionText
        actions={
          <>
            <ActionIcon size="small" icon={<CopyOutlined />} aria-label="Copy" />
            <ActionIcon size="small" icon={<EditOutlined />} aria-label="Edit" />
          </>
        }
      >
        Shop name
      </ActionText>,
    )

    expect(container.querySelector('.ant-action-text')).not.toBeNull()
    expect(container.querySelector('.ant-action-text-text')?.textContent).toBe('Shop name')
    expect(container.querySelectorAll('.ant-action-icon-sm')).toHaveLength(2)
    expect(container.querySelector('[aria-label="Copy"]')).not.toBeNull()
    expect(container.querySelector('.ant-typography')).toBeNull()
  })

  it('uses native single-line ellipsis and a title attribute', () => {
    const { container } = render(
      <ActionText ellipsis={{ title: 'Full shop name' }}>
        Very very very long shop name
      </ActionText>,
    )
    const text = container.querySelector<HTMLElement>('.ant-action-text-text')!

    expect(text.classList.contains('ant-action-text-text-ellipsis')).toBe(true)
    expect(text.getAttribute('title')).toBe('Full shop name')
    expect(text.style.margin).toBe('0px')
    expect(container.querySelector('.ant-typography')).toBeNull()
  })

  it('lets styles.text clamp multiple lines without the single-line class', () => {
    const { container } = render(
      <ActionText
        styles={{
          text: {
            display: '-webkit-box',
            overflow: 'hidden',
            whiteSpace: 'normal',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 2,
          },
        }}
      >
        Very very very long shop name
      </ActionText>,
    )
    const text = container.querySelector<HTMLElement>('.ant-action-text-text')!

    expect(text.classList.contains('ant-action-text-text-ellipsis')).toBe(false)
    expect(text.hasAttribute('title')).toBe(false)
    expect(text.style.webkitLineClamp).toBe('2')
    expect(text.style.whiteSpace).toBe('normal')
  })

  it('keeps ellipsis off unless the prop is enabled', () => {
    const { container } = render(<ActionText>Shop name</ActionText>)
    const text = container.querySelector<HTMLElement>('.ant-action-text-text')!

    expect(text.classList.contains('ant-action-text-text-ellipsis')).toBe(false)
    expect(text.hasAttribute('title')).toBe(false)
  })

  it('applies type and strong without an underline wrapper', () => {
    const { container } = render(
      <ActionText type="success" strong>
        Shop name
      </ActionText>,
    )
    const text = container.querySelector('.ant-action-text-text')

    expect(text?.classList.contains('ant-action-text-text-success')).toBe(true)
    expect(text?.querySelector('strong')?.textContent).toBe('Shop name')
    expect(text?.querySelector('u')).toBeNull()
  })

  it('uses string children as the native title when ellipsis is enabled', () => {
    const { container } = render(<ActionText ellipsis>Shop name</ActionText>)
    const text = container.querySelector<HTMLElement>('.ant-action-text-text')!

    expect(text.classList.contains('ant-action-text-text-ellipsis')).toBe(true)
    expect(text.getAttribute('title')).toBe('Shop name')
  })

  it('joins text from arrays, fragments, and nested elements', () => {
    const { container } = render(
      <ActionText ellipsis style={{ display: 'block', width: 120 }}>
        <>
          订单 <span>{2026}</span>
        </>
      </ActionText>,
    )
    const text = container.querySelector<HTMLElement>('.ant-action-text-text')!

    expect(text.getAttribute('title')).toBe('订单 2026')
    expect(text.classList.contains('ant-action-text-text-ellipsis')).toBe(true)
    expect(getComputedStyle(text).display).toBe('inline-block')
  })

  it('does not invent a title for a component that renders its own text', () => {
    const ShopName = () => <span>Hidden shop</span>
    const { container } = render(
      <ActionText ellipsis>
        <ShopName />
      </ActionText>,
    )

    expect(container.querySelector('.ant-action-text-text')?.getAttribute('title')).toBeNull()
  })

  it('omits the ellipsis class and title when ellipsis is disabled', () => {
    const { container } = render(<ActionText ellipsis={false}>Shop name</ActionText>)
    const text = container.querySelector<HTMLElement>('.ant-action-text-text')!

    expect(text.classList.contains('ant-action-text-text-ellipsis')).toBe(false)
    expect(text.hasAttribute('title')).toBe(false)
  })

  it('supports self hover, always visible, and forced visible modes', () => {
    const action = <button type="button">Edit</button>
    const { container } = render(
      <>
        <ActionText actions={action} actionsVisibleOn="self-hover">
          Self
        </ActionText>
        <ActionText actions={action} actionsVisibleOn="always">
          Always
        </ActionText>
        <ActionText actions={action} actionsVisibleOn="self-hover" actionsVisible>
          Pinned
        </ActionText>
      </>,
    )

    expect(container.querySelector('.ant-action-text-actions-self-hover')).not.toBeNull()
    expect(container.querySelectorAll('.ant-action-text-actions-always')).toHaveLength(2)
  })

  it('marks table row hover actions with the table prefix class', () => {
    const action = <button type="button">Edit</button>
    const { container } = render(
      <ConfigProvider prefixCls="custom">
        <ActionText actions={action} actionsVisibleOn="table-row-hover" actionsVisible>
          Pinned row
        </ActionText>
      </ConfigProvider>,
    )
    const actions = container.querySelector('.custom-action-text-actions')!

    expect(actions.classList.contains('custom-table-cell-hover-to-display-inline-flex')).toBe(
      true,
    )
    expect(actions.classList.contains('custom-action-text-actions-always')).toBe(true)
    expect(actions.classList.contains('custom-action-text-actions-self-hover')).toBe(false)
  })

  it('supports semantic callbacks with normalized props', () => {
    const { container } = render(
      <ActionText
        copyable
        actionsVisibleOn="always"
        classNames={({ props }) => ({
          root: props.actionsVisibleOn === 'always' ? 'custom-root' : undefined,
          text: 'custom-text',
          actions: 'custom-actions',
          action: props.actionsVisible === false ? 'custom-action' : undefined,
        })}
        styles={({ props }) => ({
          root: { width: props.actionsVisibleOn === 'always' ? 240 : undefined },
          text: { color: 'rgb(255, 0, 0)' },
        })}
        actions={<ActionIcon size="small" icon={<CopyOutlined />} aria-label="Copy" />}
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

  it('uses zby intl messages for the built-in copy label', () => {
    const { container } = render(<ActionText copyable>Shop name</ActionText>, 'en-US')

    expect(container.querySelector('[data-action-text-copy]')?.getAttribute('aria-label')).toBe(
      'Copy',
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
        <ActionText actions={<button type="button">Copy</button>}>
          Very very very long shop name
        </ActionText>
      </StyleProvider>,
    )
    const styleText = extractStyle(cache)

    expect(styleText).toContain('.ant-action-text')
    expect(styleText).toContain('display:inline-flex')
    expect(styleText).toContain('.ant-action-text-text')
    expect(styleText).toContain('.ant-action-text-actions-self-hover')
    expect(styleText).toContain('.ant-action-text-text-ellipsis')
    expect(styleText).toContain('text-overflow:ellipsis')
    expect(styleText).toContain('display:inline-block')
  })
})

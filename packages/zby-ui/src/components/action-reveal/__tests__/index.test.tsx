// @vitest-environment jsdom

import { SearchOutlined } from '@ant-design/icons'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { ConfigProvider, Input, type InputRef } from 'antd'
import * as React from 'react'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import type { ActionRevealContentRender } from '../index'
import ActionReveal from '../index'

const originalMatchMedia = window.matchMedia
const originalRequestAnimationFrame = globalThis.requestAnimationFrame
const originalCancelAnimationFrame = globalThis.cancelAnimationFrame

beforeAll(() => {
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
  Object.defineProperty(globalThis, 'requestAnimationFrame', {
    configurable: true,
    value: (callback: FrameRequestCallback) =>
      window.setTimeout(() => callback(performance.now()), 0),
  })
  Object.defineProperty(globalThis, 'cancelAnimationFrame', {
    configurable: true,
    value: (frame: number) => window.clearTimeout(frame),
  })
})

afterAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: originalMatchMedia,
  })

  if (originalRequestAnimationFrame) {
    Object.defineProperty(globalThis, 'requestAnimationFrame', {
      configurable: true,
      value: originalRequestAnimationFrame,
    })
  } else {
    delete (globalThis as { requestAnimationFrame?: typeof requestAnimationFrame })
      .requestAnimationFrame
  }

  if (originalCancelAnimationFrame) {
    Object.defineProperty(globalThis, 'cancelAnimationFrame', {
      configurable: true,
      value: originalCancelAnimationFrame,
    })
  } else {
    delete (globalThis as { cancelAnimationFrame?: typeof cancelAnimationFrame })
      .cancelAnimationFrame
  }
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const RevealContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  (props, ref) => (
    <div {...props} ref={ref} tabIndex={-1}>
      content
    </div>
  ),
)

const renderRevealContent: ActionRevealContentRender = ({ contentProps }) => {
  const { ref, ...restProps } = contentProps

  return <RevealContent {...restProps} ref={ref as React.Ref<HTMLDivElement>} />
}

function renderWithoutMotion(node: React.ReactElement) {
  return render(<ConfigProvider theme={{ token: { motion: false } }}>{node}</ConfigProvider>)
}

describe('ActionReveal', () => {
  it('replaces the ActionIcon trigger and renders content without a wrapper', async () => {
    const { container } = renderWithoutMotion(
      <ActionReveal
        triggerIcon={<SearchOutlined />}
        actionIconProps={{ 'aria-label': 'Open search' }}
        width={160}
        content={renderRevealContent}
      />,
    )

    const trigger = container.querySelector<HTMLButtonElement>('.ant-action-reveal-trigger')!
    expect(trigger.classList.contains('ant-action-icon')).toBe(true)
    expect(trigger.classList.contains('ant-btn')).toBe(false)
    expect(trigger.getAttribute('aria-label')).toBe('Open search')
    expect(container.querySelector('.ant-action-reveal')).toBeNull()

    fireEvent.click(trigger)

    await waitFor(() => {
      expect(container.querySelector('.ant-action-reveal')).not.toBeNull()
    })
    expect(container.querySelector('.ant-action-reveal-trigger')).toBeNull()
    expect(container.firstElementChild?.classList.contains('ant-action-reveal')).toBe(true)
    expect(container.querySelectorAll('.ant-action-reveal')).toHaveLength(1)
  })

  it('uses the measured trigger width as the reveal animation start', () => {
    const offsetWidthDescriptor = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'offsetWidth',
    )
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      get: () => 44,
    })
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(() => 1)

    const { container } = render(
      <ActionReveal
        triggerIcon={<SearchOutlined />}
        width={160}
        content={renderRevealContent}
      />,
    )

    fireEvent.click(container.querySelector('.ant-action-reveal-trigger')!)

    const content = container.querySelector<HTMLElement>('.ant-action-reveal')!
    expect(content.style.width).toBe('44px')

    if (offsetWidthDescriptor) {
      Object.defineProperty(HTMLElement.prototype, 'offsetWidth', offsetWidthDescriptor)
    } else {
      delete (HTMLElement.prototype as { offsetWidth?: number }).offsetWidth
    }
  })

  it('only requests changes in controlled mode', () => {
    const onOpenChange = vi.fn()
    const { container } = renderWithoutMotion(
      <ActionReveal
        open={false}
        onOpenChange={onOpenChange}
        triggerIcon={<SearchOutlined />}
        content={renderRevealContent}
      />,
    )

    fireEvent.click(container.querySelector('.ant-action-reveal-trigger')!)

    expect(onOpenChange).toHaveBeenCalledWith(true)
    expect(container.querySelector('.ant-action-reveal')).toBeNull()
  })

  it('respects a prevented trigger click', () => {
    const { container } = renderWithoutMotion(
      <ActionReveal
        triggerIcon={<SearchOutlined />}
        actionIconProps={{ onClick: (event) => event.preventDefault() }}
        content={renderRevealContent}
      />,
    )

    fireEvent.click(container.querySelector('.ant-action-reveal-trigger')!)

    expect(container.querySelector('.ant-action-reveal')).toBeNull()
  })

  it('collapses on blur by default and can keep content open', async () => {
    const collapsible = renderWithoutMotion(
      <ActionReveal defaultOpen triggerIcon={<SearchOutlined />} content={renderRevealContent} />,
    )

    fireEvent.blur(collapsible.container.querySelector('.ant-action-reveal')!)
    await waitFor(() => {
      expect(collapsible.container.querySelector('.ant-action-reveal')).toBeNull()
    })

    collapsible.unmount()
    const persistent = renderWithoutMotion(
      <ActionReveal
        defaultOpen
        collapseOnBlur={false}
        triggerIcon={<SearchOutlined />}
        content={renderRevealContent}
      />,
    )

    fireEvent.blur(persistent.container.querySelector('.ant-action-reveal')!)
    expect(persistent.container.querySelector('.ant-action-reveal')).not.toBeNull()
  })

  it('keeps compound content open while focus moves inside its visual root', () => {
    const renderSearchContent: ActionRevealContentRender = ({ contentProps }) => (
      <Input.Search
        ref={contentProps.ref as React.Ref<InputRef>}
        className={contentProps.className}
        style={contentProps.style}
        onBlur={contentProps.onBlur}
        enterButton
      />
    )
    const { container } = renderWithoutMotion(
      <ActionReveal defaultOpen content={renderSearchContent} />,
    )
    const input = container.querySelector('input')!
    const searchButton = container.querySelector('.ant-input-search-btn')!

    expect(input.closest('.ant-action-reveal')).toBe(
      searchButton.closest('.ant-action-reveal'),
    )

    fireEvent.blur(input, { relatedTarget: searchButton })

    expect(container.querySelector('.ant-action-reveal')).not.toBeNull()
  })

  it('restores trigger focus after content requests close', async () => {
    const renderClosableContent: ActionRevealContentRender = ({ close, contentProps }) => {
      const { ref, ...restProps } = contentProps

      return (
        <button
          {...restProps}
          ref={ref as React.Ref<HTMLButtonElement>}
          type="button"
          onClick={close}
        >
          Close
        </button>
      )
    }
    const { container } = renderWithoutMotion(
      <ActionReveal
        defaultOpen
        triggerIcon={<SearchOutlined />}
        content={renderClosableContent}
      />,
    )
    const content = container.querySelector<HTMLButtonElement>('.ant-action-reveal')!
    content.focus()

    fireEvent.click(content)

    await waitFor(() => {
      expect(container.querySelector('.ant-action-reveal-trigger')).not.toBeNull()
    })
    expect(document.activeElement).toBe(
      container.querySelector('.ant-action-reveal-trigger'),
    )
  })

  it('inherits ActionIcon state and DOM conventions from antd ConfigProvider', () => {
    const { container, rerender } = render(
      <ConfigProvider componentDisabled componentSize="large">
        <ActionReveal triggerIcon={<SearchOutlined />} content={renderRevealContent} />
      </ConfigProvider>,
    )

    const trigger = container.querySelector<HTMLButtonElement>('.ant-action-reveal-trigger')!
    expect(trigger.disabled).toBe(true)
    expect(trigger.classList.contains('ant-action-icon-lg')).toBe(true)

    rerender(
      <ConfigProvider direction="rtl" prefixCls="custom" theme={{ token: { motion: false } }}>
        <ActionReveal defaultOpen content={renderRevealContent} />
      </ConfigProvider>,
    )

    const content = container.querySelector('.custom-action-reveal')!
    expect(content.classList.contains('custom-action-reveal-rtl')).toBe(true)
  })

  it('supports semantic callbacks and focuses open content', () => {
    const { container } = renderWithoutMotion(
      <ActionReveal
        defaultOpen
        width={180}
        classNames={({ props }) => ({ content: props.open ? 'is-open' : undefined })}
        styles={({ props }) => ({ content: { maxWidth: props.width } })}
        content={renderRevealContent}
      />,
    )

    const content = container.querySelector<HTMLElement>('.ant-action-reveal')!
    expect(content.classList.contains('is-open')).toBe(true)
    expect(content.style.maxWidth).toBe('180px')
    expect(document.activeElement).toBe(content)
  })

  it('honors semantic content sizing and presentation styles', () => {
    const { container } = renderWithoutMotion(
      <ActionReveal
        defaultOpen
        styles={{
          content: {
            width: 222,
            overflow: 'visible',
            transition: 'opacity 1s linear',
          },
        }}
        content={renderRevealContent}
      />,
    )

    const content = container.querySelector<HTMLElement>('.ant-action-reveal')!
    expect(content.style.width).toBe('222px')
    expect(content.style.overflow).toBe('visible')
    expect(content.style.transition).toBe('opacity 1s linear')
  })

  it('opens at natural width without a transition when no target width is provided', () => {
    const requestFrame = vi.spyOn(globalThis, 'requestAnimationFrame')
    const { container } = render(
      <ActionReveal triggerIcon={<SearchOutlined />} content={renderRevealContent} />,
    )

    fireEvent.click(container.querySelector('.ant-action-reveal-trigger')!)

    const content = container.querySelector<HTMLElement>('.ant-action-reveal-open')!
    expect(content).not.toBeNull()
    expect(content.style.width).toBe('')
    expect(content.style.transition).toBe('')
    expect(requestFrame).not.toHaveBeenCalled()
  })
})

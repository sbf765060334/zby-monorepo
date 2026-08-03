// @vitest-environment jsdom

import { SearchOutlined } from '@ant-design/icons'
import { createCache, extractStyle, StyleProvider } from '@ant-design/cssinjs'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { Badge, ConfigProvider, theme } from 'antd'
import * as React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import ActionIcon from '../index'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('ActionIcon', () => {
  it('renders native button states without relying on antd Button DOM', () => {
    const { container } = render(
      <>
        <ActionIcon icon={<SearchOutlined />} aria-label="Selected icon" selected />
        <ActionIcon icon={<SearchOutlined />} aria-label="Disabled icon" disabled />
        <ActionIcon icon={<SearchOutlined />} aria-label="Not selected icon" selected={false} />
        <ActionIcon icon={<SearchOutlined />} aria-label="Plain icon" />
      </>,
    )

    const icons = container.querySelectorAll('.ant-action-icon')
    expect(icons).toHaveLength(4)
    expect(icons[0].classList.contains('ant-action-icon-selected')).toBe(true)
    expect(icons[0].classList.contains('css-var-root')).toBe(true)
    expect(icons[0].getAttribute('aria-pressed')).toBe('true')
    expect(icons[1].hasAttribute('disabled')).toBe(true)
    expect(icons[2].getAttribute('aria-pressed')).toBe('false')
    expect(icons[3].hasAttribute('aria-pressed')).toBe(false)
    expect(container.querySelector('.ant-btn')).toBeNull()
  })

  it('renders danger, selected, shape, and icon content', () => {
    const { container } = render(
      <ActionIcon danger selected shape="circle" aria-label="Danger icon">
        <SearchOutlined />
      </ActionIcon>,
    )
    const button = container.querySelector<HTMLButtonElement>('.ant-action-icon')!

    expect(button.classList.contains('ant-action-icon-danger')).toBe(true)
    expect(button.classList.contains('ant-action-icon-selected')).toBe(true)
    expect(button.classList.contains('ant-action-icon-circle')).toBe(true)
    expect(button.classList.contains('ant-action-icon-color-dangerous')).toBe(true)
    expect(button.querySelector('.ant-action-icon-icon svg')).not.toBeNull()
  })

  it('forwards native button events, attributes, and refs', () => {
    const onClick = vi.fn()
    const ref = React.createRef<HTMLButtonElement>()
    const { getByRole } = render(
      <ActionIcon
        ref={ref}
        icon={<SearchOutlined />}
        aria-label="Search icon"
        data-action="search"
        onClick={onClick}
      />,
    )
    const button = getByRole('button')

    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(ref.current).toBe(button)
    expect(button.getAttribute('type')).toBe('button')
    expect(button.getAttribute('data-action')).toBe('search')
  })

  it('can be wrapped by Badge', () => {
    const { container } = render(
      <Badge count={2}>
        <ActionIcon icon={<SearchOutlined />} aria-label="Filter icon" />
      </Badge>,
    )

    expect(container.querySelector('.ant-badge')).not.toBeNull()
    expect(container.querySelector('.ant-badge-count')).not.toBeNull()
    expect(container.querySelector('.ant-action-icon')).not.toBeNull()
  })

  it('supports size props, the medium alias, and ConfigProvider state', () => {
    const { container } = render(
      <ConfigProvider componentSize="large">
        <ActionIcon icon={<SearchOutlined />} aria-label="Small icon" size="small" />
        <ActionIcon icon={<SearchOutlined />} aria-label="Middle icon" size="middle" />
        <ActionIcon icon={<SearchOutlined />} aria-label="Medium icon" size="medium" />
        <ActionIcon icon={<SearchOutlined />} aria-label="Large icon" />
      </ConfigProvider>,
    )
    const icons = container.querySelectorAll('.ant-action-icon')

    expect(icons[0].classList.contains('ant-action-icon-sm')).toBe(true)
    expect(icons[1].classList.contains('ant-action-icon-sm')).toBe(false)
    expect(icons[1].classList.contains('ant-action-icon-lg')).toBe(false)
    expect(icons[2].classList.contains('ant-action-icon-sm')).toBe(false)
    expect(icons[2].classList.contains('ant-action-icon-lg')).toBe(false)
    expect(icons[3].classList.contains('ant-action-icon-lg')).toBe(true)

    const disabled = render(
      <ConfigProvider componentDisabled>
        <ActionIcon icon={<SearchOutlined />} aria-label="Context disabled" />
      </ConfigProvider>,
    )
    expect(
      disabled.getByRole('button', { name: 'Context disabled' }).hasAttribute('disabled'),
    ).toBe(true)
  })

  it('applies color and variant classes', () => {
    const { container } = render(
      <>
        <ActionIcon
          icon={<SearchOutlined />}
          aria-label="Primary filled"
          color="primary"
          variant="filled"
        />
        <ActionIcon
          icon={<SearchOutlined />}
          aria-label="Danger outlined"
          color="danger"
          variant="outlined"
        />
        <ActionIcon
          icon={<SearchOutlined />}
          aria-label="Green inline"
          color="green"
          variant="inline"
        />
        <ActionIcon icon={<SearchOutlined />} aria-label="Primary color" color="primary" />
        <ActionIcon icon={<SearchOutlined />} aria-label="Filled variant" variant="filled" />
        <ActionIcon
          icon={<SearchOutlined />}
          aria-label="Explicit primary danger"
          color="primary"
          variant="filled"
          danger
          selected
        />
      </>,
    )
    const icons = container.querySelectorAll('.ant-action-icon')

    expect(icons[0].classList.contains('ant-action-icon-color-primary')).toBe(true)
    expect(icons[0].classList.contains('ant-action-icon-variant-filled')).toBe(true)
    expect(icons[1].classList.contains('ant-action-icon-color-dangerous')).toBe(true)
    expect(icons[1].classList.contains('ant-action-icon-variant-outlined')).toBe(true)
    expect(icons[2].classList.contains('ant-action-icon-color-green')).toBe(true)
    expect(icons[2].classList.contains('ant-action-icon-variant-inline')).toBe(true)
    expect(icons[3].classList.contains('ant-action-icon-color-primary')).toBe(true)
    expect(icons[3].className).not.toContain('ant-action-icon-variant-')
    expect(icons[4].classList.contains('ant-action-icon-color-default')).toBe(true)
    expect(icons[4].classList.contains('ant-action-icon-variant-filled')).toBe(true)
    expect(icons[5].classList.contains('ant-action-icon-color-primary')).toBe(true)
    expect(icons[5].classList.contains('ant-action-icon-variant-filled')).toBe(true)
    expect(icons[5].classList.contains('ant-action-icon-selected')).toBe(true)
    expect(icons[5].classList.contains('ant-action-icon-danger')).toBe(false)
  })

  it('supports semantic callbacks with normalized props', () => {
    const { container } = render(
      <ActionIcon
        icon={<SearchOutlined />}
        aria-label="Styled icon"
        selected
        size="medium"
        classNames={({ props }) => ({
          root: props.selected && props.size === 'middle' ? 'custom-root' : undefined,
          icon: 'custom-icon',
        })}
        styles={({ props }) => ({
          root: { color: props.selected ? 'rgb(255, 0, 0)' : undefined },
          icon: { fontSize: 20 },
        })}
      />,
    )
    const root = container.querySelector<HTMLElement>('.custom-root')!
    const icon = container.querySelector<HTMLElement>('.custom-icon')!

    expect(root.style.color).toBe('rgb(255, 0, 0)')
    expect(icon.style.fontSize).toBe('20px')
  })

  it('inherits compatible component defaults from ConfigProvider button settings', () => {
    const { getByRole } = render(
      <ConfigProvider
        button={{
          className: 'context-root',
          style: { opacity: 0.8 },
          classNames: { root: 'context-semantic-root', icon: 'context-icon' },
          styles: { icon: { fontSize: 21 } },
          shape: 'circle',
          color: 'green',
          variant: 'filled',
        }}
      >
        <ActionIcon icon={<SearchOutlined />} aria-label="Configured icon" />
      </ConfigProvider>,
    )
    const button = getByRole('button', { name: 'Configured icon' })
    const icon = button.querySelector<HTMLElement>('.ant-action-icon-icon')!

    expect(button.classList.contains('context-root')).toBe(true)
    expect(button.classList.contains('context-semantic-root')).toBe(true)
    expect(button.classList.contains('ant-action-icon-circle')).toBe(true)
    expect(button.classList.contains('ant-action-icon-color-green')).toBe(true)
    expect(button.classList.contains('ant-action-icon-variant-filled')).toBe(true)
    expect(button.style.opacity).toBe('0.8')
    expect(icon.classList.contains('context-icon')).toBe(true)
    expect(icon.style.fontSize).toBe('21px')
  })

  it('keeps CSS variables scoped across nested light and dark themes', () => {
    const { getByRole } = render(
      <ConfigProvider theme={{ cssVar: { key: 'action-icon-light' } }}>
        <ActionIcon icon={<SearchOutlined />} aria-label="Light icon" />
        <ConfigProvider
          theme={{
            algorithm: theme.darkAlgorithm,
            cssVar: { key: 'action-icon-dark' },
          }}
        >
          <ActionIcon icon={<SearchOutlined />} aria-label="Dark icon" />
        </ConfigProvider>
      </ConfigProvider>,
    )
    const light = getByRole('button', { name: 'Light icon' })
    const dark = getByRole('button', { name: 'Dark icon' })
    const lightCSSVarClass = [...light.classList].find((name) => name === 'action-icon-light')
    const darkCSSVarClass = [...dark.classList].find((name) => name === 'action-icon-dark')

    expect(lightCSSVarClass).toBeDefined()
    expect(darkCSSVarClass).toBeDefined()
    expect(darkCSSVarClass).not.toBe(lightCSSVarClass)
    expect(document.head.textContent).toContain(`.${darkCSSVarClass}`)
    expect(document.head.textContent).toContain('--ant-color-bg-base:#000')
  })

  it('inherits prefix and direction conventions from ConfigProvider', () => {
    const { container } = render(
      <ConfigProvider prefixCls="custom" direction="rtl">
        <ActionIcon icon={<SearchOutlined />} aria-label="RTL icon" />
      </ConfigProvider>,
    )

    const button = container.querySelector('.custom-action-icon')!
    expect(button.classList.contains('custom-action-icon-rtl')).toBe(true)
  })

  it('registers size, state, and variant styles', () => {
    const cache = createCache()

    render(
      <StyleProvider cache={cache}>
        <ActionIcon
          icon={<SearchOutlined />}
          aria-label="Styled action"
          color="primary"
          variant="filled"
          selected
        />
      </StyleProvider>,
    )
    const styleText = extractStyle(cache)

    expect(styleText).toContain('.ant-action-icon')
    expect(styleText).toContain('ant-action-icon-selected')
    expect(styleText).toContain('ant-action-icon-color-primary')
    expect(styleText).toContain('ant-action-icon-variant-filled')
    expect(styleText).toContain('ant-action-icon-sm')
    expect(styleText).toContain('ant-action-icon-lg')
    expect(styleText).toContain('width:var(--ant-control-height-sm)')
    expect(styleText).toContain('width:var(--ant-control-height)')
    expect(styleText).toContain('width:var(--ant-control-height-lg)')
    expect(styleText).toContain('background:transparent;border-color:currentColor')
    expect(styleText).not.toContain('transition:all')
  })
})

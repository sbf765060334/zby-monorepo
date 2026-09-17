// @vitest-environment jsdom

import { createCache, extractStyle, StyleProvider } from '@ant-design/cssinjs'
import { cleanup, render } from '@testing-library/react'
import { ConfigProvider, Form } from 'antd'
import * as React from 'react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { InputNumberRange } from '../index'

const originalMatchMedia = window.matchMedia

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
})

afterAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: originalMatchMedia,
  })
})

afterEach(() => {
  cleanup()
})

describe('InputNumberRange antd context integration', () => {
  it('inherits disabled and size from the public ConfigProvider API', () => {
    const { container } = render(
      <ConfigProvider componentDisabled componentSize="large">
        <InputNumberRange defaultValue={[1, 2]} placeholder={['Min', 'Max']} allowClear />
      </ConfigProvider>,
    )

    const root = container.querySelector('.ant-input-number-range')!
    const inputs = Array.from(container.querySelectorAll<HTMLInputElement>('input'))

    expect(root.classList.contains('ant-input-number-range-disabled')).toBe(true)
    expect(root.classList.contains('ant-input-number-range-lg')).toBe(true)
    expect(inputs).toHaveLength(2)
    expect(inputs.every((input) => input.disabled)).toBe(true)
    expect(container.querySelector('.ant-input-number-range-clear')).toBeNull()
  })

  it('delegates inherited variant and Form.Item status to the inner InputNumber controls', () => {
    const cache = createCache()
    const { container } = render(
      <StyleProvider cache={cache}>
        <ConfigProvider variant="filled">
          <Form>
            <Form.Item validateStatus="warning">
              <InputNumberRange defaultValue={[1, 2]} placeholder={['Min', 'Max']} />
            </Form.Item>
          </Form>
        </ConfigProvider>
      </StyleProvider>,
    )

    const root = container.querySelector('.ant-input-number-range')!
    const controls = Array.from(container.querySelectorAll<HTMLElement>('.ant-input-number'))
    const styleText = extractStyle(cache)

    expect(root.classList.contains('ant-input-number-range-filled')).toBe(false)
    expect(root.classList.contains('ant-input-number-range-status-warning')).toBe(false)
    expect(controls).toHaveLength(2)
    expect(controls.every((control) => control.classList.contains('ant-input-number-filled'))).toBe(
      true,
    )
    expect(
      controls.every((control) => control.classList.contains('ant-input-number-status-warning')),
    ).toBe(true)
    expect(styleText).toContain(':has(.ant-input-number-range-input.ant-input-number-filled)')
    expect(styleText).toContain(
      ':has(.ant-input-number-range-input.ant-input-number-status-warning)',
    )
  })

  it('keeps explicit variant and status classes while forwarding them to InputNumber', () => {
    const { container } = render(
      <InputNumberRange
        defaultValue={[1, 2]}
        placeholder={['Min', 'Max']}
        variant="underlined"
        status="error"
      />,
    )

    const root = container.querySelector('.ant-input-number-range')!
    const controls = Array.from(container.querySelectorAll<HTMLElement>('.ant-input-number'))

    expect(root.classList.contains('ant-input-number-range-underlined')).toBe(true)
    expect(root.classList.contains('ant-input-number-range-status-error')).toBe(true)
    expect(
      controls.every((control) => control.classList.contains('ant-input-number-underlined')),
    ).toBe(true)
    expect(
      controls.every((control) => control.classList.contains('ant-input-number-status-error')),
    ).toBe(true)
  })

  it('uses ConfigProvider prefixCls for the range root and inner InputNumber', () => {
    const cache = createCache()
    const { container } = render(
      <StyleProvider cache={cache}>
        <ConfigProvider prefixCls="custom">
          <InputNumberRange defaultValue={[1, 2]} placeholder={['Min', 'Max']} />
        </ConfigProvider>
      </StyleProvider>,
    )

    const root = container.querySelector('.custom-input-number-range')!
    const controls = container.querySelectorAll('.custom-input-number')
    const styleText = extractStyle(cache)

    expect(root).not.toBeNull()
    expect(controls).toHaveLength(2)
    expect(styleText).toContain('.custom-input-number-range-input.custom-input-number')
    expect(styleText).toContain(
      ':has(.custom-input-number-range-input.custom-input-number-outlined)',
    )
  })

  it('inherits ConfigProvider direction as an RTL class', () => {
    const { container } = render(
      <ConfigProvider direction="rtl">
        <InputNumberRange defaultValue={[1, 2]} placeholder={['Min', 'Max']} />
      </ConfigProvider>,
    )

    expect(
      container.querySelector('.ant-input-number-range')?.classList.contains(
        'ant-input-number-range-rtl',
      ),
    ).toBe(true)
  })
})

// @vitest-environment jsdom

import { createCache, extractStyle, StyleProvider } from '@ant-design/cssinjs'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { ZbyIntlProvider } from '@zby/intl'
import { ConfigProvider, Form } from 'antd'
import * as React from 'react'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { zbyUiIntlResources } from '../../../locale/intl-resources'
import { InputNumberRange } from '../index'
import type { InputNumberRangeValue } from '../InputNumberRange'

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

const wrapIntl = (node: React.ReactElement, locale = 'zh-CN') => (
  <ZbyIntlProvider locale={locale} resources={zbyUiIntlResources}>
    {node}
  </ZbyIntlProvider>
)

const renderRange = (node: React.ReactElement, locale = 'zh-CN') => render(wrapIntl(node, locale))

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

  it('applies Form.Item id to the start input so the label htmlFor matches', () => {
    const { container } = renderRange(
      <Form>
        <Form.Item name="amountRange" label="金额范围">
          <InputNumberRange defaultValue={[1, 2]} />
        </Form.Item>
      </Form>,
    )

    const label = container.querySelector('label')
    const inputs = Array.from(container.querySelectorAll<HTMLInputElement>('input'))

    expect(label?.htmlFor).toBeTruthy()
    expect(inputs[0]?.id).toBe(label?.htmlFor)
    expect(inputs[1]?.id).toBe(`${label?.htmlFor}-end`)
  })
})

const getInputs = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLInputElement>('input'))

async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve()
  })
}

function typeInto(input: HTMLInputElement, value: string) {
  fireEvent.focus(input)
  fireEvent.change(input, { target: { value } })
}

describe('InputNumberRange commit state machine', () => {
  it('commits synchronously after blur onto a focusable node outside the range', async () => {
    const onChange = vi.fn()
    const { container } = renderRange(
      <>
        <InputNumberRange defaultValue={[1, 2]} onChange={onChange} />
        <button type="button">submit</button>
      </>,
    )

    const [start] = getInputs(container)
    const submit = container.querySelector('button')!

    typeInto(start, '0')
    fireEvent.blur(start, { relatedTarget: submit })
    await flushMicrotasks()

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith([0, 2])
  })

  it('does not commit when focus moves from start to end', async () => {
    const onChange = vi.fn()
    const { container } = renderRange(<InputNumberRange defaultValue={[1, 2]} onChange={onChange} />)
    const [start, end] = getInputs(container)

    typeInto(start, '0')
    fireEvent.blur(start, { relatedTarget: end })
    await flushMicrotasks()

    expect(onChange).not.toHaveBeenCalled()
  })

  it('commits on Enter without waiting for blur', () => {
    const onChange = vi.fn()
    const { container } = renderRange(<InputNumberRange defaultValue={[1, 2]} onChange={onChange} />)
    const [start] = getInputs(container)

    typeInto(start, '0')
    fireEvent.keyDown(start, { key: 'Enter' })

    expect(onChange).toHaveBeenCalledWith([0, 2])
  })

  it('keeps an inverted committed display until the next successful commit, then orders', () => {
    const onChange = vi.fn()
    const { container } = renderRange(
      <InputNumberRange defaultValue={[90, 10]} onChange={onChange} />,
    )
    const [start, end] = getInputs(container)

    expect(start.value).toBe('90')
    expect(end.value).toBe('10')

    fireEvent.focus(start)
    fireEvent.keyDown(start, { key: 'Enter' })

    expect(onChange).toHaveBeenCalledWith([10, 90])
    expect(getInputs(container)[0].value).toBe('10')
    expect(getInputs(container)[1].value).toBe('90')
  })

  it('rolls back drafts that violate allowEmpty', async () => {
    const onChange = vi.fn()
    const { container } = renderRange(
      <>
        <InputNumberRange defaultValue={[10, 20]} onChange={onChange} />
        <button type="button">submit</button>
      </>,
    )
    const [start] = getInputs(container)
    const submit = container.querySelector('button')!

    typeInto(start, '')
    fireEvent.blur(start, { relatedTarget: submit })
    await flushMicrotasks()

    expect(onChange).not.toHaveBeenCalled()
    expect(getInputs(container)[0].value).toBe('10')
    expect(getInputs(container)[1].value).toBe('20')
  })

  it('lets clear bypass allowEmpty and emit [null, null]', () => {
    const onChange = vi.fn()
    const { container } = renderRange(
      <InputNumberRange defaultValue={[10, 20]} allowClear onChange={onChange} />,
    )

    fireEvent.click(container.querySelector('.ant-input-number-range-clear')!)

    expect(onChange).toHaveBeenCalledWith([null, null])
  })

  it('uses the localized clear label', () => {
    const { container } = renderRange(
      <InputNumberRange defaultValue={[1, 2]} allowClear />,
      'en-US',
    )

    expect(container.querySelector('.ant-input-number-range-clear')?.getAttribute('aria-label')).toBe(
      'Clear',
    )
  })

  it('does not keep a stale draft after the controlled value changes while focused', async () => {
    const onChange = vi.fn()

    function Harness({ value }: { value: InputNumberRangeValue<number> }) {
      return (
        <>
          <InputNumberRange value={value} onChange={onChange} />
          <button type="button">submit</button>
        </>
      )
    }

    const { container, rerender } = renderRange(<Harness value={[1, 2]} />)
    const [start] = getInputs(container)
    const submit = container.querySelector('button')!

    typeInto(start, '0')
    rerender(wrapIntl(<Harness value={[8, 9]} />))
    fireEvent.blur(getInputs(container)[0], { relatedTarget: submit })
    await flushMicrotasks()

    expect(onChange).not.toHaveBeenCalled()
    expect(getInputs(container)[0].value).toBe('8')
    expect(getInputs(container)[1].value).toBe('9')
  })

  it('orders high-precision stringMode values without converting to Number', () => {
    const onChange = vi.fn()
    const { container } = renderRange(
      <InputNumberRange
        stringMode
        defaultValue={['9007199254740993', '1']}
        onChange={onChange}
      />,
    )
    const [start] = getInputs(container)

    fireEvent.focus(start)
    fireEvent.keyDown(start, { key: 'Enter' })

    expect(onChange).toHaveBeenCalledWith(['1', '9007199254740993'])
  })
})

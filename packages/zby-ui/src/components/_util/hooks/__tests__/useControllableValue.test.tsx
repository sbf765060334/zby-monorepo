// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import useControllableValue from '../useControllableValue'

describe('useControllableValue', () => {
  it('uses the options default and updates an uncontrolled value', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() =>
      useControllableValue<boolean>({ onChange }, { defaultValue: false }),
    )

    expect(result.current[0]).toBe(false)

    act(() => result.current[1]((previous) => !previous, 'action'))

    expect(result.current[0]).toBe(true)
    expect(onChange).toHaveBeenCalledWith(true, 'action')
  })

  it('prefers the default value property over the options default', () => {
    const { result } = renderHook(() =>
      useControllableValue<boolean>(
        { defaultValue: true },
        { defaultValue: false },
      ),
    )

    expect(result.current[0]).toBe(true)
  })

  it('keeps the external value authoritative and triggers onChange once', () => {
    const onChange = vi.fn()
    const updater = vi.fn((previous: boolean) => !previous)
    const { result, rerender } = renderHook(
      ({ value }: { value: boolean }) =>
        useControllableValue<boolean>({ value, onChange }),
      { initialProps: { value: true } },
    )
    const firstSetter = result.current[1]

    act(() => result.current[1](updater))

    expect(updater).toHaveBeenCalledWith(true)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(false)
    expect(result.current[0]).toBe(true)

    rerender({ value: false })
    expect(result.current[0]).toBe(false)
    expect(result.current[1]).toBe(firstSetter)
  })

  it('supports custom value, default value and trigger property names', () => {
    const onOpenChange = vi.fn()
    const { result } = renderHook(() =>
      useControllableValue<boolean>(
        { defaultOpen: true, onOpenChange },
        {
          defaultValue: false,
          defaultValuePropName: 'defaultOpen',
          valuePropName: 'open',
          trigger: 'onOpenChange',
        },
      ),
    )

    expect(result.current[0]).toBe(true)

    act(() => result.current[1](false))

    expect(result.current[0]).toBe(false)
    expect(onOpenChange).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('uses property ownership to treat an explicit undefined as controlled', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() =>
      useControllableValue<boolean | undefined>(
        { value: undefined, onChange },
        { defaultValue: true },
      ),
    )

    expect(result.current[0]).toBeUndefined()

    act(() => result.current[1](false))

    expect(result.current[0]).toBeUndefined()
    expect(onChange).toHaveBeenCalledWith(false)
  })

  it('preserves the latest controlled value after removing the value property', () => {
    const onOpenChange = vi.fn()
    const { result, rerender } = renderHook(
      ({ props }: { props: Record<string, any> }) =>
        useControllableValue<boolean>(props, {
          defaultValue: true,
          valuePropName: 'open',
          trigger: 'onOpenChange',
        }),
      {
        initialProps: {
          props: { open: false, onOpenChange } as Record<string, any>,
        },
      },
    )

    expect(result.current[0]).toBe(false)

    rerender({ props: { onOpenChange } })
    expect(result.current[0]).toBe(false)

    act(() => result.current[1](true))
    expect(result.current[0]).toBe(true)
    expect(onOpenChange).toHaveBeenCalledWith(true)
  })
})

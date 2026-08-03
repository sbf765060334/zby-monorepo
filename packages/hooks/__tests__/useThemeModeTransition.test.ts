// @vitest-environment jsdom

import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useThemeModeTransition } from '../useThemeModeTransition'

type ViewTransitionStub = {
  ready: Promise<void>
  finished: Promise<void>
}

type StartViewTransition = (
  callback: () => void,
) => ViewTransitionStub

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn(() => ({ matches: false })),
  })
})

afterEach(() => {
  cleanup()
  Reflect.deleteProperty(document, 'startViewTransition')
  vi.restoreAllMocks()
})

describe('useThemeModeTransition', () => {
  it('commits the theme once during a normal View Transition', () => {
    const onThemeModeChange = vi.fn()
    installStartViewTransition((callback) => {
      callback()
      return createViewTransition()
    })

    const { result } = renderThemeTransitionHook(onThemeModeChange)
    result.current.handleThemeModeChange('dark')

    expect(onThemeModeChange).toHaveBeenCalledTimes(1)
    expect(onThemeModeChange).toHaveBeenCalledWith('dark')
  })

  it('falls back to one direct commit when the transition fails before its callback', () => {
    const onThemeModeChange = vi.fn()
    installStartViewTransition(() => {
      throw new Error('transition failed before callback')
    })

    const { result } = renderThemeTransitionHook(onThemeModeChange)
    result.current.handleThemeModeChange('dark')

    expect(onThemeModeChange).toHaveBeenCalledTimes(1)
    expect(onThemeModeChange).toHaveBeenCalledWith('dark')
  })

  it('does not repeat the commit when the transition fails after its callback', () => {
    const onThemeModeChange = vi.fn()
    installStartViewTransition((callback) => {
      callback()
      throw new Error('transition failed after callback')
    })

    const { result } = renderThemeTransitionHook(onThemeModeChange)
    result.current.handleThemeModeChange('dark')

    expect(onThemeModeChange).toHaveBeenCalledTimes(1)
    expect(onThemeModeChange).toHaveBeenCalledWith('dark')
  })

  it('preserves callback errors without retrying the commit', () => {
    const callbackError = new Error('theme commit failed')
    const onThemeModeChange = vi.fn(() => {
      throw callbackError
    })
    installStartViewTransition((callback) => {
      callback()
      return createViewTransition()
    })

    const { result } = renderThemeTransitionHook(onThemeModeChange)

    expect(() => result.current.handleThemeModeChange('dark')).toThrow(callbackError)
    expect(onThemeModeChange).toHaveBeenCalledTimes(1)
  })
})

function renderThemeTransitionHook(onThemeModeChange: (value: 'light' | 'dark') => void) {
  return renderHook(() =>
    useThemeModeTransition({
      themeMode: 'light',
      viewTransitionName: 'test-theme',
      background: '#fff',
      onThemeModeChange,
    }),
  )
}

function installStartViewTransition(implementation: StartViewTransition) {
  Object.defineProperty(document, 'startViewTransition', {
    configurable: true,
    value: vi.fn(implementation),
  })
}

function createViewTransition(): ViewTransitionStub {
  return {
    ready: new Promise(() => {}),
    finished: new Promise(() => {}),
  }
}

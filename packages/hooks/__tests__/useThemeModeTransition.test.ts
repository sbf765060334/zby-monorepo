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
  Object.defineProperty(window, 'devicePixelRatio', {
    configurable: true,
    value: 1,
  })
})

afterEach(() => {
  cleanup()
  document.body.replaceChildren()
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

  it('converts an explicit viewport origin to the named target local coordinates', () => {
    const onThemeModeChange = vi.fn()
    const transitionTarget = document.createElement('div')
    transitionTarget.style.viewTransitionName = 'test-theme'
    vi.spyOn(transitionTarget, 'getBoundingClientRect').mockReturnValue({
      x: 100,
      y: 40,
      left: 100,
      top: 40,
      right: 900,
      bottom: 640,
      width: 800,
      height: 600,
      toJSON: () => ({}),
    })
    document.body.appendChild(transitionTarget)
    installStartViewTransition((callback) => {
      callback()
      return {
        ready: Promise.resolve(),
        finished: Promise.resolve(),
      }
    })

    const { result } = renderThemeTransitionHook(onThemeModeChange)
    result.current.handleThemeModeChange('dark', { x: 250, y: 140 })

    const transitionStyles = Array.from(document.querySelectorAll('style')).filter((style) =>
      style.textContent?.includes('::view-transition-new(test-theme)'),
    )
    const transitionStyle = transitionStyles[transitionStyles.length - 1]
    expect(transitionStyle?.textContent).toContain('circle(0px at 150px 100px)')
    expect(transitionStyle?.textContent).toMatch(
      /animation: zby-theme-transition-reveal-\d+ 520ms/,
    )
  })

  it('scales snapshot coordinates and radius by the device pixel ratio', () => {
    const onThemeModeChange = vi.fn()
    Object.defineProperty(window, 'devicePixelRatio', {
      configurable: true,
      value: 1.5,
    })
    const transitionTarget = document.createElement('div')
    transitionTarget.style.viewTransitionName = 'test-theme'
    vi.spyOn(transitionTarget, 'getBoundingClientRect').mockReturnValue({
      x: 100,
      y: 40,
      left: 100,
      top: 40,
      right: 900,
      bottom: 640,
      width: 800,
      height: 600,
      toJSON: () => ({}),
    })
    document.body.appendChild(transitionTarget)
    installStartViewTransition((callback) => {
      callback()
      return createViewTransition()
    })

    const { result } = renderThemeTransitionHook(onThemeModeChange)
    result.current.handleThemeModeChange('dark', { x: 250, y: 140 })

    const transitionStyles = Array.from(document.querySelectorAll('style')).filter((style) =>
      style.textContent?.includes('::view-transition-new(test-theme)'),
    )
    const transitionStyle = transitionStyles[transitionStyles.length - 1]
    expect(transitionStyle?.textContent).toContain('circle(0px at 225px 150px)')
    const expectedRadius = Math.hypot(650 * 1.5, 500 * 1.5)
    expect(transitionStyle?.textContent).toContain(`circle(${expectedRadius}px at 225px 150px)`)
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

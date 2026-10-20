// @vitest-environment jsdom

import { ZbyIntlProvider } from '@zby/intl'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useLayoutEffect } from 'react'

import { zbyProIntlResources } from '../../../locale/intl-resources'
import { ProThemeProvider, ProThemeSwitch, useTheme, useThemePreference } from '../theme'
import type { ProThemePreference } from '../theme'

const THEME_STORAGE_KEY = 'zby-pro:theme-preference'

let prefersDark = false
const colorSchemeListeners = new Set<() => void>()
const committedPreferences: Array<ProThemePreference & { appearance: 'light' | 'dark' }> = []

beforeEach(() => {
  window.localStorage.clear()
  prefersDark = false
  colorSchemeListeners.clear()
  committedPreferences.length = 0
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(window, 'ResizeObserver', {
    configurable: true,
    value: ResizeObserverMock,
  })
  Object.defineProperty(globalThis, 'ResizeObserver', {
    configurable: true,
    value: ResizeObserverMock,
  })
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn((query: string) => ({
      get matches() {
        return query === '(prefers-color-scheme: dark)' ? prefersDark : false
      },
      media: query,
      onchange: null,
      addEventListener: (_type: string, listener: () => void) => {
        if (query === '(prefers-color-scheme: dark)')
          colorSchemeListeners.add(listener)
      },
      removeEventListener: (_type: string, listener: () => void) => {
        colorSchemeListeners.delete(listener)
      },
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

afterEach(() => {
  cleanup()
  Reflect.deleteProperty(document, 'startViewTransition')
  Reflect.deleteProperty(document.documentElement, 'animate')
  vi.restoreAllMocks()
})

describe('ProThemeSwitch', () => {
  it('registers trigger styles independently with its own prefix', () => {
    render(
      <ZbyIntlProvider locale="zh-CN" fallbackLocale="zh-CN" resources={zbyProIntlResources}>
        <ProThemeSwitch
          value={{ mode: 'light', density: 'default' }}
          appearance="light"
          onChange={() => {}}
          prefixCls="custom-theme"
        />
      </ZbyIntlProvider>,
    )

    expect(
      screen.getByRole('button').classList.contains('custom-theme-theme-trigger'),
    ).toBe(true)
    expect(document.head.textContent).toContain('.custom-theme-theme-trigger')
  })

  it('切换明暗和布局密度，并恢复持久化偏好', async () => {
    const firstRender = renderThemeFixture()
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()

    expect(readRenderedPreference()).toEqual({
      mode: 'light',
      density: 'default',
      appearance: 'light',
    })

    const themeTrigger = screen.getByRole('button', { name: '主题设置' })
    const themeIcon = themeTrigger.querySelector('svg[data-icon="theme"]')
    expect(themeIcon).toBeTruthy()
    expect(themeIcon?.getAttribute('viewBox')).toBe('0 0 21 21')
    fireEvent.click(themeTrigger)
    expect(screen.queryByText('跟随系统')).toBeNull()
    fireEvent.mouseEnter(themeTrigger)
    expect(await screen.findByText('跟随系统')).toBeTruthy()
    expect(screen.getByText('亮色主题')).toBeTruthy()
    expect(screen.getByText('暗黑主题')).toBeTruthy()
    expect(screen.getByText('默认布局')).toBeTruthy()
    expect(screen.getByText('紧凑布局')).toBeTruthy()
    expect(document.querySelectorAll('.ant-pro-layout-theme-selected-dot')).toHaveLength(2)
    expect(document.querySelectorAll('.ant-dropdown-menu-item-selected')).toHaveLength(0)

    fireEvent.click(screen.getByText('紧凑布局'))
    expect(readRenderedPreference().density).toBe('compact')

    await openThemeMenu()
    fireEvent.click(screen.getByText('默认布局'))
    expect(readRenderedPreference().density).toBe('default')

    await openThemeMenu()
    fireEvent.click(screen.getByText('暗黑主题'))
    expect(readRenderedPreference()).toEqual({
      mode: 'dark',
      density: 'default',
      appearance: 'dark',
    })

    await openThemeMenu()
    fireEvent.click(screen.getByText('紧凑布局'))
    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem(THEME_STORAGE_KEY) || '')).toEqual({
        mode: 'dark',
        density: 'compact',
      })
    })

    firstRender.unmount()
    renderThemeFixture()
    expect(readRenderedPreference()).toEqual({
      mode: 'dark',
      density: 'compact',
      appearance: 'dark',
    })
  })

  it('跟随系统模式会响应系统明暗变化', async () => {
    renderThemeFixture({ mode: 'auto', density: 'default' })
    expect(readRenderedPreference().appearance).toBe('light')
    await waitFor(() => expect(colorSchemeListeners.size).toBeGreaterThan(0))

    act(() => {
      prefersDark = true
      colorSchemeListeners.forEach((listener) => listener())
    })

    expect(readRenderedPreference().appearance).toBe('dark')
  })

  it('离开跟随系统后系统变色，再返回时直接提交实时主题', async () => {
    renderThemeFixture({ mode: 'light', density: 'default' })

    act(() => {
      prefersDark = true
      colorSchemeListeners.forEach((listener) => listener())
    })
    expect(readRenderedPreference().appearance).toBe('light')

    committedPreferences.length = 0
    await openThemeMenu()
    fireEvent.click(screen.getAllByRole('menuitem')[0])

    expect(readRenderedPreference()).toEqual({
      mode: 'auto',
      density: 'default',
      appearance: 'dark',
    })
    expect(
      committedPreferences
        .filter((preference) => preference.mode === 'auto')
        .map((preference) => preference.appearance),
    ).toEqual(['dark'])
  })

  it('悬停打开主题菜单时固定从主题按钮中心开始过渡', async () => {
    const startViewTransition = vi.fn((callback: () => void) => {
      callback()
      return {
        ready: Promise.resolve(),
        finished: new Promise(() => {}),
      }
    })
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: startViewTransition,
    })
    renderThemeFixture({ mode: 'light', density: 'default' })
    const themeTrigger = screen.getByRole('button', { name: '主题设置' })
    const triggerRect = vi.spyOn(themeTrigger, 'getBoundingClientRect').mockReturnValue({
      x: 940,
      y: 8,
      left: 940,
      top: 8,
      right: 980,
      bottom: 40,
      width: 40,
      height: 32,
      toJSON: () => ({}),
    })
    fireEvent.pointerEnter(themeTrigger, { clientX: 942, clientY: 10 })
    triggerRect.mockReturnValue({
      x: 900,
      y: 6,
      left: 900,
      top: 6,
      right: 940,
      bottom: 38,
      width: 40,
      height: 32,
      toJSON: () => ({}),
    })
    await openThemeMenu()
    fireEvent.click(screen.getAllByRole('menuitem')[2])

    const transitionStyle = await waitFor(() => {
      const styles = Array.from(document.querySelectorAll('style')).filter((item) =>
        item.textContent?.includes('::view-transition-new(zby-pro-layout-theme)') &&
        item.textContent.includes('@keyframes zby-theme-transition-reveal-'),
      )
      const style = styles[styles.length - 1]
      expect(style).toBeTruthy()
      return style
    })
    expect(transitionStyle?.textContent).toContain('circle(0px at 920px 22px)')
    expect(transitionStyle?.textContent).toMatch(
      /animation: zby-theme-transition-reveal-\d+ 520ms/,
    )

    transitionStyle?.remove()
  })

  it('shares the current theme through ProThemeProvider', () => {
    function Reader() {
      const current = useTheme()
      return <output data-testid="current-theme">{JSON.stringify(current)}</output>
    }

    function Harness() {
      const preference = useThemePreference({
        defaultValue: { mode: 'dark', density: 'compact' },
      })
      return (
        <ProThemeProvider value={preference}>
          <button type="button" onClick={() => preference.setMode('light')}>
            light
          </button>
          <Reader />
        </ProThemeProvider>
      )
    }

    render(
      <ZbyIntlProvider locale="zh-CN" fallbackLocale="zh-CN" resources={zbyProIntlResources}>
        <Harness />
      </ZbyIntlProvider>,
    )

    expect(screen.getByTestId('current-theme').textContent).toBe(
      JSON.stringify({ theme: 'dark', resolvedTheme: 'dark', density: 'compact' }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'light' }))

    expect(screen.getByTestId('current-theme').textContent).toBe(
      JSON.stringify({ theme: 'light', resolvedTheme: 'light', density: 'compact' }),
    )
  })

  it('throws when useTheme is used outside ProThemeProvider', () => {
    function Reader() {
      useTheme()
      return null
    }

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() => render(<Reader />)).toThrow(/ProThemeProvider/)
    consoleError.mockRestore()
  })
})

function ThemeFixture(props: {
  defaultValue?: ProThemePreference
}) {
  const preference = useThemePreference({
    defaultValue: props.defaultValue,
  })

  useLayoutEffect(() => {
    committedPreferences.push({
      ...preference.value,
      appearance: preference.appearance,
    })
  }, [preference.appearance, preference.value])

  return (
    <>
      <ProThemeSwitch
        value={preference.value}
        appearance={preference.appearance}
        onChange={preference.setValue}
      />
      <output data-testid="theme-preference">
        {JSON.stringify({ ...preference.value, appearance: preference.appearance })}
      </output>
    </>
  )
}

function renderThemeFixture(defaultValue?: ProThemePreference) {
  return render(
    <ZbyIntlProvider locale="zh-CN" fallbackLocale="zh-CN" resources={zbyProIntlResources}>
      <ThemeFixture defaultValue={defaultValue} />
    </ZbyIntlProvider>,
  )
}

async function openThemeMenu() {
  fireEvent.mouseEnter(screen.getByRole('button', { name: '主题设置' }))
  await waitFor(() => {
    const menu = screen.getByRole('menu')
    expect(menu.parentElement?.style.pointerEvents).not.toBe('none')
  })
}

function readRenderedPreference() {
  return JSON.parse(screen.getByTestId('theme-preference').textContent || '') as
    ProThemePreference & { appearance: 'light' | 'dark' }
}

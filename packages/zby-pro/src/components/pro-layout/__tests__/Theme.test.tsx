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

import { zbyProLocales } from '../../../locales'
import { ProThemeSwitch, useThemePreference } from '../theme'
import type { ProThemePreference } from '../theme'

let prefersDark = false
const colorSchemeListeners = new Set<() => void>()

beforeEach(() => {
  window.localStorage.clear()
  prefersDark = false
  colorSchemeListeners.clear()
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
  vi.restoreAllMocks()
})

describe('ProThemeSwitch', () => {
  it('切换明暗和布局密度，并恢复持久化偏好', async () => {
    const storageKey = 'pro-theme-switch-test'
    const firstRender = renderThemeFixture(storageKey)

    expect(readRenderedPreference()).toEqual({
      mode: 'light',
      density: 'default',
      appearance: 'light',
    })

    const themeTrigger = screen.getByRole('button', { name: '主题设置' })
    expect(themeTrigger.querySelector('svg[data-icon="theme"]')).toBeTruthy()
    fireEvent.click(themeTrigger)
    expect(screen.queryByText('跟随系统')).toBeNull()
    fireEvent.mouseEnter(themeTrigger)
    expect(await screen.findByText('跟随系统')).toBeTruthy()
    expect(screen.getByText('亮色主题')).toBeTruthy()
    expect(screen.getByText('暗黑主题')).toBeTruthy()
    expect(screen.getByText('默认布局')).toBeTruthy()
    expect(screen.getByText('紧凑布局')).toBeTruthy()
    expect(document.querySelectorAll('.zby-pro-layout-theme-selected-dot')).toHaveLength(2)
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
      expect(JSON.parse(window.localStorage.getItem(storageKey) || '')).toEqual({
        mode: 'dark',
        density: 'compact',
      })
    })

    firstRender.unmount()
    renderThemeFixture(storageKey)
    expect(readRenderedPreference()).toEqual({
      mode: 'dark',
      density: 'compact',
      appearance: 'dark',
    })
  })

  it('跟随系统模式会响应系统明暗变化', async () => {
    renderThemeFixture('pro-theme-auto-test', { mode: 'auto', density: 'default' })
    expect(readRenderedPreference().appearance).toBe('light')
    await waitFor(() => expect(colorSchemeListeners.size).toBeGreaterThan(0))

    act(() => {
      prefersDark = true
      colorSchemeListeners.forEach((listener) => listener())
    })

    expect(readRenderedPreference().appearance).toBe('dark')
  })
})

function ThemeFixture(props: {
  storageKey: string
  defaultValue?: ProThemePreference
}) {
  const preference = useThemePreference({
    storageKey: props.storageKey,
    defaultValue: props.defaultValue,
  })

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

function renderThemeFixture(storageKey: string, defaultValue?: ProThemePreference) {
  return render(
    <ZbyIntlProvider locale="zh-CN" fallbackLocale="zh-CN" resources={zbyProLocales}>
      <ThemeFixture storageKey={storageKey} defaultValue={defaultValue} />
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

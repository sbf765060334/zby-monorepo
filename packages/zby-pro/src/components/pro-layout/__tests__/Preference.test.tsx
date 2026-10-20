// @vitest-environment jsdom

import { useIntl } from '@zby/intl'
import { createRouterCore } from '@zby/router-core'
import { mergeLocales } from '@zby/ui'
import { ConfigProvider } from 'antd'
import antdEnUS from 'antd/locale/en_US'
import antdZhCN from 'antd/locale/zh_CN'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useContext } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import proEnUS from '../../../locales/en_US'
import proZhCN from '../../../locales/zh_CN'
import ReactRouterProLayout, { useLocale, useTheme } from '../index'
import type { ProLayoutRoute } from '../types'

const locales = [
  {
    key: 'zh-CN',
    label: '简体中文',
    pack: mergeLocales({
      antd: antdZhCN,
      packs: [proZhCN, { locale: 'zh-CN', app: { onlyZh: '仅中文' } }],
    }),
  },
  {
    key: 'en-US',
    label: 'English',
    pack: mergeLocales({ antd: antdEnUS, packs: [proEnUS] }),
  },
]

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(window, 'ResizeObserver', { configurable: true, value: ResizeObserverMock })
})

beforeEach(() => {
  window.localStorage.removeItem('zby-pro:theme-preference')
  window.localStorage.removeItem('zby-pro:locale-preference')
  window.localStorage.removeItem('zby-pro:theme-seed')
})

afterEach(cleanup)

describe('ProLayout theme and locale', () => {
  it('keeps the header switch, page setter, and antd locale on one state', async () => {
    renderLayout()

    expect(screen.getByTestId('intl-locale').textContent).toBe('zh-CN')
    expect(screen.getByTestId('layout-locale').textContent).toBe('zh-CN')
    expect(screen.getByTestId('antd-locale').textContent).toBe('zh-cn')
    expect(screen.getByTestId('theme').textContent).toBe('light/light/default')
    expect(document.documentElement.dataset.theme).toBe('light')

    fireEvent.click(screen.getByRole('button', { name: 'set-dark' }))
    await waitFor(() => {
      expect(screen.getByTestId('theme').textContent).toBe('dark/dark/default')
      expect(document.documentElement.dataset.theme).toBe('dark')
    })

    fireEvent.click(screen.getByRole('button', { name: 'set-compact' }))
    await waitFor(() => {
      expect(screen.getByTestId('theme').textContent).toBe('dark/dark/compact')
      expect(
        (document.querySelector('.ant-pro-layout') as HTMLElement).style.getPropertyValue(
          '--ant-pro-layout-header-height',
        ),
      ).toBe('33px')
    })

    fireEvent.click(screen.getByRole('button', { name: 'set-en' }))
    await waitFor(() => {
      expect(screen.getByTestId('intl-locale').textContent).toBe('en-US')
      expect(screen.getByTestId('layout-locale').textContent).toBe('en-US')
      expect(screen.getByTestId('antd-locale').textContent).toBe('en')
    })

    await openMenu(screen.getByRole('button', { name: 'Language' }))
    fireEvent.click(screen.getByText('简体中文'))
    await waitFor(() => {
      expect(screen.getByTestId('intl-locale').textContent).toBe('zh-CN')
      expect(screen.getByRole('button', { name: '语言设置' })).toBeTruthy()
    })
  })

  it('falls back to Chinese copy and ignores a locale outside the list', async () => {
    window.localStorage.setItem('zby-pro:locale-preference', 'fr-FR')
    renderLayout({ defaultLocale: 'en-US' })

    expect(screen.getByTestId('layout-locale').textContent).toBe('en-US')
    await waitFor(() => {
      expect(screen.getByTestId('fallback-copy').textContent).toBe('仅中文')
    })

    window.localStorage.removeItem('zby-pro:locale-preference')
    fireEvent.click(screen.getByRole('button', { name: 'set-fr' }))
    expect(screen.getByTestId('layout-locale').textContent).toBe('en-US')
    expect(window.localStorage.getItem('zby-pro:locale-preference')).toBeNull()
  })

  it('throws when useTheme or useLocale is used outside ProLayout', () => {
    function ThemeReader() {
      useTheme()
      return null
    }
    function LocaleReader() {
      useLocale()
      return null
    }

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() => render(<ThemeReader />)).toThrow(/ProLayout/)
    expect(() => render(<LocaleReader />)).toThrow(/ProLayout/)
    consoleError.mockRestore()
  })
})

function PreferencePage() {
  const intl = useIntl()
  const locale = useLocale()
  const theme = useTheme()
  const antdLocale = useContext(ConfigProvider.ConfigContext).locale

  return (
    <div data-testid="preference-page">
      <output data-testid="intl-locale">{intl.locale}</output>
      <output data-testid="layout-locale">{locale.locale}</output>
      <output data-testid="antd-locale">{antdLocale?.locale}</output>
      <output data-testid="theme">
        {`${theme.theme}/${theme.resolvedTheme}/${theme.density}`}
      </output>
      <button type="button" onClick={() => theme.setMode('dark')}>set-dark</button>
      <button type="button" onClick={() => theme.setDensity('compact')}>set-compact</button>
      <button type="button" onClick={() => locale.setLocale('en-US')}>set-en</button>
      <button type="button" onClick={() => locale.setLocale('fr-FR')}>set-fr</button>
      <output data-testid="fallback-copy">{intl.getMessage('app.onlyZh')}</output>
    </div>
  )
}

function renderLayout(options: { defaultLocale?: string } = {}) {
  const routes: ProLayoutRoute[] = [
    { path: '/preference', title: '偏好', element: PreferencePage },
  ]
  const router = createRouterCore<ProLayoutRoute>({
    routes,
    defaultRedirectPath: '/preference',
    storageAdapter: false,
  })

  return render(
    <MemoryRouter initialEntries={['/preference']}>
      <ReactRouterProLayout
        router={router}
        title="数字化平台"
        locales={locales}
        defaultLocale={options.defaultLocale ?? 'zh-CN'}
      />
    </MemoryRouter>,
  )
}

async function openMenu(trigger: HTMLElement) {
  fireEvent.mouseEnter(trigger)
  await waitFor(() => {
    expect(screen.getByRole('menu').parentElement?.style.pointerEvents).not.toBe('none')
  })
}

// @vitest-environment jsdom

import { ZbyIntlProvider } from '@zby/intl'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { zbyProLocales } from '../../../locales'
import { ProLocaleSwitch, useLocalePreference } from '../locale'

beforeEach(() => {
  window.localStorage.clear()
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
})

afterEach(cleanup)

describe('ProLocaleSwitch', () => {
  it('通过悬浮菜单在简体中文和 English 之间切换', async () => {
    const storageKey = 'pro-locale-switch-test'
    const firstRender = render(<LocaleFixture storageKey={storageKey} />)

    const trigger = screen.getByRole('button', { name: '语言设置' })
    expect(trigger.querySelector('.anticon-global')).toBeTruthy()
    fireEvent.click(trigger)
    expect(screen.queryByText('English')).toBeNull()

    await openLocaleMenu(trigger)
    expect(screen.getByText('简体中文')).toBeTruthy()
    expect(screen.getByText('English')).toBeTruthy()
    expect(document.querySelectorAll('.zby-pro-layout-locale-selected-dot')).toHaveLength(1)
    expect(document.querySelectorAll('.ant-dropdown-menu-item-selected')).toHaveLength(0)

    fireEvent.click(screen.getByText('English'))
    await waitFor(() => {
      expect(screen.getByTestId('locale').textContent).toBe('en-US')
      expect(screen.getByRole('button', { name: 'Language' })).toBeTruthy()
      expect(window.localStorage.getItem(storageKey)).toBe('en-US')
    })

    firstRender.unmount()
    render(<LocaleFixture storageKey={storageKey} />)
    expect(screen.getByTestId('locale').textContent).toBe('en-US')
    expect(screen.getByRole('button', { name: 'Language' })).toBeTruthy()

    await openLocaleMenu(screen.getByRole('button', { name: 'Language' }))
    fireEvent.click(screen.getByText('简体中文'))
    await waitFor(() => {
      expect(screen.getByTestId('locale').textContent).toBe('zh-CN')
      expect(screen.getByRole('button', { name: '语言设置' })).toBeTruthy()
      expect(window.localStorage.getItem(storageKey)).toBe('zh-CN')
    })
  })
})

function LocaleFixture(props: { storageKey: string }) {
  const preference = useLocalePreference({ storageKey: props.storageKey })
  const locale = preference.value

  return (
    <ZbyIntlProvider
      locale={locale}
      fallbackLocale="zh-CN"
      resources={zbyProLocales}
    >
      <ProLocaleSwitch value={locale} onChange={preference.setValue} />
      <output data-testid="locale">{locale}</output>
    </ZbyIntlProvider>
  )
}

async function openLocaleMenu(trigger: HTMLElement) {
  fireEvent.mouseEnter(trigger)
  await waitFor(() => {
    const menu = screen.getByRole('menu')
    expect(menu.parentElement?.style.pointerEvents).not.toBe('none')
  })
}

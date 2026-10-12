// @vitest-environment jsdom

import { ZbyIntlProvider } from '@zby/intl'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { zbyProIntlResources } from '../../../locale/intl-resources'
import { UserMenu } from '../user'

beforeEach(() => {
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

function renderMenu(name: string, onLogout = vi.fn()) {
  render(
    <ZbyIntlProvider locale="zh-CN" fallbackLocale="zh-CN" resources={zbyProIntlResources}>
      <UserMenu
        name={name}
        menus={[{ key: 'logout', label: '退出登录', onClick: onLogout }]}
      />
    </ZbyIntlProvider>,
  )
  return onLogout
}

describe('UserMenu', () => {
  it('uses the first character as the avatar and calls the clicked menu item', async () => {
    const onLogout = renderMenu('沈彬峰')
    const trigger = screen.getByRole('button', { name: /沈彬峰 用户菜单/ })

    expect(trigger.querySelector('.ant-pro-layout-user-menu-avatar')?.textContent).toBe('沈')
    expect(trigger.querySelector('.anticon-user')).toBeNull()

    fireEvent.mouseEnter(trigger)
    await waitFor(() => {
      expect(screen.getByRole('menu').parentElement?.style.pointerEvents).not.toBe('none')
    })
    fireEvent.click(screen.getByText('退出登录'))
    expect(onLogout).toHaveBeenCalledTimes(1)
  })

  it('uses the default icon when the name is empty', () => {
    render(
      <ZbyIntlProvider locale="en-US" fallbackLocale="en-US" resources={zbyProIntlResources}>
        <UserMenu name="" />
      </ZbyIntlProvider>,
    )

    const trigger = screen.getByRole('button', { name: /User menu/ })
    expect(trigger.querySelector('.anticon-user')).toBeTruthy()
    expect(trigger.querySelector('.ant-pro-layout-user-menu-name')).toBeNull()
    expect(trigger.textContent).toMatch(/~$/)
  })

  it('shows the greeting for the current hour and switches at the next boundary', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 12, 10, 59, 0))
    renderMenu('沈彬峰')
    expect(screen.getByText('上午好~')).toBeTruthy()

    act(() => {
      vi.setSystemTime(new Date(2026, 9, 12, 11, 0, 0))
      vi.advanceTimersByTime(60_000)
    })
    expect(screen.getByText('中午好~')).toBeTruthy()
    expect(screen.getByText('沈彬峰')).toBeTruthy()
    vi.useRealTimers()
  })

  it('uses the late-night greeting after 23:00', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 12, 23, 10, 0))
    renderMenu('沈彬峰')
    expect(screen.getByText('夜深了，早点休息~')).toBeTruthy()
    vi.useRealTimers()
  })
})

// @vitest-environment jsdom

import { ZbyIntlProvider } from '@zby/intl'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { zbyProIntlResources } from '../../../locale/intl-resources'
import { ProThemeSwitch, useThemeSeedPreference } from '../theme'
import type { ProThemePreference, ProThemeSeedPreference } from '../theme'

vi.mock('vanilla-jsoneditor', () => ({
  Mode: { text: 'text' },
  createJSONEditor: ({ props }: { props: { content?: { text?: string } } }) => {
    const state = { text: props.content?.text ?? '' }
    return {
      get: () => ({ text: state.text }),
      set: (content: { text: string }) => {
        state.text = content.text
      },
      destroy: async () => {},
      updateProps: () => {},
    }
  },
}))

const SEED_STORAGE_KEY = 'zby-pro:theme-seed'
const THEME_STORAGE_KEY = 'zby-pro:theme-preference'

const THEME: ProThemePreference = { mode: 'light', density: 'default' }

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
})

afterEach(() => {
  cleanup()
})

describe('theme seed drawer', () => {
  it('keeps edits as a draft until confirm, including reset', async () => {
    const view = renderSeedFixture()
    expect(window.localStorage.getItem(SEED_STORAGE_KEY)).toBeNull()
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()

    await openSeedDrawer('个性化')
    expect(confirmButton('确定').disabled).toBe(true)
    expect(screen.getByText('共 0 处修改')).toBeTruthy()
    expect(screen.getByText('页面示例')).toBeTruthy()
    await waitFor(() => {
      expect(screen.getByText('华北')).toBeTruthy()
    })
    expect(screen.queryByText('查看详情')).toBeNull()
    expect(screen.queryByText('销售额')).toBeNull()

    fireEvent.click(screen.getByText('风格概览'))
    expect(screen.getByText('容器背景')).toBeTruthy()
    expect(screen.getByRole('link', { name: '查看详情' })).toBeTruthy()
    fireEvent.click(screen.getByText('页面示例'))

    fireEvent.keyDown(fontSizeSlider(), { keyCode: 39, which: 39 })
    expect(confirmButton('确定').disabled).toBe(false)
    expect(screen.getByText('共 1 处修改')).toBeTruthy()
    expect(window.localStorage.getItem(SEED_STORAGE_KEY)).toBeNull()
    expect(readRenderedSeed().fontSize).toBe(14)

    fireEvent.click(screen.getByRole('button', { name: '恢复默认' }))
    expect(confirmButton('确定').disabled).toBe(true)
    expect(readRenderedSeed().fontSize).toBe(14)

    fireEvent.keyDown(fontSizeSlider(), { keyCode: 39, which: 39 })
    fireEvent.click(confirmButton('确定'))
    expect(readRenderedSeed().fontSize).toBe(15)
    expect(JSON.parse(window.localStorage.getItem(SEED_STORAGE_KEY) || '').fontSize).toBe(15)
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })

    view.unmount()
    renderSeedFixture()
    expect(readRenderedSeed().fontSize).toBe(15)

    await openSeedDrawer('个性化')
    expect(screen.getByText('共 1 处修改')).toBeTruthy()
    expect(confirmButton('确定').disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: '恢复默认' }))
    expect(screen.getByText('共 0 处修改')).toBeTruthy()
    expect(confirmButton('确定').disabled).toBe(false)
    expect(readRenderedSeed().fontSize).toBe(15)
    fireEvent.click(confirmButton('确定'))
    expect(readRenderedSeed().fontSize).toBe(14)
    expect(JSON.parse(window.localStorage.getItem(SEED_STORAGE_KEY) || '').fontSize).toBe(14)
    expect(JSON.parse(window.localStorage.getItem(SEED_STORAGE_KEY) || '').colorInfo).toBeNull()
  }, 40000)

  it('discards a draft when the drawer closes', async () => {
    renderSeedFixture()
    await openSeedDrawer('个性化')
    fireEvent.keyDown(fontSizeSlider(), { keyCode: 39, which: 39 })
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(window.localStorage.getItem(SEED_STORAGE_KEY)).toBeNull()
    expect(readRenderedSeed().fontSize).toBe(14)

    await openSeedDrawer('个性化')
    expect(confirmButton('确定').disabled).toBe(true)
  })

  it('keeps imported config text, including defaults and unknown fields', async () => {
    const view = renderSeedFixture()
    await openSeedDrawer('个性化')
    fireEvent.click(screen.getByRole('button', { name: '主题配置' }))
    await waitFor(() => {
      expect(configEditorText()).toContain('{')
    })
    expect(screen.getByText(/dark 和 compact/)).toBeTruthy()

    replaceConfigText('{\n  "fontSize": 14,\n  "extra": 1\n}')
    fireEvent.click(configConfirm())
    await finishModalMotion()
    expect(screen.getByText('共 0 处修改')).toBeTruthy()
    expect(confirmButton('确定').disabled).toBe(false)
    expect(screen.queryByText(/dark 和 compact/)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '主题配置' }))
    await waitFor(() => {
      expect(configEditorText()).toContain('fontSize')
    })
    expect(configEditorText()).toContain('14')
    expect(configEditorText()).toContain('extra')
    await dismissConfigDialog()

    fireEvent.click(screen.getByText('fontSize').parentElement?.querySelector('button') as HTMLButtonElement)
    fireEvent.click(screen.getByRole('button', { name: '主题配置' }))
    await waitFor(() => {
      expect(configEditorText()).toContain('"extra": 1')
    })
    expect(configEditorText()).not.toContain('fontSize')
    await dismissConfigDialog()

    fireEvent.click(screen.getByRole('button', { name: '恢复默认' }))
    fireEvent.click(screen.getByRole('button', { name: '主题配置' }))
    await waitFor(() => {
      expect(configEditorText().replace(/\s/g, '')).toBe('{}')
    })
    replaceConfigText('{')
    fireEvent.click(configConfirm())
    expect(screen.getByText('配置需要是 JSON 对象')).toBeTruthy()
    await dismissConfigDialog()

    fireEvent.keyDown(fontSizeSlider(), { keyCode: 39, which: 39 })
    fireEvent.click(screen.getByRole('button', { name: '主题配置' }))
    await waitFor(() => {
      expect(configEditorText()).toContain('15')
    })
    await dismissConfigDialog()
    fireEvent.click(confirmButton('确定'))
    expect(JSON.parse(window.localStorage.getItem(SEED_STORAGE_KEY) || '').config).toEqual({ fontSize: 15 })

    view.unmount()
    renderSeedFixture()
    await openSeedDrawer('个性化')
    fireEvent.click(screen.getByRole('button', { name: '主题配置' }))
    await waitFor(() => {
      expect(configEditorText()).toContain('"fontSize": 15')
    })
  }, 20000)

  it('uses English copy and ignores invalid stored fields', async () => {
    window.localStorage.setItem(SEED_STORAGE_KEY, JSON.stringify({
      colorPrimary: '#123456',
      fontSize: 40,
      colorInfo: 'red',
    }))
    renderSeedFixture('en-US')
    expect(readRenderedSeed().colorPrimary).toBe('#123456')
    expect(readRenderedSeed().fontSize).toBe(14)
    expect(readRenderedSeed().colorInfo).toBeNull()

    await openSeedDrawer('Customize')
    expect(screen.getByRole('button', { name: 'OK' })).toBeTruthy()
    expect(screen.getByText('Page sample')).toBeTruthy()
    expect(screen.getByText('2 changes')).toBeTruthy()
  })
})

function SeedFixture(props: { locale?: 'zh-CN' | 'en-US' }) {
  const preference = useThemeSeedPreference()
  return (
    <ZbyIntlProvider
      locale={props.locale || 'zh-CN'}
      fallbackLocale="zh-CN"
      resources={zbyProIntlResources}
    >
      <output data-testid="seed">{JSON.stringify(preference.value)}</output>
      <ProThemeSwitch
        appearance="light"
        value={THEME}
        onChange={() => {}}
        seed={preference.value}
        onSeedConfirm={preference.setValue}
      />
    </ZbyIntlProvider>
  )
}

function renderSeedFixture(locale?: 'zh-CN' | 'en-US') {
  return render(<SeedFixture locale={locale} />)
}

async function openSeedDrawer(name: string) {
  const triggerName = name === 'Customize' ? 'Theme settings' : '主题设置'
  fireEvent.mouseEnter(screen.getByRole('button', { name: triggerName }))
  await waitFor(() => {
    const menu = screen.getByRole('menu')
    expect(menu.parentElement?.style.pointerEvents).not.toBe('none')
  })
  fireEvent.click(screen.getByRole('menuitem', { name: new RegExp(name) }))
}

function confirmButton(name: string) {
  return screen.getByRole('button', {
    name: new RegExp(name.split('').join('\\s*')),
  }) as HTMLButtonElement
}

function configEditorText() {
  const host = document.querySelector('[class$="-theme-seed-config-editor"]') as ConfigEditorHost | null
  const content = host?.jsonEditor?.get()
  if (content && 'text' in content && typeof content.text === 'string')
    return content.text
  if (content && 'json' in content)
    return JSON.stringify(content.json)
  return ''
}

function replaceConfigText(value: string) {
  const host = document.querySelector('[class$="-theme-seed-config-editor"]') as ConfigEditorHost | null
  if (!host?.jsonEditor)
    throw new Error('config editor was not found')
  host.jsonEditor.set({ text: value })
}

interface ConfigEditorHost extends HTMLElement {
  jsonEditor?: {
    get: () => { text?: string, json?: unknown }
    set: (content: { text: string }) => void
  }
}

// jsdom 不会结束 CSS 动画。关掉弹窗后补一帧 animationend，destroyOnHidden 才能卸载。
async function finishModalMotion() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50))
  })
  await act(async () => {
    document.querySelectorAll('.ant-modal, .ant-modal-mask').forEach((node) => {
      node.dispatchEvent(new Event('animationend'))
      node.dispatchEvent(new Event('transitionend'))
    })
  })
}

async function dismissConfigDialog() {
  fireEvent.click(screen.getByRole('button', { name: /取\s*消/ }))
  await finishModalMotion()
}

function configConfirm() {
  const dialog = document.querySelector('[class$="-theme-seed-config-editor"]')?.closest('[role="dialog"]')
  if (!dialog)
    throw new Error('config dialog was not found')
  return within(dialog as HTMLElement).getByRole('button', {
    name: /确\s*定/,
  })
}

function fontSizeSlider() {
  const slider = screen.getAllByRole('slider').find((item) => item.getAttribute('aria-valuemax') === '20')
  if (!slider)
    throw new Error('font size slider was not found')
  return slider
}

function readRenderedSeed(): ProThemeSeedPreference {
  return JSON.parse(screen.getByTestId('seed').textContent || '')
}

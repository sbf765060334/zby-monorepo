// @vitest-environment jsdom

import 'fake-indexeddb/auto'

import { createCache, extractStyle, StyleProvider } from '@ant-design/cssinjs'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ZbyIntlProvider } from '@zby/intl'
import { ConfigProvider } from 'antd'
import * as React from 'react'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { zbyProIntlResources } from '../../../locale/intl-resources'
import ProViewManagement, {
  createIndexedDBProViewManagementAdapter,
  normalizeProViewManagementStorageState,
} from '..'
import type { ProViewManagementAdapter, ProViewManagementView } from '../interface'
import {
  normalizeCustomViews,
  normalizeSystemViews,
  resolveActiveView,
  resolveDirty,
  validateCreateViewName,
  validateRenameViewName,
} from '../utils'

const originalResizeObserver = globalThis.ResizeObserver
const originalMatchMedia = window.matchMedia

class TestResizeObserver implements ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', TestResizeObserver)
  window.matchMedia = vi.fn().mockImplementation((media: string) => ({
    matches: false,
    media,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia
})

afterAll(() => {
  vi.stubGlobal('ResizeObserver', originalResizeObserver)
  window.matchMedia = originalMatchMedia
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const validationMessages = {
  required: 'required',
  duplicated: 'duplicated',
  maxCustomViews: (count: number) => `max ${count}`,
}

const systemView: ProViewManagementView<{ keyword: string }> = {
  id: 'system-all',
  name: 'All records',
  scope: 'system',
  order: 0,
  snapshot: { keyword: '' },
}

const customView: ProViewManagementView<{ keyword: string }> = {
  id: 'custom-open',
  name: 'Open records',
  scope: 'custom',
  order: 0,
  snapshot: { keyword: 'open' },
}

function renderWithIntl(node: React.ReactElement, locale = 'en-US') {
  return render(
    <ZbyIntlProvider locale={locale} resources={zbyProIntlResources}>
      {node}
    </ZbyIntlProvider>,
  )
}

function createTestAdapter<TSnapshot>(): ProViewManagementAdapter<TSnapshot> {
  return {
    load: vi.fn().mockResolvedValue({ views: [], activeViewId: undefined }),
    update: vi.fn().mockResolvedValue(undefined),
  }
}

describe('ProViewManagement utilities', () => {
  it('normalizes scopes and orders views without mutating the input', () => {
    const views = [
      { ...customView, scope: 'system' as const, order: 2 },
      { ...systemView, order: 1 },
    ]

    const normalizedSystem = normalizeSystemViews(views)
    const normalizedCustom = normalizeCustomViews([
      { ...customView, order: 3 },
      { ...systemView, scope: 'system' as const },
      { ...customView, id: 'custom-first', name: 'First', order: 1 },
    ])

    expect(normalizedSystem.map((view) => view.id)).toEqual([
      'system-all',
      'custom-open',
    ])
    expect(normalizedSystem.every((view) => view.scope === 'system')).toBe(true)
    expect(normalizedCustom.map((view) => view.id)).toEqual([
      'custom-first',
      'custom-open',
    ])
    expect(normalizedCustom.map((view) => view.order)).toEqual([0, 1])
    expect(views[0].scope).toBe('system')
  })

  it('resolves active views and supports controlled or deep-comparison dirty state', () => {
    const compare = vi.fn((left: { keyword: string }, right: { keyword: string }) =>
      left.keyword === right.keyword,
    )

    expect(resolveActiveView('missing', [systemView], [customView])).toBe(systemView)
    expect(resolveActiveView(customView.id, [systemView], [customView])).toBe(customView)
    expect(resolveDirty(true, customView, { keyword: 'different' }, compare)).toBe(true)
    expect(compare).not.toHaveBeenCalled()
    expect(resolveDirty(undefined, customView, { keyword: 'open' }, compare)).toBe(false)
    expect(resolveDirty(undefined, customView, { keyword: 'closed' }, compare)).toBe(true)
    expect(compare).toHaveBeenCalledTimes(2)
  })

  it('validates trimmed names, duplicate names, and the custom view limit', () => {
    expect(
      validateCreateViewName(
        {
          customViews: [customView],
          maxCustomViews: 1,
          mode: 'create',
          name: 'New view',
          systemViews: [systemView],
        },
        validationMessages,
      ),
    ).toBe('max 1')
    expect(
      validateCreateViewName(
        {
          customViews: [],
          mode: 'create',
          name: ' All records ',
          systemViews: [systemView],
        },
        validationMessages,
      ),
    ).toBe('duplicated')
    expect(
      validateCreateViewName(
        {
          customViews: [],
          mode: 'create',
          name: ' New view ',
          systemViews: [systemView],
        },
        validationMessages,
      ),
    ).toBeUndefined()
    expect(
      validateRenameViewName(
        {
          customViews: [customView],
          name: ' Open records ',
          systemViews: [systemView],
          viewId: customView.id,
        },
        validationMessages,
      ),
    ).toBeUndefined()
    expect(
      validateRenameViewName(
        {
          customViews: [customView],
          name: ' All records ',
          systemViews: [systemView],
          viewId: customView.id,
        },
        validationMessages,
      ),
    ).toBe('duplicated')
  })
})

describe('ProViewManagement adapters', () => {
  it('persists views, ordering, active state, and instance isolation in IndexedDB', async () => {
    const adapter = createIndexedDBProViewManagementAdapter<{
      keyword: string
    }>()
    const firstInstance = `pro-view-management-test-${Date.now()}-a`
    const secondInstance = `${firstInstance}-b`
    const secondView = { ...customView, id: 'custom-closed', name: 'Closed records', order: 1 }

    await adapter.update(firstInstance, (current) => ({
      ...current,
      views: normalizeCustomViews([customView, secondView]),
    }))
    await adapter.update(secondInstance, (current) => ({
      ...current,
      views: normalizeCustomViews([{ ...customView, id: 'other-instance' }]),
    }))
    await adapter.update(firstInstance, (current) => ({
      ...current,
      views: normalizeCustomViews(
        current.views.map((view) =>
          view.id === customView.id
            ? {
                ...view,
                name: 'Open items',
                snapshot: { keyword: 'open-items' },
              }
            : view,
        ),
      ),
    }))
    await adapter.update(firstInstance, (current) => ({
      ...current,
      views: normalizeCustomViews(
        current.views.map((view) => ({
          ...view,
          order: view.id === secondView.id ? 0 : 1,
        })),
      ),
    }))
    await adapter.update(firstInstance, (current) => ({
      ...current,
      activeViewId: secondView.id,
    }))

    const firstState = await adapter.load(firstInstance)
    const secondState = await adapter.load(secondInstance)

    expect(firstState.views.map((view) => view.id)).toEqual([
      secondView.id,
      customView.id,
    ])
    expect(firstState.views[1]).toMatchObject({
      name: 'Open items',
      snapshot: { keyword: 'open-items' },
    })
    expect(firstState.views.map((view) => view.order)).toEqual([0, 1])
    expect(firstState.activeViewId).toBe(secondView.id)
    expect(secondState.views.map((view) => view.id)).toEqual(['other-instance'])

    await adapter.update(firstInstance, (current) => ({
      ...current,
      views: normalizeCustomViews(
        current.views.filter((view) => view.id !== secondView.id),
      ),
      activeViewId: undefined,
    }))
    expect((await adapter.load(firstInstance)).views.map((view) => view.id)).toEqual([
      customView.id,
    ])
  })

  it('loads after a queued update so a later reader sees the latest views', async () => {
    const adapter = createIndexedDBProViewManagementAdapter<{
      keyword: string
    }>()
    const instanceId = `pro-view-management-queue-${Date.now()}`
    const updatePromise = adapter.update(instanceId, (current) => ({
      ...normalizeProViewManagementStorageState(current),
      views: normalizeCustomViews([customView]),
      activeViewId: customView.id,
    }))
    const loaded = adapter.load(instanceId)

    await updatePromise
    expect((await loaded).views.map((view) => view.id)).toEqual([customView.id])
    expect((await loaded).activeViewId).toBe(customView.id)
  })

  it('keeps existing views when a later active-view update lands', async () => {
    const adapter = createIndexedDBProViewManagementAdapter<{
      keyword: string
    }>()
    const instanceId = `pro-view-management-field-${Date.now()}`

    await adapter.update(instanceId, (current) => ({
      ...current,
      views: normalizeCustomViews([customView]),
    }))
    await adapter.update(instanceId, (current) => ({
      ...current,
      activeViewId: customView.id,
    }))

    expect(await adapter.load(instanceId)).toEqual({
      views: normalizeCustomViews([customView]),
      activeViewId: customView.id,
    })
  })
})

describe('ProViewManagement component', () => {
  it('uses preloaded storage without calling adapter.load and applies a selected view', async () => {
    const adapter = createTestAdapter<{ keyword: string }>()
    const onApplyView = vi.fn()
    const onActiveViewChange = vi.fn()

    renderWithIntl(
      <ProViewManagement
        adapter={adapter}
        currentSnapshot={customView.snapshot}
        defaultSnapshot={systemView.snapshot}
        initialStorageState={{
          views: [customView],
          activeViewId: systemView.id,
        }}
        instanceId="preloaded-instance"
        onActiveViewChange={onActiveViewChange}
        onApplyView={onApplyView}
        systemViews={[systemView]}
      />,
    )

    expect(adapter.load).not.toHaveBeenCalled()
    const selector = document.querySelector('[role="combobox"]')!
    fireEvent.mouseDown(selector)

    await waitFor(() => expect(screen.getByText('Open records')).toBeTruthy())
    fireEvent.click(screen.getByText('Open records'))

    await waitFor(() => {
      expect(onActiveViewChange).toHaveBeenCalledWith(customView)
      expect(onApplyView).toHaveBeenCalledWith(customView)
      expect(vi.mocked(adapter.update)).toHaveBeenCalledWith(
        'preloaded-instance',
        expect.any(Function),
      )
      const recipe = vi.mocked(adapter.update).mock.calls[0]?.[1]
      expect(
        recipe?.({
          views: [customView],
          activeViewId: systemView.id,
        }),
      ).toMatchObject({
        activeViewId: customView.id,
      })
    })
  })

  it('renders loading and error states with localized labels', () => {
    const { container, rerender } = renderWithIntl(
      <ProViewManagement
        currentSnapshot={systemView.snapshot}
        defaultSnapshot={systemView.snapshot}
        instanceId="loading-instance"
        loading
        systemViews={[systemView]}
      />,
    )

    expect(container.querySelector('.ant-select-loading')).not.toBeNull()

    rerender(
      <ZbyIntlProvider locale="en-US" resources={zbyProIntlResources}>
        <ProViewManagement
          currentSnapshot={systemView.snapshot}
          defaultSnapshot={systemView.snapshot}
          instanceId="error-instance"
          loadError={new Error('load failed')}
          systemViews={[systemView]}
        />
      </ZbyIntlProvider>,
    )

    expect(container.querySelector('.ant-select-status-error')).not.toBeNull()
    expect(screen.getByLabelText('Failed to load views. Click to retry')).toBeTruthy()
  })

  it('registers styles through Ant Design CSS-in-JS', () => {
    const cache = createCache()

    renderWithIntl(
      <StyleProvider cache={cache}>
        <ConfigProvider>
          <ProViewManagement
            currentSnapshot={systemView.snapshot}
            defaultSnapshot={systemView.snapshot}
            initialStorageState={{ views: [], activeViewId: systemView.id }}
            instanceId="style-instance"
            systemViews={[systemView]}
          />
        </ConfigProvider>
      </StyleProvider>,
    )

    const styleText = extractStyle(cache)
    expect(styleText).toContain('.ant-pro-view-management')
    expect(styleText).toContain('pro-view-management-manager-list')
    expect(styleText).toContain('overflow-y:auto')
  })
})

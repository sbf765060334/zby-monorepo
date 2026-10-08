// @vitest-environment jsdom

import * as React from 'react'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { createProTableViewStore } from '../../store'
import { useProTableFullscreen } from '../useProTableFullscreen'

afterEach(() => {
  cleanup()
  document.body.style.overflow = ''
  document.body.style.paddingRight = ''
})

function Probe({
  moreFiltersOpen,
  viewStore,
}: {
  moreFiltersOpen: boolean
  viewStore: ReturnType<typeof createProTableViewStore>
}) {
  useProTableFullscreen({
    active: true,
    moreFiltersOpen,
    viewStore,
  })
  return null
}

describe('useProTableFullscreen', () => {
  it('locks body scroll while active and restores on unmount', () => {
    document.body.style.overflow = 'auto'
    const viewStore = createProTableViewStore()
    const { unmount } = render(<Probe moreFiltersOpen={false} viewStore={viewStore} />)

    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).toBe('auto')
  })

  it('exits fullscreen on Escape when no overlay is open', () => {
    const viewStore = createProTableViewStore()
    viewStore.getState().setFullscreenActive(true)
    render(<Probe moreFiltersOpen={false} viewStore={viewStore} />)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(viewStore.getState().fullscreenActive).toBe(false)
  })

  it('does not exit fullscreen when column settings are open', () => {
    const viewStore = createProTableViewStore()
    viewStore.getState().setFullscreenActive(true)
    viewStore.getState().setColumnsModalOpen(true)
    render(<Probe moreFiltersOpen={false} viewStore={viewStore} />)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(viewStore.getState().fullscreenActive).toBe(true)
  })

  it('does not exit fullscreen when more filters are open', () => {
    const viewStore = createProTableViewStore()
    viewStore.getState().setFullscreenActive(true)
    render(<Probe moreFiltersOpen viewStore={viewStore} />)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(viewStore.getState().fullscreenActive).toBe(true)
  })

  it('does not exit fullscreen when an antd dropdown overlay is open', () => {
    const viewStore = createProTableViewStore()
    viewStore.getState().setFullscreenActive(true)
    const dropdown = document.createElement('div')
    dropdown.className = 'ant-select-dropdown'
    document.body.append(dropdown)
    render(<Probe moreFiltersOpen={false} viewStore={viewStore} />)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(viewStore.getState().fullscreenActive).toBe(true)
    dropdown.remove()
  })
})

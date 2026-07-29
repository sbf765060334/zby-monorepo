// @vitest-environment jsdom

import { createCache, extractStyle, StyleProvider } from '@ant-design/cssinjs'
import { cleanup, render } from '@testing-library/react'
import * as React from 'react'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import ContentContainer from '../index'

const OriginalResizeObserver = globalThis.ResizeObserver

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverMock)
})

afterAll(() => {
  vi.stubGlobal('ResizeObserver', OriginalResizeObserver)
})

afterEach(cleanup)

describe('ContentContainer', () => {
  it('uses stack mode and a vertical ScrollArea by default', () => {
    const { container, getByText } = render(
      <ContentContainer header="Header" footer="Footer" gap={10}>
        <div>Content</div>
      </ContentContainer>,
    )

    const root = container.querySelector('.ant-content-container')!

    expect(root.classList.contains('ant-content-container-stack')).toBe(true)
    expect(root.querySelector('.ant-content-container-body.ant-scroll-area')).not.toBeNull()
    expect(root.querySelector('.ant-content-container-body-scroll-viewport')).not.toBeNull()
    expect(
      (root.querySelector('.ant-content-container-body-scroll-content') as HTMLElement).style.gap,
    ).toBe('10px')
    expect(getByText('Header')).not.toBeNull()
    expect(getByText('Footer')).not.toBeNull()
    expect(getByText('Content')).not.toBeNull()
  })

  it('uses a non-scrolling flex body in fill mode', () => {
    const { container } = render(
      <ContentContainer mode="fill">
        <div>Table</div>
      </ContentContainer>,
    )
    const root = container.querySelector('.ant-content-container')!
    const body = root.querySelector('.ant-content-container-body')!

    expect(root.classList.contains('ant-content-container-fill')).toBe(true)
    expect(body.classList.contains('ant-scroll-area')).toBe(false)
    expect(root.querySelector('.ant-scroll-area-viewport')).toBeNull()
  })

  it('supports spacing and semantic overrides without changing the height contract', () => {
    const cache = createCache()
    const { container } = render(
      <StyleProvider cache={cache}>
        <ContentContainer
          mode="fill"
          padding={false}
          gap={6}
          classNames={{ root: 'custom-root', body: 'custom-body' }}
          styles={{ root: { background: 'red' }, content: { paddingInline: 12 } }}
        >
          Content
        </ContentContainer>
      </StyleProvider>,
    )
    const root = container.querySelector<HTMLElement>('.ant-content-container')!
    const content = root.querySelector<HTMLElement>('.ant-content-container-content')!
    const body = root.querySelector<HTMLElement>('.ant-content-container-body')!
    const styleText = extractStyle(cache)

    expect(root.classList.contains('custom-root')).toBe(true)
    expect(body.classList.contains('custom-body')).toBe(true)
    expect(root.style.background).toBe('red')
    expect(content.style.padding).toBe('0px')
    expect(content.style.paddingInline).toBe('12px')
    expect(body.style.gap).toBe('6px')
    expect(styleText).toContain('height:100%')
    expect(styleText).toContain('min-height:0')
    expect(styleText).toContain('flex:1')
  })
})

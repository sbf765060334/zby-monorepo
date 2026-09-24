// @vitest-environment jsdom

import { createCache, extractStyle, StyleProvider } from '@ant-design/cssinjs'
import { cleanup, render } from '@testing-library/react'
import { ConfigProvider } from 'antd'
import * as React from 'react'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import ProLayoutContentContainer from '../content-container'
import type {
  ProLayoutContentContainerItemConfig,
  ProLayoutContentContainerItemProps,
  ProLayoutContentContainerProps,
} from '../content-container'

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

describe('ProLayoutContentContainer', () => {
  it('uses a fill Card by default without a Card header or breadcrumb', () => {
    const { container, getByText } = render(
      <ProLayoutContentContainer>Table</ProLayoutContentContainer>,
    )
    const root = container.querySelector('.ant-pro-layout-content-container')!
    const body = root.querySelector('.ant-pro-layout-content-container-body')!
    const item = root.querySelector('.ant-pro-layout-content-container-item')!

    expect(root.classList.contains('ant-pro-layout-content-container-fill')).toBe(true)
    expect(body.classList.contains('ant-scroll-area')).toBe(false)
    expect(item.classList.contains('ant-pro-layout-content-container-item-fill')).toBe(true)
    expect(item.classList.contains('ant-card')).toBe(true)
    expect(root.querySelector('.ant-card-head')).toBeNull()
    expect(root.querySelector('[class*="breadcrumb"]')).toBeNull()
    expect(getByText('Table')).not.toBeNull()
  })

  it('uses native body scrolling in explicit stack mode without wrapping children in a Card', () => {
    const { container } = render(
      <ProLayoutContentContainer mode="stack">
        <section>First</section>
        <section>Second</section>
      </ProLayoutContentContainer>,
    )
    const root = container.querySelector('.ant-pro-layout-content-container')!
    const body = root.querySelector('.ant-pro-layout-content-container-body')!

    expect(root.classList.contains('ant-pro-layout-content-container-stack')).toBe(true)
    expect(body.classList.contains('ant-scroll-area')).toBe(false)
    expect(body.children).toHaveLength(2)
    expect(root.querySelector('[class*="body-scroll-"]')).toBeNull()
    expect(root.querySelector('.ant-card')).toBeNull()
  })

  it('defaults items to stack mode and renders each item as a Card', () => {
    const { container, getByText } = render(
      <ProLayoutContentContainer
        items={[
          { key: 'first', children: 'First item' },
          { key: 'second', children: 'Second item' },
        ]}
      />,
    )
    const root = container.querySelector('.ant-pro-layout-content-container')!

    expect(root.classList.contains('ant-pro-layout-content-container-stack')).toBe(true)
    expect(root.querySelectorAll('.ant-pro-layout-content-container-item')).toHaveLength(2)
    expect(root.querySelector('.ant-pro-layout-content-container-body.ant-scroll-area')).toBeNull()
    expect(getByText('First item')).not.toBeNull()
    expect(getByText('Second item')).not.toBeNull()
  })

  it('skips Card work when stable item inputs survive a container rerender', () => {
    const resolveClassNames = vi.fn(() => ({ root: 'stable-item' }))
    const items: ProLayoutContentContainerItemConfig[] = [
      {
        key: 'stable',
        children: 'Stable item',
        classNames: resolveClassNames,
      },
    ]
    const view = render(<ProLayoutContentContainer data-version="first" items={items} />)
    const initialResolutionCount = resolveClassNames.mock.calls.length

    view.rerender(<ProLayoutContentContainer data-version="second" items={items} />)

    expect(initialResolutionCount).toBeGreaterThan(0)
    expect(resolveClassNames).toHaveBeenCalledTimes(initialResolutionCount)

    const updatedItems: ProLayoutContentContainerItemConfig[] = [
      { ...items[0], children: 'Updated item' },
    ]
    view.rerender(<ProLayoutContentContainer data-version="third" items={updatedItems} />)

    expect(view.getByText('Updated item')).not.toBeNull()
    expect(resolveClassNames.mock.calls.length).toBeGreaterThan(initialResolutionCount)
  })

  it('lets explicit Card body styles override the shared body padding', () => {
    const { container } = render(
      <ProLayoutContentContainer
        itemBodyPadding={false}
        itemProps={{
          styles: {
            body: {
              padding: 12,
              backgroundColor: 'rgb(1, 2, 3)',
            },
          },
        }}
      >
        Content
      </ProLayoutContentContainer>,
    )
    const cardBody = container.querySelector<HTMLElement>('.ant-card-body')!

    expect(cardBody.style.padding).toBe('12px')
    expect(cardBody.style.backgroundColor).toBe('rgb(1, 2, 3)')
  })

  it('renders an end aside with its own native scroll container and width contract', () => {
    const { container } = render(
      <ProLayoutContentContainer
        mode="stack"
        aside={<nav>Filters</nav>}
        asidePosition="end"
        asideWidth={280}
        asideClassName="custom-aside"
      >
        Results
      </ProLayoutContentContainer>,
    )
    const root = container.querySelector('.ant-pro-layout-content-container')!
    const content = root.querySelector('.ant-pro-layout-content-container-content')!
    const aside = root.querySelector<HTMLElement>('.ant-pro-layout-content-container-aside')!

    expect(root.classList.contains('ant-pro-layout-content-container-with-aside')).toBe(true)
    expect(root.classList.contains('ant-pro-layout-content-container-aside-end')).toBe(true)
    expect(content.lastElementChild).toBe(aside)
    expect(aside.classList.contains('custom-aside')).toBe(true)
    expect(aside.style.width).toBe('280px')
    expect(aside.style.flexBasis).toBe('280px')
    const asideScroll = aside.querySelector('.ant-pro-layout-content-container-aside-scroll')!

    expect(asideScroll.tagName).toBe('DIV')
    expect(asideScroll.classList.contains('ant-scroll-area')).toBe(false)
    expect(aside.querySelector('[class*="aside-scroll-viewport"]')).toBeNull()
  })

  it('moves stack padding to native scroll panes without changing fill padding', () => {
    const stackView = render(
      <ProLayoutContentContainer
        mode="stack"
        padding={24}
        gap={8}
        aside="Filters"
        asidePosition="end"
      >
        Results
      </ProLayoutContentContainer>,
    )
    const stackContent = stackView.container.querySelector<HTMLElement>(
      '.ant-pro-layout-content-container-content',
    )!
    const stackBody = stackView.container.querySelector<HTMLElement>(
      '.ant-pro-layout-content-container-body',
    )!
    const stackAside = stackView.container.querySelector<HTMLElement>(
      '.ant-pro-layout-content-container-aside',
    )!

    expect(stackContent.style.padding).toBe('0px')
    expect(stackContent.style.gap).toBe('8px')
    expect(stackBody.style.padding).toBe('24px')
    expect(stackBody.style.paddingInlineEnd).toBe('0px')
    expect(stackAside.style.padding).toBe('24px')
    expect(stackAside.style.paddingInlineStart).toBe('0px')

    stackView.unmount()

    const fillView = render(
      <ProLayoutContentContainer mode="fill" padding={24}>
        Content
      </ProLayoutContentContainer>,
    )
    const fillContent = fillView.container.querySelector<HTMLElement>(
      '.ant-pro-layout-content-container-content',
    )!
    const fillBody = fillView.container.querySelector<HTMLElement>(
      '.ant-pro-layout-content-container-body',
    )!

    expect(fillContent.style.padding).toBe('24px')
    expect(fillBody.style.padding).toBe('')
  })

  it('renders header and footer semantic overrides without breadcrumb markup', () => {
    const { container, getByText } = render(
      <ProLayoutContentContainer
        header={<div>Toolbar</div>}
        footer={<button type="button">Save</button>}
        footerClassName="custom-footer"
        footerStyle={{ minHeight: 48 }}
      >
        Content
      </ProLayoutContentContainer>,
    )
    const root = container.querySelector('.ant-pro-layout-content-container')!
    const footer = root.querySelector<HTMLElement>('.ant-pro-layout-content-container-footer')!

    expect(root.classList.contains('ant-pro-layout-content-container-with-footer')).toBe(true)
    expect(root.querySelector('.ant-pro-layout-content-container-header-content')).not.toBeNull()
    expect(root.querySelector('[class*="breadcrumb"]')).toBeNull()
    expect(footer.classList.contains('custom-footer')).toBe(true)
    expect(footer.style.minHeight).toBe('48px')
    expect(getByText('Toolbar')).not.toBeNull()
    expect(getByText('Save')).not.toBeNull()
  })

  it('registers the full-height chain, sticky footer and desktop-only aside styles', () => {
    const cache = createCache()

    render(
      <StyleProvider cache={cache}>
        <ConfigProvider
          theme={{
            cssVar: {
              key: 'content-container-test',
              prefix: 'zby-content-container-test',
            },
          }}
        >
          <ProLayoutContentContainer aside="Aside" footer="Footer">
            Content
          </ProLayoutContentContainer>
        </ConfigProvider>
      </StyleProvider>,
    )

    const styleText = extractStyle(cache)

    expect(styleText).toContain('ant-pro-layout-content-container')
    expect(styleText).toContain('height:100%')
    expect(styleText).toContain('min-height:0')
    expect(styleText).toContain('position:sticky')
    expect(styleText).toContain('overflow:auto')
    expect(styleText).not.toContain('scrollbar-gutter')
    expect(styleText).toMatch(
      /ant-pro-layout-content-container[^}]*background:var\(--zby-content-container-test-color-bg-layout\)/,
    )
    expect(styleText).not.toMatch(/@media\s*\(max-width:\s*960px\)/)
  })

  it('keeps breadcrumb, Card title and Card body scrolling out of the public API', () => {
    const supportsBreadcrumb: 'breadcrumb' extends keyof ProLayoutContentContainerProps
      ? true
      : false = false
    const supportsTitle: 'title' extends keyof ProLayoutContentContainerItemProps
      ? true
      : false = false
    const supportsBodyScrollable: 'bodyScrollable' extends keyof ProLayoutContentContainerItemProps
      ? true
      : false = false
    const supportsTabProps: 'tabProps' extends keyof ProLayoutContentContainerItemProps
      ? true
      : false = false

    expect(supportsBreadcrumb).toBe(false)
    expect(supportsTitle).toBe(false)
    expect(supportsBodyScrollable).toBe(false)
    expect(supportsTabProps).toBe(false)
  })
})

// @vitest-environment jsdom

import { createCache, extractStyle, StyleProvider } from '@ant-design/cssinjs'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { ConfigProvider } from 'antd'
import * as React from 'react'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import ScrollArea from '../index'

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

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

function mockScrollMetrics(
  element: HTMLElement,
  metrics: Partial<{
    clientWidth: number
    clientHeight: number
    scrollWidth: number
    scrollHeight: number
    scrollLeft: number
    scrollTop: number
  }>,
) {
  Object.keys(metrics).forEach((key) => {
    Object.defineProperty(element, key, {
      configurable: true,
      get: () => metrics[key as keyof typeof metrics],
      set: (nextValue) => {
        metrics[key as keyof typeof metrics] = nextValue as number
      },
    })
  })
}

describe('ScrollArea', () => {
  it('renders root, viewport, content and the default vertical track immediately', () => {
    const { container } = render(
      <ScrollArea>
        <div>content</div>
      </ScrollArea>,
    )

    expect(container.querySelector('.ant-scroll-area')).not.toBeNull()
    expect(container.querySelector('.ant-scroll-area-viewport')).not.toBeNull()
    expect(container.querySelector('.ant-scroll-area-content')).not.toBeNull()
    expect(container.querySelector('.ant-scroll-area-track-vertical')).not.toBeNull()
  })

  it('keeps the hover track mounted before any scroll event', () => {
    const cache = createCache()
    const { container } = render(
      <StyleProvider cache={cache}>
        <ScrollArea scrollbar="hover" />
      </StyleProvider>,
    )

    const styleText = extractStyle(cache)

    expect(container.querySelector('.ant-scroll-area-track-vertical')).not.toBeNull()
    expect(styleText).toContain('scrollbar-hover:hover')
    expect(styleText).toContain(':not(:has(> .ant-scroll-area-thumb))')
    expect(styleText).toContain('visibility:hidden')
    expect(styleText).toMatch(/scroll-area-track\{[^}]*background:transparent/)
  })

  it('keeps the thumb hit target 4px larger than the configured track size', () => {
    const cache = createCache()
    const { container } = render(
      <StyleProvider cache={cache}>
        <ConfigProvider theme={{ components: { ScrollArea: { trackSize: 20 } } }}>
          <ScrollArea direction="both" scrollbar="always" />
        </ConfigProvider>
      </StyleProvider>,
    )

    const root = container.querySelector<HTMLElement>('.ant-scroll-area')!
    const styleText = extractStyle(cache)

    expect(root.style.getPropertyValue('--zby-scroll-area-track-size')).toBe('20px')
    expect(styleText).toContain('height:calc(var(--zby-scroll-area-track-size) + 4px)')
    expect(styleText).toContain('width:calc(var(--zby-scroll-area-track-size) + 4px)')
    expect(styleText).not.toContain('min-width:44px')
    expect(styleText).not.toContain('min-height:44px')
  })

  it('insets horizontal and vertical tracks 2px from the outer container edges', () => {
    const cache = createCache()

    render(
      <StyleProvider cache={cache}>
        <ScrollArea direction="both" scrollbar="always" />
      </StyleProvider>,
    )

    const styleText = extractStyle(cache)

    expect(styleText).toContain('margin-block-end:2px')
    expect(styleText).toContain('margin-inline-end:2px')
  })

  it('normalizes scrollbar visibility options into stable root classes', () => {
    const { container, rerender } = render(
      <ScrollArea scrollbar={['hover', 'scrolling', 'hover']} />,
    )
    const root = container.querySelector('.ant-scroll-area')!

    expect(root.classList.contains('ant-scroll-area-scrollbar-hover')).toBe(true)
    expect(root.classList.contains('ant-scroll-area-scrollbar-scrolling')).toBe(true)

    rerender(<ScrollArea scrollbar />)
    expect(root.classList.contains('ant-scroll-area-scrollbar-always')).toBe(true)

    rerender(<ScrollArea scrollbar={false} />)
    expect(root.classList.contains('ant-scroll-area-scrollbar-none')).toBe(true)
  })

  it('uses an imperative scrolling class without updating component metrics', () => {
    const viewportRef = React.createRef<HTMLDivElement>()
    const { container } = render(
      <ScrollArea scrollbar="scrolling" viewportRef={viewportRef}>
        <div style={{ height: 800 }} />
      </ScrollArea>,
    )
    const root = container.querySelector('.ant-scroll-area')!
    const track = container.querySelector('.ant-scroll-area-track-vertical')

    mockScrollMetrics(viewportRef.current!, {
      clientHeight: 100,
      scrollHeight: 800,
      scrollTop: 10,
    })
    fireEvent.scroll(viewportRef.current!)

    expect(root.classList.contains('ant-scroll-area-scrolling')).toBe(true)
    expect(track).not.toBeNull()
  })

  it('renders only the tracks enabled by direction', () => {
    const { container, rerender } = render(<ScrollArea direction="horizontal" scrollbar="always" />)

    expect(container.querySelector('.ant-scroll-area-track-horizontal')).not.toBeNull()
    expect(container.querySelector('.ant-scroll-area-track-vertical')).toBeNull()

    rerender(<ScrollArea direction="both" scrollbar="always" />)
    expect(container.querySelector('.ant-scroll-area-track-horizontal')).not.toBeNull()
    expect(container.querySelector('.ant-scroll-area-track-vertical')).not.toBeNull()
  })

  it('uses a native viewport and omits custom tracks when nativeScrollbar is enabled', () => {
    const { container } = render(<ScrollArea nativeScrollbar direction="both" />)
    const root = container.querySelector('.ant-scroll-area')!
    const viewport = container.querySelector<HTMLElement>('.ant-scroll-area-viewport')!

    expect(root.classList.contains('ant-scroll-area-native')).toBe(true)
    expect(viewport.hasAttribute('data-radix-scroll-area-viewport')).toBe(false)
    expect(container.querySelector('.ant-scroll-area-track')).toBeNull()
  })

  it('generates native scrollbar hiding styles and consumes component token overrides', () => {
    const cache = createCache()

    const { container } = render(
      <StyleProvider cache={cache}>
        <ConfigProvider
          theme={{
            components: {
              ScrollArea: {
                trackSize: 10,
                thumbBg: '#123456',
                thumbHoverBg: '#654321',
                zIndex: 99,
              },
            },
          }}
        >
          <ScrollArea />
        </ConfigProvider>
      </StyleProvider>,
    )

    const root = container.querySelector<HTMLElement>('.ant-scroll-area')!
    const styleText = extractStyle(cache)
    expect(styleText).toContain('scrollbar-width:none')
    expect(styleText).toContain('::-webkit-scrollbar')
    expect(styleText).toContain('width:var(--zby-scroll-area-track-size)')
    expect(styleText).toContain('background:var(--zby-scroll-area-thumb-bg)')
    expect(styleText).toContain('background:var(--zby-scroll-area-thumb-hover-bg)')
    expect(styleText).toContain('z-index:var(--zby-scroll-area-z-index)')
    expect(root.style.getPropertyValue('--zby-scroll-area-track-size')).toBe('10px')
    expect(root.style.getPropertyValue('--zby-scroll-area-thumb-bg')).toBe('#123456')
    expect(root.style.getPropertyValue('--zby-scroll-area-thumb-hover-bg')).toBe('#654321')
    expect(root.style.getPropertyValue('--zby-scroll-area-z-index')).toBe('99')
  })

  it('uses ConfigProvider prefixCls for DOM classes without renaming component variables', () => {
    const { container } = render(
      <ConfigProvider prefixCls="custom">
        <ScrollArea />
      </ConfigProvider>,
    )

    const root = container.querySelector<HTMLElement>('.custom-scroll-area')!

    expect(root).not.toBeNull()
    expect(root.style.getPropertyValue('--zby-scroll-area-track-size')).not.toBe('')
    expect(root.style.getPropertyValue('--custom-scroll-area-track-size')).toBe('')
  })

  it('isolates component token variables between nested cssVar ConfigProviders', () => {
    const cache = createCache()
    const { getByTestId } = render(
      <StyleProvider cache={cache}>
        <ConfigProvider theme={{ cssVar: { prefix: 'zby-test' } }}>
          <ScrollArea data-testid="default-scroll-area" />
          <ConfigProvider
            theme={{
              components: {
                ScrollArea: {
                  trackSize: 12,
                  thumbBg: '#123456',
                  thumbHoverBg: '#654321',
                  zIndex: 88,
                },
              },
            }}
          >
            <ScrollArea data-testid="custom-scroll-area" />
          </ConfigProvider>
        </ConfigProvider>
      </StyleProvider>,
    )

    const defaultScrollArea = getByTestId('default-scroll-area')
    const customScrollArea = getByTestId('custom-scroll-area')
    const styleText = extractStyle(cache)

    expect(defaultScrollArea.style.getPropertyValue('--zby-scroll-area-track-size')).toBe('8px')
    expect(customScrollArea.style.getPropertyValue('--zby-scroll-area-track-size')).toBe('12px')
    expect(customScrollArea.style.getPropertyValue('--zby-scroll-area-thumb-bg')).toBe('#123456')
    expect(customScrollArea.style.getPropertyValue('--zby-scroll-area-thumb-hover-bg')).toBe(
      '#654321',
    )
    expect(customScrollArea.style.getPropertyValue('--zby-scroll-area-z-index')).toBe('88')
    expect(styleText).toContain('width:var(--zby-scroll-area-track-size)')
  })

  it('maps a vertical wheel to horizontal scrolling by default', () => {
    const viewportRef = React.createRef<HTMLDivElement>()
    render(<ScrollArea direction="horizontal" scrollbar={false} viewportRef={viewportRef} />)

    mockScrollMetrics(viewportRef.current!, {
      clientWidth: 200,
      clientHeight: 100,
      scrollWidth: 800,
      scrollHeight: 100,
      scrollLeft: 0,
      scrollTop: 0,
    })
    fireEvent.wheel(viewportRef.current!, { deltaY: 120, deltaX: 0 })

    expect(viewportRef.current?.scrollLeft).toBe(120)
  })

  it('normalizes line-based wheel deltas and releases wheel events at the horizontal edge', () => {
    const viewportRef = React.createRef<HTMLDivElement>()
    render(<ScrollArea direction="horizontal" scrollbar={false} viewportRef={viewportRef} />)

    mockScrollMetrics(viewportRef.current!, {
      clientWidth: 200,
      clientHeight: 100,
      scrollWidth: 800,
      scrollHeight: 100,
      scrollLeft: 0,
      scrollTop: 0,
    })

    const movingEvent = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 3,
      deltaMode: WheelEvent.DOM_DELTA_LINE,
    })
    viewportRef.current!.dispatchEvent(movingEvent)

    expect(viewportRef.current?.scrollLeft).toBe(48)
    expect(movingEvent.defaultPrevented).toBe(true)

    Object.defineProperty(viewportRef.current!, 'scrollLeft', {
      configurable: true,
      get: () => 600,
      set: () => undefined,
    })
    const edgeEvent = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 120,
    })
    viewportRef.current!.dispatchEvent(edgeEvent)

    expect(edgeEvent.defaultPrevented).toBe(false)
  })

  it('keeps wheel behavior native when requested', () => {
    const viewportRef = React.createRef<HTMLDivElement>()
    render(
      <ScrollArea
        direction="horizontal"
        scrollbar={false}
        viewportRef={viewportRef}
        wheelBehavior="native"
      />,
    )

    mockScrollMetrics(viewportRef.current!, {
      clientWidth: 200,
      clientHeight: 100,
      scrollWidth: 800,
      scrollHeight: 100,
      scrollLeft: 0,
      scrollTop: 0,
    })
    fireEvent.wheel(viewportRef.current!, { deltaY: 120, deltaX: 0 })

    expect(viewportRef.current?.scrollLeft).toBe(0)
  })

  it('does not map wheel events emitted by a nested ScrollArea with another prefix', () => {
    const outerRef = React.createRef<HTMLDivElement>()
    const innerRef = React.createRef<HTMLDivElement>()
    render(
      <ScrollArea direction="horizontal" scrollbar={false} viewportRef={outerRef}>
        <ScrollArea
          prefixCls="inner-scroll-area"
          direction="vertical"
          scrollbar={false}
          viewportRef={innerRef}
        />
      </ScrollArea>,
    )

    mockScrollMetrics(outerRef.current!, {
      clientWidth: 200,
      clientHeight: 100,
      scrollWidth: 800,
      scrollHeight: 100,
      scrollLeft: 0,
      scrollTop: 0,
    })
    mockScrollMetrics(innerRef.current!, {
      clientWidth: 60,
      clientHeight: 100,
      scrollWidth: 60,
      scrollHeight: 400,
      scrollLeft: 0,
      scrollTop: 0,
    })
    fireEvent.wheel(innerRef.current!, { deltaY: 120, deltaX: 0 })

    expect(outerRef.current?.scrollLeft).toBe(0)
  })

  it('supports semantic callbacks, viewport props and both public refs', () => {
    const rootRef = React.createRef<HTMLDivElement>()
    const viewportRef = React.createRef<HTMLDivElement>()
    const viewportPropsRef = React.createRef<HTMLDivElement>()
    const onScroll = vi.fn()
    const { container } = render(
      <ScrollArea
        ref={rootRef}
        direction="horizontal"
        viewportRef={viewportRef}
        classNames={({ props }) => ({ root: `root-${props.direction}` })}
        styles={{ root: { height: 120 }, content: { minWidth: 300 } }}
        viewportProps={{
          ref: viewportPropsRef,
          className: 'custom-viewport',
          onScroll,
        }}
      />,
    )

    fireEvent.scroll(viewportRef.current!)

    expect(container.querySelector('.root-horizontal')).toBe(rootRef.current)
    expect(viewportRef.current).toBe(viewportPropsRef.current)
    expect(container.querySelector('.custom-viewport')).toBe(viewportRef.current)
    expect(container.querySelector<HTMLElement>('.root-horizontal')?.style.height).toBe('120px')
    expect(container.querySelector<HTMLElement>('.ant-scroll-area-content')?.style.minWidth).toBe(
      '300px',
    )
    expect(onScroll).toHaveBeenCalledTimes(1)
  })

  it('uses normalized RTL direction for horizontal wheel mapping', () => {
    const viewportRef = React.createRef<HTMLDivElement>()
    const { container } = render(
      <ConfigProvider direction="rtl">
        <ScrollArea direction="horizontal" scrollbar={false} viewportRef={viewportRef} />
      </ConfigProvider>,
    )

    mockScrollMetrics(viewportRef.current!, {
      clientWidth: 200,
      clientHeight: 100,
      scrollWidth: 800,
      scrollHeight: 100,
      scrollLeft: 0,
      scrollTop: 0,
    })
    fireEvent.wheel(viewportRef.current!, { deltaY: 120, deltaX: 0 })

    expect(container.querySelector('.ant-scroll-area')?.getAttribute('dir')).toBe('rtl')
    expect(viewportRef.current?.scrollLeft).toBe(-120)
  })
})

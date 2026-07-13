// @vitest-environment jsdom

import { createCache, extractStyle, StyleProvider } from '@ant-design/cssinjs'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { ConfigProvider } from 'antd'
import * as React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import ScrollArea from './index'
import { clampScrollOffset, getThumbOffset, getThumbSize } from './utils'

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

async function fireScroll(element: HTMLElement) {
  act(() => {
    fireEvent.scroll(element)
  })
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 24))
  })
}

describe('ScrollArea', () => {
  it('renders the root, viewport and content structure', () => {
    const { container } = render(
      <ScrollArea>
        <div>content</div>
      </ScrollArea>,
    )

    expect(container.querySelector('.ant-scroll-area')).not.toBeNull()
    expect(container.querySelector('.ant-scroll-area-viewport')).not.toBeNull()
    expect(container.querySelector('.ant-scroll-area-content')).not.toBeNull()
  })

  it('normalizes scrollbar visibility options', () => {
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

  it('shows and clears the scrolling state', () => {
    vi.useFakeTimers()
    const viewportRef = React.createRef<HTMLDivElement>()
    const { container } = render(
      <ScrollArea direction="horizontal" scrollbar="scrolling" viewportRef={viewportRef} />,
    )
    const root = container.querySelector('.ant-scroll-area')!

    act(() => fireEvent.scroll(viewportRef.current!))
    expect(root.classList.contains('ant-scroll-area-scrolling')).toBe(true)

    act(() => vi.advanceTimersByTime(1200))
    expect(root.classList.contains('ant-scroll-area-scrolling')).toBe(false)
  })

  it('generates native scrollbar hiding styles and consumes component token overrides', () => {
    const cache = createCache()

    render(
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

    const styleText = extractStyle(cache)
    expect(styleText).toContain('scrollbar-width:none')
    expect(styleText).toContain('-ms-overflow-style:none')
    expect(styleText).toContain('::-webkit-scrollbar')
    expect(styleText).toContain('height:10px')
    expect(styleText).toContain('width:10px')
    expect(styleText).toContain('background:#123456')
    expect(styleText).toContain('background:#654321')
    expect(styleText).toContain('z-index:99')
  })

  it('renders and positions the horizontal thumb from native metrics', async () => {
    const viewportRef = React.createRef<HTMLDivElement>()
    const { container } = render(
      <ScrollArea direction="horizontal" scrollbar="always" viewportRef={viewportRef} />,
    )

    mockScrollMetrics(viewportRef.current!, {
      clientWidth: 200,
      clientHeight: 100,
      scrollWidth: 800,
      scrollHeight: 100,
      scrollLeft: 300,
      scrollTop: 0,
    })
    await fireScroll(viewportRef.current!)

    const thumb = container.querySelector<HTMLElement>('.ant-scroll-area-thumb')
    expect(thumb).not.toBeNull()
    expect(thumb?.style.width).toBe('50px')
    expect(thumb?.style.transform).toBe('translate3d(75px, 0, 0)')
  })

  it('updates native scrollLeft while dragging the horizontal thumb', async () => {
    const viewportRef = React.createRef<HTMLDivElement>()
    const { container } = render(
      <ScrollArea direction="horizontal" scrollbar="always" viewportRef={viewportRef} />,
    )

    mockScrollMetrics(viewportRef.current!, {
      clientWidth: 200,
      clientHeight: 100,
      scrollWidth: 800,
      scrollHeight: 100,
      scrollLeft: 0,
      scrollTop: 0,
    })
    await fireScroll(viewportRef.current!)

    const thumb = container.querySelector<HTMLElement>('.ant-scroll-area-thumb')!
    fireEvent.mouseDown(thumb, { clientX: 0, pageX: 0 })
    fireEvent.mouseMove(window, { clientX: 75, pageX: 75, buttons: 1 })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 24))
    })

    expect(viewportRef.current?.scrollLeft).toBe(300)
    expect(thumb.style.transform).toBe('translate3d(75px, 0, 0)')
  })

  it('maps a vertical wheel to horizontal scrolling by default', async () => {
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
    await fireScroll(viewportRef.current!)
    fireEvent.wheel(viewportRef.current!, { deltaY: 120, deltaX: 0 })

    expect(viewportRef.current?.scrollLeft).toBe(120)
  })

  it('keeps wheel behavior native when requested', async () => {
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
    await fireScroll(viewportRef.current!)
    fireEvent.wheel(viewportRef.current!, { deltaY: 120, deltaX: 0 })

    expect(viewportRef.current?.scrollLeft).toBe(0)
  })

  it('does not map wheel events emitted by a nested ScrollArea viewport', async () => {
    const outerRef = React.createRef<HTMLDivElement>()
    const innerRef = React.createRef<HTMLDivElement>()
    render(
      <ScrollArea direction="horizontal" scrollbar={false} viewportRef={outerRef}>
        <ScrollArea direction="vertical" scrollbar={false} viewportRef={innerRef} />
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
    await fireScroll(outerRef.current!)
    await fireScroll(innerRef.current!)
    fireEvent.wheel(innerRef.current!, { deltaY: 120, deltaX: 0 })

    expect(outerRef.current?.scrollLeft).toBe(0)
  })

  it('supports semantic callbacks and viewport props', () => {
    const onScroll = vi.fn()
    const viewportRef = React.createRef<HTMLDivElement>()
    const { container } = render(
      <ScrollArea
        direction="horizontal"
        viewportRef={viewportRef}
        classNames={({ props }) => ({ root: 'root-' + props.direction })}
        styles={{ root: { height: 120 }, content: { minWidth: 300 } }}
        viewportProps={{ className: 'custom-viewport', onScroll }}
      />,
    )

    fireEvent.scroll(viewportRef.current!)

    expect(container.querySelector('.root-horizontal')).not.toBeNull()
    expect(container.querySelector<HTMLElement>('.root-horizontal')?.style.height).toBe('120px')
    expect(container.querySelector<HTMLElement>('.ant-scroll-area-content')?.style.minWidth).toBe(
      '300px',
    )
    expect(container.querySelector('.custom-viewport')).toBe(viewportRef.current)
    expect(onScroll).toHaveBeenCalledTimes(1)
  })
})

describe('ScrollArea metrics', () => {
  it('calculates thumb size, offset and clamped scroll offsets', () => {
    expect(getThumbSize(200, 800)).toBe(50)
    expect(getThumbSize(100, 100)).toBe(0)
    expect(getThumbOffset(300, 200, 800)).toBe(75)
    expect(clampScrollOffset(-10, 200, 800)).toBe(0)
    expect(clampScrollOffset(900, 200, 800)).toBe(600)
  })
})

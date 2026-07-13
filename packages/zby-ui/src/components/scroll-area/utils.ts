import type * as React from 'react'

export function getThumbSize(clientSize: number, scrollSize: number) {
  /**
   * 滑块长度按“可视区域 / 全部内容”的比例计算：
   * thumb / client = client / scroll。
   * 最小 20px 保证内容很长时滑块仍然可被鼠标或触摸操作。
   */
  if (!clientSize || !scrollSize || scrollSize <= clientSize) return 0
  return Math.max(Math.floor((clientSize / scrollSize) * clientSize), 20)
}

export function getThumbOffset(scrollOffset: number, clientSize: number, scrollSize: number) {
  /**
   * 将原生滚动距离线性映射到滑块可移动区间：
   * scrollOffset / scrollRange = thumbOffset / offsetRange。
   */
  const thumbSize = getThumbSize(clientSize, scrollSize)
  const scrollRange = scrollSize - clientSize
  const offsetRange = clientSize - thumbSize

  if (!scrollRange || !offsetRange) return 0
  return Math.min(Math.max((scrollOffset / scrollRange) * offsetRange, 0), offsetRange)
}

export function clampScrollOffset(scrollOffset: number, clientSize: number, scrollSize: number) {
  // 浏览器允许的逻辑滚动范围是 0 到 scrollSize - clientSize。
  return Math.min(Math.max(scrollOffset, 0), Math.max(scrollSize - clientSize, 0))
}

/**
 * SSR/jsdom 没有 requestAnimationFrame 时使用 16ms 定时器退化，
 * 浏览器环境则保留原生 RAF，确保滚动指标更新与绘制节奏一致。
 */
let requestFrame = (callback: FrameRequestCallback) => +setTimeout(callback, 16)
let cancelFrame = (handle: number) => clearTimeout(handle)

if (typeof window !== 'undefined' && 'requestAnimationFrame' in window) {
  requestFrame = (callback: FrameRequestCallback) => window.requestAnimationFrame(callback)
  cancelFrame = (handle: number) => window.cancelAnimationFrame(handle)
}

let rafId = 0
const rafHandles = new Map<number, number>()

export const raf = Object.assign(
  (callback: () => void, times = 1): number => {
    rafId += 1
    const id = rafId

    const run = (remaining: number) => {
      if (remaining === 0) {
        rafHandles.delete(id)
        callback()
        return
      }

      const handle = requestFrame(() => run(remaining - 1))
      // 每个逻辑任务只保留当前实际 RAF 句柄，cancel 时即可终止后续递归。
      rafHandles.set(id, handle)
    }

    run(times)
    return id
  },
  {
    cancel(id: number) {
      const handle = rafHandles.get(id)
      rafHandles.delete(id)
      if (handle !== undefined) cancelFrame(handle)
    },
  },
)

function fillRef<T>(ref: React.Ref<T> | null | undefined, value: T) {
  // React ref 既可能是回调，也可能是带 current 的对象，需要分别写入。
  if (typeof ref === 'function') {
    ref(value)
  } else if (ref && typeof ref === 'object' && 'current' in ref) {
    ;(ref as React.MutableRefObject<T>).current = value
  }
}

export function composeRef<T>(
  ...refs: Array<React.Ref<T> | null | undefined>
): React.RefCallback<T> {
  // viewport 同时需要满足内部测量、viewportRef 和 viewportProps.ref 三类引用。
  return (value) => {
    refs.forEach((ref) => fillRef(ref, value))
  }
}

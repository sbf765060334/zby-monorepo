import * as React from 'react'

import type { TableProps } from '../InternalTable'

type TableFillMetrics = {
  hasFooter: boolean
  hasSummary: boolean
  hasTitle: boolean
  paginationEnabled: boolean
  paginationPlacement?: string
  virtual: boolean
}

type UseTableFillLayoutOptions = {
  enabled: boolean
  metrics: TableFillMetrics
  prefixCls: string
  rootRef: React.RefObject<HTMLDivElement | null>
  scroll?: TableProps['scroll']
}

const BODY_SELECTORS = [
  (prefixCls: string) => `.${prefixCls}-body`,
  (prefixCls: string) => `.${prefixCls}-tbody-virtual-holder`,
  (prefixCls: string) => `.${prefixCls}-content`,
]

const NON_BODY_SELECTORS = [
  (prefixCls: string) => `.${prefixCls}-title`,
  (prefixCls: string) => `.${prefixCls}-footer`,
  (prefixCls: string) => `.${prefixCls}-header`,
  (prefixCls: string) => `.${prefixCls}-summary`,
  (prefixCls: string) => `.${prefixCls}-pagination`,
]

const requestMeasureFrame = (callback: FrameRequestCallback) => {
  if (
    typeof window !== 'undefined' &&
    typeof window.requestAnimationFrame === 'function'
  ) {
    return window.requestAnimationFrame(callback)
  }

  return window.setTimeout(() => callback(Date.now()), 16)
}

const cancelMeasureFrame = (frameId: number) => {
  if (
    typeof window !== 'undefined' &&
    typeof window.cancelAnimationFrame === 'function'
  ) {
    window.cancelAnimationFrame(frameId)
    return
  }

  window.clearTimeout(frameId)
}

function getOwnedElements(
  root: HTMLDivElement,
  prefixCls: string,
  selectors: Array<(prefixCls: string) => string>,
) {
  return selectors.flatMap((buildSelector) =>
    Array.from(root.querySelectorAll<HTMLElement>(buildSelector(prefixCls))).filter(
      (node) => node.closest(`.${prefixCls}-wrapper`) === root,
    ),
  )
}

function getOwnedBody(root: HTMLDivElement, prefixCls: string) {
  return getOwnedElements(root, prefixCls, BODY_SELECTORS)[0] ?? null
}

function getOwnedNonBodyNodes(
  root: HTMLDivElement,
  prefixCls: string,
  bodyNode: HTMLElement | null,
) {
  return getOwnedElements(root, prefixCls, NON_BODY_SELECTORS).filter((node) => {
    if (!node.classList.contains(`${prefixCls}-summary`)) {
      return true
    }

    return !bodyNode?.contains(node)
  })
}

function collectObservedNodes(root: HTMLDivElement, prefixCls: string) {
  return [root, ...getOwnedElements(root, prefixCls, NON_BODY_SELECTORS)].filter(
    (node, index, list) => list.indexOf(node) === index,
  )
}

function clearBodyHeight(node: HTMLElement | null) {
  if (node) {
    node.style.height = ''
  }
}

function parseStyleSize(value: string) {
  const size = Number.parseFloat(value)
  return Number.isFinite(size) ? size : 0
}

function getOuterBlockSize(node: HTMLElement) {
  const computedStyle = window.getComputedStyle(node)

  return (
    node.offsetHeight +
    parseStyleSize(computedStyle.marginTop) +
    parseStyleSize(computedStyle.marginBottom)
  )
}

export default function useTableFillLayout({
  enabled,
  metrics,
  prefixCls,
  rootRef,
  scroll,
}: UseTableFillLayoutOptions) {
  const [bodyHeight, setBodyHeight] = React.useState<number | undefined>()
  const frameRef = React.useRef<number | null>(null)
  const observerRef = React.useRef<ResizeObserver | null>(null)
  const observedNodesRef = React.useRef<Set<HTMLElement>>(new Set())
  const previousBodyRef = React.useRef<HTMLElement | null>(null)
  const lastValidBodyHeightRef = React.useRef<number | undefined>()

  const clearObservedNodes = React.useCallback(() => {
    const observer = observerRef.current
    const observedNodes = observedNodesRef.current

    if (observer) {
      observedNodes.forEach((node) => observer.unobserve(node))
    }

    observedNodes.clear()
  }, [])

  const refreshObservedNodes = React.useCallback(
    (root: HTMLDivElement) => {
      const nextNodes = collectObservedNodes(root, prefixCls)
      const nextNodeSet = new Set(nextNodes)
      const observedNodes = observedNodesRef.current
      const observer = observerRef.current
      let changed = nextNodeSet.size !== observedNodes.size

      observedNodes.forEach((node) => {
        if (!nextNodeSet.has(node)) {
          observer?.unobserve(node)
          changed = true
        }
      })

      nextNodes.forEach((node) => {
        if (!observedNodes.has(node)) {
          observer?.observe(node)
          changed = true
        }
      })

      observedNodesRef.current = nextNodeSet
      return changed
    },
    [prefixCls],
  )

  const measure = React.useCallback(
    (root: HTMLDivElement) => {
      const bodyNode = getOwnedBody(root, prefixCls)
      const nonBodyNodes = getOwnedNonBodyNodes(root, prefixCls, bodyNode)
      const occupiedHeight = nonBodyNodes.reduce(
        (total, node) => total + getOuterBlockSize(node),
        0,
      )
      const nextBodyHeight = Math.max(root.clientHeight - occupiedHeight, 0)

      refreshObservedNodes(root)

      const lastValidBodyHeight = lastValidBodyHeightRef.current
      if (
        root.clientHeight === 0 &&
        lastValidBodyHeight != null &&
        lastValidBodyHeight > 0
      ) {
        return
      }

      if (previousBodyRef.current && previousBodyRef.current !== bodyNode) {
        clearBodyHeight(previousBodyRef.current)
      }

      if (bodyNode) {
        bodyNode.style.height = `${nextBodyHeight}px`
      }

      previousBodyRef.current = bodyNode
      if (nextBodyHeight > 0) {
        lastValidBodyHeightRef.current = nextBodyHeight
      }
      setBodyHeight((previous) =>
        previous === nextBodyHeight ? previous : nextBodyHeight,
      )
    },
    [prefixCls, refreshObservedNodes],
  )

  const scheduleMeasure = React.useCallback(() => {
    if (frameRef.current !== null) {
      cancelMeasureFrame(frameRef.current)
    }

    frameRef.current = requestMeasureFrame(() => {
      frameRef.current = null
      const root = rootRef.current
      if (root) {
        measure(root)
      }
    })
  }, [measure, rootRef])

  React.useEffect(() => {
    if (!enabled) {
      setBodyHeight(undefined)
      clearObservedNodes()
      observerRef.current?.disconnect()
      observerRef.current = null
      clearBodyHeight(previousBodyRef.current)
      previousBodyRef.current = null
      lastValidBodyHeightRef.current = undefined
      return undefined
    }

    const root = rootRef.current
    if (!root) return undefined

    if (typeof ResizeObserver !== 'undefined') {
      observerRef.current = new ResizeObserver(scheduleMeasure)
    }

    refreshObservedNodes(root)

    return () => {
      clearObservedNodes()
      observerRef.current?.disconnect()
      observerRef.current = null
      if (frameRef.current !== null) {
        cancelMeasureFrame(frameRef.current)
        frameRef.current = null
      }
      clearBodyHeight(previousBodyRef.current)
      previousBodyRef.current = null
    }
  }, [
    clearObservedNodes,
    enabled,
    metrics.hasFooter,
    metrics.hasSummary,
    metrics.hasTitle,
    metrics.paginationEnabled,
    metrics.paginationPlacement,
    metrics.virtual,
    prefixCls,
    refreshObservedNodes,
    scheduleMeasure,
  ])

  React.useLayoutEffect(() => {
    if (!enabled) {
      setBodyHeight(undefined)
      clearBodyHeight(previousBodyRef.current)
      previousBodyRef.current = null
      lastValidBodyHeightRef.current = undefined
      return
    }

    const root = rootRef.current
    if (!root) return

    refreshObservedNodes(root)
    measure(root)
  }, [
    bodyHeight,
    enabled,
    measure,
    metrics.hasFooter,
    metrics.hasSummary,
    metrics.hasTitle,
    metrics.paginationEnabled,
    metrics.paginationPlacement,
    metrics.virtual,
    refreshObservedNodes,
  ])

  return {
    bodyHeight,
    mergedScrollY: enabled ? bodyHeight : scroll?.y,
  }
}

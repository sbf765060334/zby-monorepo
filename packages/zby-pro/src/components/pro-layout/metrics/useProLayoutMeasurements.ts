import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import type { ProLayoutElementSize, ProLayoutMetrics } from './ProLayoutMetricsContext'

export interface UseProLayoutMeasurementsOptions {
  currentPathname: string
  layoutRevision: string
  noBar: boolean
  showBreadcrumb: boolean
}

const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect
const EMPTY_SIZE: ProLayoutElementSize = { height: 0, width: 0 }
const EMPTY_METRICS: ProLayoutMetrics = {
  header: EMPTY_SIZE,
  sider: EMPTY_SIZE,
  breadcrumb: EMPTY_SIZE,
}

function getElementSize(element: HTMLElement | null): ProLayoutElementSize {
  if (!element)
    return EMPTY_SIZE

  const { height, width } = element.getBoundingClientRect()
  return { height, width }
}

function areMetricsEqual(left: ProLayoutMetrics, right: ProLayoutMetrics) {
  return (
    left.header.width === right.header.width &&
    left.header.height === right.header.height &&
    left.sider.width === right.sider.width &&
    left.sider.height === right.sider.height &&
    left.breadcrumb.width === right.breadcrumb.width &&
    left.breadcrumb.height === right.breadcrumb.height
  )
}

export default function useProLayoutMeasurements(
  options: UseProLayoutMeasurementsOptions,
) {
  const {
    currentPathname,
    layoutRevision,
    noBar,
    showBreadcrumb,
  } = options
  const headerRef = useRef<HTMLElement>(null)
  const siderRef = useRef<HTMLDivElement>(null)
  const breadcrumbRef = useRef<HTMLDivElement>(null)
  const [metrics, setMetrics] = useState<ProLayoutMetrics>(EMPTY_METRICS)

  useBrowserLayoutEffect(() => {
    const measure = () => {
      const nextMetrics: ProLayoutMetrics = {
        header: noBar ? EMPTY_SIZE : getElementSize(headerRef.current),
        sider: noBar ? EMPTY_SIZE : getElementSize(siderRef.current),
        breadcrumb: showBreadcrumb ? getElementSize(breadcrumbRef.current) : EMPTY_SIZE,
      }

      setMetrics((previous) => {
        if (areMetricsEqual(previous, nextMetrics)) {
          return previous
        }

        return nextMetrics
      })
    }

    measure()

    if (typeof ResizeObserver === 'undefined')
      return undefined

    const observer = new ResizeObserver(measure)
    const observedElements = [headerRef.current, siderRef.current, breadcrumbRef.current]
    observedElements.forEach((element) => {
      if (element)
        observer.observe(element)
    })

    return () => observer.disconnect()
  }, [currentPathname, layoutRevision, noBar, showBreadcrumb])

  return { breadcrumbRef, headerRef, metrics, siderRef }
}

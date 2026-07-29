import { createContext, useContext } from 'react'

import type { ReactNode } from 'react'

export interface ProLayoutMetrics {
  header: ProLayoutElementSize
  sider: ProLayoutElementSize
  breadcrumb: ProLayoutElementSize
}

export interface ProLayoutElementSize {
  width: number
  height: number
}

const ProLayoutContext = createContext<ProLayoutMetrics | null>(null)

/** Provides the measured dimensions of ProLayout chrome to descendant business pages. */
export function ProLayoutProvider(props: {
  children?: ReactNode
  value: ProLayoutMetrics
}) {
  return (
    <ProLayoutContext.Provider value={props.value}>
      {props.children}
    </ProLayoutContext.Provider>
  )
}

/** Returns the actual dimensions of the header, sider, and current breadcrumb. */
export function useProLayoutMetrics() {
  const metrics = useContext(ProLayoutContext)

  if (!metrics) {
    throw new Error('[ProLayout] Metric hooks must be used inside ProLayout.')
  }

  return metrics
}

export function useProLayoutHeaderSize() {
  return useProLayoutMetrics().header
}

export function useProLayoutSiderSize() {
  return useProLayoutMetrics().sider
}

export function useProLayoutBreadcrumbSize() {
  return useProLayoutMetrics().breadcrumb
}

export function useProLayoutHeaderHeight() {
  return useProLayoutHeaderSize().height
}

export function useProLayoutHeaderWidth() {
  return useProLayoutHeaderSize().width
}

export function useProLayoutSiderWidth() {
  return useProLayoutSiderSize().width
}

export function useProLayoutSiderHeight() {
  return useProLayoutSiderSize().height
}

export function useProLayoutBreadcrumbWidth() {
  return useProLayoutBreadcrumbSize().width
}

export function useProLayoutBreadcrumbHeight() {
  return useProLayoutBreadcrumbSize().height
}

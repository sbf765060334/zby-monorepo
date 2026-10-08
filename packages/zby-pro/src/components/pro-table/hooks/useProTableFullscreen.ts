import { useEffect } from 'react'

import type { ProTableViewStore } from '../store'
import { lockBodyScroll, unlockBodyScroll } from '../utils/body-scroll-lock'

function isVisibleOverlay(node: Element) {
  return window.getComputedStyle(node).display !== 'none'
}

function hasOpenPopupOverlay() {
  if (typeof document === 'undefined') {
    return false
  }

  return Boolean(
    Array.from(document.querySelectorAll('.ant-modal-wrap')).some(isVisibleOverlay) ||
      document.querySelector('.ant-drawer-open') ||
      document.querySelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)') ||
      document.querySelector('.ant-picker-dropdown:not(.ant-picker-dropdown-hidden)') ||
      document.querySelector('.ant-dropdown:not(.ant-dropdown-hidden)') ||
      document.querySelector('.ant-popover:not(.ant-popover-hidden)'),
  )
}

export function useProTableFullscreen({
  active,
  moreFiltersOpen,
  viewStore,
}: {
  active: boolean
  moreFiltersOpen: boolean
  viewStore: ProTableViewStore
}) {
  useEffect(() => {
    if (!active) {
      return
    }

    lockBodyScroll()
    return () => {
      unlockBodyScroll()
    }
  }, [active])

  useEffect(() => {
    if (!active) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) {
        return
      }

      const { columnsModalOpen, filtersModalOpen } = viewStore.getState()
      if (columnsModalOpen || filtersModalOpen || moreFiltersOpen || hasOpenPopupOverlay()) {
        return
      }

      event.preventDefault()
      viewStore.getState().setFullscreenActive(false)
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [active, moreFiltersOpen, viewStore])
}

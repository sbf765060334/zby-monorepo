let lockCount = 0
let previousOverflow = ''
let previousPaddingRight = ''

function getScrollbarWidth() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return 0
  }

  return Math.max(window.innerWidth - document.documentElement.clientWidth, 0)
}

export function lockBodyScroll() {
  if (typeof document === 'undefined') {
    return
  }

  if (lockCount === 0) {
    previousOverflow = document.body.style.overflow
    previousPaddingRight = document.body.style.paddingRight
    const computedPadding = Number.parseInt(
      window.getComputedStyle(document.body).paddingRight,
      10,
    ) || 0
    const scrollbarWidth = getScrollbarWidth()
    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${computedPadding + scrollbarWidth}px`
    }
  }

  lockCount += 1
}

export function unlockBodyScroll() {
  if (typeof document === 'undefined' || lockCount === 0) {
    return
  }

  lockCount -= 1
  if (lockCount > 0) {
    return
  }

  document.body.style.overflow = previousOverflow
  document.body.style.paddingRight = previousPaddingRight
}

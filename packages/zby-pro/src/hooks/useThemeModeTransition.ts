import * as React from 'react'
import { flushSync } from 'react-dom'

export type ZbyThemeMode = 'light' | 'dark'

export type ZbyThemeTransitionOrigin = {
  x: number
  y: number
}

export type UseThemeModeTransitionOptions = {
  themeMode: ZbyThemeMode
  viewTransitionName: string
  background: string
  onThemeModeChange: (value: ZbyThemeMode) => void
}

export type UseThemeModeTransitionReturn = {
  recordThemeSwitchPoint: React.PointerEventHandler<HTMLElement>
  handleThemeModeChange: (nextThemeMode: ZbyThemeMode) => void
}

type ViewTransitionLike = {
  ready: Promise<void>
  finished: Promise<void>
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => ViewTransitionLike
}

export function useThemeModeTransition({
  themeMode,
  viewTransitionName,
  background,
  onThemeModeChange,
}: UseThemeModeTransitionOptions): UseThemeModeTransitionReturn {
  const themeSwitchPointRef = React.useRef<ZbyThemeTransitionOrigin | null>(null)

  const recordThemeSwitchPoint = React.useCallback<React.PointerEventHandler<HTMLElement>>(
    (event) => {
      themeSwitchPointRef.current = { x: event.clientX, y: event.clientY }
    },
    [],
  )

  const handleThemeModeChange = React.useCallback(
    (nextThemeMode: ZbyThemeMode) => {
      if (nextThemeMode === themeMode) {
        return
      }

      if (typeof document === 'undefined' || typeof window === 'undefined') {
        onThemeModeChange(nextThemeMode)
        return
      }

      const viewTransitionDocument = document as ViewTransitionDocument

      if (
        !viewTransitionDocument.startViewTransition ||
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      ) {
        onThemeModeChange(nextThemeMode)
        return
      }

      const { x, y } = themeSwitchPointRef.current ?? {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      }
      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y),
      )
      const clipPath = [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`]
      const enteringDark = nextThemeMode === 'dark'
      const styleElement = document.createElement('style')
      styleElement.textContent = `
::view-transition {
  background: ${background};
}

::view-transition-group(root) {
  z-index: 0;
}

::view-transition-group(${viewTransitionName}) {
  z-index: 1;
}

::view-transition-image-pair(root),
::view-transition-image-pair(${viewTransitionName}) {
  isolation: isolate;
}

::view-transition-old(root),
::view-transition-new(root),
::view-transition-old(${viewTransitionName}),
::view-transition-new(${viewTransitionName}) {
  animation: none;
  mix-blend-mode: normal;
}

::view-transition-old(${viewTransitionName}) {
  z-index: ${enteringDark ? 1 : 999};
}

::view-transition-new(${viewTransitionName}) {
  z-index: ${enteringDark ? 999 : 1};
}
`
      document.head.appendChild(styleElement)

      let themeTransitionAnimation: Animation | undefined
      let transition: ViewTransitionLike

      try {
        transition = viewTransitionDocument.startViewTransition(() => {
          flushSync(() => onThemeModeChange(nextThemeMode))
        })
      } catch {
        styleElement.remove()
        onThemeModeChange(nextThemeMode)
        return
      }

      void transition.ready
        .then(() => {
          themeTransitionAnimation = document.documentElement.animate(
            {
              clipPath: enteringDark ? clipPath : [...clipPath].reverse(),
            },
            {
              duration: 520,
              easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
              fill: 'forwards',
              pseudoElement: `::view-transition-${enteringDark ? 'new' : 'old'}(${viewTransitionName})`,
            } as KeyframeAnimationOptions,
          )
        })
        .catch(() => undefined)

      void transition.finished
        .finally(() => {
          themeTransitionAnimation?.cancel()
          styleElement.remove()
        })
        .catch(() => undefined)
    },
    [background, onThemeModeChange, themeMode, viewTransitionName],
  )

  return {
    recordThemeSwitchPoint,
    handleThemeModeChange,
  }
}

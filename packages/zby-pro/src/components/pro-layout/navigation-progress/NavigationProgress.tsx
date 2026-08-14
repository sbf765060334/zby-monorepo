import 'nprogress/nprogress.css'

import {
  RouterCoreReactRouterAdapter,
  type RouterCoreLocationSyncScheduler,
} from '@zby/router-core/react-router'
import { useRouterCore } from '@zby/router-core/react'
import NProgress from 'nprogress'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import useNavigationProgressStyle from './style'
import type { ReactNode } from 'react'

const NAVIGATION_TIMEOUT = 15_000

interface ScheduledFrame {
  kind: 'raf' | 'timeout'
  id: number | ReturnType<typeof setTimeout>
}

interface NavigationTransaction {
  id: number
  pathname: string
  commit: () => void
  cancelled: boolean
  synced: boolean
  completionScheduled: boolean
  cleanupVersion: number
  firstFrame?: ScheduledFrame
  secondFrame?: ScheduledFrame
  completionFrame?: ScheduledFrame
  timeout?: ReturnType<typeof setTimeout>
}

interface NavigationTransactionContextValue {
  navigationId: number | null
  targetPathname: string | null
  synced: boolean
  reportPageCommitted: (navigationId: number, pathname: string) => void
}

const NavigationTransactionContext = createContext<NavigationTransactionContextValue | null>(null)

/**
 * Owns the ProLayout-specific navigation transaction. The React Router
 * adapter remains generic; this controller is where NProgress and page
 * commit timing are intentionally kept.
 */
export function NavigationProgressController(props: { children: ReactNode }) {
  const router = useRouterCore()
  const { children } = props
  useNavigationProgressStyle()

  const mountedRef = useRef(true)
  const nextNavigationIdRef = useRef(0)
  const activeTransactionRef = useRef<NavigationTransaction | null>(null)
  const progressActiveRef = useRef(false)
  const [transaction, setTransaction] = useState<{
    id: number
    pathname: string
    synced: boolean
  } | null>(null)

  const stopProgress = useCallback(() => {
    if (!progressActiveRef.current)
      return

    progressActiveRef.current = false
    NProgress.done(true)
  }, [])

  const clearTransactionScheduling = useCallback((current: NavigationTransaction) => {
    if (current.firstFrame) {
      cancelScheduledFrame(current.firstFrame)
      current.firstFrame = undefined
    }
    if (current.secondFrame) {
      cancelScheduledFrame(current.secondFrame)
      current.secondFrame = undefined
    }
    if (current.completionFrame) {
      cancelScheduledFrame(current.completionFrame)
      current.completionFrame = undefined
    }
    if (current.timeout !== undefined) {
      clearTimeout(current.timeout)
      current.timeout = undefined
    }
  }, [])

  const finishTransaction = useCallback((navigationId: number) => {
    const current = activeTransactionRef.current
    if (!current || current.id !== navigationId)
      return

    clearTransactionScheduling(current)
    activeTransactionRef.current = null
    setTransaction(null)
    stopProgress()
  }, [clearTransactionScheduling, stopProgress])

  const reportPageCommitted = useCallback((navigationId: number, pathname: string) => {
    const current = activeTransactionRef.current
    if (
      !current ||
      current.id !== navigationId ||
      current.pathname !== normalizePathname(pathname) ||
      !current.synced ||
      current.completionScheduled
    ) {
      return
    }

    current.completionScheduled = true
    current.completionFrame = requestScheduledFrame(() => {
      finishTransaction(navigationId)
    })
  }, [finishTransaction])

  const createTransactionCleanup = useCallback((current: NavigationTransaction) => {
    return () => {
      if (activeTransactionRef.current !== current)
        return

      const cleanupVersion = ++current.cleanupVersion

      // React runs the next location effect immediately after this cleanup.
      // The replacement scheduler can invalidate this microtask and reuse the
      // same transaction when only search/hash changed for the target page.
      queueMicrotaskSafe(() => {
        if (
          !mountedRef.current ||
          activeTransactionRef.current !== current ||
          current.cleanupVersion !== cleanupVersion
        ) {
          return
        }

        current.cancelled = true
        clearTransactionScheduling(current)
        activeTransactionRef.current = null
        setTransaction(null)
        stopProgress()
      })
    }
  }, [clearTransactionScheduling, stopProgress])

  const scheduleSyncLocation = useCallback<RouterCoreLocationSyncScheduler>((location, commit) => {
    const pathname = normalizePathname(location.pathname)
    const state = router.getState()
    const previous = activeTransactionRef.current

    if (previous && !previous.cancelled && previous.pathname === pathname) {
      previous.cleanupVersion += 1
      previous.commit = commit
      if (previous.synced)
        commit()
      return createTransactionCleanup(previous)
    }

    if (previous) {
      previous.cancelled = true
      previous.cleanupVersion += 1
      clearTransactionScheduling(previous)
      activeTransactionRef.current = null
    }

    // Initial bootstrap and same-page search/hash changes keep the original
    // RouterCore timing. Only a real pathname navigation needs a transaction.
    if (
      state.navigationStatus === 'bootstrapping' ||
      !state.currentPathname ||
      state.currentPathname === pathname
    ) {
      commit()
      if (previous) {
        setTransaction(null)
        stopProgress()
      }
      return
    }

    const current: NavigationTransaction = {
      id: ++nextNavigationIdRef.current,
      pathname,
      commit,
      cancelled: false,
      synced: false,
      completionScheduled: false,
      cleanupVersion: 0,
    }
    activeTransactionRef.current = current
    setTransaction({ id: current.id, pathname, synced: false })

    if (!progressActiveRef.current) {
      progressActiveRef.current = true
      NProgress.start()
    }

    current.firstFrame = requestScheduledFrame(() => {
      current.firstFrame = undefined
      current.secondFrame = requestScheduledFrame(() => {
        current.secondFrame = undefined
        if (
          !mountedRef.current ||
          current.cancelled ||
          activeTransactionRef.current !== current
        ) {
          return
        }

        current.synced = false
        try {
          current.commit()
          current.synced = true
          setTransaction((previous) => previous?.id === current.id
            ? { ...previous, synced: true }
            : previous)
        } catch (error) {
          finishTransaction(current.id)
          throw error
        }
      })
    })
    current.timeout = setTimeout(() => {
      finishTransaction(current.id)
    }, NAVIGATION_TIMEOUT)

    return createTransactionCleanup(current)
  }, [
    clearTransactionScheduling,
    createTransactionCleanup,
    finishTransaction,
    router,
    stopProgress,
  ])

  useEffect(() => {
    mountedRef.current = true
    NProgress.configure({ showSpinner: false })

    return () => {
      mountedRef.current = false
      const current = activeTransactionRef.current
      if (current) {
        current.cancelled = true
        clearTransactionScheduling(current)
        activeTransactionRef.current = null
      }
      stopProgress()
      NProgress.remove()
    }
  }, [clearTransactionScheduling, stopProgress])

  const contextValue = useMemo<NavigationTransactionContextValue>(
    () => ({
      navigationId: transaction?.id ?? null,
      targetPathname: transaction?.pathname ?? null,
      synced: transaction?.synced ?? false,
      reportPageCommitted,
    }),
    [reportPageCommitted, transaction],
  )

  return (
    <NavigationTransactionContext.Provider value={contextValue}>
      <RouterCoreReactRouterAdapter scheduleSyncLocation={scheduleSyncLocation}>
        {children}
      </RouterCoreReactRouterAdapter>
    </NavigationTransactionContext.Provider>
  )
}

/** Reports a committed target page without adding any DOM. */
export function PageCommitReporter(props: {
  active?: boolean
  pathname: string
}) {
  const { active = true, pathname } = props
  const context = useContext(NavigationTransactionContext)

  useLayoutEffect(() => {
    if (!context || !active || context.navigationId === null || !context.synced)
      return

    if (context.targetPathname !== normalizePathname(pathname))
      return

    context.reportPageCommitted(context.navigationId, pathname)
  }, [active, context, pathname])

  return null
}

export default NavigationProgressController

function normalizePathname(pathname: string) {
  return pathname || '/'
}

function requestScheduledFrame(callback: () => void): ScheduledFrame {
  if (
    typeof window !== 'undefined' &&
    typeof window.requestAnimationFrame === 'function'
  ) {
    return {
      kind: 'raf',
      id: window.requestAnimationFrame(callback),
    }
  }

  return { kind: 'timeout', id: setTimeout(callback, 0) }
}

function cancelScheduledFrame(frame: ScheduledFrame) {
  if (frame.kind === 'raf') {
    if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function')
      window.cancelAnimationFrame(frame.id as number)
    return
  }

  clearTimeout(frame.id as ReturnType<typeof setTimeout>)
}

function queueMicrotaskSafe(callback: () => void) {
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(callback)
    return
  }

  void Promise.resolve().then(callback)
}

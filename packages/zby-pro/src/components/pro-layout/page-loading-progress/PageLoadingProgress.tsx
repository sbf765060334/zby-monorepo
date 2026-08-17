import 'nprogress/nprogress.css'

import NProgress from 'nprogress'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react'

import type { PropsWithChildren, ReactNode } from 'react'
import usePageLoadingProgressStyle from './style'

const START_DELAY = 150

type PageLoadingToken = symbol

interface PageLoadingProgressController {
  begin: () => PageLoadingToken
  end: (token: PageLoadingToken) => void
}

const PageLoadingProgressContext = createContext<PageLoadingProgressController | null>(null)

/** 统一协调活动页面的 Suspense 等待状态与顶部 NProgress。 */
export default function PageLoadingProgressProvider(props: PropsWithChildren) {
  usePageLoadingProgressStyle()
  const tokensRef = useRef(new Set<PageLoadingToken>())
  const startTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const finishVersionRef = useRef(0)
  const startedRef = useRef(false)

  const begin = useCallback(() => {
    const token = Symbol('page-loading')
    const tokens = tokensRef.current
    tokens.add(token)
    finishVersionRef.current += 1

    if (
      tokens.size === 1 &&
      startTimerRef.current === null &&
      !startedRef.current
    ) {
      startTimerRef.current = setTimeout(() => {
        startTimerRef.current = null
        if (tokensRef.current.size === 0 || startedRef.current)
          return

        NProgress.start()
        startedRef.current = true
      }, START_DELAY)
    }

    return token
  }, [])

  const end = useCallback((token: PageLoadingToken) => {
    const tokens = tokensRef.current
    if (!tokens.delete(token) || tokens.size > 0)
      return

    if (startTimerRef.current !== null) {
      clearTimeout(startTimerRef.current)
      startTimerRef.current = null
    }

    const finishVersion = ++finishVersionRef.current
    queueMicrotask(() => {
      if (
        finishVersion !== finishVersionRef.current ||
        tokensRef.current.size > 0 ||
        !startedRef.current
      ) {
        return
      }

      startedRef.current = false
      NProgress.done()
    })
  }, [])

  const controller = useMemo(() => ({ begin, end }), [begin, end])

  useEffect(() => {
    const tokens = tokensRef.current
    NProgress.configure({ showSpinner: false })

    return () => {
      finishVersionRef.current += 1
      tokens.clear()
      if (startTimerRef.current !== null) {
        clearTimeout(startTimerRef.current)
        startTimerRef.current = null
      }
      if (startedRef.current) {
        startedRef.current = false
        NProgress.done()
      }
      NProgress.remove()
    }
  }, [])

  return (
    <PageLoadingProgressContext.Provider value={controller}>
      {props.children}
    </PageLoadingProgressContext.Provider>
  )
}

/** 只在当前 Suspense fallback 可见于活动页面时持有加载 token。 */
export function PageLoadingProgressFallback(props: {
  active: boolean
  children?: ReactNode
}) {
  const { active, children } = props
  const controller = useContext(PageLoadingProgressContext)

  useEffect(() => {
    if (!active || !controller)
      return undefined

    const token = controller.begin()
    return () => controller.end(token)
  }, [active, controller])

  return <>{children}</>
}

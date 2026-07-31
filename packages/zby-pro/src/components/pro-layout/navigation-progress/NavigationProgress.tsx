import 'nprogress/nprogress.css'

import { useRouterCoreSelector } from '@zby/router-core/react'
import NProgress from 'nprogress'
import { useEffect, useRef } from 'react'

import useNavigationProgressStyle from './style'

const START_DELAY = 150

/** 将 RouterCore 的 pathname 导航阶段映射为固定在视口顶部的 NProgress。 */
export default function NavigationProgress() {
  useNavigationProgressStyle()
  const navigationStatus = useRouterCoreSelector(
    (state) => state.navigationStatus,
  )
  const startTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    NProgress.configure({ showSpinner: false })

    return () => {
      if (startTimerRef.current !== null)
        clearTimeout(startTimerRef.current)
      NProgress.done()
      NProgress.remove()
    }
  }, [])

  useEffect(() => {
    if (navigationStatus === 'settled') {
      if (startTimerRef.current !== null) {
        clearTimeout(startTimerRef.current)
        startTimerRef.current = null
      }
      NProgress.done()
      return
    }

    if (startTimerRef.current !== null || NProgress.isStarted())
      return

    startTimerRef.current = setTimeout(() => {
      startTimerRef.current = null
      NProgress.start()
    }, START_DELAY)
  }, [navigationStatus])

  return null
}

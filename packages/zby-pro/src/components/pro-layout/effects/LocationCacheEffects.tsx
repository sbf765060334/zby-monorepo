import { memo, useEffect } from 'react'

import { useProLayoutStoreSelector } from '../context'
import type { ProLayoutLocation } from '../router'

export interface LocationCacheEffectsProps {
  location: ProLayoutLocation
}

/**
 * 在 Router location 生效后缓存当前页签的 search/hash，并发布完整 URL 事件。
 *
 * Effect 每次挂载也会发布当前 location，因此页面端在步骤 8 使用 useLayoutEffect
 * 注册 emitter 后，可以收到首次 pathname/search/hash，而不仅是挂载后的后续变化。
 */
function LocationCacheEffects(props: LocationCacheEffectsProps) {
  const {
    location: { pathname, search, hash },
  } = props
  const cache = useProLayoutStoreSelector((state) => state.cache)
  const getTabKey = useProLayoutStoreSelector((state) => state.getTabKey)
  const emitPageLocationEvent = useProLayoutStoreSelector(
    (state) => state.emitPageLocationEvent,
  )

  useEffect(() => {
    // 根路径没有页签身份；未知路由也不能污染任意页签的 URL Cache。
    if (!pathname || pathname === '/')
      return

    const tabKey = getTabKey(pathname)
    if (!tabKey)
      return

    // Cache 自己负责 search/hash 格式规范化；事件载荷保持 Router location 的标准格式。
    cache.setSearchParamsForTabKey(tabKey, search)
    cache.setHashForTabKey(tabKey, hash)
    emitPageLocationEvent(tabKey, {
      pathname,
      search: search || '',
      hash: hash || '',
    })
  }, [cache, emitPageLocationEvent, getTabKey, hash, pathname, search])

  return null
}

export default memo(LocationCacheEffects)

import { describe, expect, it, vi } from 'vitest'

import type { ProLayoutRoute } from '../../interface'
import { createRouteRegistry } from '../registry'
import { preloadRouteElement, preloadTabRoute } from '../preload'

function createPreloadRoute(
  path: string,
  preload: () => void | Promise<void>,
): ProLayoutRoute {
  const Page = Object.assign(() => null, { preload })
  return { path, title: path, element: Page }
}

describe('route preload', () => {
  it('calls a route component preload method and swallows its rejection', async () => {
    const successfulPreload = vi.fn()
    const rejectedPreload = vi.fn(async () => {
      throw new Error('preload failed')
    })

    preloadRouteElement(createPreloadRoute('/success', successfulPreload))
    preloadRouteElement(createPreloadRoute('/failure', rejectedPreload))
    await Promise.resolve()

    expect(successfulPreload).toHaveBeenCalledTimes(1)
    expect(rejectedPreload).toHaveBeenCalledTimes(1)
  })

  it('does nothing when the route element does not provide preload', () => {
    const route: ProLayoutRoute = { path: '/plain', title: 'Plain', element: () => null }

    expect(() => preloadRouteElement(route)).not.toThrow()
  })

  it('restores the real parameter pathname before preloading a tab route', () => {
    const preload = vi.fn()
    const route = createPreloadRoute('/projects/:projectId', preload)
    const registry = createRouteRegistry({ routes: [route] })
    const cache = {
      getParamsPathByTabKey: vi.fn(() => '/projects/42'),
    }

    preloadTabRoute('/projects/:projectId', registry, cache)

    expect(cache.getParamsPathByTabKey).toHaveBeenCalledWith('/projects/:projectId')
    expect(preload).toHaveBeenCalledTimes(1)
  })

  it('uses the tab key directly when no parameter pathname is cached', () => {
    const preload = vi.fn()
    const route = createPreloadRoute('/dashboard', preload)
    const registry = createRouteRegistry({ routes: [route] })
    const cache = {
      getParamsPathByTabKey: () => '',
    }

    preloadTabRoute('/dashboard', registry, cache)
    preloadTabRoute('/missing', registry, cache)

    expect(preload).toHaveBeenCalledTimes(1)
  })
})

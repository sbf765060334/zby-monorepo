import { describe, expect, it, vi } from 'vitest'

import { ProLayoutCache } from '../cache'

describe('proLayoutCache', () => {
  it('isolates constructor and hydration input objects from internal state', () => {
    const initial = { '/project/:id': '/project/1' }
    const hydrated = { '/task/:id': '/task/2' }
    const onChange = vi.fn()
    const cache = new ProLayoutCache(initial, onChange)

    initial['/project/:id'] = '/project/99'
    expect(cache.getParamsPathByTabKey('/project/:id')).toBe('/project/1')

    cache.hydrateFixedParamsPathMap(hydrated)
    hydrated['/task/:id'] = '/task/88'

    expect(cache.getParamsPathByTabKey('/project/:id')).toBe('')
    expect(cache.getParamsPathByTabKey('/task/:id')).toBe('/task/2')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('notifies persistence only when a parameter pathname actually changes', () => {
    const onChange = vi.fn()
    const cache = new ProLayoutCache({ '/project/:id': '/project/1' }, onChange)

    cache.setParamsPath('/project/:id', '/project/1')
    expect(onChange).not.toHaveBeenCalled()

    cache.setParamsPath('/project/:id', '/project/2')
    expect(onChange).toHaveBeenLastCalledWith({ '/project/:id': '/project/2' })

    const emittedSnapshot = onChange.mock.lastCall?.[0] as Record<string, string>
    emittedSnapshot['/project/:id'] = '/project/99'
    expect(cache.getParamsPathByTabKey('/project/:id')).toBe('/project/2')

    cache.setParamsPath('/project/:id', null)
    expect(onChange).toHaveBeenLastCalledWith({})
    expect(onChange).toHaveBeenCalledTimes(2)

    cache.setParamsPath('/project/:id', null)
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  it('normalizes and restores in-memory search parameters and hashes', () => {
    const cache = new ProLayoutCache({})

    cache.setSearchParamsForTabKey('/orders', '?status=open')
    cache.setHashForTabKey('/orders', 'summary')

    expect(cache.getSearchParamsForTabKey('/orders')).toBe('status=open')
    expect(cache.getHashForTabKey('/orders')).toBe('#summary')

    cache.setSearchParamsForTabKey('/orders', '')
    cache.setHashForTabKey('/orders', null)

    expect(cache.getSearchParamsForTabKey('/orders')).toBe('')
    expect(cache.getHashForTabKey('/orders')).toBe('')
  })

  it('clears every URL cache associated with a closed tab', () => {
    const onChange = vi.fn()
    const cache = new ProLayoutCache({ '/project/:id': '/project/42' }, onChange)

    cache.setSearchParamsForTabKey('/project/:id', 'tab=detail')
    cache.setHashForTabKey('/project/:id', '#summary')
    cache.clearTab('/project/:id')

    expect(cache.getParamsPathByTabKey('/project/:id')).toBe('')
    expect(cache.getSearchParamsForTabKey('/project/:id')).toBe('')
    expect(cache.getHashForTabKey('/project/:id')).toBe('')
    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange).toHaveBeenCalledWith({})
  })
})

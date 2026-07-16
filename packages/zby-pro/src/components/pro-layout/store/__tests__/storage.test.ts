import { indexedDB as fakeIndexedDB } from 'fake-indexeddb'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import type { ProLayoutStorageState } from '../interface'
import {
  createIndexedDBProLayoutStorageAdapter,
  createRemoteProLayoutStorageAdapter,
  normalizeProLayoutStorageState,
} from '../storage'

let storageKeySequence = 0

function createStorageKey(label: string) {
  storageKeySequence += 1
  return `zby-pro-layout-test:${label}:${storageKeySequence}`
}

beforeAll(() => {
  vi.stubGlobal('indexedDB', fakeIndexedDB)
})

afterAll(() => {
  vi.unstubAllGlobals()
})

describe('proLayout storage state', () => {
  it('normalizes partial and malformed persisted values', () => {
    const malformedState = {
      collection: ['/dashboard', 1, null],
      fixedTabs: 'not-an-array',
      fixedParamsPathMap: {
        '/project/:id': '/project/42',
        '/invalid': 42,
      },
    } as unknown as Partial<ProLayoutStorageState>

    expect(normalizeProLayoutStorageState(malformedState)).toEqual({
      collection: ['/dashboard'],
      fixedTabs: [],
      fixedParamsPathMap: {
        '/project/:id': '/project/42',
      },
    })
    expect(normalizeProLayoutStorageState(null)).toEqual({
      collection: [],
      fixedTabs: [],
      fixedParamsPathMap: {},
    })
  })
})

describe('indexedDB ProLayout storage adapter', () => {
  it('degrades to empty state and no-op saves when IndexedDB is unavailable', async () => {
    vi.stubGlobal('indexedDB', undefined)
    const adapter = createIndexedDBProLayoutStorageAdapter()

    await expect(adapter.load('unavailable')).resolves.toEqual({
      collection: [],
      fixedTabs: [],
      fixedParamsPathMap: {},
    })
    await expect(adapter.saveCollection('unavailable', ['/dashboard'])).resolves.toBeUndefined()
    await expect(adapter.saveFixedTabs('unavailable', ['/dashboard'])).resolves.toBeUndefined()
    await expect(
      adapter.saveFixedParamsPathMap('unavailable', {
        '/project/:id': '/project/42',
      }),
    ).resolves.toBeUndefined()

    vi.stubGlobal('indexedDB', fakeIndexedDB)
  })

  it('preserves every field when different saves are submitted concurrently', async () => {
    const adapter = createIndexedDBProLayoutStorageAdapter()
    const storageKey = createStorageKey('concurrent-fields')

    await Promise.all([
      adapter.saveCollection(storageKey, ['/dashboard']),
      adapter.saveFixedTabs(storageKey, ['/project/:id']),
      adapter.saveFixedParamsPathMap(storageKey, {
        '/project/:id': '/project/42',
      }),
    ])

    await expect(adapter.load(storageKey)).resolves.toEqual({
      collection: ['/dashboard'],
      fixedTabs: ['/project/:id'],
      fixedParamsPathMap: {
        '/project/:id': '/project/42',
      },
    })
  })

  it('keeps the last submitted value for rapid saves to the same field', async () => {
    const adapter = createIndexedDBProLayoutStorageAdapter()
    const storageKey = createStorageKey('same-field-order')

    await Promise.all([
      adapter.saveCollection(storageKey, ['/first']),
      adapter.saveCollection(storageKey, ['/second']),
      adapter.saveCollection(storageKey, ['/last']),
    ])

    await expect(adapter.load(storageKey)).resolves.toEqual({
      collection: ['/last'],
      fixedTabs: [],
      fixedParamsPathMap: {},
    })
  })

  it('isolates records that use different storage keys', async () => {
    const adapter = createIndexedDBProLayoutStorageAdapter()
    const firstStorageKey = createStorageKey('isolation-first')
    const secondStorageKey = createStorageKey('isolation-second')

    await Promise.all([
      adapter.saveFixedTabs(firstStorageKey, ['/dashboard']),
      adapter.saveFixedTabs(secondStorageKey, ['/orders']),
    ])

    await expect(adapter.load(firstStorageKey)).resolves.toMatchObject({
      fixedTabs: ['/dashboard'],
    })
    await expect(adapter.load(secondStorageKey)).resolves.toMatchObject({
      fixedTabs: ['/orders'],
    })
  })
})

describe('remote ProLayout storage adapter', () => {
  it('normalizes loaded state and serializes saves for the same storage key', async () => {
    let releaseFirstSave: (() => void) | undefined
    const saveCollection = vi.fn(
      async (_storageKey: string, collection: string[]) => {
        if (collection[0] === '/first') {
          await new Promise<void>((resolve) => {
            releaseFirstSave = resolve
          })
        }
      },
    )
    const adapter = createRemoteProLayoutStorageAdapter({
      load: vi.fn(async () => ({
        collection: ['/dashboard', 1],
        fixedTabs: null,
        fixedParamsPathMap: { '/project/:id': '/project/42', '/invalid': 42 },
      }) as unknown as ProLayoutStorageState),
      saveCollection,
      saveFixedTabs: vi.fn(async () => undefined),
      saveFixedParamsPathMap: vi.fn(async () => undefined),
    })
    const storageKey = createStorageKey('remote-order')

    await expect(adapter.load(storageKey)).resolves.toEqual({
      collection: ['/dashboard'],
      fixedTabs: [],
      fixedParamsPathMap: { '/project/:id': '/project/42' },
    })

    const firstSave = adapter.saveCollection(storageKey, ['/first'])
    const secondSave = adapter.saveCollection(storageKey, ['/second'])

    await vi.waitFor(() => {
      expect(saveCollection).toHaveBeenCalledTimes(1)
    })
    releaseFirstSave?.()
    await Promise.all([firstSave, secondSave])

    expect(saveCollection).toHaveBeenNthCalledWith(1, storageKey, ['/first'])
    expect(saveCollection).toHaveBeenNthCalledWith(2, storageKey, ['/second'])
  })

  it('continues processing queued saves after a previous save fails', async () => {
    const saveFixedTabs = vi
      .fn<(storageKey: string, fixedTabs: string[]) => Promise<void>>()
      .mockRejectedValueOnce(new Error('remote save failed'))
      .mockResolvedValueOnce(undefined)
    const adapter = createRemoteProLayoutStorageAdapter({
      load: vi.fn(async () => normalizeProLayoutStorageState()),
      saveCollection: vi.fn(async () => undefined),
      saveFixedTabs,
      saveFixedParamsPathMap: vi.fn(async () => undefined),
    })
    const storageKey = createStorageKey('remote-recovery')

    const failedSave = adapter.saveFixedTabs(storageKey, ['/first'])
    const recoveredSave = adapter.saveFixedTabs(storageKey, ['/second'])

    await expect(failedSave).rejects.toThrow('remote save failed')
    await expect(recoveredSave).resolves.toBeUndefined()
    expect(saveFixedTabs).toHaveBeenCalledTimes(2)
  })
})

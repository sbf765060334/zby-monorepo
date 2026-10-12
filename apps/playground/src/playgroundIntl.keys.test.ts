import { describe, expect, it } from 'vitest'

import { playgroundEnUS, playgroundMyMM, playgroundViVN, playgroundZhCN } from './playgroundIntl'

function messageKeys(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return prefix ? [prefix] : []

  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => {
    if (key === 'locale')
      return []
    const next = prefix ? `${prefix}.${key}` : key
    return messageKeys(child, next)
  })
}

describe('playground locale packs', () => {
  it('keeps Vietnamese and Burmese keys aligned with Chinese', () => {
    const base = messageKeys(playgroundZhCN).sort()
    expect(messageKeys(playgroundEnUS).sort()).toEqual(base)
    expect(messageKeys(playgroundViVN).sort()).toEqual(base)
    expect(messageKeys(playgroundMyMM).sort()).toEqual(base)
  })
})

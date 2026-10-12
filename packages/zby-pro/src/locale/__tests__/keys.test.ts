import { describe, expect, it } from 'vitest'

import enUS from '../en_US'
import myMM from '../my_MM'
import viVN from '../vi_VN'
import zhCN from '../zh_CN'

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

describe('pro locale packs', () => {
  it('keeps Vietnamese and Burmese keys aligned with Chinese', () => {
    const base = messageKeys(zhCN).sort()
    expect(messageKeys(enUS).sort()).toEqual(base)
    expect(messageKeys(viVN).sort()).toEqual(base)
    expect(messageKeys(myMM).sort()).toEqual(base)
  })
})

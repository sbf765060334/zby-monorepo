import { describe, expect, it } from 'vitest'

import { ANTD_THEME_SEED } from './constants'
import {
  applyThemeSeedConfig,
  deriveThemeSeedConfig,
  parseThemeSeedConfig,
  readStoredThemeSeedConfig,
  removeThemeSeedConfigField,
  resetThemeSeedConfigField,
  stringifyThemeSeedConfig,
  syncThemeSeedConfigPatch,
  upsertThemeSeedConfig,
} from './themeSeedConfig'

describe('theme seed config document', () => {
  it('keeps explicit defaults and ignores dirty fields without deleting them', () => {
    const current = { ...ANTD_THEME_SEED, fontSize: 15, sizeStep: 6 }
    const config = {
      fontSize: 14,
      sizeStep: 11,
      extra: { raw: true },
      colorPrimary: '#abc',
    }

    const next = applyThemeSeedConfig(config, current)

    expect(next.fontSize).toBe(14)
    expect(next.sizeStep).toBe(6)
    expect(next.colorPrimary).toBe('#aabbcc')
    expect(next.colorInfo).toBeNull()
    expect(config.extra).toEqual({ raw: true })
    expect(stringifyThemeSeedConfig(config)).toContain('"fontSize": 14')
    expect(stringifyThemeSeedConfig(config)).toContain('"extra"')
  })

  it('drops a field only when that field is reset', () => {
    const config = upsertThemeSeedConfig({ extra: 1 }, 'fontSize', 14)
    expect(config).toEqual({ extra: 1, fontSize: 14 })
    expect(removeThemeSeedConfigField(config, 'fontSize')).toEqual({ extra: 1 })
  })

  it('writes info color with brand color while follow stays on', () => {
    const draft = { ...ANTD_THEME_SEED }
    const config = syncThemeSeedConfigPatch({}, draft, { colorPrimary: '#722ed1' })
    expect(config).toEqual({ colorPrimary: '#722ed1', colorInfo: '#722ed1' })

    const followed = applyThemeSeedConfig(config, draft)
    expect(followed.colorPrimary).toBe('#722ed1')
    expect(followed.colorInfo).toBeNull()

    const customInfo = { ...draft, colorInfo: '#ff0000' as string | null }
    expect(syncThemeSeedConfigPatch(
      { colorPrimary: '#722ed1', colorInfo: '#ff0000' },
      customInfo,
      { colorPrimary: '#123456' },
    )).toEqual({ colorPrimary: '#123456', colorInfo: '#ff0000' })
    expect(applyThemeSeedConfig({ colorPrimary: '#123456', colorInfo: '#654321' }, draft).colorInfo).toBe('#654321')
  })

  it('drops mirrored info color when brand color is reset', () => {
    const draft = { ...ANTD_THEME_SEED, colorPrimary: '#722ed1' }
    expect(resetThemeSeedConfigField(
      { colorPrimary: '#722ed1', colorInfo: '#722ed1', extra: 1 },
      draft,
      'colorPrimary',
    )).toEqual({ extra: 1 })
    expect(resetThemeSeedConfigField(
      { colorInfo: '#ff0000' },
      { ...draft, colorInfo: '#ff0000' },
      'colorInfo',
    )).toEqual({ colorInfo: '#722ed1' })
  })

  it('derives a document only when storage has no config of its own', () => {
    const seed = { ...ANTD_THEME_SEED, colorPrimary: '#123456' }
    expect(deriveThemeSeedConfig(seed)).toEqual({ colorPrimary: '#123456', colorInfo: '#123456' })
    expect(readStoredThemeSeedConfig({ ...seed, config: { fontSize: 14, extra: 'x' } }, seed)).toEqual({
      fontSize: 14,
      extra: 'x',
    })
    expect(parseThemeSeedConfig('{')).toBeNull()
    expect(parseThemeSeedConfig('[]')).toBeNull()
  })
})

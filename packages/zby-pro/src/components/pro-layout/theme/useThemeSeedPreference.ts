import { theme as antdTheme } from 'antd'
import { useCallback, useMemo, useState } from 'react'

import {
  ANTD_THEME_SEED,
  THEME_SEED_FONT_SIZE_RANGE,
  THEME_SEED_RADIUS_RANGE,
  THEME_SEED_SIZE_STEP_RANGE,
  THEME_SEED_SIZE_UNIT_RANGE,
} from './constants'
import {
  deriveThemeSeedConfig,
  readStoredThemeSeedConfig,
  THEME_SEED_CONFIG_FIELD,
} from './themeSeedConfig'
import type { ThemeSeedConfig } from './themeSeedConfig'
import type {
  ProThemeAppearance,
  ProThemeDensity,
  ProThemeSeedPreference,
  UseThemeSeedPreferenceOptions,
  UseThemeSeedPreferenceReturn,
} from './types'

const DEFAULT_STORAGE_KEY = 'zby-pro:theme-seed'
const SEED_KEYS = Object.keys(ANTD_THEME_SEED) as (keyof ProThemeSeedPreference)[]

/** 管理已确定的个性化种子和本地持久化，不创建 ConfigProvider。 */
export function useThemeSeedPreference(
  options: UseThemeSeedPreferenceOptions = {},
): UseThemeSeedPreferenceReturn {
  const fallback = normalizeThemeSeed(
    { ...ANTD_THEME_SEED, ...options.defaultValue },
    ANTD_THEME_SEED,
  )
  const [stored, setStored] = useState(() => readPreference(DEFAULT_STORAGE_KEY, fallback))

  const setValue = useCallback((nextValue: ProThemeSeedPreference, nextConfig?: ThemeSeedConfig) => {
    const normalized = normalizeThemeSeed(nextValue, ANTD_THEME_SEED)
    const config = nextConfig ?? deriveThemeSeedConfig(normalized)
    persistPreference(DEFAULT_STORAGE_KEY, normalized, config)
    setStored({ value: normalized, config })
  }, [])

  return useMemo(
    () => ({ value: stored.value, config: stored.config, setValue }),
    [setValue, stored.config, stored.value],
  )
}

/** 把种子变成 ConfigProvider 能直接接收的 token。null 颜色在这里才解析成具体色值。 */
export function toThemeSeedToken(
  seed: ProThemeSeedPreference,
  appearance: ProThemeAppearance,
) {
  const dark = appearance === 'dark'
  return {
    colorPrimary: seed.colorPrimary,
    colorSuccess: seed.colorSuccess,
    colorWarning: seed.colorWarning,
    colorError: seed.colorError,
    colorInfo: seed.colorInfo ?? seed.colorPrimary,
    colorLink: seed.colorLink ?? seed.colorPrimary,
    colorTextBase: seed.colorTextBase ?? (dark ? '#ffffff' : '#000000'),
    colorBgBase: seed.colorBgBase ?? (dark ? '#000000' : '#ffffff'),
    fontSize: seed.fontSize,
    sizeStep: seed.sizeStep,
    sizeUnit: seed.sizeUnit,
    borderRadius: seed.borderRadius,
    wireframe: seed.wireframe,
  }
}

/** 预览沿用当前已确定的明暗和密度，不在抽屉里再放一套开关。 */
export function resolveThemeAlgorithm(
  appearance: ProThemeAppearance,
  density: ProThemeDensity,
) {
  const appearanceAlgorithm = appearance === 'dark'
    ? antdTheme.darkAlgorithm
    : antdTheme.defaultAlgorithm
  return density === 'compact'
    ? [appearanceAlgorithm, antdTheme.compactAlgorithm]
    : appearanceAlgorithm
}

/**
 * 统计两份种子的差异项。
 * 信息色为 null 时按品牌色比较，和 antd 把跟随主色写成具体色值的方式一致。
 */
export function countThemeSeedChanges(
  draft: ProThemeSeedPreference,
  baseline: ProThemeSeedPreference,
) {
  return SEED_KEYS.reduce(
    (count, key) => count + (themeSeedFieldValue(draft, key) === themeSeedFieldValue(baseline, key) ? 0 : 1),
    0,
  )
}

function themeSeedFieldValue(
  seed: ProThemeSeedPreference,
  key: keyof ProThemeSeedPreference,
) {
  if (key === 'colorInfo' && seed.colorInfo == null)
    return seed.colorPrimary
  return seed[key]
}

function readPreference(
  storageKey: string,
  fallback: ProThemeSeedPreference,
) {
  if (typeof window === 'undefined')
    return { value: fallback, config: deriveThemeSeedConfig(fallback) }

  try {
    const storedValue = window.localStorage.getItem(storageKey)
    if (!storedValue)
      return { value: fallback, config: deriveThemeSeedConfig(fallback) }
    const parsed = JSON.parse(storedValue) as unknown
    const value = normalizeThemeSeed(parsed, fallback)
    return { value, config: readStoredThemeSeedConfig(parsed, value) }
  } catch {
    return { value: fallback, config: deriveThemeSeedConfig(fallback) }
  }
}

function persistPreference(
  storageKey: string,
  value: ProThemeSeedPreference,
  config: ThemeSeedConfig,
) {
  if (typeof window === 'undefined')
    return

  try {
    window.localStorage.setItem(storageKey, JSON.stringify({
      ...value,
      [THEME_SEED_CONFIG_FIELD]: config,
    }))
  } catch {
    // localStorage 不可用时仍保留内存状态，不能让持久化失败打断确定操作。
  }
}

function normalizeThemeSeed(
  input: unknown,
  fallback: ProThemeSeedPreference,
): ProThemeSeedPreference {
  const source = isRecord(input) ? input : {}
  return {
    colorPrimary: normalizeColor(source.colorPrimary, fallback.colorPrimary),
    colorSuccess: normalizeColor(source.colorSuccess, fallback.colorSuccess),
    colorWarning: normalizeColor(source.colorWarning, fallback.colorWarning),
    colorError: normalizeColor(source.colorError, fallback.colorError),
    colorInfo: normalizeOptionalColor(source.colorInfo, fallback.colorInfo),
    colorLink: normalizeOptionalColor(source.colorLink, fallback.colorLink),
    colorTextBase: normalizeOptionalColor(source.colorTextBase, fallback.colorTextBase),
    colorBgBase: normalizeOptionalColor(source.colorBgBase, fallback.colorBgBase),
    fontSize: normalizeInteger(
      source.fontSize,
      THEME_SEED_FONT_SIZE_RANGE.min,
      THEME_SEED_FONT_SIZE_RANGE.max,
      fallback.fontSize,
    ),
    sizeStep: normalizeInteger(
      source.sizeStep,
      THEME_SEED_SIZE_STEP_RANGE.min,
      THEME_SEED_SIZE_STEP_RANGE.max,
      fallback.sizeStep,
    ),
    sizeUnit: normalizeInteger(
      source.sizeUnit,
      THEME_SEED_SIZE_UNIT_RANGE.min,
      THEME_SEED_SIZE_UNIT_RANGE.max,
      fallback.sizeUnit,
    ),
    borderRadius: normalizeInteger(
      source.borderRadius,
      THEME_SEED_RADIUS_RANGE.min,
      THEME_SEED_RADIUS_RANGE.max,
      fallback.borderRadius,
    ),
    wireframe: typeof source.wireframe === 'boolean' ? source.wireframe : fallback.wireframe,
  }
}

function normalizeOptionalColor(value: unknown, fallback: string | null) {
  if (value == null || value === '')
    return null
  if (typeof value !== 'string')
    return fallback
  const hex = expandHex(value.trim().toLowerCase())
  return /^#[0-9a-f]{6}$/.test(hex) ? hex : fallback
}

function normalizeColor(value: unknown, fallback: string) {
  if (typeof value !== 'string')
    return fallback
  const normalized = value.trim().toLowerCase()
  const hex = expandHex(normalized)
  return /^#[0-9a-f]{6}$/.test(hex) ? hex : fallback
}

function expandHex(value: string) {
  if (/^#[0-9a-f]{3}$/.test(value)) {
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
  }
  return /^#[0-9a-f]{8}$/.test(value) ? value.slice(0, 7) : value
}

function normalizeInteger(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
) {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
    ? value
    : fallback
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

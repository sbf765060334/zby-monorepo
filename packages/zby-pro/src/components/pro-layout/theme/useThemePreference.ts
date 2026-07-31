import { useCallback, useMemo, useState, useSyncExternalStore } from 'react'

import type {
  ProThemeAppearance,
  ProThemeDensity,
  ProThemeMode,
  ProThemePreference,
  UseThemePreferenceOptions,
  UseThemePreferenceReturn,
} from './types'

const DEFAULT_STORAGE_KEY = 'zby-pro:theme-preference'
const SYSTEM_THEME_QUERY = '(prefers-color-scheme: dark)'
/** 未传配置且没有持久化记录时，保持 antd 原生的浅色和默认密度。 */
const DEFAULT_PREFERENCE: ProThemePreference = {
  mode: 'light',
  density: 'default',
}

/** 管理主题偏好、系统外观解析和本地持久化，不创建 ConfigProvider。 */
export function useThemePreference(
  options: UseThemePreferenceOptions = {},
): UseThemePreferenceReturn {
  const fallback = { ...DEFAULT_PREFERENCE, ...options.defaultValue }
  const [value, setPreference] = useState<ProThemePreference>(() =>
    readPreference(DEFAULT_STORAGE_KEY, fallback))
  const systemAppearance = useSyncExternalStore(
    subscribeSystemAppearance,
    getSystemAppearance,
    getServerAppearance,
  )

  const setValue = useCallback((nextValue: ProThemePreference) => {
    persistPreference(DEFAULT_STORAGE_KEY, nextValue)
    setPreference(nextValue)
  }, [])

  const setMode = useCallback((mode: ProThemeMode) => {
    if (value.mode === mode)
      return
    setValue({ ...value, mode })
  }, [setValue, value])

  const setDensity = useCallback((density: ProThemeDensity) => {
    if (value.density === density)
      return
    setValue({ ...value, density })
  }, [setValue, value])

  // value 保留用户选择的 auto，appearance 则提供业务真正需要应用的 light/dark。
  return useMemo(() => ({
    value,
    appearance: value.mode === 'auto' ? systemAppearance : value.mode,
    setValue,
    setMode,
    setDensity,
  }), [setDensity, setMode, setValue, systemAppearance, value])
}

/** 将某个明暗模式同步解析为当前实际外观，供点击切换时判断是否需要动画。 */
export function resolveThemeAppearance(mode: ProThemeMode): ProThemeAppearance {
  return mode === 'auto' ? getSystemAppearance() : mode
}

function getSystemAppearance(): ProThemeAppearance {
  // SSR 没有 matchMedia，使用 light 保证服务端输出稳定。
  if (typeof window === 'undefined')
    return 'light'
  return window.matchMedia?.(SYSTEM_THEME_QUERY).matches ? 'dark' : 'light'
}

function getServerAppearance(): ProThemeAppearance {
  return 'light'
}

function subscribeSystemAppearance(onStoreChange: () => void) {
  if (typeof window === 'undefined')
    return () => undefined

  const media = window.matchMedia?.(SYSTEM_THEME_QUERY)
  if (!media)
    return () => undefined

  media.addEventListener?.('change', onStoreChange)
  return () => media.removeEventListener?.('change', onStoreChange)
}

function readPreference(
  storageKey: string,
  fallback: ProThemePreference,
): ProThemePreference {
  if (typeof window === 'undefined')
    return fallback

  try {
    const storedValue = window.localStorage.getItem(storageKey)
    if (!storedValue)
      return fallback

    // 兼容旧版只存储 auto/light/dark 字符串的 ProLayout 数据。
    if (isThemeMode(storedValue))
      return { ...fallback, mode: storedValue }

    const parsed = JSON.parse(storedValue) as Partial<ProThemePreference>
    return {
      mode: isThemeMode(parsed.mode) ? parsed.mode : fallback.mode,
      density: isThemeDensity(parsed.density) ? parsed.density : fallback.density,
    }
  } catch {
    return fallback
  }
}

function persistPreference(storageKey: string, value: ProThemePreference) {
  if (typeof window === 'undefined')
    return

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(value))
  } catch {
    // localStorage 不可用时仍保留内存状态，不能让持久化失败打断主题切换。
  }
}

function isThemeMode(value: unknown): value is ProThemeMode {
  return value === 'auto' || value === 'light' || value === 'dark'
}

function isThemeDensity(value: unknown): value is ProThemeDensity {
  return value === 'default' || value === 'compact'
}

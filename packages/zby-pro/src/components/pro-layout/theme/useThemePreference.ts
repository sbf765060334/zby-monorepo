import { useCallback, useEffect, useMemo, useState } from 'react'

import type {
  ProThemeAppearance,
  ProThemeDensity,
  ProThemeMode,
  ProThemePreference,
  UseThemePreferenceOptions,
  UseThemePreferenceReturn,
} from './types'

const DEFAULT_STORAGE_KEY = 'zby-pro:theme-preference'
/** 未传配置且没有持久化记录时，保持 antd 原生的浅色和默认密度。 */
const DEFAULT_PREFERENCE: ProThemePreference = {
  mode: 'light',
  density: 'default',
}

/** 管理主题偏好、系统外观解析和本地持久化，不创建 ConfigProvider。 */
export function useThemePreference(
  options: UseThemePreferenceOptions = {},
): UseThemePreferenceReturn {
  const storageKey = options.storageKey || DEFAULT_STORAGE_KEY
  const [value, setPreference] = useState<ProThemePreference>(() => {
    // 初始化阶段先合并业务默认值，再让有效的本地记录覆盖它。
    const fallback = { ...DEFAULT_PREFERENCE, ...options.defaultValue }
    return readPreference(storageKey, fallback)
  })
  const [systemAppearance, setSystemAppearance] = useState<ProThemeAppearance>(
    getSystemAppearance,
  )

  useEffect(() => {
    // hook 只持久化偏好，不创建 ConfigProvider，也不决定业务 token。
    persistPreference(storageKey, value)
  }, [storageKey, value])

  useEffect(() => {
    // 只有 auto 模式依赖系统外观；离开 auto 后立即释放监听器。
    if (value.mode !== 'auto' || typeof window === 'undefined')
      return undefined

    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!media)
      return undefined

    const handleChange = () => setSystemAppearance(media.matches ? 'dark' : 'light')
    handleChange()
    media.addEventListener?.('change', handleChange)
    return () => media.removeEventListener?.('change', handleChange)
  }, [value.mode])

  const setValue = useCallback((nextValue: ProThemePreference) => {
    setPreference(nextValue)
  }, [])

  const setMode = useCallback((mode: ProThemeMode) => {
    setPreference((current) => current.mode === mode ? current : { ...current, mode })
  }, [])

  const setDensity = useCallback((density: ProThemeDensity) => {
    setPreference((current) => current.density === density ? current : { ...current, density })
  }, [])

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
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
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

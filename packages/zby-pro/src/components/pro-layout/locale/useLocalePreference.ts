import { useCallback, useMemo, useState } from 'react'

import type { ProLocale } from './LocaleSwitch'

const DEFAULT_STORAGE_KEY = 'zby-pro:locale-preference'
const DEFAULT_LOCALE: ProLocale = 'zh-CN'

export interface UseLocalePreferenceOptions {
  /** 没有有效本地记录时使用的初始语言。 */
  defaultValue?: ProLocale
}

export interface UseLocalePreferenceReturn {
  /** 当前语言偏好。 */
  value: ProLocale
  /** 更新语言偏好并触发本地持久化。 */
  setValue: (value: ProLocale) => void
}

/** 管理受控语言选择器使用的语言偏好和本地持久化，不创建任何 Provider。 */
export function useLocalePreference(
  options: UseLocalePreferenceOptions = {},
): UseLocalePreferenceReturn {
  const fallback = options.defaultValue || DEFAULT_LOCALE
  const [value, setLocale] = useState<ProLocale>(() =>
    readPreference(DEFAULT_STORAGE_KEY, fallback))

  const setValue = useCallback((nextValue: ProLocale) => {
    persistPreference(DEFAULT_STORAGE_KEY, nextValue)
    setLocale(nextValue)
  }, [])

  return useMemo(() => ({ value, setValue }), [setValue, value])
}

function readPreference(storageKey: string, fallback: ProLocale): ProLocale {
  if (typeof window === 'undefined')
    return fallback

  try {
    const storedValue = window.localStorage.getItem(storageKey)
    return isProLocale(storedValue) ? storedValue : fallback
  } catch {
    return fallback
  }
}

function persistPreference(storageKey: string, value: ProLocale) {
  if (typeof window === 'undefined')
    return

  try {
    window.localStorage.setItem(storageKey, value)
  } catch {
    // localStorage 不可用时仍保留内存状态，不能让持久化失败打断语言切换。
  }
}

function isProLocale(value: unknown): value is ProLocale {
  return value === 'zh-CN' || value === 'en-US' || value === 'vi-VN' || value === 'my-MM'
}

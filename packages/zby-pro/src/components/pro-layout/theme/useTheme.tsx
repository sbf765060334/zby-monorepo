import { createContext, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'

import type { UseThemePreferenceReturn, UseThemeReturn } from './types'

const ProThemeContext = createContext<UseThemeReturn | null>(null)

export interface ProThemeProviderProps {
  /** 同一次 useThemePreference() 的返回值。 */
  value: UseThemePreferenceReturn
  children?: ReactNode
}

/** 把根组件的主题偏好提供给业务侧的 useTheme。 */
export function ProThemeProvider(props: ProThemeProviderProps) {
  const { value, children } = props
  const theme = useMemo<UseThemeReturn>(() => ({
    theme: value.value.mode,
    resolvedTheme: value.appearance,
    density: value.value.density,
  }), [value.appearance, value.value.density, value.value.mode])

  return <ProThemeContext.Provider value={theme}>{children}</ProThemeContext.Provider>
}

/** 读取 ProThemeProvider 中当前生效的主题。 */
export function useTheme(): UseThemeReturn {
  const theme = useContext(ProThemeContext)
  if (!theme) {
    throw new Error('useTheme must be used within ProThemeProvider')
  }
  return theme
}

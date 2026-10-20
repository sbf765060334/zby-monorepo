// 运行时选择器和偏好 hook 留在布局内部。对外只从布局 store 读取 useTheme / useLocale。
export { default as ProThemeSwitch } from './ThemeSwitch'
export { useThemePreference } from './useThemePreference'
export { useLocale, useTheme } from '../metrics'
export {
  toThemeSeedToken,
  useThemeSeedPreference,
} from './useThemeSeedPreference'

export type { ProThemeSwitchProps } from './ThemeSwitch'
export type { UseLocaleReturn } from '../metrics'
export type {
  ProThemeAppearance,
  ProThemeDensity,
  ProThemeMode,
  ProThemePreference,
  ProThemeSeedPreference,
  UseThemePreferenceOptions,
  UseThemePreferenceReturn,
  UseThemeReturn,
  UseThemeSeedPreferenceOptions,
  UseThemeSeedPreferenceReturn,
} from './types'

// 公开运行时 API：受控选择器和可选的偏好状态 hook。
export { default as ProThemeSwitch } from './ThemeSwitch'
export { useThemePreference } from './useThemePreference'
export {
  toThemeSeedToken,
  useThemeSeedPreference,
} from './useThemeSeedPreference'

// 公开类型统一从 theme 入口转发，业务无需依赖内部文件路径。
export type { ProThemeSwitchProps } from './ThemeSwitch'
export type {
  ProThemeAppearance,
  ProThemeDensity,
  ProThemeMode,
  ProThemePreference,
  ProThemeSeedPreference,
  UseThemePreferenceOptions,
  UseThemePreferenceReturn,
  UseThemeSeedPreferenceOptions,
  UseThemeSeedPreferenceReturn,
} from './types'

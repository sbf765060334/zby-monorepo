/** 用户可选择的明暗模式；auto 会在运行时解析为实际外观。 */
export type ProThemeMode = 'auto' | 'light' | 'dark'
/** 当前真正生效的明暗外观，不包含尚未解析的 auto。 */
export type ProThemeAppearance = Exclude<ProThemeMode, 'auto'>
/** 与明暗模式相互独立的布局密度。 */
export type ProThemeDensity = 'default' | 'compact'

/** 需要持久化并交给主题按钮编辑的完整用户偏好。 */
export interface ProThemePreference {
  /** 明暗模式。 */
  mode: ProThemeMode
  /** 布局密度。 */
  density: ProThemeDensity
}

/** useThemePreference 的初始化和持久化配置。 */
export interface UseThemePreferenceOptions {
  /** 没有有效本地记录时使用的初始偏好，缺省字段回落到浅色和默认布局。 */
  defaultValue?: Partial<ProThemePreference>
  /** localStorage 键名。 */
  storageKey?: string
}

/** 业务 ConfigProvider 与 ProThemeSwitch 之间共享的主题状态。 */
export interface UseThemePreferenceReturn {
  /** 用户选择的原始偏好。 */
  value: ProThemePreference
  /** mode 解析后的实际明暗外观，业务用它选择 antd 明暗算法。 */
  appearance: ProThemeAppearance
  /** 一次性更新完整偏好，主要供受控主题按钮使用。 */
  setValue: (value: ProThemePreference) => void
  /** 只更新明暗模式。 */
  setMode: (mode: ProThemeMode) => void
  /** 只更新布局密度。 */
  setDensity: (density: ProThemeDensity) => void
}

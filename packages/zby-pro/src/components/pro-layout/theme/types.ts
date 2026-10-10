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

/**
 * 可持久化的全局种子。
 * 颜色字段为 null 时表示继续跟随 antd 的默认关系，例如信息色跟随品牌色。
 */
export interface ProThemeSeedPreference {
  /** 品牌色。 */
  colorPrimary: string
  /** 成功色。 */
  colorSuccess: string
  /** 警戒色。 */
  colorWarning: string
  /** 错误色。 */
  colorError: string
  /** 信息色。null 表示使用品牌色。 */
  colorInfo: string | null
  /** 链接色。null 表示使用品牌色。 */
  colorLink: string | null
  /** 基础文本色。null 表示交给当前明暗算法。 */
  colorTextBase: string | null
  /** 基础背景色。null 表示交给当前明暗算法。 */
  colorBgBase: string | null
  /** 基础字号。 */
  fontSize: number
  /** 尺寸步长。紧凑算法会在此基础上再减 2。 */
  sizeStep: number
  /** 尺寸变化单位，间距档位都乘以它。 */
  sizeUnit: number
  /** 基础圆角。 */
  borderRadius: number
  /** 是否使用线框风格。 */
  wireframe: boolean
}

/** useThemeSeedPreference 的初始化和持久化配置。 */
export interface UseThemeSeedPreferenceOptions {
  /** 没有有效本地记录时使用的种子；缺省字段回落到 antd 预设。 */
  defaultValue?: Partial<ProThemeSeedPreference>
}

/** 业务 ConfigProvider 与个性化面板之间共享的种子状态。 */
export interface UseThemeSeedPreferenceReturn {
  /** 最近一次确定后的种子。 */
  value: ProThemeSeedPreference
  /** 最近一次确定后的配置正文，包含用户留下的默认值和未识别字段。 */
  config: Record<string, unknown>
  /** 确定后提交完整种子和配置正文，并写入本地存储。 */
  setValue: (value: ProThemeSeedPreference, config?: Record<string, unknown>) => void
}

/** useThemePreference 的初始化和持久化配置。 */
export interface UseThemePreferenceOptions {
  /** 没有有效本地记录时使用的初始偏好，缺省字段回落到浅色和默认布局。 */
  defaultValue?: Partial<ProThemePreference>
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

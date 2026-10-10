import type { ProThemeSeedPreference } from './types'

/** ProLayout 根节点与明暗切换动画共同使用的 View Transition 名称。 */
export const PRO_LAYOUT_THEME_VIEW_TRANSITION_NAME = 'zby-pro-layout-theme'

/** antd 6 全局种子预设。恢复默认回到这组值，不采用业务传入的 defaultValue。 */
export const ANTD_THEME_SEED: ProThemeSeedPreference = {
  colorPrimary: '#1677ff',
  colorSuccess: '#52c41a',
  colorWarning: '#faad14',
  colorError: '#ff4d4f',
  colorInfo: null,
  colorLink: null,
  colorTextBase: null,
  colorBgBase: null,
  fontSize: 14,
  sizeStep: 4,
  sizeUnit: 4,
  borderRadius: 6,
  wireframe: false,
}

/** 字号滑杆范围，避开过小或过大的基础字号。 */
export const THEME_SEED_FONT_SIZE_RANGE = { min: 12, max: 20 } as const

/** 尺寸步长范围。下限 2 保证紧凑算法的 sizeStep - 2 不会变成负数。 */
export const THEME_SEED_SIZE_STEP_RANGE = { min: 2, max: 8 } as const

/** 尺寸变化单位范围。过小会把默认和紧凑两套间距一起压扁。 */
export const THEME_SEED_SIZE_UNIT_RANGE = { min: 2, max: 8 } as const

/** 圆角滑杆范围。16 是 antd 把 borderRadiusLG 封顶的位置。 */
export const THEME_SEED_RADIUS_RANGE = { min: 0, max: 16 } as const

/** 颜色选择器里的预设色，取 antd 默认色板并去掉已废弃的 pink 别名。 */
export const THEME_SEED_PRESET_COLORS = [
  '#1677ff',
  '#722ed1',
  '#13c2c2',
  '#52c41a',
  '#eb2f96',
  '#f5222d',
  '#fa8c16',
  '#fadb14',
  '#fa541c',
  '#2f54eb',
  '#faad14',
  '#a0d911',
] as const

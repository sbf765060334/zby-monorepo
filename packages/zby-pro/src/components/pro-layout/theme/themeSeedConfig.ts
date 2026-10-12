import {
  ANTD_THEME_SEED,
  THEME_SEED_FONT_SIZE_RANGE,
  THEME_SEED_RADIUS_RANGE,
  THEME_SEED_SIZE_STEP_RANGE,
  THEME_SEED_SIZE_UNIT_RANGE,
} from './constants'
import type { ProThemeSeedPreference } from './types'

/** 和种子存在同一条本地记录里，避免和种子字段重名。 */
export const THEME_SEED_CONFIG_FIELD = 'config'

/** 用户自己的主题配置。未知字段保留，读取种子时跳过。 */
export type ThemeSeedConfig = Record<string, unknown>

const SEED_KEYS = Object.keys(ANTD_THEME_SEED) as (keyof ProThemeSeedPreference)[]

/** 旧数据没有配置正文时，用已经偏离默认值的种子补一份，避免编辑器是空的。 */
export function deriveThemeSeedConfig(seed: ProThemeSeedPreference): ThemeSeedConfig {
  const config: ThemeSeedConfig = {}
  SEED_KEYS.forEach((key) => {
    if (seed[key] !== ANTD_THEME_SEED[key])
      config[key] = seed[key]
  })
  // 信息色跟随主色时，antd 仍把解析后的色值写进配置。
  if (seed.colorInfo == null && seed.colorPrimary !== ANTD_THEME_SEED.colorPrimary)
    config.colorInfo = seed.colorPrimary
  return config
}

/**
 * 外面的控件改种子时同步配置。
 * 信息色正在跟随主色时，改品牌色会把信息色写成同一个色值，开关本身保持跟随。
 */
export function syncThemeSeedConfigPatch(
  config: ThemeSeedConfig,
  draft: ProThemeSeedPreference,
  next: Partial<ProThemeSeedPreference>,
): ThemeSeedConfig {
  const after = { ...draft, ...next }
  let result = config
  ;(Object.keys(next) as (keyof ProThemeSeedPreference)[]).forEach((key) => {
    if (key === 'colorInfo' && next.colorInfo == null) {
      result = upsertThemeSeedConfig(result, 'colorInfo', after.colorPrimary)
      return
    }
    result = upsertThemeSeedConfig(result, key, next[key] as ProThemeSeedPreference[typeof key])
  })
  if (hasOwn(next, 'colorPrimary') && !hasOwn(next, 'colorInfo') && draft.colorInfo == null)
    result = upsertThemeSeedConfig(result, 'colorInfo', after.colorPrimary)
  return result
}

/** 字段重置删掉对应键。跟随中的信息色会随品牌色一起删掉，或在品牌色仍偏离默认时写回主色。 */
export function resetThemeSeedConfigField(
  config: ThemeSeedConfig,
  draft: ProThemeSeedPreference,
  key: keyof ProThemeSeedPreference,
): ThemeSeedConfig {
  let next = removeThemeSeedConfigField(config, key)
  if (key === 'colorPrimary' && draft.colorInfo == null)
    next = removeThemeSeedConfigField(next, 'colorInfo')
  if (key === 'colorInfo' && draft.colorPrimary !== ANTD_THEME_SEED.colorPrimary)
    next = upsertThemeSeedConfig(next, 'colorInfo', draft.colorPrimary)
  return next
}

export function stringifyThemeSeedConfig(config: ThemeSeedConfig) {
  return JSON.stringify(config, null, 2)
}

/** 根节点必须是对象。解析失败返回 null，调用方保留编辑器内容。 */
export function parseThemeSeedConfig(text: string): ThemeSeedConfig | null {
  try {
    const parsed = JSON.parse(text) as unknown
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
      return null
    return parsed as ThemeSeedConfig
  } catch {
    return null
  }
}

export function themeSeedConfigEquals(left: ThemeSeedConfig, right: ThemeSeedConfig) {
  return JSON.stringify(left) === JSON.stringify(right)
}

/** 外面的控件改了哪个种子，配置里就写上这个字段，即使值回到了默认。 */
export function upsertThemeSeedConfig(
  config: ThemeSeedConfig,
  key: keyof ProThemeSeedPreference,
  value: ProThemeSeedPreference[keyof ProThemeSeedPreference],
) {
  if (hasOwn(config, key) && Object.is(config[key], value))
    return config
  return { ...config, [key]: value }
}

/** 只有字段重置会删掉对应键。 */
export function removeThemeSeedConfigField(
  config: ThemeSeedConfig,
  key: keyof ProThemeSeedPreference,
) {
  if (!hasOwn(config, key))
    return config
  const next = { ...config }
  delete next[key]
  return next
}

/**
 * 配置里没有的种子回到 antd 默认。
 * 字段在，但值不合法时不读取，草稿维持原值。
 */
export function applyThemeSeedConfig(
  config: ThemeSeedConfig,
  current: ProThemeSeedPreference,
): ProThemeSeedPreference {
  const colorPrimary = readColor(config, 'colorPrimary', current.colorPrimary)
  return {
    colorPrimary,
    colorSuccess: readColor(config, 'colorSuccess', current.colorSuccess),
    colorWarning: readColor(config, 'colorWarning', current.colorWarning),
    colorError: readColor(config, 'colorError', current.colorError),
    colorInfo: resolveFollowedColor(config, 'colorInfo', colorPrimary, current.colorInfo),
    colorLink: readOptionalColor(config, 'colorLink', current.colorLink),
    colorTextBase: readOptionalColor(config, 'colorTextBase', current.colorTextBase),
    colorBgBase: readOptionalColor(config, 'colorBgBase', current.colorBgBase),
    fontSize: readNumber(config, 'fontSize', THEME_SEED_FONT_SIZE_RANGE.min, THEME_SEED_FONT_SIZE_RANGE.max, current.fontSize),
    sizeStep: readNumber(config, 'sizeStep', THEME_SEED_SIZE_STEP_RANGE.min, THEME_SEED_SIZE_STEP_RANGE.max, current.sizeStep),
    sizeUnit: readNumber(config, 'sizeUnit', THEME_SEED_SIZE_UNIT_RANGE.min, THEME_SEED_SIZE_UNIT_RANGE.max, current.sizeUnit),
    borderRadius: readNumber(config, 'borderRadius', THEME_SEED_RADIUS_RANGE.min, THEME_SEED_RADIUS_RANGE.max, current.borderRadius),
    wireframe: readWireframe(config, current.wireframe),
  }
}

export function readStoredThemeSeedConfig(
  input: unknown,
  seed: ProThemeSeedPreference,
): ThemeSeedConfig {
  if (!isRecord(input) || !hasOwn(input, THEME_SEED_CONFIG_FIELD))
    return deriveThemeSeedConfig(seed)
  const config = input[THEME_SEED_CONFIG_FIELD]
  if (!isRecord(config))
    return deriveThemeSeedConfig(seed)
  return { ...config }
}

function readColor(
  config: ThemeSeedConfig,
  key: 'colorPrimary' | 'colorSuccess' | 'colorWarning' | 'colorError',
  current: string,
) {
  if (!hasOwn(config, key))
    return ANTD_THEME_SEED[key]
  return readHex(config[key]) ?? current
}

function resolveFollowedColor(
  config: ThemeSeedConfig,
  key: 'colorInfo',
  colorPrimary: string,
  current: string | null,
) {
  const value = readOptionalColor(config, key, current)
  // 跟随主色时，配置里的信息色就是当前品牌色，不要因此关掉「使用主色」。
  if (current == null && value === colorPrimary)
    return null
  return value
}

function readOptionalColor(
  config: ThemeSeedConfig,
  key: 'colorInfo' | 'colorLink' | 'colorTextBase' | 'colorBgBase',
  current: string | null,
) {
  if (!hasOwn(config, key))
    return ANTD_THEME_SEED[key]
  if (config[key] === null)
    return null
  return readHex(config[key]) ?? current
}

function readNumber(
  config: ThemeSeedConfig,
  key: 'fontSize' | 'sizeStep' | 'sizeUnit' | 'borderRadius',
  min: number,
  max: number,
  current: number,
) {
  if (!hasOwn(config, key))
    return ANTD_THEME_SEED[key]
  const value = config[key]
  if (typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max)
    return value
  return current
}

function readWireframe(config: ThemeSeedConfig, current: boolean) {
  if (!hasOwn(config, 'wireframe'))
    return ANTD_THEME_SEED.wireframe
  return typeof config.wireframe === 'boolean' ? config.wireframe : current
}

function readHex(value: unknown) {
  if (typeof value !== 'string')
    return undefined
  const hex = expandHex(value.trim().toLowerCase())
  return /^#[0-9a-f]{6}$/.test(hex) ? hex : undefined
}

function expandHex(value: string) {
  if (/^#[0-9a-f]{3}$/.test(value))
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
  return /^#[0-9a-f]{8}$/.test(value) ? value.slice(0, 7) : value
}

function hasOwn(target: object, key: PropertyKey) {
  // eslint-disable-next-line e18e/prefer-object-has-own -- current TS lib target does not expose Object.hasOwn
  return Object.prototype.hasOwnProperty.call(target, key)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

import { generate } from '@ant-design/colors'

export interface SiderPalette {
  /** 侧栏渐变上端，取主色较深色阶后再压暗。 */
  gradientStart: string
  /** 侧栏渐变下端，取主色最深色阶后再压暗。 */
  gradientEnd: string
  /** 底部分割线，位于渐变两端之间。 */
  divider: string
  /** 默认文字，白色半透明，保证换主色后仍可读。 */
  text: string
  /** 悬停文字。 */
  textHover: string
  /** 选中文字和左侧指示条。 */
  textActive: string
}

const START_NEUTRAL = '#12141c'
const END_NEUTRAL = '#07080c'
const DIVIDER_NEUTRAL = '#10131a'

const FALLBACK_PALETTE: SiderPalette = {
  gradientStart: '#384386',
  gradientEnd: '#11162f',
  divider: '#30354f',
  text: 'rgba(255, 255, 255, 0.55)',
  textHover: 'rgba(255, 255, 255, 0.78)',
  textActive: '#ffffff',
}

/** 由品牌色派生侧栏深色渐变。侧栏不跟随内容区的明暗背景翻转。 */
export function deriveSiderPalette(colorPrimary: string): SiderPalette {
  if (!/^#[0-9a-f]{6}$/i.test(colorPrimary))
    return FALLBACK_PALETTE

  const palette = generate(colorPrimary)
  return {
    gradientStart: mixHex(palette[7], START_NEUTRAL, 42),
    gradientEnd: mixHex(palette[9], END_NEUTRAL, 58),
    divider: mixHex(palette[8], DIVIDER_NEUTRAL, 50),
    text: FALLBACK_PALETTE.text,
    textHover: FALLBACK_PALETTE.textHover,
    textActive: FALLBACK_PALETTE.textActive,
  }
}

/** amount 是 target 所占百分比，与 FastColor.mix 的方向一致。 */
function mixHex(source: string, target: string, targetAmount: number) {
  const from = parseHex(source)
  const to = parseHex(target)
  const ratio = targetAmount / 100
  const channel = (start: number, end: number) => Math.round(start + (end - start) * ratio)
  return formatHex(
    channel(from.r, to.r),
    channel(from.g, to.g),
    channel(from.b, to.b),
  )
}

function parseHex(value: string) {
  const hex = value.slice(1)
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  }
}

function formatHex(red: number, green: number, blue: number) {
  return `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

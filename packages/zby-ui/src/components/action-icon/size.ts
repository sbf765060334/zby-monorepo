/**
 * 文件职责：根据 antd 主题 token 推导 ActionIcon 三档按钮尺寸和三档图标字号。
 *
 * 这里不直接写死像素值。这样用户调整全局字号、行高或间距 token 时，ActionIcon 也会
 * 跟着主题一起缩放；开启 CSS 变量模式后，同一套公式仍然可以直接交给浏览器计算。
 */
import { unit } from '@ant-design/cssinjs'

/** 主题 token 既可能是普通数字，也可能是 `var(--xxx)` 这样的 CSS 字符串。 */
type SizeValue = number | string

/** 尺寸计算真正需要的最小主题 token 集合，避免工具函数依赖整份 antd 主题对象。 */
export interface ActionIconSizeTokenSource {
  /** 基础正文的字号。 */
  fontSize: SizeValue
  /** antd 的大号正文字号，也是小号 ActionIcon 图标的计算起点。 */
  fontSizeLG: SizeValue
  /** 基础文字的无单位行高倍数，用来算出正文实际占用的高度。 */
  lineHeight: SizeValue
  /** 最小间距，负责拉开相邻尺寸档位。 */
  paddingXXS: SizeValue
  /** 小号间距，用来得到大号按钮的点击区域。 */
  paddingXS: SizeValue
}

/**
 * 根据基础字号和行高 token 计算正文实际行盒高度。
 *
 * 两个值都是数字时直接在 JavaScript 中计算并四舍五入；只要包含 CSS 变量，就返回
 * calc 表达式，让浏览器等变量有了实际值后再完成乘法。
 */
function getTextLineHeight(fontSize: SizeValue, lineHeight: SizeValue): SizeValue {
  if (typeof fontSize === 'number' && typeof lineHeight === 'number') {
    return Math.round(fontSize * lineHeight)
  }

  // unit 会给普通数字补 px，但会原样保留 CSS 变量和已有单位的字符串。
  return `calc(${unit(fontSize)} * ${lineHeight})`
}

/**
 * 去掉最外层 calc 包装。
 * 例如 addSize 可能接收到 `calc(var(--font-size) * 1.5)`；先拆掉外层，才能安全拼成
 * `calc(var(--font-size) * 1.5 + 4px)`，避免生成不必要的嵌套 calc。
 */
function unwrapCalc(value: string) {
  return value.startsWith('calc(') ? value.slice(5, -1) : value
}

/** 在数字 token 和 CSS 变量 token 下统一完成尺寸相加。 */
function addSize(value: SizeValue, offset: SizeValue): SizeValue {
  // 纯数字可以立即得到结果，最终由 css-in-js 的 unit 逻辑补上 px。
  if (typeof value === 'number' && typeof offset === 'number') return value + offset

  // 任意一项是字符串时保留 CSS 表达式，主题变量仍可在运行时动态变化。
  return `calc(${unwrapCalc(unit(value))} + ${unwrapCalc(unit(offset))})`
}

/** 在数字 token 和 CSS 变量 token 下取得尺寸的一部分。 */
function divideSize(value: SizeValue, divisor: number): SizeValue {
  // 与 addSize 相同：数字直接计算，CSS 字符串交给浏览器计算。
  if (typeof value === 'number') return value / divisor

  return `calc(${unwrapCalc(unit(value))} / ${divisor})`
}

/**
 * 计算按钮点击区域的三档宽高。
 *
 * small 直接采用正文行盒高度；middle 在它上面增加 paddingXXS；large 增加 paddingXS。
 * 默认主题下得到 22 / 26 / 30px，同时会跟随字体、行高和间距主题变化。
 */
export function getActionIconSizes(token: ActionIconSizeTokenSource) {
  // 三个档位共享同一个起点，避免分别计算后出现不一致。
  const small = getTextLineHeight(token.fontSize, token.lineHeight)

  return {
    small,
    middle: addSize(small, token.paddingXXS),
    large: addSize(small, token.paddingXS),
  }
}

/**
 * 计算图标本身的三档字号。
 *
 * small 以 fontSizeLG 起步，middle 增加半个 paddingXXS，large 增加一个 paddingXXS。
 * 默认主题下得到 16 / 18 / 20px，保持三档图标和点击区域同步放大。
 */
export function getActionIconFontSizes(token: ActionIconSizeTokenSource) {
  // 先保存共同基准，下面三项的关系会更直观。
  const small = token.fontSizeLG

  return {
    small,
    middle: addSize(small, divideSize(token.paddingXXS, 2)),
    large: addSize(small, token.paddingXXS),
  }
}

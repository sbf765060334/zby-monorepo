import { unit } from '@ant-design/cssinjs'

type SizeValue = number | string

export interface ActionIconSizeTokenSource {
  fontSize: SizeValue
  lineHeight: SizeValue
  paddingXXS: SizeValue
  paddingXS: SizeValue
}

/** 根据公开字号和行高 token 计算正文实际行盒高度。 */
function getTextLineHeight(fontSize: SizeValue, lineHeight: SizeValue): SizeValue {
  if (typeof fontSize === 'number' && typeof lineHeight === 'number') {
    return Math.round(fontSize * lineHeight)
  }

  return `calc(${unit(fontSize)} * ${lineHeight})`
}

/** 去掉外层 calc，避免组合 CSS 变量时生成无效的嵌套表达式。 */
function unwrapCalc(value: string) {
  return value.startsWith('calc(') ? value.slice(5, -1) : value
}

/** 在数字 token 和 CSS 变量 token 下统一完成尺寸相加。 */
function addSize(value: SizeValue, offset: SizeValue): SizeValue {
  if (typeof value === 'number' && typeof offset === 'number') return value + offset

  return `calc(${unwrapCalc(unit(value))} + ${unwrapCalc(unit(offset))})`
}

/**
 * 三档尺寸以正文行盒为起点，并使用间距 token 递增。
 * 默认主题下得到 22 / 26 / 30px，同时会跟随字体、行高和间距主题变化。
 */
export function getActionIconSizes(token: ActionIconSizeTokenSource) {
  const small = getTextLineHeight(token.fontSize, token.lineHeight)

  return {
    small,
    middle: addSize(small, token.paddingXXS),
    large: addSize(small, token.paddingXS),
  }
}

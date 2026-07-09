import type { DateInput } from './types'

// 根据 locale 格式化日期。
// 这里直接使用浏览器/Node 内置的 Intl.DateTimeFormat，避免再引入 dayjs/date-fns 等依赖。
export function formatDate(
  locale: string,
  value: DateInput,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = value instanceof Date ? value : new Date(value)

  // 无效日期返回空字符串，避免 UI 上出现 Invalid Date。
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat(locale, options).format(date)
}

// 根据 locale 格式化数字。
// options 可用于金额、百分比、小数位等场景，例如 { style: 'currency', currency: 'USD' }。
export function formatNumber(
  locale: string,
  value: number,
  options?: Intl.NumberFormatOptions,
): string {
  // NaN/Infinity 不适合作为界面文案展示，统一返回空字符串。
  if (!Number.isFinite(value)) {
    return ''
  }

  return new Intl.NumberFormat(locale, options).format(value)
}

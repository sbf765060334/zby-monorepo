import type { CSSProperties } from 'react'

export type AutoWidthKind = 'input' | 'picker' | 'select'

export type SearchControlFieldNames = {
  children?: string
  label?: string
  title?: string
  value?: string
}

export type SearchControlProps = {
  'aria-labelledby'?: string
  allowClear?: unknown
  fieldNames?: SearchControlFieldNames
  maxTagCount?: unknown
  mode?: unknown
  multiple?: boolean
  options?: unknown
  placeholder?: unknown
  style?: CSSProperties
  treeData?: unknown
}

export type SearchSizeToken = {
  controlHeight: number
  fontFamily: string
  fontSize: number
  fontSizeIcon: number
  lineWidth: number
  marginXXS: number
  marginXS: number
  paddingSM: number
  paddingXS: number
  paddingXXS: number
}

export type SelectMeasurePlan = {
  labels: string[]
  mode: 'single' | 'tags'
  restCount: number
}

const CASCADER_PATH_SEPARATOR = ' / '
const SELECT_SEARCH_MIN_WIDTH = 4
const SELECT_TAG_CLOSE_SIZE = 10
const SELECT_TAG_LAYOUT_SLACK = 1

let measureContext: CanvasRenderingContext2D | null | undefined
let measureFont = ''

export function getElementName(type: unknown) {
  if (typeof type === 'string') {
    return type
  }

  if (type && (typeof type === 'function' || typeof type === 'object')) {
    const named = type as { displayName?: string; name?: string }
    return named.displayName ?? named.name ?? ''
  }

  return ''
}

export function getAutoWidthKind(name: string): AutoWidthKind | null {
  if (
    name === 'Input' ||
    name === 'Search' ||
    name === 'Password' ||
    name === 'TextArea' ||
    name.startsWith('Input.')
  ) {
    return 'input'
  }

  if (
    name === 'DatePicker' ||
    name === 'TimePicker' ||
    name === 'RangePicker' ||
    name === 'WeekPicker' ||
    name === 'MonthPicker' ||
    name === 'QuarterPicker' ||
    name === 'YearPicker'
  ) {
    return 'picker'
  }

  if (name === 'Select' || name === 'Cascader' || name === 'TreeSelect') {
    return 'select'
  }

  return null
}

export function hasSearchValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.some((item) => item != null && item !== '')
  }

  return value != null && value !== ''
}

export function hasExplicitWidth(width: CSSProperties['width']) {
  return width != null && width !== '' && width !== 'auto'
}

export function getSelectMeasurePlan(
  props: SearchControlProps,
  value: unknown,
  elementName: string,
): SelectMeasurePlan | undefined {
  if (!hasSearchValue(value)) {
    return undefined
  }

  const options = collectOptions(props)
  const names = getFieldNames(props, elementName)

  if (isMultipleControl(props)) {
    const items = Array.isArray(value)
      ? value.filter((item) => item != null && item !== '')
      : []
    const labels = items
      .map((item) => formatSelectItem(item, options, names, elementName, true))
      .filter(Boolean)
    if (labels.length === 0) {
      return undefined
    }

    const limit = resolveVisibleTagLimit(props.maxTagCount, labels.length)
    return {
      labels: labels.slice(0, limit),
      mode: 'tags',
      restCount: labels.length - limit,
    }
  }

  const text = formatSelectItem(value, options, names, elementName, false)
  if (!text) {
    return undefined
  }

  return {
    labels: [text],
    mode: 'single',
    restCount: 0,
  }
}

export function measureContentWidth(
  kind: AutoWidthKind,
  props: SearchControlProps,
  value: unknown,
  token: SearchSizeToken,
  elementName: string,
) {
  if (kind === 'select') {
    const plan = getSelectMeasurePlan(props, value, elementName)
    if (!plan) {
      return undefined
    }

    if (plan.mode === 'tags') {
      return measureTagListWidth(plan.labels, plan.restCount, token)
    }

    return measureText(plan.labels[0] ?? '', token)
  }

  if (Array.isArray(value)) {
    const texts = value
      .map((item) => (item == null || item === '' ? '' : String(item)))
      .filter(Boolean)
    if (texts.length === 0) {
      return undefined
    }

    return texts.reduce((sum, text) => sum + measureText(text, token), 0)
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return measureText(String(value), token)
  }

  return undefined
}

export function resolveInlineSearchControlStyle(
  kind: AutoWidthKind,
  props: SearchControlProps,
  value: unknown,
  token: SearchSizeToken,
  elementName: string,
) {
  const style = props.style
  if (hasExplicitWidth(style?.width)) {
    return style
  }

  const extra = controlExtraWidth(kind, props, token)
  const userMin = toPx(style?.minWidth)
  const minContent = token.fontSize * 2
  const contentWidth = measureContentWidth(kind, props, value, token, elementName)
  const placeholderWidth = measurePlaceholderWidth(props.placeholder, token)
  const placeholderInset =
    kind === 'select' && isMultipleControl(props) ? selectMultiplePlaceholderInset(token) : 0
  const placeholderSlack = kind === 'select' ? SELECT_TAG_LAYOUT_SLACK : 0
  const autoWidth = hasSearchValue(value)
    ? Math.max(
        Math.ceil((contentWidth ?? 0) + (contentWidth ? extra : 0)),
        userMin,
        minContent,
      )
    : Math.max(
        placeholderWidth != null
          ? Math.ceil(placeholderWidth + extra + placeholderInset + placeholderSlack)
          : token.controlHeight * 4,
        userMin,
      )

  const nextStyle: CSSProperties = { ...style, minWidth: autoWidth }
  if (kind === 'select') {
    nextStyle.width = autoWidth
  }

  return nextStyle
}

export function resolveAutoWidthMaxTagCount(props: SearchControlProps, value: unknown) {
  if (hasExplicitWidth(props.style?.width) || props.maxTagCount !== 'responsive') {
    return props.maxTagCount
  }

  const total = Array.isArray(value)
    ? value.filter((item) => item != null && item !== '').length
    : 0

  return total > 0 ? total : props.maxTagCount
}

function isMultipleControl(props: SearchControlProps) {
  return props.mode === 'multiple' || props.multiple === true
}

function collectOptions(props: SearchControlProps) {
  if (Array.isArray(props.options)) {
    return props.options
  }

  if (Array.isArray(props.treeData)) {
    return props.treeData
  }

  return []
}

function getFieldNames(props: SearchControlProps, elementName: string) {
  const isTree = elementName === 'TreeSelect'
  return {
    children: props.fieldNames?.children ?? 'children',
    label: props.fieldNames?.label ?? (isTree ? 'title' : 'label'),
    title: props.fieldNames?.title ?? 'title',
    value: props.fieldNames?.value ?? 'value',
  }
}

function asRecord(value: unknown) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
}

function optionText(option: Record<string, unknown>, names: ReturnType<typeof getFieldNames>) {
  const raw = option[names.label] ?? option[names.title]
  if (typeof raw === 'string' || typeof raw === 'number') {
    return String(raw)
  }
}

function fallbackText(value: unknown) {
  if (value == null || value === '') {
    return ''
  }

  return String(value)
}

function findOptionLabel(
  list: unknown[],
  value: unknown,
  names: ReturnType<typeof getFieldNames>,
): string | undefined {
  for (const item of list) {
    const rec = asRecord(item)
    if (!rec) {
      if (item === value) {
        return fallbackText(item)
      }
      continue
    }

    if (rec[names.value] === value) {
      return optionText(rec, names) ?? fallbackText(value)
    }

    const nested = rec[names.children] ?? rec.options
    if (Array.isArray(nested)) {
      const found = findOptionLabel(nested, value, names)
      if (found) {
        return found
      }
    }
  }
}

function pathLabels(
  options: unknown[],
  path: unknown[],
  names: ReturnType<typeof getFieldNames>,
) {
  const labels: string[] = []
  let current: unknown[] | undefined = options

  for (const segment of path) {
    const rec: Record<string, unknown> | undefined = Array.isArray(current)
      ? current
          .map(asRecord)
          .find((item): item is Record<string, unknown> => item != null && item[names.value] === segment)
      : undefined

    if (rec) {
      labels.push(optionText(rec, names) ?? fallbackText(segment))
      const children: unknown = rec[names.children]
      current = Array.isArray(children) ? children : undefined
      continue
    }

    labels.push(fallbackText(segment))
    current = undefined
  }

  return labels.filter(Boolean)
}

function formatSelectItem(
  item: unknown,
  options: unknown[],
  names: ReturnType<typeof getFieldNames>,
  elementName: string,
  multiple: boolean,
) {
  if (Array.isArray(item)) {
    const labels = pathLabels(options, item, names)
    if (labels.length === 0) {
      return ''
    }

    if (elementName === 'Cascader' && multiple) {
      return labels[labels.length - 1] ?? ''
    }

    return labels.join(CASCADER_PATH_SEPARATOR)
  }

  return findOptionLabel(options, item, names) ?? fallbackText(item)
}

function resolveVisibleTagLimit(maxTagCount: unknown, total: number) {
  if (typeof maxTagCount === 'number' && Number.isFinite(maxTagCount)) {
    return Math.min(total, Math.max(0, Math.floor(maxTagCount)))
  }

  return total
}

function measureTagListWidth(labels: string[], restCount: number, token: SearchSizeToken) {
  let width = 0

  for (const text of labels) {
    width += measureSelectTagWidth(text, token, true)
  }

  if (restCount > 0) {
    width += measureSelectTagWidth(formatRestTagLabel(restCount), token, false)
  }

  return width + SELECT_SEARCH_MIN_WIDTH
}

function formatRestTagLabel(restCount: number) {
  return `+ ${restCount} ...`
}

function measureSelectTagWidth(text: string, token: SearchSizeToken, closable: boolean) {
  const itemMargin = Math.floor(token.paddingXXS / 2)
  const closeChrome = closable ? SELECT_TAG_CLOSE_SIZE + token.paddingXXS : 0
  return (
    Math.ceil(
      measureText(text, token) +
        token.paddingXS +
        token.paddingXXS +
        closeChrome +
        itemMargin * 2 +
        token.lineWidth,
    ) + SELECT_TAG_LAYOUT_SLACK
  )
}

function placeholderTexts(placeholder: unknown) {
  if (typeof placeholder === 'string' && placeholder) {
    return [placeholder]
  }

  if (Array.isArray(placeholder)) {
    return placeholder.filter((item): item is string => typeof item === 'string' && item.length > 0)
  }

  return []
}

function measurePlaceholderWidth(placeholder: unknown, token: SearchSizeToken) {
  const texts = placeholderTexts(placeholder)
  if (texts.length === 0) {
    return undefined
  }

  return texts.reduce((sum, text) => sum + measureText(text, token), 0)
}

function selectInlinePad(token: SearchSizeToken) {
  return Math.max(token.paddingSM - token.lineWidth, 0)
}

function selectArrowReserve(token: SearchSizeToken) {
  return Math.max(Math.ceil(token.fontSize * 1.25), token.fontSizeIcon)
}

function selectMultipleStartPad(token: SearchSizeToken) {
  const itemHeight = Math.min(
    token.controlHeight - token.paddingXXS * 2,
    token.controlHeight - token.lineWidth * 2,
  )
  return Math.max((token.controlHeight - itemHeight) / 2 - token.lineWidth, 0)
}

function selectMultiplePlaceholderInset(token: SearchSizeToken) {
  const itemMargin = Math.floor(token.paddingXXS / 2)
  return Math.max(
    selectInlinePad(token) - selectMultipleStartPad(token) + itemMargin - token.lineWidth * 2,
    0,
  )
}

function controlExtraWidth(kind: AutoWidthKind, props: SearchControlProps, token: SearchSizeToken) {
  const inlinePad = selectInlinePad(token)

  if (kind === 'select') {
    const arrowReserve = selectArrowReserve(token)
    const borders = token.lineWidth * 2
    if (isMultipleControl(props)) {
      return selectMultipleStartPad(token) + inlinePad + arrowReserve + borders
    }
    return inlinePad * 2 + arrowReserve + borders
  }

  if (kind === 'picker' && Array.isArray(props.placeholder)) {
    return inlinePad * 2 + token.marginXS + token.fontSizeIcon
  }

  if (kind === 'input') {
    const suffixChrome = props.allowClear ? token.fontSizeIcon + token.marginXXS : 0
    return inlinePad * 2 + suffixChrome
  }

  return inlinePad * 2 + token.fontSizeIcon + token.marginXXS
}

function toPx(value: CSSProperties['minWidth']) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.endsWith('px')) {
    const next = Number.parseFloat(value)
    return Number.isFinite(next) ? next : 0
  }

  return 0
}

function estimateTextWidth(text: string, fontSize: number) {
  let width = 0
  const latin = fontSize * (8 / 14)
  for (const char of text) {
    width += char.charCodeAt(0) > 255 ? fontSize : latin
  }
  return width
}

function measureText(text: string, token: SearchSizeToken) {
  if (!text) {
    return 0
  }

  const font = `${token.fontSize}px ${token.fontFamily}`

  try {
    if (typeof document !== 'undefined') {
      if (measureContext === undefined) {
        const context = document.createElement('canvas').getContext('2d')
        measureContext = context ?? null
      }

      if (measureContext) {
        if (measureFont !== font) {
          measureContext.font = font
          measureFont = font
        }
        const width = measureContext.measureText(text).width
        if (width > 0) {
          return width
        }
      }
    }
  } catch {
    measureContext = null
    measureFont = ''
  }

  return estimateTextWidth(text, token.fontSize)
}

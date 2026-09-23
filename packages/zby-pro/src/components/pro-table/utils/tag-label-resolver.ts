import type { ReactNode } from 'react'

export type ProTableSearchTagTextResolver<Query = Record<string, unknown>> = (
  value: unknown,
  query: Query,
) => ReactNode

export type ProTableSearchTagRawValue = string | number | boolean

export type ProTableSearchTagFieldNames = {
  label?: string
  value?: string
  options?: string
  children?: string
  title?: string
}

export type ProTableSearchTagOption = {
  label?: ReactNode
  value?: unknown
  options?: ProTableSearchTagOption[]
  children?: ProTableSearchTagOption[]
  title?: ReactNode
  [key: string]: unknown
}

export type ProTableSearchTagFallbackConfig = {
  emptyText?: ReactNode
  unknownText?: ReactNode
  renderUnknown?: (value: unknown) => ReactNode
}

export type ProTablePrimitiveTagTextResolverConfig = ProTableSearchTagFallbackConfig & {
  separator?: ReactNode
}

export type ProTableOptionTagTextResolverConfig = ProTablePrimitiveTagTextResolverConfig & {
  options?: Array<ProTableSearchTagOption | ProTableSearchTagRawValue>
  fieldNames?: ProTableSearchTagFieldNames
}

export type ProTableCascaderTagTextResolverConfig = ProTableSearchTagFallbackConfig & {
  options?: ProTableSearchTagOption[]
  fieldNames?: ProTableSearchTagFieldNames
  pathSeparator?: ReactNode
  multipleSeparator?: ReactNode
}

export type ProTableTreeSelectTagTextResolverConfig = ProTableOptionTagTextResolverConfig

export type ProTableDateTagTextResolverConfig = ProTableSearchTagFallbackConfig & {
  format?: string
  separator?: ReactNode
}

export type ProTableRangeTagTextResolverConfig = ProTableSearchTagFallbackConfig & {
  format?: string
  rangeSeparator?: ReactNode
  multipleSeparator?: ReactNode
}

export type ProTableBooleanTagTextResolverConfig = ProTableSearchTagFallbackConfig & {
  trueText?: ReactNode
  falseText?: ReactNode
}

const DEFAULT_EMPTY_TEXT = ''
const DEFAULT_MULTIPLE_SEPARATOR = '、'
const DEFAULT_PATH_SEPARATOR = ' / '
const DEFAULT_RANGE_SEPARATOR = ' ~ '
const DEFAULT_DATE_FORMAT = 'YYYY-MM-DD'
const DEFAULT_TIME_FORMAT = 'HH:mm:ss'
const TAG_OPTION_PREVIEW_COUNT = 3
const PATH_KEY_SEPARATOR = '\u001F'
const hasOwnProperty = Object.prototype.hasOwnProperty

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isEmptyValue(value: unknown) {
  return value === undefined || value === null || value === ''
}

function isEmptyTagValue(value: unknown) {
  return isEmptyValue(value) || (Array.isArray(value) && value.length === 0)
}

function getFieldNames(fieldNames?: ProTableSearchTagFieldNames) {
  return {
    label: fieldNames?.label ?? 'label',
    value: fieldNames?.value ?? 'value',
    options: fieldNames?.options ?? 'options',
    children: fieldNames?.children ?? 'children',
    title: fieldNames?.title ?? 'title',
  }
}

function getObjectValue(record: Record<string, unknown>, key: string) {
  return record[key]
}

function getLabeledValueLabel(value: unknown): ReactNode | undefined {
  if (isPlainRecord(value) && hasOwnProperty.call(value, 'label')) {
    return value.label as ReactNode
  }

  return undefined
}

function getLabeledValueValue(value: unknown) {
  if (isPlainRecord(value) && hasOwnProperty.call(value, 'value')) {
    return value.value
  }

  return value
}

function valueToKey(value: unknown) {
  const actualValue = getLabeledValueValue(value)
  return `${typeof actualValue}:${String(actualValue)}`
}

function pathToKey(path: unknown[]) {
  return path.map(valueToKey).join(PATH_KEY_SEPARATOR)
}

function joinNodes(nodes: ReactNode[], separator: ReactNode): ReactNode {
  if (nodes.length === 0) {
    return DEFAULT_EMPTY_TEXT
  }

  if (nodes.length === 1) {
    return nodes[0]
  }

  return nodes.flatMap((node, index) => (index === 0 ? [node] : [separator, node]))
}

function joinWithOverflow(nodes: ReactNode[], separator: ReactNode): ReactNode {
  if (nodes.length <= TAG_OPTION_PREVIEW_COUNT) {
    return joinNodes(nodes, separator)
  }

  return [joinNodes(nodes.slice(0, TAG_OPTION_PREVIEW_COUNT), separator), ` +${nodes.length - TAG_OPTION_PREVIEW_COUNT}`]
}

function resolveUnknownValue(value: unknown, config: ProTableSearchTagFallbackConfig): ReactNode {
  if (typeof config.renderUnknown === 'function') {
    return config.renderUnknown(value)
  }

  if (hasOwnProperty.call(config, 'unknownText')) {
    return config.unknownText
  }

  const labeledValueLabel = getLabeledValueLabel(value)
  if (!isEmptyValue(labeledValueLabel)) {
    return labeledValueLabel
  }

  const actualValue = getLabeledValueValue(value)
  if (isEmptyValue(actualValue)) {
    return config.emptyText ?? DEFAULT_EMPTY_TEXT
  }

  return String(actualValue)
}

function normalizeOption(
  option: ProTableSearchTagOption | ProTableSearchTagRawValue,
  fieldNames: ReturnType<typeof getFieldNames>,
) {
  if (typeof option === 'string' || typeof option === 'number' || typeof option === 'boolean') {
    return {
      label: option,
      value: option,
      children: undefined,
      options: undefined,
    }
  }

  const label =
    getObjectValue(option, fieldNames.label) ??
    getObjectValue(option, fieldNames.title) ??
    getObjectValue(option, fieldNames.value)

  return {
    label: label as ReactNode,
    value: getObjectValue(option, fieldNames.value),
    children: getObjectValue(option, fieldNames.children) as
      | Array<ProTableSearchTagOption | ProTableSearchTagRawValue>
      | undefined,
    options: getObjectValue(option, fieldNames.options) as
      | Array<ProTableSearchTagOption | ProTableSearchTagRawValue>
      | undefined,
  }
}

function buildOptionLabelMap(
  options: Array<ProTableSearchTagOption | ProTableSearchTagRawValue> | undefined,
  fieldNamesConfig?: ProTableSearchTagFieldNames,
) {
  const fieldNames = getFieldNames(fieldNamesConfig)
  const labelMap = new Map<unknown, ReactNode>()

  const visit = (items: Array<ProTableSearchTagOption | ProTableSearchTagRawValue> | undefined) => {
    items?.forEach((item) => {
      const option = normalizeOption(item, fieldNames)

      if (!isEmptyValue(option.value)) {
        labelMap.set(option.value, option.label)
      }

      visit(option.options)
      visit(option.children)
    })
  }

  visit(options)

  return labelMap
}

function buildCascaderPathIndex(
  options: ProTableSearchTagOption[] | undefined,
  fieldNamesConfig?: ProTableSearchTagFieldNames,
) {
  const fieldNames = getFieldNames(fieldNamesConfig)
  const pathMap = new Map<string, ReactNode[]>()
  const valuePathMap = new Map<unknown, ReactNode[]>()

  const visit = (
    items: ProTableSearchTagOption[] | undefined,
    parentValues: unknown[],
    parentLabels: ReactNode[],
  ) => {
    items?.forEach((item) => {
      const value = getObjectValue(item, fieldNames.value)
      const label =
        (getObjectValue(item, fieldNames.label) as ReactNode) ??
        (getObjectValue(item, fieldNames.title) as ReactNode) ??
        value
      const values = [...parentValues, value]
      const labels = [...parentLabels, label as ReactNode]

      pathMap.set(pathToKey(values), labels)
      if (!isEmptyValue(value)) {
        valuePathMap.set(value, labels)
      }

      visit(getObjectValue(item, fieldNames.children) as ProTableSearchTagOption[] | undefined, values, labels)
    })
  }

  visit(options, [], [])

  return { pathMap, valuePathMap }
}

function createOptionResolver(
  config: ProTableOptionTagTextResolverConfig,
): ProTableSearchTagTextResolver<any> {
  const labelMap = buildOptionLabelMap(config.options, config.fieldNames)
  const separator = config.separator ?? DEFAULT_MULTIPLE_SEPARATOR

  const resolveOne = (value: unknown): ReactNode => {
    if (isEmptyValue(value)) {
      return config.emptyText ?? DEFAULT_EMPTY_TEXT
    }

    const labeledValueLabel = getLabeledValueLabel(value)
    if (!isEmptyValue(labeledValueLabel)) {
      return labeledValueLabel
    }

    const actualValue = getLabeledValueValue(value)
    if (labelMap.has(actualValue)) {
      return labelMap.get(actualValue)
    }

    return resolveUnknownValue(value, config)
  }

  return ((value: unknown) => {
    if (isEmptyTagValue(value)) {
      return config.emptyText ?? DEFAULT_EMPTY_TEXT
    }

    if (Array.isArray(value)) {
      return joinWithOverflow(
        value.filter((item) => !isEmptyValue(item)).map(resolveOne),
        separator,
      )
    }

    return resolveOne(value)
  }) satisfies ProTableSearchTagTextResolver<any>
}

function normalizeCascaderPaths(value: unknown): unknown[][] {
  if (!Array.isArray(value)) {
    return []
  }

  if (value.length === 0) {
    return []
  }

  if (value.some(Array.isArray)) {
    return value.filter(Array.isArray)
  }

  return [value]
}

function resolveCascaderLabelPathFromValue(value: unknown): ReactNode[] {
  if (!Array.isArray(value)) {
    const label = getLabeledValueLabel(value)
    return !isEmptyValue(label) ? [label] : []
  }

  return value
    .map((item) => getLabeledValueLabel(item) ?? getLabeledValueValue(item))
    .filter((item) => !isEmptyValue(item)) as ReactNode[]
}

function padDatePart(value: number) {
  return String(value).padStart(2, '0')
}

function formatNativeDate(value: Date, format: string) {
  return format
    .replace(/YYYY/g, String(value.getFullYear()))
    .replace(/MM/g, padDatePart(value.getMonth() + 1))
    .replace(/DD/g, padDatePart(value.getDate()))
    .replace(/HH/g, padDatePart(value.getHours()))
    .replace(/mm/g, padDatePart(value.getMinutes()))
    .replace(/ss/g, padDatePart(value.getSeconds()))
}

function formatDateLike(value: unknown, format: string, config: ProTableSearchTagFallbackConfig) {
  if (isEmptyValue(value)) {
    return config.emptyText ?? DEFAULT_EMPTY_TEXT
  }

  if (
    isPlainRecord(value) &&
    typeof (value as { format?: (format: string) => ReactNode }).format === 'function'
  ) {
    return (value as { format: (format: string) => ReactNode }).format(format)
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatNativeDate(value, format)
  }

  return resolveUnknownValue(value, config)
}

export function createPrimitiveTagTextResolver(
  config: ProTablePrimitiveTagTextResolverConfig = {},
): ProTableSearchTagTextResolver<any> {
  const separator = config.separator ?? DEFAULT_MULTIPLE_SEPARATOR

  return ((value: unknown) => {
    if (isEmptyTagValue(value)) {
      return config.emptyText ?? DEFAULT_EMPTY_TEXT
    }

    if (Array.isArray(value)) {
      return joinNodes(
        value.filter((item) => !isEmptyValue(item)).map((item) => resolveUnknownValue(item, config)),
        separator,
      )
    }

    return resolveUnknownValue(value, config)
  }) satisfies ProTableSearchTagTextResolver<any>
}

export function createSelectTagTextResolver(
  config: ProTableOptionTagTextResolverConfig = {},
): ProTableSearchTagTextResolver<any> {
  return createOptionResolver(config)
}

export function createCascaderTagTextResolver(
  config: ProTableCascaderTagTextResolverConfig = {},
): ProTableSearchTagTextResolver<any> {
  const { pathMap, valuePathMap } = buildCascaderPathIndex(config.options, config.fieldNames)
  const pathSeparator = config.pathSeparator ?? DEFAULT_PATH_SEPARATOR
  const multipleSeparator = config.multipleSeparator ?? DEFAULT_MULTIPLE_SEPARATOR

  const resolvePath = (pathValue: unknown): ReactNode => {
    if (!Array.isArray(pathValue)) {
      const actualValue = getLabeledValueValue(pathValue)
      const labelPath = valuePathMap.get(actualValue)

      if (labelPath) {
        return joinNodes(labelPath, pathSeparator)
      }

      return resolveUnknownValue(pathValue, config)
    }

    const key = pathToKey(pathValue)
    const labelPath = pathMap.get(key)
    if (labelPath) {
      return joinNodes(labelPath, pathSeparator)
    }

    const fallbackPath = resolveCascaderLabelPathFromValue(pathValue)
    return fallbackPath.length > 0
      ? joinNodes(fallbackPath, pathSeparator)
      : resolveUnknownValue(pathValue.at(-1), config)
  }

  return ((value: unknown) => {
    if (isEmptyTagValue(value)) {
      return config.emptyText ?? DEFAULT_EMPTY_TEXT
    }

    const paths = normalizeCascaderPaths(value)
    if (paths.length > 0) {
      return joinWithOverflow(paths.map(resolvePath), multipleSeparator)
    }

    return resolvePath(value)
  }) satisfies ProTableSearchTagTextResolver<any>
}

export function createTreeSelectTagTextResolver(
  config: ProTableTreeSelectTagTextResolverConfig = {},
): ProTableSearchTagTextResolver<any> {
  return createOptionResolver({
    ...config,
    fieldNames: {
      label: 'title',
      ...config.fieldNames,
    },
  })
}

function createDateLikeResolver(
  config: ProTableDateTagTextResolverConfig,
  defaultFormat: string,
): ProTableSearchTagTextResolver<any> {
  const format = config.format ?? defaultFormat
  const separator = config.separator ?? DEFAULT_MULTIPLE_SEPARATOR

  return ((value: unknown) => {
    if (isEmptyTagValue(value)) {
      return config.emptyText ?? DEFAULT_EMPTY_TEXT
    }

    if (Array.isArray(value)) {
      return joinNodes(
        value.filter((item) => !isEmptyValue(item)).map((item) => formatDateLike(item, format, config)),
        separator,
      )
    }

    return formatDateLike(value, format, config)
  }) satisfies ProTableSearchTagTextResolver<any>
}

function createRangeDateLikeResolver(
  config: ProTableRangeTagTextResolverConfig,
  defaultFormat: string,
): ProTableSearchTagTextResolver<any> {
  const format = config.format ?? defaultFormat
  const rangeSeparator = config.rangeSeparator ?? DEFAULT_RANGE_SEPARATOR
  const multipleSeparator = config.multipleSeparator ?? DEFAULT_MULTIPLE_SEPARATOR

  const resolveRange = (rangeValue: unknown): ReactNode => {
    if (!Array.isArray(rangeValue)) {
      return formatDateLike(rangeValue, format, config)
    }

    const [start, end] = rangeValue
    if (isEmptyValue(start) && isEmptyValue(end)) {
      return config.emptyText ?? DEFAULT_EMPTY_TEXT
    }

    return joinNodes(
      [formatDateLike(start, format, config), formatDateLike(end, format, config)],
      rangeSeparator,
    )
  }

  return ((value: unknown) => {
    if (isEmptyTagValue(value)) {
      return config.emptyText ?? DEFAULT_EMPTY_TEXT
    }

    if (Array.isArray(value) && value.length > 0 && value.every((item) => Array.isArray(item))) {
      return joinNodes(value.map(resolveRange), multipleSeparator)
    }

    return resolveRange(value)
  }) satisfies ProTableSearchTagTextResolver<any>
}

export function createDateTagTextResolver(
  config: ProTableDateTagTextResolverConfig = {},
): ProTableSearchTagTextResolver<any> {
  return createDateLikeResolver(config, DEFAULT_DATE_FORMAT)
}

export function createDateRangeTagTextResolver(
  config: ProTableRangeTagTextResolverConfig = {},
): ProTableSearchTagTextResolver<any> {
  return createRangeDateLikeResolver(config, DEFAULT_DATE_FORMAT)
}

export function createTimeTagTextResolver(
  config: ProTableDateTagTextResolverConfig = {},
): ProTableSearchTagTextResolver<any> {
  return createDateLikeResolver(config, DEFAULT_TIME_FORMAT)
}

export function createTimeRangeTagTextResolver(
  config: ProTableRangeTagTextResolverConfig = {},
): ProTableSearchTagTextResolver<any> {
  return createRangeDateLikeResolver(config, DEFAULT_TIME_FORMAT)
}

export function createBooleanTagTextResolver(
  config: ProTableBooleanTagTextResolverConfig = {},
): ProTableSearchTagTextResolver<any> {
  const trueText = config.trueText ?? '是'
  const falseText = config.falseText ?? '否'

  return ((value: unknown) => {
    if (isEmptyValue(value)) {
      return config.emptyText ?? DEFAULT_EMPTY_TEXT
    }

    if (value === true) {
      return trueText
    }

    if (value === false) {
      return falseText
    }

    return resolveUnknownValue(value, config)
  }) satisfies ProTableSearchTagTextResolver<any>
}

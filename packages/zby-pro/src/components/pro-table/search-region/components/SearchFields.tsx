import {
  cloneElement,
  Fragment,
  isValidElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import type { CSSProperties, ReactElement, ReactNode } from 'react'
import { Drawer, Flex } from 'antd'

import { shallow, useControllerSelector } from '../../hooks'
import type { ProTableController, ProTableFilter, ProTableFilterRenderContext } from '../../interface'

type SearchFieldsProps<RecordType, Query extends Record<string, unknown>, Summary> = {
  controller: ProTableController<RecordType, Query, Summary>
  filters: ProTableFilter<Query>[]
  prefixCls: string
}

type SearchControlProps = {
  'aria-labelledby'?: string
  options?: Array<{ label?: ReactNode; value?: unknown }>
  placeholder?: unknown
  style?: CSSProperties
}

const DRAWER_FOCUSABLE = { trap: false }
const OVERLAY_ROOT_STYLE = { overflow: 'hidden' } as const
const OVERLAY_DRAWER_STYLES = {
  wrapper: { height: 'auto', maxHeight: '90%', boxShadow: 'none' },
  section: { height: 'auto', maxHeight: '90%', boxShadow: 'none' },
  body: { paddingTop: 0, paddingInline: 0 },
} as const
const SEARCH_CONTROL_DEFAULT_WIDTH = 120
const SEARCH_CONTROL_MIN_CONTENT_WIDTH = 24
const SEARCH_CONTROL_CHROME = 28
const SEARCH_SELECT_CHROME = 56
const SEARCH_RANGE_CHROME = 56
const SEARCH_MEASURE_FONT =
  '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif'

let measureContext: CanvasRenderingContext2D | null | undefined

function hasSearchValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.some((item) => item != null && item !== '')
  }

  return value != null && value !== ''
}

function toQueryFieldValue<T>(value: T) {
  return hasSearchValue(value) ? value : undefined
}

function hasExplicitWidth(width: CSSProperties['width']) {
  return width != null && width !== '' && width !== 'auto'
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

function estimateTextWidth(text: string) {
  let width = 0
  for (const char of text) {
    width += char.charCodeAt(0) > 255 ? 14 : 8
  }
  return width
}

function measureText(text: string) {
  if (!text) {
    return 0
  }

  try {
    if (typeof document !== 'undefined') {
      if (measureContext === undefined) {
        const context = document.createElement('canvas').getContext('2d')
        if (context) {
          context.font = SEARCH_MEASURE_FONT
          measureContext = context
        } else {
          measureContext = null
        }
      }

      if (measureContext) {
        const width = measureContext.measureText(text).width
        if (width > 0) {
          return width
        }
      }
    }
  } catch {
    measureContext = null
  }

  return estimateTextWidth(text)
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

function optionLabel(
  options: SearchControlProps['options'],
  value: unknown,
): string | undefined {
  const option = options?.find((item) => item.value === value)
  return typeof option?.label === 'string' ? option.label : undefined
}

function measurePlaceholderWidth(placeholder: unknown) {
  const texts = placeholderTexts(placeholder)
  if (texts.length === 0) {
    return undefined
  }

  return texts.reduce((sum, text) => sum + measureText(text), 0)
}

function measureContentWidth(props: SearchControlProps, value: unknown) {
  if (Array.isArray(props.options)) {
    const values = Array.isArray(value) ? value : [value]
    const labels = values
      .map((item) => optionLabel(props.options, item) ?? (item == null || item === '' ? '' : String(item)))
      .filter(Boolean)
    if (labels.length > 0) {
      return labels.reduce((sum, text) => sum + measureText(text), 0)
    }
  }

  if (Array.isArray(value)) {
    const texts = value
      .map((item) => (item == null || item === '' ? '' : String(item)))
      .filter(Boolean)
    if (texts.length === 0) {
      return undefined
    }

    return texts.reduce((sum, text) => sum + measureText(text), 0)
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return measureText(String(value))
  }

  return undefined
}

function controlChrome(props: SearchControlProps) {
  if (Array.isArray(props.placeholder)) {
    return SEARCH_RANGE_CHROME
  }

  if (props.options != null) {
    return SEARCH_SELECT_CHROME
  }

  return SEARCH_CONTROL_CHROME
}

function resolveInlineSearchControlStyle(props: SearchControlProps, value: unknown) {
  const style = props.style
  if (hasExplicitWidth(style?.width)) {
    return style
  }

  const chrome = controlChrome(props)
  const userMin = toPx(style?.minWidth)
  const contentWidth = measureContentWidth(props, value)
  const placeholderWidth = measurePlaceholderWidth(props.placeholder)
  const autoWidth = hasSearchValue(value)
    ? Math.max(
        Math.ceil((contentWidth ?? 0) + (contentWidth ? chrome : 0)),
        userMin,
        SEARCH_CONTROL_MIN_CONTENT_WIDTH,
      )
    : Math.max(
        placeholderWidth != null ? Math.ceil(placeholderWidth + chrome) : SEARCH_CONTROL_DEFAULT_WIDTH,
        userMin,
      )

  const nextStyle: CSSProperties = { ...style, minWidth: autoWidth }
  if (props.options != null) {
    nextStyle.width = autoWidth
  }

  return nextStyle
}

function applySearchControlLayout(
  node: ReactNode,
  {
    labelId,
    value,
  }: {
    labelId: string
    value: unknown
  },
) {
  if (!isValidElement(node) || node.type === Fragment) {
    return node
  }

  const element = node as ReactElement<SearchControlProps>
  const style = resolveInlineSearchControlStyle(element.props, value)

  return cloneElement(element, {
    'aria-labelledby': element.props['aria-labelledby'] ?? labelId,
    ...(style ? { style } : {}),
  })
}

function SearchFieldControl<Query extends Record<string, unknown>>({
  field,
  labelId,
  query,
  setValue,
  value,
}: {
  field: ProTableFilter<Query>
  labelId: string
  query: Query
  setValue: ProTableFilterRenderContext<Query>['setValue']
  value: ProTableFilterRenderContext<Query>['value']
}) {
  return applySearchControlLayout(
    field.render({ query, setValue, value } as Parameters<ProTableFilter<Query>['render']>[0]),
    {
      labelId,
      value,
    },
  )
}

function SearchFieldItem<RecordType, Query extends Record<string, unknown>, Summary>({
  controller,
  field,
  prefixCls,
}: {
  controller: ProTableController<RecordType, Query, Summary>
  field: ProTableFilter<Query>
  prefixCls: string
}) {
  const query = useControllerSelector(controller, (state) => state.query, shallow)
  const key = field.key
  const value = query[key]
  const setValue: ProTableFilterRenderContext<Query>['setValue'] = (next) => {
    controller.setQueryField(key, toQueryFieldValue(next) as Query[typeof key])
  }
  const labelId = `${prefixCls}-search-field-${String(key)}`

  return (
    <span className={`${prefixCls}-search-field`}>
      <span id={labelId} className={`${prefixCls}-search-field-label`}>
        {field.label}
        {': '}
      </span>
      <span className={`${prefixCls}-search-field-control`}>
        <SearchFieldControl
          field={field}
          labelId={labelId}
          query={query}
          setValue={setValue}
          value={value}
        />
      </span>
    </span>
  )
}

export function SearchFields<RecordType, Query extends Record<string, unknown>, Summary>({
  controller,
  filters,
  prefixCls,
}: SearchFieldsProps<RecordType, Query, Summary>) {
  if (filters.length === 0) {
    return null
  }

  return (
    <div className={`${prefixCls}-search-fields`}>
      {filters.map((field) => (
        <SearchFieldItem
          key={String(field.key)}
          controller={controller}
          field={field}
          prefixCls={prefixCls}
        />
      ))}
    </div>
  )
}

export function SearchMorePanel<RecordType, Query extends Record<string, unknown>, Summary>({
  controller,
  filters,
  onClose,
  open,
  prefixCls,
}: SearchFieldsProps<RecordType, Query, Summary> & {
  onClose: () => void
  open: boolean
}) {
  const openRef = useRef(open)
  const [mounted, setMounted] = useState(open)
  const handleAfterOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen && !openRef.current) {
      setMounted(false)
    }
  }, [])

  useEffect(() => {
    openRef.current = open

    if (open) {
      setMounted(true)
    }
  }, [open])

  if (!mounted || filters.length === 0) {
    return null
  }

  return (
    <Drawer
      afterOpenChange={handleAfterOpenChange}
      closable={false}
      destroyOnHidden
      focusable={DRAWER_FOCUSABLE}
      getContainer={false}
      open={open}
      placement="top"
      rootClassName={`${prefixCls}-search-overlay`}
      rootStyle={OVERLAY_ROOT_STYLE}
      styles={OVERLAY_DRAWER_STYLES}
      onClose={onClose}
    >
      <Flex
        className={`${prefixCls}-search-overlay-body`}
        align="center"
        gap="small"
        wrap="wrap"
      >
        <SearchFields controller={controller} filters={filters} prefixCls={prefixCls} />
      </Flex>
    </Drawer>
  )
}

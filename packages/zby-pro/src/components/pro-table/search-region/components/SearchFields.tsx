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
import { Drawer, Flex, theme as antdTheme } from 'antd'

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

type SearchSizeToken = {
  controlHeight: number
  fontFamily: string
  fontSize: number
  fontSizeIcon: number
  lineWidth: number
  marginXXS: number
  marginXS: number
  paddingSM: number
  paddingXS: number
}

let measureContext: CanvasRenderingContext2D | null | undefined
let measureFont = ''

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

function measurePlaceholderWidth(placeholder: unknown, token: SearchSizeToken) {
  const texts = placeholderTexts(placeholder)
  if (texts.length === 0) {
    return undefined
  }

  return texts.reduce((sum, text) => sum + measureText(text, token), 0)
}

function measureContentWidth(props: SearchControlProps, value: unknown, token: SearchSizeToken) {
  if (Array.isArray(props.options)) {
    const values = Array.isArray(value) ? value : [value]
    const labels = values
      .map((item) => optionLabel(props.options, item) ?? (item == null || item === '' ? '' : String(item)))
      .filter(Boolean)
    if (labels.length > 0) {
      return labels.reduce((sum, text) => sum + measureText(text, token), 0)
    }
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

function controlExtraWidth(props: SearchControlProps, token: SearchSizeToken) {
  const selectInlinePad = Math.max(token.paddingSM - token.lineWidth, 0)

  if (Array.isArray(props.placeholder)) {
    return selectInlinePad * 2 + token.marginXS + token.fontSizeIcon + token.paddingSM
  }

  if (props.options != null) {
    return selectInlinePad * 2 + token.fontSizeIcon * 2 + token.paddingSM
  }

  return token.paddingXS * 2 + token.fontSizeIcon + token.marginXXS + token.paddingSM
}

function resolveInlineSearchControlStyle(
  props: SearchControlProps,
  value: unknown,
  token: SearchSizeToken,
) {
  const style = props.style
  if (hasExplicitWidth(style?.width)) {
    return style
  }

  const extra = controlExtraWidth(props, token)
  const userMin = toPx(style?.minWidth)
  const minContent = token.fontSize * 2
  const contentWidth = measureContentWidth(props, value, token)
  const placeholderWidth = measurePlaceholderWidth(props.placeholder, token)
  const autoWidth = hasSearchValue(value)
    ? Math.max(
        Math.ceil((contentWidth ?? 0) + (contentWidth ? extra : 0)),
        userMin,
        minContent,
      )
    : Math.max(
        placeholderWidth != null ? Math.ceil(placeholderWidth + extra) : token.controlHeight * 4,
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
    token,
    value,
  }: {
    labelId: string
    token: SearchSizeToken
    value: unknown
  },
) {
  if (!isValidElement(node) || node.type === Fragment) {
    return node
  }

  const element = node as ReactElement<SearchControlProps>
  const style = resolveInlineSearchControlStyle(element.props, value, token)

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
  token,
  value,
}: {
  field: ProTableFilter<Query>
  labelId: string
  query: Query
  setValue: ProTableFilterRenderContext<Query>['setValue']
  token: SearchSizeToken
  value: ProTableFilterRenderContext<Query>['value']
}) {
  return applySearchControlLayout(
    field.render({ query, setValue, value } as Parameters<ProTableFilter<Query>['render']>[0]),
    {
      labelId,
      token,
      value,
    },
  )
}

function SearchFieldItem<RecordType, Query extends Record<string, unknown>, Summary>({
  controller,
  field,
  prefixCls,
  token,
}: {
  controller: ProTableController<RecordType, Query, Summary>
  field: ProTableFilter<Query>
  prefixCls: string
  token: SearchSizeToken
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
          token={token}
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
  const { token } = antdTheme.useToken()

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
          token={token}
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

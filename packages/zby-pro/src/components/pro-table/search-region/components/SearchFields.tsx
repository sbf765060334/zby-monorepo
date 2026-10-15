import {
  cloneElement,
  Fragment,
  isValidElement,
  useState,
} from 'react'
import type { ReactElement, ReactNode } from 'react'
import { Cascader, DatePicker, Drawer, Flex, Input, Select, theme as antdTheme, TimePicker, TreeSelect } from 'antd'

import { shallow, useControllerSelector } from '../../hooks'
import type { ProTableController, ProTableFilter, ProTableFilterRenderContext, ProTableQueryRecord } from '../../interface'
import {
  getAutoWidthKind,
  getElementName,
  resolveAutoWidthMaxTagCount,
  resolveInlineSearchControlStyle,
} from '../search-control-layout'
import type { AutoWidthKind, SearchControlProps, SearchSizeToken } from '../search-control-layout'

type SearchFieldsProps<RecordType, Query extends ProTableQueryRecord, Summary> = {
  controller: ProTableController<RecordType, Query, Summary>
  filters: ProTableFilter<Query>[]
  prefixCls: string
}

const AUTO_WIDTH_TYPES = new Map<unknown, { kind: AutoWidthKind; name: string }>([
  [Input, { kind: 'input', name: 'Input' }],
  [Input.Password, { kind: 'input', name: 'Input.Password' }],
  [Input.Search, { kind: 'input', name: 'Search' }],
  [Input.TextArea, { kind: 'input', name: 'TextArea' }],
  [DatePicker, { kind: 'picker', name: 'DatePicker' }],
  [DatePicker.RangePicker, { kind: 'picker', name: 'RangePicker' }],
  [TimePicker, { kind: 'picker', name: 'TimePicker' }],
  [TimePicker.RangePicker, { kind: 'picker', name: 'RangePicker' }],
  [Select, { kind: 'select', name: 'Select' }],
  [Cascader, { kind: 'select', name: 'Cascader' }],
  [TreeSelect, { kind: 'select', name: 'TreeSelect' }],
])

const DRAWER_FOCUSABLE = { trap: false }
const OVERLAY_ROOT_STYLE = { overflow: 'hidden' } as const
const OVERLAY_DRAWER_STYLES = {
  wrapper: { height: 'auto', maxHeight: '90%', boxShadow: 'none' },
  section: { height: 'auto', maxHeight: '90%', boxShadow: 'none' },
  body: { paddingTop: 0, paddingInline: 0 },
} as const

function resolveControlMeta(type: ReactElement['type']) {
  const mapped = AUTO_WIDTH_TYPES.get(type)
  if (mapped) {
    return mapped
  }

  const name = getElementName(type)
  return { kind: getAutoWidthKind(name), name }
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
  const labelled = {
    'aria-labelledby': element.props['aria-labelledby'] ?? labelId,
  }
  const { kind, name: elementName } = resolveControlMeta(element.type)
  if (!kind) {
    return cloneElement(element, labelled)
  }

  const nextProps: SearchControlProps = {
    ...labelled,
    style: resolveInlineSearchControlStyle(kind, element.props, value, token, elementName),
  }

  if (kind === 'select') {
    const maxTagCount = resolveAutoWidthMaxTagCount(element.props, value)
    if (maxTagCount !== element.props.maxTagCount) {
      nextProps.maxTagCount = maxTagCount
    }
  }

  return cloneElement(element, nextProps)
}

function SearchFieldControl<Query extends ProTableQueryRecord>({
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

function SearchFieldItem<RecordType, Query extends ProTableQueryRecord, Summary>({
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
    controller.setQueryField(key, next as Query[typeof key])
  }
  const labelId = `${prefixCls}-search-field-${String(key)}`

  return (
    <span className={`${prefixCls}-search-field`}>
      <span id={labelId} className={`${prefixCls}-search-field-label`}>
        {field.label}
        ：
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

export function SearchFields<RecordType, Query extends ProTableQueryRecord, Summary>({
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

export function SearchMorePanel<RecordType, Query extends ProTableQueryRecord, Summary>({
  controller,
  filters,
  onClose,
  open,
  prefixCls,
}: SearchFieldsProps<RecordType, Query, Summary> & {
  onClose: () => void
  open: boolean
}) {
  const [mounted, setMounted] = useState(open)

  if (open && !mounted) {
    setMounted(true)
  }

  if (!mounted || filters.length === 0) {
    return null
  }

  return (
    <Drawer
      closable={false}
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

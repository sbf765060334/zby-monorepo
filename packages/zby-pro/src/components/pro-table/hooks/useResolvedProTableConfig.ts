import * as React from 'react'
import { clsx } from 'clsx'
import { ConfigProvider } from 'antd'

import type { ModalScopeProps, ViewsConfigValue } from '../search-region/types'
import type {
  ProTableClassNamesType,
  ProTableColumnSettingConfig,
  ProTableConfig,
  ProTableFilter,
  ProTableProps,
  ProTableStylesType,
  ProTableToolbarConfig,
  ProTableViewsConfig,
} from '../interface'
import useStyle from '../style'

type SemanticProps = Record<string, unknown>
type SemanticClassNames = Record<string, string | undefined>
type SemanticStyles = Record<string, React.CSSProperties | undefined>

/**
 * `true` 开默认能力，`false` / 缺省关闭，对象才是配置。
 * 解析后下游只认 `false | config`。
 */
function resolveToggleConfig<T extends object>(
  value: boolean | T | undefined,
): false | T {
  if (value === true) {
    return {} as T
  }
  if (value === false || value == null) {
    return false
  }
  return value
}

function resolveToolbarConfig<RecordType, Query extends Record<string, unknown>, Summary>(
  toolbar: ProTableProps<RecordType, Query, Summary>['toolbar'],
): false | ProTableToolbarConfig<RecordType, Query, Summary> {
  if (toolbar === true) {
    return {}
  }
  if (toolbar === false || toolbar == null) {
    return false
  }
  return toolbar
}

function resolveColumnSetting(
  toolbar: false | ProTableToolbarConfig<any, any, any>,
): false | ProTableColumnSettingConfig {
  if (toolbar === false) {
    return false
  }
  const value = toolbar.columnSetting
  if (value === false) {
    return false
  }
  if (value === true || value == null) {
    return {}
  }
  return value
}

const mergeInlineStyles = (...values: Array<React.CSSProperties | undefined>) =>
  values.reduce<React.CSSProperties>((current, value) => ({ ...current, ...value }), {})

const resolveSemanticValue = <T>(
  value: T | ((info: { props: SemanticProps }) => T) | undefined,
  props: SemanticProps,
) => (typeof value === 'function' ? (value as (info: { props: SemanticProps }) => T)({ props }) : value)

const mergeSemanticClassNames = (...values: Array<SemanticClassNames | undefined>) =>
  values.reduce<SemanticClassNames>((current, value) => {
    Object.keys(value ?? {}).forEach((key) => {
      current[key] = clsx(current[key], value?.[key])
    })
    return current
  }, {})

const mergeSemanticStyles = (...values: Array<SemanticStyles | undefined>) =>
  values.reduce<SemanticStyles>((current, value) => {
    Object.keys(value ?? {}).forEach((key) => {
      current[key] = mergeInlineStyles(current[key], value?.[key])
    })
    return current
  }, {})

function isShallowEqualRecord(left: SemanticProps, right: SemanticProps) {
  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every((key) => Object.is(left[key], right[key]))
  )
}

function useShallowStableRecord<T extends SemanticProps>(value: T) {
  const valueRef = React.useRef(value)
  if (!isShallowEqualRecord(valueRef.current, value)) {
    valueRef.current = value
  }
  return valueRef.current
}

export interface ResolvedProTableConfig<
  RecordType,
  Query extends Record<string, unknown>,
  Summary,
> {
  mergedFilters: ProTableFilter<Query>[]
  mergedViews: false | ViewsConfigValue<Query>
  mergedToolbar: false | ProTableToolbarConfig<RecordType, Query, Summary>
  mergedColumnSetting: false | ProTableColumnSettingConfig
  mergedFilterSetting: false | Record<string, never>
  columnPreferencesEnabled: boolean
  mergedColumnResize: ProTableProps<RecordType, Query, Summary>['columnResize']
  mergedLayout: ProTableConfig<RecordType, Query, Summary>['layout']
  mergedEmptyState: ProTableConfig<RecordType, Query, Summary>['emptyState']
  mergedRowSelection: ProTableProps<RecordType, Query, Summary>['rowSelection']
  mergedExpandable: ProTableProps<RecordType, Query, Summary>['expandable']
  mergedPagination: ProTableProps<RecordType, Query, Summary>['pagination']
  mergedScroll: ProTableProps<RecordType, Query, Summary>['scroll']
  mergedHeightMode: NonNullable<ProTableProps<RecordType, Query, Summary>['heightMode']>
  mergedAutoRequest: boolean
  mergedClassName: string | undefined
  mergedRootClassName: string | undefined
  mergedStyle: React.CSSProperties
  mergedSemanticClassNames: SemanticClassNames
  mergedSemanticStyles: SemanticStyles
  prefixCls: string
  hashId: string
  cssVarCls: string
  rootStyleClassName: string
  columnsModalProps: ModalScopeProps
  fullscreenEnabled: boolean
}

export function useResolvedProTableConfig<
  RecordType,
  Query extends Record<string, unknown>,
  Summary,
>(
  props: ProTableProps<RecordType, Query, Summary>,
): ResolvedProTableConfig<RecordType, Query, Summary> {
  const stableProps = useShallowStableRecord(props as unknown as SemanticProps)
  const {
    filters,
    filterSetting,
    views: viewsProp,
    toolbar,
    heightMode = 'content',
    layout,
    emptyState,
    prefixCls: customizePrefixCls,
    className,
    rootClassName,
    style,
    classNames,
    styles,
    rowSelection,
    expandable,
    pagination,
    scroll,
    columnResize,
    autoRequest,
  } = props
  const { getPrefixCls } = React.useContext(ConfigProvider.ConfigContext)
  const mergedFilters = React.useMemo(
    () => (filters?.length ? filters : []),
    [filters],
  )
  const mergedViews = resolveToggleConfig<ProTableViewsConfig<Query>>(viewsProp)
  const mergedToolbar = resolveToolbarConfig(toolbar)
  const mergedColumnSetting = resolveColumnSetting(mergedToolbar)
  const mergedFilterSetting = filterSetting === false ? false : {}
  const columnPreferencesEnabled = mergedViews !== false || mergedColumnSetting !== false
  const mergedColumnResize = columnResize ?? true
  const mergedLayout = layout
  const mergedEmptyState = emptyState
  const mergedRowSelection = rowSelection
  const mergedExpandable = expandable
  const mergedPagination = pagination
  const mergedScroll = scroll
  const mergedHeightMode = heightMode ?? 'content'
  const mergedAutoRequest = autoRequest ?? true
  const mergedStyle = React.useMemo(() => mergeInlineStyles(style), [style])
  const prefixCls = getPrefixCls('pro-table', customizePrefixCls)
  const [hashId, cssVarCls] = useStyle(prefixCls)
  const rootStyleClassName = clsx(hashId, cssVarCls)
  const fullscreenEnabled = mergedToolbar !== false && mergedToolbar.fullscreen !== false
  const mergedResolvedProps = React.useMemo<SemanticProps>(
    () => ({
      ...stableProps,
      className,
      columnResize: mergedColumnResize,
      emptyState: mergedEmptyState,
      expandable: mergedExpandable,
      fullscreen: fullscreenEnabled,
      heightMode: mergedHeightMode,
      autoRequest: mergedAutoRequest,
      layout: mergedLayout,
      pagination: mergedPagination,
      prefixCls,
      rootClassName,
      rowSelection: mergedRowSelection,
      scroll: mergedScroll,
      filters: mergedFilters,
      style: mergedStyle,
      styles,
      toolbar: mergedToolbar,
      views: mergedViews,
      columnSetting: mergedColumnSetting,
    }),
    [
      className,
      fullscreenEnabled,
      mergedAutoRequest,
      mergedColumnResize,
      mergedColumnSetting,
      mergedEmptyState,
      mergedExpandable,
      mergedHeightMode,
      mergedLayout,
      mergedPagination,
      mergedRowSelection,
      mergedScroll,
      mergedFilters,
      mergedStyle,
      mergedToolbar,
      mergedViews,
      prefixCls,
      rootClassName,
      stableProps,
      styles,
    ],
  )
  const mergedSemanticClassNames = React.useMemo(
    () => mergeSemanticClassNames(resolveSemanticValue(classNames as ProTableClassNamesType | undefined, mergedResolvedProps)),
    [classNames, mergedResolvedProps],
  )
  const mergedSemanticStyles = React.useMemo(
    () => mergeSemanticStyles(resolveSemanticValue(styles as ProTableStylesType | undefined, mergedResolvedProps)),
    [mergedResolvedProps, styles],
  )
  const columnsModalProps = React.useMemo(
    () =>
      ({
        className: clsx(hashId, mergedSemanticClassNames.columnsModal),
        rootClassName: rootStyleClassName,
        style: mergedSemanticStyles.columnsModal,
      }) satisfies ModalScopeProps,
    [hashId, mergedSemanticClassNames.columnsModal, mergedSemanticStyles.columnsModal, rootStyleClassName],
  )

  return {
    mergedFilters,
    mergedViews,
    mergedToolbar,
    mergedColumnSetting,
    mergedFilterSetting,
    columnPreferencesEnabled,
    mergedColumnResize,
    mergedLayout,
    mergedEmptyState,
    mergedRowSelection,
    mergedExpandable,
    mergedPagination,
    mergedScroll,
    mergedHeightMode,
    mergedAutoRequest,
    mergedClassName: className,
    mergedRootClassName: rootClassName,
    mergedStyle,
    mergedSemanticClassNames,
    mergedSemanticStyles,
    prefixCls,
    hashId,
    cssVarCls: cssVarCls ?? '',
    rootStyleClassName,
    columnsModalProps,
    fullscreenEnabled,
  }
}

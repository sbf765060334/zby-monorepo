import * as React from 'react'
import { clsx } from 'clsx'
import { ConfigProvider } from 'antd'

import type {
  ProTableClassNamesType,
  ProTableConfig,
  ProTableProps,
  ProTableStylesType,
} from '../interface'
import type { ModalScopeProps, SearchConfigValue } from '../search-region/types'
import useStyle from '../style'

type SemanticProps = Record<string, unknown>
type SemanticClassNames = Record<string, string | undefined>
type SemanticStyles = Record<string, React.CSSProperties | undefined>

type ViewsConfigValue<Query extends Record<string, unknown>> = Exclude<
  ProTableProps<any, Query, any>['views'],
  false | undefined
>

const DEFAULT_PREFIX_CLS = 'zby-pro-table'

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

export function normalizeSearchConfig<RecordType, Query extends Record<string, unknown>, Summary>(
  search: Partial<SearchConfigValue<RecordType, Query, Summary>>,
) {
  return {
    ...search,
    variant: search.variant ?? 'mixed',
  } as SearchConfigValue<RecordType, Query, Summary>
}

export interface ResolvedProTableConfig<
  RecordType,
  Query extends Record<string, unknown>,
  Summary,
> {
  mergedSearch: false | SearchConfigValue<RecordType, Query, Summary>
  mergedViews: false | ViewsConfigValue<Query>
  mergedToolbar: false | Exclude<ProTableProps<RecordType, Query, Summary>['toolbar'], undefined>
  mergedColumnsState:
    | false
    | Exclude<ProTableProps<RecordType, Query, Summary>['columnsState'], undefined>
  mergedColumnResize: ProTableProps<RecordType, Query, Summary>['columnResize']
  mergedLayout: ProTableConfig<RecordType, Query, Summary>['layout']
  mergedEmptyState: ProTableConfig<RecordType, Query, Summary>['emptyState']
  mergedRowSelection: ProTableProps<RecordType, Query, Summary>['rowSelection']
  mergedExpandable: ProTableProps<RecordType, Query, Summary>['expandable']
  mergedPagination: ProTableProps<RecordType, Query, Summary>['pagination']
  mergedScroll: ProTableProps<RecordType, Query, Summary>['scroll']
  mergedFullscreen: ProTableProps<RecordType, Query, Summary>['fullscreen']
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
    search = false,
    views: viewsProp,
    toolbar = false,
    columnsState = false,
    heightMode = 'content',
    fullscreen = false,
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
  const mergedSearch = React.useMemo(() => {
    if (search === false || !search || !search.fields) {
      return false as const
    }
    return normalizeSearchConfig(search)
  }, [search])
  const mergedViews = (viewsProp ?? false) as false | ViewsConfigValue<Query>
  const mergedToolbar = (toolbar ?? false) as typeof toolbar
  const mergedColumnsState = (columnsState ?? false) as typeof columnsState
  const mergedColumnResize = columnResize ?? true
  const mergedLayout = layout
  const mergedEmptyState = emptyState
  const mergedRowSelection = rowSelection
  const mergedExpandable = expandable
  const mergedPagination = pagination
  const mergedScroll = scroll
  const mergedFullscreen = (fullscreen ?? false) as typeof fullscreen
  const mergedHeightMode = heightMode ?? 'content'
  const mergedAutoRequest = autoRequest ?? true
  const mergedStyle = React.useMemo(() => mergeInlineStyles(style), [style])
  const prefixCls = getPrefixCls('pro-table', customizePrefixCls ?? DEFAULT_PREFIX_CLS)
  const [hashId, cssVarCls] = useStyle(prefixCls)
  const rootStyleClassName = clsx(hashId, cssVarCls)
  const mergedResolvedProps = React.useMemo<SemanticProps>(
    () => ({
      ...stableProps,
      className,
      columnsState: mergedColumnsState,
      columnResize: mergedColumnResize,
      emptyState: mergedEmptyState,
      expandable: mergedExpandable,
      fullscreen: mergedFullscreen,
      heightMode: mergedHeightMode,
      autoRequest: mergedAutoRequest,
      layout: mergedLayout,
      pagination: mergedPagination,
      prefixCls,
      rootClassName,
      rowSelection: mergedRowSelection,
      scroll: mergedScroll,
      search: mergedSearch,
      style: mergedStyle,
      styles,
      toolbar: mergedToolbar,
      views: mergedViews,
    }),
    [
      className,
      mergedAutoRequest,
      mergedColumnResize,
      mergedColumnsState,
      mergedEmptyState,
      mergedExpandable,
      mergedFullscreen,
      mergedHeightMode,
      mergedLayout,
      mergedPagination,
      mergedRowSelection,
      mergedScroll,
      mergedSearch,
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
  const fullscreenEnabled =
    mergedFullscreen !== false &&
    (typeof mergedFullscreen !== 'object' || mergedFullscreen.enabled !== false)
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
    mergedSearch,
    mergedViews,
    mergedToolbar,
    mergedColumnsState,
    mergedColumnResize,
    mergedLayout,
    mergedEmptyState,
    mergedRowSelection,
    mergedExpandable,
    mergedPagination,
    mergedScroll,
    mergedFullscreen,
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

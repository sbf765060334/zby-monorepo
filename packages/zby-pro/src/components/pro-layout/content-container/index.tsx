import { Card, ConfigProvider } from 'antd'
import { clsx } from 'clsx'
import * as React from 'react'

import type { CardProps } from 'antd'
import useStyle from './style'

export type ProLayoutContentContainerItemBodyPadding =
  | React.CSSProperties['padding']
  | false
export type ProLayoutContentContainerMode = 'fill' | 'stack'

const DEFAULT_CONTENT_CONTAINER_MIN_WIDTH = 960

type CardHeaderProp =
  | 'activeTabKey'
  | 'defaultActiveTabKey'
  | 'extra'
  | 'headStyle'
  | 'onTabChange'
  | 'tabBarExtraContent'
  | 'tabList'
  | 'tabProps'
  | 'title'

export interface ProLayoutContentContainerItemProps extends Omit<
  CardProps,
  'children' | 'prefixCls' | CardHeaderProp
> {
  children?: React.ReactNode
  prefixCls?: string
  fill?: boolean
  bodyPadding?: ProLayoutContentContainerItemBodyPadding
}

export interface ProLayoutContentContainerItemConfig extends Omit<
  ProLayoutContentContainerItemProps,
  'children'
> {
  key: React.Key
  children?: React.ReactNode
  cardProps?: Omit<ProLayoutContentContainerItemProps, 'children'>
}

export interface ProLayoutContentContainerProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'children'
> {
  mode?: ProLayoutContentContainerMode
  header?: React.ReactNode
  footer?: React.ReactNode
  aside?: React.ReactNode
  asidePosition?: 'start' | 'end'
  asideWidth?: React.CSSProperties['width']
  /** 容器最小宽度。数字按像素处理，默认 960。`style.minWidth` 可覆盖。 */
  minWidth?: React.CSSProperties['minWidth']
  items?: ProLayoutContentContainerItemConfig[]
  padding?: React.CSSProperties['padding'] | false
  gap?: React.CSSProperties['gap']
  itemBodyPadding?: ProLayoutContentContainerItemBodyPadding
  prefixCls?: string
  contentClassName?: string
  contentStyle?: React.CSSProperties
  bodyClassName?: string
  bodyStyle?: React.CSSProperties
  footerClassName?: string
  footerStyle?: React.CSSProperties
  asideClassName?: string
  asideStyle?: React.CSSProperties
  itemProps?: ProLayoutContentContainerItemProps
  children?: React.ReactNode
}

type ProLayoutContentContainerComponent = React.ForwardRefExoticComponent<
  ProLayoutContentContainerProps & React.RefAttributes<HTMLDivElement>
> & {
  Item: typeof ProLayoutContentContainerItem
}

function useContentContainerStyle(customizePrefixCls?: string) {
  const { getPrefixCls } = React.useContext(ConfigProvider.ConfigContext)
  const prefixCls = getPrefixCls('pro-layout', customizePrefixCls)
  const hashId = useStyle(prefixCls, getPrefixCls('card'))

  return [prefixCls, hashId] as const
}

const ProLayoutContentContainerItem = React.memo(
  React.forwardRef<HTMLDivElement, ProLayoutContentContainerItemProps>((props, ref) => {
    const {
      prefixCls: customizePrefixCls,
      fill = false,
      bodyPadding,
      children,
      className,
      styles,
      variant = 'borderless',
      ...cardProps
    } = props
    const [prefixCls, hashId] = useContentContainerStyle(customizePrefixCls)
    const mergedStyles = React.useMemo(
      () => mergeItemBodyPaddingStyle(styles, bodyPadding),
      [bodyPadding, styles],
    )

    return (
      <Card
        {...cardProps}
        ref={ref}
        styles={mergedStyles}
        variant={variant}
        className={clsx(
          `${prefixCls}-content-container-item`,
          fill && `${prefixCls}-content-container-item-fill`,
          hashId,
          className,
        )}
      >
        {children}
      </Card>
    )
  }),
)

interface ConfiguredContentContainerItemProps {
  item: ProLayoutContentContainerItemConfig
  itemProps?: ProLayoutContentContainerItemProps
  prefixCls: string
  itemBodyPadding?: ProLayoutContentContainerItemBodyPadding
}

const ConfiguredContentContainerItem = React.memo(
  (props: ConfiguredContentContainerItemProps) => {
    const { item, itemProps, prefixCls, itemBodyPadding } = props
    const { key: _key, children, cardProps, className, style, ...restItemProps } = item
    const mergedItemProps: ProLayoutContentContainerItemProps = {
      bodyPadding: itemBodyPadding,
      ...itemProps,
      ...cardProps,
      ...restItemProps,
      prefixCls,
      className: clsx(itemProps?.className, cardProps?.className, className),
      style: {
        ...itemProps?.style,
        ...cardProps?.style,
        ...style,
      },
    }

    return (
      <ProLayoutContentContainerItem {...mergedItemProps}>
        {children}
      </ProLayoutContentContainerItem>
    )
  },
)

const ProLayoutContentContainerInner = React.forwardRef<
  HTMLDivElement,
  ProLayoutContentContainerProps
>((props, ref) => {
  const {
    mode,
    header,
    footer,
    aside,
    asidePosition = 'start',
    asideWidth,
    minWidth = DEFAULT_CONTENT_CONTAINER_MIN_WIDTH,
    items,
    padding,
    gap,
    itemBodyPadding,
    prefixCls: customizePrefixCls,
    className,
    style,
    contentClassName,
    contentStyle,
    bodyClassName,
    bodyStyle,
    footerClassName,
    footerStyle,
    asideClassName,
    asideStyle,
    itemProps,
    children,
    ...restProps
  } = props
  const [prefixCls, hashId] = useContentContainerStyle(customizePrefixCls)
  const hasItems = Array.isArray(items)
  const mergedMode = resolveMode(mode, hasItems)
  const mergedPadding = padding === false ? 0 : padding
  const contentInlineStyle = React.useMemo<React.CSSProperties>(
    () => ({
      ...(mergedMode === 'stack'
        ? { padding: 0 }
        : padding !== undefined
          ? { padding: mergedPadding }
          : null),
      ...(gap !== undefined ? { gap } : null),
      ...contentStyle,
    }),
    [contentStyle, gap, mergedMode, mergedPadding, padding],
  )
  const bodyInlineStyle = React.useMemo<React.CSSProperties>(
    () => ({
      ...(mergedMode === 'stack' && padding !== undefined
        ? { padding: mergedPadding }
        : null),
      ...(mergedMode === 'stack' && aside && asidePosition === 'start'
        ? { paddingInlineStart: 0 }
        : null),
      ...(mergedMode === 'stack' && aside && asidePosition === 'end'
        ? { paddingInlineEnd: 0 }
        : null),
      ...bodyStyle,
    }),
    [aside, asidePosition, bodyStyle, mergedMode, mergedPadding, padding],
  )
  const asideInlineStyle = React.useMemo<React.CSSProperties>(
    () => ({
      ...(asideWidth !== undefined ? { flexBasis: asideWidth, width: asideWidth } : null),
      ...(mergedMode === 'stack' && padding !== undefined
        ? { padding: mergedPadding }
        : null),
      ...(mergedMode === 'stack' && asidePosition === 'start'
        ? { paddingInlineEnd: 0 }
        : null),
      ...(mergedMode === 'stack' && asidePosition === 'end'
        ? { paddingInlineStart: 0 }
        : null),
      ...asideStyle,
    }),
    [asidePosition, asideStyle, asideWidth, mergedMode, mergedPadding, padding],
  )
  const bodyNode = hasItems
    ? items.map((item) => (
        <ConfiguredContentContainerItem
          key={item.key}
          item={item}
          itemProps={itemProps}
          prefixCls={prefixCls}
          itemBodyPadding={itemBodyPadding}
        />
      ))
    : renderChildren(children, mergedMode, itemProps, prefixCls, itemBodyPadding)

  return (
    <div
      {...restProps}
      ref={ref}
      className={clsx(
        `${prefixCls}-content-container`,
        `${prefixCls}-content-container-${mergedMode}`,
        footer && `${prefixCls}-content-container-with-footer`,
        aside && `${prefixCls}-content-container-with-aside`,
        asidePosition === 'end' && `${prefixCls}-content-container-aside-end`,
        hashId,
        className,
      )}
      style={{ minWidth, ...style }}
    >
      {header ? (
        <div className={`${prefixCls}-content-container-header`}>
          <div className={`${prefixCls}-content-container-header-content`}>{header}</div>
        </div>
      ) : null}
      <div
        className={clsx(`${prefixCls}-content-container-content`, contentClassName)}
        style={contentInlineStyle}
      >
        {aside && asidePosition === 'start'
          ? renderAside(aside, prefixCls, asideClassName, asideInlineStyle)
          : null}
        {renderBody(bodyNode, prefixCls, bodyClassName, bodyInlineStyle)}
        {aside && asidePosition === 'end'
          ? renderAside(aside, prefixCls, asideClassName, asideInlineStyle)
          : null}
      </div>
      {footer ? (
        <div
          className={clsx(`${prefixCls}-content-container-footer`, footerClassName)}
          style={footerStyle}
        >
          {footer}
        </div>
      ) : null}
    </div>
  )
})

function resolveMode(
  mode: ProLayoutContentContainerMode | undefined,
  hasItems: boolean,
): ProLayoutContentContainerMode {
  if (mode)
    return mode

  return hasItems ? 'stack' : 'fill'
}

function renderChildren(
  children: React.ReactNode,
  mode: ProLayoutContentContainerMode,
  itemProps: ProLayoutContentContainerItemProps | undefined,
  prefixCls: string,
  itemBodyPadding: ProLayoutContentContainerItemBodyPadding | undefined,
) {
  if (mode === 'stack')
    return children

  return (
    <ProLayoutContentContainerItem
      bodyPadding={itemBodyPadding}
      {...itemProps}
      prefixCls={prefixCls}
      fill
    >
      {children}
    </ProLayoutContentContainerItem>
  )
}

function renderBody(
  bodyNode: React.ReactNode,
  prefixCls: string,
  bodyClassName: string | undefined,
  bodyStyle: React.CSSProperties | undefined,
) {
  const className = clsx(`${prefixCls}-content-container-body`, bodyClassName)
  return (
    <div className={className} style={bodyStyle}>
      {bodyNode}
    </div>
  )
}

function renderAside(
  aside: React.ReactNode,
  prefixCls: string,
  asideClassName: string | undefined,
  asideStyle: React.CSSProperties | undefined,
) {
  return (
    <aside
      className={clsx(`${prefixCls}-content-container-aside`, asideClassName)}
      style={asideStyle}
    >
      <div className={`${prefixCls}-content-container-aside-scroll`}>
        {aside}
      </div>
    </aside>
  )
}

function mergeItemBodyPaddingStyle(
  styles: CardProps['styles'],
  bodyPadding: ProLayoutContentContainerItemBodyPadding | undefined,
): CardProps['styles'] {
  if (bodyPadding === undefined)
    return styles

  const bodyStyle: React.CSSProperties = {
    padding: bodyPadding === false ? 0 : bodyPadding,
  }

  if (typeof styles === 'function') {
    return (info) => {
      const resolvedStyles = styles(info)

      return {
        ...resolvedStyles,
        body: {
          ...bodyStyle,
          ...resolvedStyles?.body,
        },
      }
    }
  }

  return {
    ...styles,
    body: {
      ...bodyStyle,
      ...styles?.body,
    },
  }
}

const ProLayoutContentContainer =
  ProLayoutContentContainerInner as ProLayoutContentContainerComponent
ProLayoutContentContainer.Item = ProLayoutContentContainerItem

ProLayoutContentContainer.displayName = 'ProLayoutContentContainer'
ProLayoutContentContainerItem.displayName = 'ProLayoutContentContainer.Item'

export default ProLayoutContentContainer

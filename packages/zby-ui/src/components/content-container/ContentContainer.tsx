import { ConfigProvider } from 'antd'
import { clsx } from 'clsx'
import * as React from 'react'

import ScrollArea from '../scroll-area'
import useStyle from './style'

export type ContentContainerMode = 'fill' | 'stack'

export type ContentContainerSemanticName =
  | 'root'
  | 'header'
  | 'content'
  | 'body'
  | 'footer'

export type ContentContainerClassNames = Partial<
  Record<ContentContainerSemanticName, string>
>

export type ContentContainerStyles = Partial<
  Record<ContentContainerSemanticName, React.CSSProperties>
>

export interface ContentContainerProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'children'
> {
  /** Fill constrains children to the available height; stack scrolls vertically. */
  mode?: ContentContainerMode
  prefixCls?: string
  rootClassName?: string
  header?: React.ReactNode
  footer?: React.ReactNode
  padding?: React.CSSProperties['padding'] | false
  gap?: React.CSSProperties['gap']
  classNames?: ContentContainerClassNames
  styles?: ContentContainerStyles
  children?: React.ReactNode
}

const ContentContainer = React.forwardRef<HTMLDivElement, ContentContainerProps>(
  (props, ref) => {
    const {
      mode = 'stack',
      prefixCls: customizePrefixCls,
      rootClassName,
      header,
      footer,
      padding,
      gap,
      className,
      classNames,
      style,
      styles,
      children,
      ...restProps
    } = props
    const { getPrefixCls } = React.useContext(ConfigProvider.ConfigContext)
    const prefixCls = getPrefixCls('content-container', customizePrefixCls)
    const hashId = useStyle(prefixCls)
    const hasHeader = header !== undefined && header !== null
    const hasFooter = footer !== undefined && footer !== null
    const bodyGap = styles?.body?.gap ?? gap
    const bodyStyle: React.CSSProperties = {
      ...(gap !== undefined ? { gap } : null),
      ...styles?.body,
    }
    const bodyClassName = clsx(`${prefixCls}-body`, classNames?.body)

    return (
      <div
        {...restProps}
        ref={ref}
        className={clsx(
          prefixCls,
          `${prefixCls}-${mode}`,
          hashId,
          rootClassName,
          classNames?.root,
          className,
        )}
        style={{ ...styles?.root, ...style }}
      >
        {hasHeader ? (
          <div
            className={clsx(`${prefixCls}-header`, classNames?.header)}
            style={styles?.header}
          >
            {header}
          </div>
        ) : null}
        <div
          className={clsx(`${prefixCls}-content`, classNames?.content)}
          style={{
            ...(padding !== undefined ? { padding: padding === false ? 0 : padding } : null),
            ...styles?.content,
          }}
        >
          {mode === 'fill' ? (
            <div className={bodyClassName} style={bodyStyle}>
              {children}
            </div>
          ) : (
            <ScrollArea
              className={bodyClassName}
              style={bodyStyle}
              classNames={{
                viewport: `${prefixCls}-body-scroll-viewport`,
                content: `${prefixCls}-body-scroll-content`,
              }}
              styles={bodyGap === undefined ? undefined : { content: { gap: bodyGap } }}
            >
              {children}
            </ScrollArea>
          )}
        </div>
        {hasFooter ? (
          <div
            className={clsx(`${prefixCls}-footer`, classNames?.footer)}
            style={styles?.footer}
          >
            {footer}
          </div>
        ) : null}
      </div>
    )
  },
)

ContentContainer.displayName = 'ContentContainer'

export default ContentContainer

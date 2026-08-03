import type { ButtonProps } from 'antd'
import { ConfigProvider } from 'antd'
import { clsx } from 'clsx'
import * as React from 'react'
import useStyle from './style'

type ActionIconSize = ButtonProps['size'] | 'medium'
type ActionIconColor = NonNullable<ButtonProps['color']>
type ActionIconVariant = NonNullable<ButtonProps['variant']> | 'inline'

export type ActionIconSemanticName = keyof ActionIconSemanticClassNames &
  keyof ActionIconSemanticStyles

export type ActionIconSemanticClassNames = {
  root?: string
  icon?: string
}

export type ActionIconSemanticStyles = {
  root?: React.CSSProperties
  icon?: React.CSSProperties
}

type ActionIconSemanticValue<T> = T | ((info: { props: ActionIconProps }) => T)

export type ActionIconClassNamesType = ActionIconSemanticValue<
  Readonly<ActionIconSemanticClassNames>
>

export type ActionIconStylesType = ActionIconSemanticValue<
  Readonly<ActionIconSemanticStyles>
>

export interface ActionIconProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'color' | 'type'
> {
  prefixCls?: string
  className?: string
  rootClassName?: string
  style?: React.CSSProperties
  icon?: React.ReactNode
  children?: React.ReactNode
  selected?: boolean
  danger?: boolean
  color?: ActionIconColor
  variant?: ActionIconVariant
  disabled?: boolean
  size?: ActionIconSize
  shape?: 'square' | 'circle'
  classNames?: ActionIconClassNamesType
  styles?: ActionIconStylesType
}

function resolveSemanticValue<T>(
  value: ActionIconSemanticValue<T> | undefined,
  props: ActionIconProps,
): T {
  if (typeof value === 'function') {
    return (value as (info: { props: ActionIconProps }) => T)({ props })
  }

  return (value ?? {}) as T
}

const ActionIcon = React.forwardRef<HTMLButtonElement, ActionIconProps>((props, ref) => {
  const {
    prefixCls: customizePrefixCls,
    className,
    rootClassName,
    style,
    icon,
    children,
    selected: customizeSelected,
    danger = false,
    color,
    variant,
    disabled: customizeDisabled,
    size: customizeSize,
    shape: customizeShape,
    classNames,
    styles,
    ...restProps
  } = props
  const { getPrefixCls, direction, button: buttonConfig } = React.useContext(
    ConfigProvider.ConfigContext,
  )
  const {
    className: contextClassName,
    style: contextStyle,
    classNames: contextClassNames,
    styles: contextStyles,
    shape: contextShape,
    color: contextColor,
    variant: contextVariant,
  } = buttonConfig ?? {}
  const { componentDisabled, componentSize } = ConfigProvider.useConfig()
  const disabled = customizeDisabled ?? componentDisabled
  const size = customizeSize ?? componentSize
  const normalizedSize = size === 'medium' ? 'middle' : size
  const selected = customizeSelected ?? false
  const shape = customizeShape ?? (contextShape === 'circle' ? 'circle' : 'square')
  const configuredColor = color ?? (danger ? 'danger' : contextColor)
  const configuredVariant = variant ?? contextVariant
  const mergedColor =
    configuredColor ??
    (configuredVariant === 'solid'
      ? 'primary'
      : configuredVariant === 'filled'
        ? 'default'
        : undefined)
  const mergedVariant = configuredVariant
  const mergedIcon = icon ?? children
  const prefixCls = getPrefixCls('action-icon', customizePrefixCls)
  const [hashId, cssVarCls] = useStyle(prefixCls)
  const sizeCls =
    normalizedSize === 'small'
      ? `${prefixCls}-sm`
      : normalizedSize === 'large'
        ? `${prefixCls}-lg`
        : undefined
  const colorCls = mergedColor
    ? `${prefixCls}-color-${mergedColor === 'danger' ? 'dangerous' : mergedColor}`
    : undefined
  const variantCls = mergedVariant ? `${prefixCls}-variant-${mergedVariant}` : undefined
  const mergedProps: ActionIconProps = {
    ...props,
    selected,
    danger,
    color: mergedColor,
    variant: mergedVariant,
    disabled,
    size: normalizedSize,
    shape,
  }
  const contextSemanticClassNames = resolveSemanticValue(
    contextClassNames as unknown as ActionIconClassNamesType,
    mergedProps,
  )
  const customSemanticClassNames = resolveSemanticValue(classNames, mergedProps)
  const contextSemanticStyles = resolveSemanticValue(
    contextStyles as unknown as ActionIconStylesType,
    mergedProps,
  )
  const customSemanticStyles = resolveSemanticValue(styles, mergedProps)

  return (
    <button
      {...restProps}
      ref={ref}
      type="button"
      disabled={disabled}
      aria-pressed={customizeSelected}
      className={clsx(
        prefixCls,
        contextClassName,
        hashId,
        cssVarCls,
        {
          [`${prefixCls}-rtl`]: direction === 'rtl',
          [`${prefixCls}-selected`]: selected,
          [`${prefixCls}-danger`]: danger && color === undefined,
          [`${prefixCls}-${shape}`]: shape,
        },
        sizeCls,
        colorCls,
        variantCls,
        className,
        rootClassName,
        contextSemanticClassNames.root,
        customSemanticClassNames.root,
      )}
      style={{
        ...contextStyle,
        ...contextSemanticStyles.root,
        ...customSemanticStyles.root,
        ...style,
      }}
    >
      <span
        aria-hidden="true"
        className={clsx(
          `${prefixCls}-icon`,
          contextSemanticClassNames.icon,
          customSemanticClassNames.icon,
        )}
        style={{ ...contextSemanticStyles.icon, ...customSemanticStyles.icon }}
      >
        {mergedIcon}
      </span>
    </button>
  )
})

ActionIcon.displayName = 'ActionIcon'

export default ActionIcon

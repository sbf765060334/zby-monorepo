/**
 * 文件职责：实现 ActionIcon 的属性类型、ConfigProvider 配置合并和最终 button DOM。
 *
 * 可以把这个文件理解成组件的“组装层”：它先决定禁用、尺寸、颜色、变体等最终值，
 * 再生成对应 className 和 semantic 样式，实际 CSS 规则由同目录 style 模块负责注册。
 */
import type { ButtonProps } from 'antd'
import { ConfigProvider } from 'antd'
import { clsx } from 'clsx'
import * as React from 'react'
import useStyle from './style'

/** 兼容 antd Button 尺寸，并额外接受业务中常见的 `medium` 别名。 */
type ActionIconSize = ButtonProps['size'] | 'medium'
/** 直接复用 antd Button 的预设和主题颜色名称。 */
type ActionIconColor = NonNullable<ButtonProps['color']>
/** 复用 antd Button 变体，并补充不强制固定宽高的 `inline`。 */
type ActionIconVariant = NonNullable<ButtonProps['variant']> | 'inline'

/** ActionIcon 支持定制的语义部位名称，目前只有根按钮和内部图标容器。 */
export type ActionIconSemanticName = keyof ActionIconSemanticClassNames &
  keyof ActionIconSemanticStyles

/** 允许调用方分别给根按钮和图标容器追加 className。 */
export type ActionIconSemanticClassNames = {
  /** 最外层原生 button。 */
  root?: string
  /** 包住 icon/children 的 span。 */
  icon?: string
}

/** 允许调用方分别给根按钮和图标容器追加行内样式。 */
export type ActionIconSemanticStyles = {
  /** 最外层原生 button 的 style。 */
  root?: React.CSSProperties
  /** 图标 span 的 style。 */
  icon?: React.CSSProperties
}

/** semantic 配置既可以直接传对象，也可以根据最终 Props 动态计算。 */
type ActionIconSemanticValue<T> = T | ((info: { props: ActionIconProps }) => T)

/** classNames 属性的完整类型。 */
export type ActionIconClassNamesType = ActionIconSemanticValue<
  Readonly<ActionIconSemanticClassNames>
>

/** styles 属性的完整类型。 */
export type ActionIconStylesType = ActionIconSemanticValue<
  Readonly<ActionIconSemanticStyles>
>

/**
 * ActionIcon 对外属性。
 *
 * 组件本质是原生 button，所以保留 onClick、aria-label 等原生属性；children、color 和
 * type 由 ActionIcon 自己定义，避免与原生 button 或 antd 类型产生含义冲突。
 */
export interface ActionIconProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'color' | 'type'
> {
  /** 自定义 CSS 类名前缀；通常由 ConfigProvider 自动生成。 */
  prefixCls?: string
  /** 追加到根按钮的普通 className。 */
  className?: string
  /** 兼容 antd 组件约定的根级 className。 */
  rootClassName?: string
  /** 根按钮最终优先级最高的行内样式。 */
  style?: React.CSSProperties
  /** 推荐的图标内容；同时传 children 时优先使用 icon。 */
  icon?: React.ReactNode
  /** icon 为空时作为图标内容的兜底。 */
  children?: React.ReactNode
  /** 是否呈现选中态；显式传入时还会输出 aria-pressed。 */
  selected?: boolean
  /** 是否启用危险操作语义；显式 color 的优先级更高。 */
  danger?: boolean
  /** antd 预设颜色或主题色。 */
  color?: ActionIconColor
  /** filled、solid、outlined、text、link、inline 等视觉变体。 */
  variant?: ActionIconVariant
  /** 是否禁用；未传时继承 ConfigProvider 的 componentDisabled。 */
  disabled?: boolean
  /** 点击区域尺寸；`medium` 会统一成 antd 的 `middle`。 */
  size?: ActionIconSize
  /** 方形或圆形外观。 */
  shape?: 'square' | 'circle'
  /** 按 root/icon 语义部位追加 className，支持函数形式。 */
  classNames?: ActionIconClassNamesType
  /** 按 root/icon 语义部位追加 style，支持函数形式。 */
  styles?: ActionIconStylesType
}

/** 把 semantic 对象或计算函数统一解析成可以直接读取的对象。 */
function resolveSemanticValue<T>(
  value: ActionIconSemanticValue<T> | undefined,
  props: ActionIconProps,
): T {
  if (typeof value === 'function') {
    // 函数接收的不是原始 props，而是已经合并默认值和上下文后的最终 props。
    return (value as (info: { props: ActionIconProps }) => T)({ props })
  }

  // 未配置时使用空对象，后续可以直接安全读取 root/icon 而不需要到处判空。
  return (value ?? {}) as T
}

/**
 * 渲染一个只包含图标的原生按钮，并把 ref 直接转发给 button。
 *
 * 合并优先级始终是“组件显式 Props > ConfigProvider > 内置默认值”，避免上层主题配置
 * 覆盖调用方在单个按钮上明确指定的行为。
 */
const ActionIcon = React.forwardRef<HTMLButtonElement, ActionIconProps>((props, ref) => {
  // 先拆出 ActionIcon 自己消费的字段，剩余原生按钮属性最后原样透传给 button。
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

  // ConfigContext 提供全局前缀、文字方向，以及给 antd Button 配置的组件级默认值。
  // ActionIcon 沿用这些配置，这样它和同一 ConfigProvider 里的其它按钮外观能够保持一致。
  const { getPrefixCls, direction, button: buttonConfig } = React.useContext(
    ConfigProvider.ConfigContext,
  )

  // buttonConfig 可能不存在，因此用空对象兜底，再取出 ActionIcon 能复用的配置项。
  const {
    className: contextClassName,
    style: contextStyle,
    classNames: contextClassNames,
    styles: contextStyles,
    shape: contextShape,
    color: contextColor,
    variant: contextVariant,
  } = buttonConfig ?? {}

  // componentDisabled 和 componentSize 是 ConfigProvider 面向所有组件提供的通用默认值。
  const { componentDisabled, componentSize } = ConfigProvider.useConfig()

  // 调用方在当前 ActionIcon 上显式传入的值优先；只有没有传入时才继承全局配置。
  const disabled = customizeDisabled ?? componentDisabled
  const size = customizeSize ?? componentSize

  // medium 只是本组件为方便业务使用提供的别名，内部统一转成 antd 标准的 middle。
  // 后面的 className 计算和 semantic 回调因此只需要处理一种“中号”写法。
  const normalizedSize = size === 'medium' ? 'middle' : size

  // selected 默认是 false；保留 customizeSelected，是为了区分“没有传”与“明确传了 false”。
  const selected = customizeSelected ?? false

  // antd Button 还支持其它 shape，但 ActionIcon 只提供方形和圆形，因此只继承 circle。
  const shape = customizeShape ?? (contextShape === 'circle' ? 'circle' : 'square')

  // 显式 color 的优先级最高。没有 color 且 danger=true 时使用危险色，最后才读取上下文颜色。
  const configuredColor = color ?? (danger ? 'danger' : contextColor)

  // 视觉变体同样先读取组件 Props，没有传入时才继承 ConfigProvider 的 Button 变体。
  const configuredVariant = variant ?? contextVariant

  // solid 和 filled 必须有一个颜色才能得到完整样式。调用方没有指定颜色时，分别补上
  // primary 和 default；其它变体保持 undefined，继续使用基础样式。
  const mergedColor =
    configuredColor ??
    (configuredVariant === 'solid'
      ? 'primary'
      : configuredVariant === 'filled'
        ? 'default'
        : undefined)
  const mergedVariant = configuredVariant

  // icon 是更明确的图标入口，所以它优先于 children；两者都没传时 span 会自然保持为空。
  const mergedIcon = icon ?? children

  // 根据 ConfigProvider 生成最终类名前缀，并注册当前主题对应的 ActionIcon 样式。
  // hashId 用来隔离 css-in-js 样式，cssVarCls 用来让 CSS 变量在按钮节点上生效。
  const prefixCls = getPrefixCls('action-icon', customizePrefixCls)
  const [hashId, cssVarCls] = useStyle(prefixCls)

  // 中号是基础样式，不需要额外类名；只有小号和大号需要覆盖宽高与图标字号。
  const sizeCls =
    normalizedSize === 'small'
      ? `${prefixCls}-sm`
      : normalizedSize === 'large'
        ? `${prefixCls}-lg`
        : undefined

  // danger 在 CSS 中使用 dangerous 作为颜色后缀，这里只做命名转换，不改变对外 color 值。
  const colorCls = mergedColor
    ? `${prefixCls}-color-${mergedColor === 'danger' ? 'dangerous' : mergedColor}`
    : undefined

  // 每种 variant 都对应 style/index.ts 中的一组规则；未设置时只应用基础交互样式。
  const variantCls = mergedVariant ? `${prefixCls}-variant-${mergedVariant}` : undefined

  // semantic 函数需要看到组件真正采用的值，因此把原始 Props 和上面算出的最终状态合并。
  // 这个对象只用于回调入参，不会直接透传到 DOM，也不会反过来修改调用方的 props。
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

  // 先分别解析 ConfigProvider 与当前组件的 semantic classNames/styles。
  // 保持两份结果到渲染阶段再合并，便于明确实现“上下文在前、组件配置在后”的覆盖顺序。
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
      // onClick、aria-label、data-* 等未被组件消费的原生属性全部传给真实 button。
      {...restProps}
      // forwardRef 收到的 ref 必须挂在真实按钮上，调用方才能聚焦或测量这个 DOM。
      ref={ref}
      // 固定为 button，避免组件放进 form 后因浏览器默认 type=submit 而意外提交表单。
      type="button"
      disabled={disabled}
      // 只有调用方明确传了 selected，才暴露 aria-pressed=true/false；未传时属性会被省略。
      aria-pressed={customizeSelected}
      className={clsx(
        // 基础类、上下文类和 css-in-js 标识负责加载组件的公共样式。
        prefixCls,
        contextClassName,
        hashId,
        cssVarCls,
        {
          // 这些布尔类名分别控制 RTL、选中态、危险态和按钮形状。
          [`${prefixCls}-rtl`]: direction === 'rtl',
          [`${prefixCls}-selected`]: selected,
          // 显式 color 已经生成 colorCls，此时不再额外挂 danger 类，避免两套颜色规则竞争。
          [`${prefixCls}-danger`]: danger && color === undefined,
          [`${prefixCls}-${shape}`]: shape,
        },
        // 尺寸、颜色与变体类名把上面合并完成的配置连接到对应 CSS 规则。
        sizeCls,
        colorCls,
        variantCls,
        // 自定义类名放在内置类名之后；clsx 会忽略 undefined，并把所有有效类名拼起来。
        className,
        rootClassName,
        contextSemanticClassNames.root,
        customSemanticClassNames.root,
      )}
      style={{
        // 后展开的对象会覆盖前面的同名 CSS 属性，所以组件自身 style 拥有最高优先级。
        ...contextStyle,
        ...contextSemanticStyles.root,
        ...customSemanticStyles.root,
        ...style,
      }}
    >
      <span
        // 图标只是装饰内容，按钮的可访问名称应由 aria-label 等按钮属性提供。
        // 隐藏这个 span 可以防止屏幕阅读器重复朗读图标内部的文字或 SVG 信息。
        aria-hidden="true"
        className={clsx(
          `${prefixCls}-icon`,
          contextSemanticClassNames.icon,
          customSemanticClassNames.icon,
        )}
        // 图标语义样式同样是组件级配置覆盖 ConfigProvider 配置。
        style={{ ...contextSemanticStyles.icon, ...customSemanticStyles.icon }}
      >
        {mergedIcon}
      </span>
    </button>
  )
})

// displayName 让 React DevTools 和报错堆栈显示 ActionIcon，而不是匿名的 forwardRef。
ActionIcon.displayName = 'ActionIcon'

export default ActionIcon

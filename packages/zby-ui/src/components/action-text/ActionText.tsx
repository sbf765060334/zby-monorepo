import { ConfigProvider } from 'antd'
import { clsx } from 'clsx'
import * as React from 'react'
import type { AnchorHTMLAttributes } from 'react'

import useControllableValue from '../_util/hooks/useControllableValue'
import ActionTextCopyAction from './ActionTextCopyAction'
import useStyle from './style'

/** 操作区展示策略：跟随 ActionText 自身 hover，或始终展示。 */
export type ActionTextVisibleOn = 'self-hover' | 'always'

/** 单行省略配置。全文提示使用原生 title，只接受字符串。 */
export interface ActionTextEllipsisConfig {
  /** 原生 title。未传时，从 children 中的文本节点拼接全文。 */
  title?: string
}

export type ActionTextSemanticName = keyof ActionTextSemanticClassNames &
  keyof ActionTextSemanticStyles

export type ActionTextSemanticClassNames = {
  /** 最外层容器。 */
  root?: string
  /** 承载文本的节点。 */
  text?: string
  /** 文本右侧的完整操作区。 */
  actions?: string
  /** 内置复制按钮。 */
  action?: string
}

export type ActionTextSemanticStyles = {
  /** 根容器内联样式。 */
  root?: React.CSSProperties
  /** 文本节点内联样式。多行省略写在这里。 */
  text?: React.CSSProperties
  /** 操作区内联样式。 */
  actions?: React.CSSProperties
  /** 内置复制按钮的内联样式。 */
  action?: React.CSSProperties
}

type ActionTextSemanticValue<T> = T | ((info: { props: ActionTextProps }) => T)

export type ActionTextClassNamesType = ActionTextSemanticValue<
  Readonly<ActionTextSemanticClassNames>
>

export type ActionTextStylesType = ActionTextSemanticValue<
  Readonly<ActionTextSemanticStyles>
>

/** 内置复制操作配置。 */
export interface ActionTextCopyConfig {
  /** 要复制的文本；函数形式可在点击时同步或异步计算。 */
  text?: string | (() => string | Promise<string>)
  /** 浏览器复制成功后触发。 */
  onCopy?: (event?: React.MouseEvent<HTMLButtonElement>) => void
  /** 单个图标，或依次表示“复制前、复制后”的两个图标。 */
  icon?: React.ReactNode
  /** 单个原生 title，或依次表示“复制前、复制后”的两个 title。false 可关闭提示。 */
  tooltips?: string | readonly [string?, string?] | false
  /** 写入剪贴板的数据格式。 */
  format?: 'text/plain' | 'text/html'
  /** 复制按钮的键盘 Tab 顺序。 */
  tabIndex?: number
}

/** 将文本渲染成链接或无跳转按钮时的交互配置。 */
export interface ActionTextClickableConfig extends Pick<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  'href' | 'target' | 'rel'
> {
  /** 点击回调；提供 href 时修饰键点击仍保留浏览器原生行为。 */
  onClick?: React.MouseEventHandler<HTMLElement>
  /** 禁用可点击语义，文本回退为普通内容。 */
  disabled?: boolean
  /** 受控访问状态。 */
  visited?: boolean
  /** 非受控模式下的初始访问状态。 */
  defaultVisited?: boolean
  /** 首次进入访问状态时触发。 */
  onVisitedChange?: (visited: boolean) => void
}

/** ActionText 根组件属性。 */
export interface ActionTextProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'children'
> {
  /** 自定义 antd 风格前缀，默认由 ConfigProvider 生成。 */
  prefixCls?: string
  /** 附加到根节点的样式类。 */
  rootClassName?: string
  /** 展示内容，也是默认的复制文本来源。 */
  children?: React.ReactNode
  /** 单行省略。不传或 false 关闭；true 用 children 中的文本作为原生 title；对象可指定 title。 */
  ellipsis?: boolean | ActionTextEllipsisConfig
  /** 启用内置复制操作。 */
  copyable?: boolean | ActionTextCopyConfig
  /** 启用点击或链接语义。 */
  clickable?: boolean | ActionTextClickableConfig
  /** 放在复制按钮后面的自定义操作。弹层和确认逻辑由业务自己实现。 */
  actions?: React.ReactNode
  /** 操作区的展示时机。 */
  actionsVisibleOn?: ActionTextVisibleOn
  /**
   * 为 true 时强制显示操作区。
   * 自定义弹层打开后鼠标会离开根节点，self-hover 否则会把按钮隐藏掉。
   */
  actionsVisible?: boolean
  /** 按语义节点定制 className，可根据归一化后的 props 动态计算。 */
  classNames?: ActionTextClassNamesType
  /** 按语义节点定制内联样式，可根据归一化后的 props 动态计算。 */
  styles?: ActionTextStylesType
}

/** 将静态语义配置和函数式语义配置统一解析为对象。 */
function resolveSemanticValue<T>(
  value: ActionTextSemanticValue<T> | undefined,
  props: ActionTextProps,
): T {
  if (typeof value === 'function') {
    return (value as (info: { props: ActionTextProps }) => T)({ props })
  }

  return (value ?? {}) as T
}

/**
 * 收集 children 里已经写明的文本。
 * 数组和元素的子节点会继续向下拆；组件内部自己渲染、没有通过 children 传入的文字不会出现在结果里。
 */
const collectText = (node: React.ReactNode): string => {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node)
  }

  if (node == null || typeof node === 'boolean') {
    return ''
  }

  if (Array.isArray(node)) {
    return node.map(collectText).join('')
  }

  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return collectText(node.props.children)
  }

  return ''
}

/** 拼出省略用的全文；只有空白时不输出 title。 */
const getTextTitle = (children: React.ReactNode) => {
  const text = collectText(children)

  return text.trim() ? text : undefined
}

/** 省略开启时解析全文 title；空字符串不输出 title 属性。 */
const resolveEllipsisTitle = (
  ellipsis: ActionTextProps['ellipsis'],
  children: React.ReactNode,
) => {
  if (!ellipsis) return undefined

  const title =
    ellipsis !== true && ellipsis.title !== undefined
      ? ellipsis.title
      : getTextTitle(children)

  return title || undefined
}

/**
 * 判断链接点击是否应交还浏览器处理。
 * 中键、修饰键和已 preventDefault 的事件不触发 ActionText 的普通访问逻辑。
 */
const shouldUseNativeLinkBehavior = (event: React.MouseEvent<HTMLElement>) =>
  event.defaultPrevented ||
  event.button !== 0 ||
  event.metaKey ||
  event.ctrlKey ||
  event.shiftKey ||
  event.altKey

const ActionText = React.forwardRef<HTMLDivElement, ActionTextProps>((props, ref) => {
  const {
    prefixCls: customizePrefixCls,
    className,
    rootClassName,
    style,
    children,
    ellipsis = false,
    copyable,
    clickable,
    actions,
    actionsVisibleOn = 'self-hover',
    actionsVisible = false,
    classNames,
    styles,
    ...restProps
  } = props
  // 前缀、方向和 CSS-in-JS hash 都跟随 antd ConfigProvider，确保主题与 RTL 一致。
  const { getPrefixCls, direction } = React.useContext(ConfigProvider.ConfigContext)
  const prefixCls = getPrefixCls('action-text', customizePrefixCls)
  const [hashId, cssVarCls] = useStyle(prefixCls)
  const hasCopyAction = !!copyable
  const hasCustomActions = actions != null && actions !== false
  const hasActions = hasCopyAction || hasCustomActions
  // 弹层打开时钉住操作区，避免 self-hover 在鼠标移入 portal 后把触发按钮隐藏。
  const actionsVisibleCls =
    actionsVisibleOn === 'always' || actionsVisible
      ? `${prefixCls}-actions-always`
      : `${prefixCls}-actions-self-hover`

  // clickable=true 使用默认配置；对象形式则提供链接、受控 visited 等高级能力。
  const clickableConfig = clickable && clickable !== true ? clickable : {}
  const enableClickable = !!clickable && !clickableConfig.disabled
  const [visited, setVisited] = useControllableValue<boolean>(clickableConfig, {
    defaultValue: false,
    defaultValuePropName: 'defaultVisited',
    valuePropName: 'visited',
    trigger: 'onVisitedChange',
  })
  const mergedProps: ActionTextProps = {
    ...props,
    actionsVisibleOn,
    actionsVisible,
  }
  const mergedClassNames = resolveSemanticValue(classNames, mergedProps)
  const mergedStyles = resolveSemanticValue(styles, mergedProps)
  // styles.text 已声明行数时，不再叠加单行 nowrap，让业务用同一处样式完成多行省略。
  const singleLineEllipsis = Boolean(ellipsis) && mergedStyles.text?.WebkitLineClamp == null
  const ellipsisTitle = resolveEllipsisTitle(ellipsis, children)

  // visited 只从 false 跳转一次；受控模式下最终视觉状态仍由调用方传入值决定。
  const triggerVisitedChange = () => {
    if (!enableClickable || visited) return

    setVisited(true)
  }

  const handleTextClick: React.MouseEventHandler<HTMLElement> = (event) => {
    // 新标签页、下载工具等原生链接手势不应被组件内部点击逻辑劫持。
    if (clickableConfig.href && shouldUseNativeLinkBehavior(event)) return

    clickableConfig.onClick?.(event)
    triggerVisitedChange()
  }

  // 有 href 时输出语义正确的 a；无 href 时使用 button，避免用 div 模拟交互元素。
  const textNode = enableClickable ? (
    clickableConfig.href ? (
      <a
        className={clsx(`${prefixCls}-text-link`, {
          [`${prefixCls}-text-link-visited`]: visited,
        })}
        href={clickableConfig.href}
        target={clickableConfig.target}
        rel={
          clickableConfig.rel === undefined && clickableConfig.target === '_blank'
            ? 'noopener noreferrer'
            : clickableConfig.rel
        }
        onClick={handleTextClick}
      >
        {children}
      </a>
    ) : (
      <button
        type="button"
        className={clsx(`${prefixCls}-text-button`, {
          [`${prefixCls}-text-button-visited`]: visited,
        })}
        onClick={handleTextClick}
      >
        {children}
      </button>
    )
  ) : (
    children
  )

  return (
    // 根节点负责宽度约束、主题 hash、RTL 和调用方原生 div 属性。
    <div
      {...restProps}
      ref={ref}
      className={clsx(
        prefixCls,
        hashId,
        cssVarCls,
        {
          [`${prefixCls}-rtl`]: direction === 'rtl',
        },
        className,
        rootClassName,
        mergedClassNames.root,
      )}
      style={{ ...mergedStyles.root, ...style }}
    >
      <span
        className={clsx(
          `${prefixCls}-text`,
          { [`${prefixCls}-text-ellipsis`]: singleLineEllipsis },
          mergedClassNames.text,
        )}
        style={{ ...mergedStyles.text, margin: 0 }}
        title={ellipsisTitle}
      >
        {textNode}
      </span>
      {/* 操作区按“复制 → 自定义操作”固定顺序渲染。 */}
      {hasActions ? (
        <span
          className={clsx(
            `${prefixCls}-actions`,
            actionsVisibleCls,
            mergedClassNames.actions,
          )}
          style={mergedStyles.actions}
        >
          {copyable ? (
            <ActionTextCopyAction
              copyable={copyable}
              className={clsx(`${prefixCls}-action`, mergedClassNames.action)}
              style={mergedStyles.action}
            >
              {children}
            </ActionTextCopyAction>
          ) : null}
          {hasCustomActions ? actions : null}
        </span>
      ) : null}
    </div>
  )
})

ActionText.displayName = 'ActionText'

export default ActionText

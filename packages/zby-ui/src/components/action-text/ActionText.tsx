import type {
  ButtonProps,
  FormInstance,
  FormItemProps,
  FormProps,
  Input,
  InputProps,
  PopoverProps,
  TooltipProps,
} from 'antd'
import { ConfigProvider, Typography } from 'antd'
import { clsx } from 'clsx'
import * as React from 'react'
import type { AnchorHTMLAttributes } from 'react'

import useControllableValue from '../_util/hooks/useControllableValue'
import { TableCellHoverRelatedClassNames } from '../_util/tableCellHover'
import ActionIcon from '../action-icon'
import type { ActionIconProps } from '../action-icon'
import ActionTextCopyAction from './ActionTextCopyAction'
import ActionTextEditPopover from './ActionTextEditPopover'
import useStyle from './style'

/** 从 antd 公共 FormItemProps 推导字段路径，避免依赖 antd/es 下的私有类型。 */
type NamePath = NonNullable<FormItemProps['name']>
/** 从公开的 Input.TextArea 组件推导属性，随当前 antd 版本自动保持一致。 */
type TextAreaProps = React.ComponentProps<typeof Input.TextArea>

/** 操作区展示策略：跟随 ActionText 自身 hover，或始终展示。 */
export type ActionTextVisibleOn = 'self-hover' | 'table-row-hover' | 'always'

/** Typography.Paragraph 省略能力的轻量封装。 */
export interface ActionTextEllipsisConfig {
  /** 最多展示行数，默认一行。 */
  rows?: number
  /** true 时使用原始 children 作为提示内容，也可以直接传自定义 Tooltip 内容或配置。 */
  tooltip?: boolean | React.ReactNode | TooltipProps
}

export type ActionTextSemanticName = keyof ActionTextSemanticClassNames &
  keyof ActionTextSemanticStyles

export type ActionTextSemanticClassNames = {
  /** 最外层容器。 */
  root?: string
  /** 承载 Typography.Paragraph 的文本节点。 */
  text?: string
  /** 文本右侧的完整操作区。 */
  actions?: string
  /** 复制、编辑及自定义 ActionIcon 共用的单个操作节点。 */
  action?: string
}

export type ActionTextSemanticStyles = {
  /** 根容器内联样式。 */
  root?: React.CSSProperties
  /** 文本节点内联样式。 */
  text?: React.CSSProperties
  /** 操作区内联样式。 */
  actions?: React.CSSProperties
  /** 所有单个操作共同使用的内联样式。 */
  action?: React.CSSProperties
}

type ActionTextSemanticValue<T> = T | ((info: { props: ActionTextProps }) => T)

export type ActionTextClassNamesType = ActionTextSemanticValue<
  Readonly<ActionTextSemanticClassNames>
>

export type ActionTextStylesType = ActionTextSemanticValue<
  Readonly<ActionTextSemanticStyles>
>

/** 文本右侧自定义操作项；视觉和交互能力复用 ActionIcon。 */
export interface ActionTextAction extends Omit<
  ActionIconProps,
  'children' | 'icon' | 'title'
> {
  /** React 列表 key，用于稳定识别操作项。 */
  key: React.Key
  /** 操作图标。 */
  icon: React.ReactNode
  /** 无显式 title 时，字符串 label 会同时作为无障碍名称。 */
  label?: React.ReactNode
  /** 原生 title；字符串值也会作为默认 aria-label。 */
  title?: React.ReactNode
}

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

/** renderForm 自定义编辑表单时可使用的完整运行上下文。 */
export interface ActionTextEditableRenderContext {
  /** ActionText 内部创建的 antd Form 实例。 */
  form: FormInstance
  /** 当前主编辑字段的路径。 */
  name: NamePath
  /** 已按 inputType 创建并透传 inputProps 的默认输入节点。 */
  inputNode: React.ReactNode
  /** 编辑 Popover 当前是否打开。 */
  open: boolean
  /** 异步确认操作是否正在执行。 */
  loading: boolean
  /** 执行校验、提交并在成功后关闭 Popover。 */
  confirm: () => Promise<void>
  /** 执行取消回调并关闭 Popover。 */
  cancel: () => void
  /** 仅关闭 Popover，不额外触发取消回调。 */
  close: () => void
}

/** 确认回调附带的 Form 上下文和完整校验结果。 */
export interface ActionTextEditableConfirmInfo {
  /** 当前编辑 Form 实例。 */
  form: FormInstance
  /** validateFields 返回的完整表单值，包含 renderForm 添加的其他字段。 */
  values: any
}

/** 取消回调附带的 Form 上下文。 */
export interface ActionTextEditableCancelInfo {
  /** 当前编辑 Form 实例，可用于读取取消前的字段状态。 */
  form: FormInstance
}

export interface ActionTextEditableConfig {
  /** 输入框中的当前文本；未提供时从字符串或数字 children 推导。 */
  text?: string
  /** 受控打开状态。 */
  open?: boolean
  /** 非受控模式下的初始打开状态。 */
  defaultOpen?: boolean
  /** 打开状态变化通知；受控模式下由调用方负责回传新值。 */
  onOpenChange?: (open: boolean) => void
  /** Popover 标题，同时用于编辑按钮的无障碍名称。 */
  title?: React.ReactNode
  /** 默认单行 Input，也可切换为 Input.TextArea。 */
  inputType?: 'input' | 'textarea'
  /** 透传给当前 inputType 对应输入组件的属性。 */
  inputProps?: InputProps | TextAreaProps
  /** 透传给内部 Form；initialValues 会与主编辑字段的值合并。 */
  formProps?: FormProps
  /** 透传给默认 Form.Item；name 和 initialValue 由 ActionText 统一管理。 */
  formItemProps?: Omit<FormItemProps, 'initialValue' | 'name'>
  /** 主编辑字段路径，支持 antd NamePath 的嵌套结构。 */
  name?: NamePath
  /** 确认按钮文案，默认读取 @zby/intl。 */
  confirmText?: React.ReactNode
  /** 取消按钮文案，默认读取 @zby/intl。 */
  cancelText?: React.ReactNode
  /** 确认按钮属性。 */
  confirmButtonProps?: ButtonProps
  /** 取消按钮属性。 */
  cancelButtonProps?: ButtonProps
  /** 透传给 Popover，但打开状态、触发方式和内容由 ActionText 接管。 */
  popoverProps?: Omit<
    PopoverProps,
    'content' | 'open' | 'onOpenChange' | 'trigger' | 'children'
  >
  /** 完全自定义表单主体；底部确认和取消操作仍由 ActionText 提供。 */
  renderForm?: (ctx: ActionTextEditableRenderContext) => React.ReactNode
  /** 校验通过后的确认回调；返回 Promise 时按钮进入 loading，成功后才关闭。 */
  onConfirm?: (
    value: any,
    info: ActionTextEditableConfirmInfo,
  ) => void | Promise<void>
  /** 用户点击取消时触发。 */
  onCancel?: (info: ActionTextEditableCancelInfo) => void
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
  /** 展示内容，也是默认的复制和编辑文本来源。 */
  children?: React.ReactNode
  /** 文本省略配置，默认单行省略并展示完整内容提示。 */
  ellipsis?: boolean | ActionTextEllipsisConfig
  /** 启用内置复制操作。 */
  copyable?: boolean | ActionTextCopyConfig
  /** 启用 Popover 编辑操作。 */
  editable?: boolean | ActionTextEditableConfig
  /** 启用点击或链接语义。 */
  clickable?: boolean | ActionTextClickableConfig
  /** 追加在内置复制、编辑操作后的自定义操作。 */
  actions?: ActionTextAction[]
  /** 操作区的展示时机。 */
  actionsVisibleOn?: ActionTextVisibleOn
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

/** 优先取 title，再取 label；只有字符串才能安全转成原生无障碍文本。 */
const getActionLabel = (action: ActionTextAction) => {
  const title = action.title ?? action.label
  return typeof title === 'string' ? title : undefined
}

/**
 * 将 ActionText 的简化 ellipsis 配置转换成 Typography.Paragraph 所需结构。
 * boolean true 表示一行省略，并直接用原始 children 作为完整内容提示。
 */
const getParagraphEllipsis = (
  ellipsis: ActionTextProps['ellipsis'],
  children: React.ReactNode,
) => {
  if (!ellipsis) return false

  if (ellipsis === true) {
    return {
      rows: 1,
      tooltip: children,
    }
  }

  const { rows = 1, tooltip = children } = ellipsis

  return {
    ...ellipsis,
    rows,
    tooltip: tooltip === true ? children : tooltip,
  }
}

/** 默认编辑器只接受可无损转成字符串的 children，复杂节点交给 editable.text 显式指定。 */
const getTextFromChildren = (children: React.ReactNode) => {
  if (typeof children === 'string' || typeof children === 'number') {
    return String(children)
  }

  return ''
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
    ellipsis = true,
    copyable,
    editable,
    clickable,
    actions,
    actionsVisibleOn = 'self-hover',
    classNames,
    styles,
    ...restProps
  } = props
  // 前缀、方向和 CSS-in-JS hash 都跟随 antd ConfigProvider，确保主题与 RTL 一致。
  const { getPrefixCls, direction } = React.useContext(ConfigProvider.ConfigContext)
  const prefixCls = getPrefixCls('action-text', customizePrefixCls)
  const [hashId, cssVarCls] = useStyle(prefixCls)
  const paragraphEllipsis = getParagraphEllipsis(ellipsis, children)
  const actionList = actions?.filter(Boolean) ?? []
  const hasCopyAction = !!copyable
  const hasEditAction = !!editable
  const hasActions = hasCopyAction || hasEditAction || actionList.length > 0
  const actionsVisibleCls = `${prefixCls}-actions-${actionsVisibleOn}`

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
  }
  const mergedClassNames = resolveSemanticValue(classNames, mergedProps)
  const mergedStyles = resolveSemanticValue(styles, mergedProps)

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

  const defaultText = getTextFromChildren(children)

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
      <Typography.Paragraph
        className={clsx(`${prefixCls}-text`, mergedClassNames.text)}
        style={{ ...mergedStyles.text, margin: 0 }}
        ellipsis={paragraphEllipsis}
      >
        {textNode}
      </Typography.Paragraph>
      {/* 操作区按“复制 → 编辑 → 自定义操作”固定顺序渲染。 */}
      {hasActions ? (
        <span
          className={clsx(
            `${prefixCls}-actions`,
            actionsVisibleCls,
            {
              [TableCellHoverRelatedClassNames.hoverToDisplayInlineFlex]:
                actionsVisibleOn === 'table-row-hover',
            },
            mergedClassNames.actions,
          )}
          style={mergedStyles.actions}
        >
          {hasCopyAction ? (
            <ActionTextCopyAction
              copyable={copyable}
              className={clsx(`${prefixCls}-action`, mergedClassNames.action)}
              style={mergedStyles.action}
            >
              {children}
            </ActionTextCopyAction>
          ) : null}
          {hasEditAction ? (
            <ActionTextEditPopover
              prefixCls={prefixCls}
              hashId={hashId}
              cssVarCls={cssVarCls}
              editable={editable}
              defaultText={defaultText}
              className={clsx(`${prefixCls}-action`, mergedClassNames.action)}
              style={mergedStyles.action}
            >
              {children}
            </ActionTextEditPopover>
          ) : null}
          {actionList.map((action) => {
            const {
              key,
              label: _label,
              title,
              className: actionClassName,
              style: actionStyle,
              ...actionProps
            } = action
            const actionLabel = getActionLabel(action)

            return (
              <ActionIcon
                key={key}
                size="small"
                {...actionProps}
                icon={action.icon}
                title={typeof title === 'string' ? title : actionLabel}
                aria-label={actionProps['aria-label'] ?? actionLabel}
                className={clsx(
                  `${prefixCls}-action`,
                  actionClassName,
                  mergedClassNames.action,
                )}
                style={{ ...mergedStyles.action, ...actionStyle }}
              />
            )
          })}
        </span>
      ) : null}
    </div>
  )
})

ActionText.displayName = 'ActionText'

export default ActionText

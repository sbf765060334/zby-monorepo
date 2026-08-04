import * as React from 'react'
import { ConfigProvider, theme as antdTheme } from 'antd'
import { clsx } from 'clsx'

import ActionIcon from '../action-icon'
import type { ActionIconProps } from '../action-icon'
import { getActionIconSizes } from '../action-icon/size'

type RevealWidth = React.CSSProperties['width']

/** 可通过 `classNames` / `styles` 定制的语义节点名称。 */
export type ActionRevealSemanticName = keyof ActionRevealSemanticClassNames &
  keyof ActionRevealSemanticStyles

export type ActionRevealSemanticClassNames = {
  /** 收起态触发按钮。 */
  trigger?: string
  /** 展开态内容根节点。 */
  content?: string
}

export type ActionRevealSemanticStyles = {
  /** 收起态触发按钮样式。 */
  trigger?: React.CSSProperties
  /** 展开态内容根节点样式。 */
  content?: React.CSSProperties
}

/**
 * 语义化配置既支持静态对象，也支持根据归一化后的组件 props 动态计算。
 * 回调中的 `props.open`、`props.size`、`props.disabled` 等值已经合并默认值和上下文。
 */
type ActionRevealSemanticValue<T> = T | ((info: { props: ActionRevealProps }) => T)

export type ActionRevealClassNamesType = ActionRevealSemanticValue<
  Readonly<ActionRevealSemanticClassNames>
>

export type ActionRevealStylesType = ActionRevealSemanticValue<
  Readonly<ActionRevealSemanticStyles>
>

/**
 * 必须传递给 `content` 所返回真实根节点的属性。
 *
 * 组件刻意不额外创建包装 DOM，因此动画宽度、焦点范围和失焦收起都依赖这些属性
 * 被正确透传。对于 antd Input 等复合组件，`ref` 可以按其公开 Ref 类型进行断言。
 */
export type ActionRevealContentProps = {
  /** 同时用于自动聚焦、焦点边界判断和向外转发的内容 ref。 */
  ref: React.Ref<unknown>
  /** 包含基础类名、动画状态类名及当前实例的焦点作用域类名。 */
  className: string
  /** 包含当前动画宽度、overflow 与 transition。 */
  style: React.CSSProperties
  hidden?: boolean
  /** 用于判断焦点是否真正离开整个内容区域。 */
  onBlur: React.FocusEventHandler
}

export type ActionRevealContentRender = (info: {
  /** 目标开合状态；关闭动画期间已为 false。 */
  open: boolean
  /** 当前视觉展开状态；用于区分关闭动画与已经完全展开。 */
  expanded: boolean
  /** 主动请求收起；焦点仍在内容内时会在收起后恢复到触发按钮。 */
  close: () => void
  contentProps: ActionRevealContentProps
}) => React.ReactElement

export interface ActionRevealProps {
  /** 自定义组件 CSS 前缀。 */
  prefixCls?: string
  /** 追加到展开态内容根节点。 */
  className?: string
  /** 无额外包装节点，因此同样追加到展开态内容根节点。 */
  rootClassName?: string
  /** 展开态内容根节点基础样式。 */
  style?: React.CSSProperties
  /** 透传到当前实际渲染的触发按钮或内容根节点。 */
  hidden?: boolean
  /** 触发按钮尺寸；未传时继承 ConfigProvider。 */
  size?: ActionIconProps['size']
  /** 是否禁用收起态触发按钮；未传时继承 ConfigProvider。 */
  disabled?: boolean
  /** 受控展开状态。 */
  open?: boolean
  /** 非受控模式下的初始展开状态。 */
  defaultOpen?: boolean
  /** 用户点击、失焦或调用 close 请求改变状态时触发。 */
  onOpenChange?: (open: boolean) => void
  /** 焦点离开整个内容根节点后是否自动收起。 */
  collapseOnBlur?: boolean
  /** 展开后是否聚焦 content ref。 */
  autoFocus?: boolean
  /** 收起态按钮图标。 */
  triggerIcon?: React.ReactNode
  /** 透传给收起态 ActionIcon 的属性。 */
  actionIconProps?: Partial<ActionIconProps>
  /** 展开目标宽度；未传时使用内容自然宽度，并跳过宽度动画。 */
  width?: RevealWidth
  /** 动画起始宽度；未传时优先使用实际触发按钮宽度。 */
  collapsedWidth?: RevealWidth
  /** 展开内容渲染函数。返回值会直接替换触发按钮，不增加包装节点。 */
  content: ActionRevealContentRender
  /** 触发按钮和内容节点的语义 className。 */
  classNames?: ActionRevealClassNamesType
  /** 触发按钮和内容节点的语义内联样式。 */
  styles?: ActionRevealStylesType
}

/** 将静态语义值与函数形式统一解析成对象。 */
function resolveSemanticValue<T>(
  value: ActionRevealSemanticValue<T> | undefined,
  props: ActionRevealProps,
): T {
  if (typeof value === 'function') {
    return (value as (info: { props: ActionRevealProps }) => T)({ props })
  }

  return (value ?? {}) as T
}

/**
 * 将 antd 动画时长 token 转换成关闭内容的兜底计时毫秒数。
 * token 通常为 `0.2s` 或 `200ms`；无法解析时使用 300ms，避免内容永久残留。
 */
function getMotionDeadline(duration: string | number | undefined) {
  if (typeof duration === 'number') return duration

  const parsedDuration = Number.parseFloat(duration ?? '')
  if (Number.isNaN(parsedDuration)) return 300

  return duration?.trim().endsWith('ms') ? parsedDuration : parsedDuration * 1000
}

/**
 * 将普通 HTMLElement 与 antd 常见的组件 Ref 统一解析成可操作 DOM。
 * `nativeElement` 通常指复合组件根节点，`input` 用于兼容 InputRef。
 */
function getFocusableElement(node: unknown): HTMLElement | null {
  if (!node) return null
  if (node instanceof HTMLElement) return node

  const refObject = node as {
    nativeElement?: HTMLElement | null
    input?: HTMLElement | null
  }

  return refObject.nativeElement ?? refObject.input ?? null
}

/**
 * 从 ref 或事件目标向上寻找当前 ActionReveal 实例的真实内容根节点。
 * 每个实例都有独立 scope class，因此嵌套 ActionReveal 也不会混淆焦点边界。
 */
function findContentElement(node: unknown, scopeClassName: string): HTMLElement | null {
  let element = getFocusableElement(node)

  while (element) {
    if (element.classList.contains(scopeClassName)) return element
    element = element.parentElement
  }

  return null
}

/** 优先调用组件 Ref 暴露的 focus，再回退到解析出的原生 DOM。 */
function focusContent(node: unknown) {
  if (!node) return

  const focusableRef = node as { focus?: () => void }
  if (typeof focusableRef.focus === 'function') {
    focusableRef.focus()
    return
  }

  getFocusableElement(node)?.focus()
}

const ActionReveal = React.forwardRef<unknown, ActionRevealProps>((props, ref) => {
  const {
    prefixCls: customizePrefixCls,
    className,
    rootClassName,
    style,
    hidden,
    size: customizeSize,
    disabled: customizeDisabled,
    open: controlledOpen,
    defaultOpen = false,
    onOpenChange,
    collapseOnBlur = true,
    autoFocus = true,
    triggerIcon,
    actionIconProps,
    width,
    collapsedWidth,
    content,
    classNames,
    styles,
  } = props
  const { getPrefixCls, direction } = React.useContext(ConfigProvider.ConfigContext)
  const { componentDisabled, componentSize } = ConfigProvider.useConfig()
  const { token } = antdTheme.useToken()

  // useId 在 SSR 与客户端保持稳定；移除冒号后作为 class token 使用。
  const contentScopeId = React.useId()
  const prefixCls = getPrefixCls('action-reveal', customizePrefixCls)
  const contentScopeClassName = `${prefixCls}-scope-${contentScopeId.replace(/:/g, '')}`

  // 显式 props 优先于 ConfigProvider 提供的组件级默认值。
  const size = customizeSize ?? componentSize
  const disabled = customizeDisabled ?? componentDisabled
  const motionEnabled = token.motion !== false

  // open 只负责“目标状态”：受控模式完全以外部值为准，非受控模式更新内部状态。
  const isControlled = controlledOpen !== undefined
  const [innerOpen, setInnerOpen] = React.useState(defaultOpen)
  const open = isControlled ? controlledOpen : innerOpen

  /**
   * 动画状态分成两层：
   * - renderContent：关闭动画完成前继续挂载内容；
   * - contentExpanded：决定当前使用折叠宽度还是展开宽度。
   *
   * 打开：trigger -> 挂载折叠内容 -> 下一帧展开。
   * 关闭：展开内容 -> 切到折叠宽度 -> 动画结束后卸载并渲染 trigger。
   */
  const [renderContent, setRenderContent] = React.useState(() => open)
  const [contentExpanded, setContentExpanded] = React.useState(() => open)

  // 触发器测量值只服务于动画起点，不改变调用方传入的 collapsedWidth。
  const [measuredTriggerWidth, setMeasuredTriggerWidth] = React.useState<number>()

  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const contentRef = React.useRef<unknown>(null)

  // 前者记录本次关闭是否希望恢复焦点，后者跨过卸载渲染保存最终决定。
  const restoreFocusOnCloseRef = React.useRef<boolean | null>(null)
  const restoreFocusAfterCloseRef = React.useRef(false)

  // 外部直接将 open 设为 true 时没有 trigger 可测量，使用与 ActionIcon 相同的尺寸公式兜底。
  const actionIconSizes = getActionIconSizes(token)
  const fallbackCollapsedWidth =
    size === 'small'
      ? actionIconSizes.small
      : size === 'large'
        ? actionIconSizes.large
        : actionIconSizes.middle
  const mergedCollapsedWidth = collapsedWidth ?? measuredTriggerWidth ?? fallbackCollapsedWidth

  const mergedProps: ActionRevealProps = {
    ...props,
    collapseOnBlur,
    disabled,
    size,
    open,
  }
  const mergedClassNames = resolveSemanticValue(classNames, mergedProps)
  const mergedStyles = resolveSemanticValue(styles, mergedProps)

  // 语义 styles 的优先级高于顶层 style；独立 width prop 的优先级最高。
  const mergedContentStyle = { ...style, ...mergedStyles.content }
  const targetWidth = width ?? mergedContentStyle.width
  // CSS 无法在确定宽度和 auto 之间可靠插值；没有目标宽度时直接使用自然宽度。
  const widthMotionEnabled = motionEnabled && targetWidth !== undefined

  /**
   * 统一派发状态请求。受控模式只通知，不在组件内部擅自改变 open；
   * 非受控模式则先更新内部状态，再调用同一个 onOpenChange。
   */
  const triggerOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) setInnerOpen(nextOpen)
      onOpenChange?.(nextOpen)
    },
    [isControlled, onOpenChange],
  )

  // content 主动关闭时，只有当前焦点确实位于内容内部，才计划恢复到触发按钮。
  const close = React.useCallback(() => {
    const contentElement =
      findContentElement(contentRef.current, contentScopeClassName) ??
      getFocusableElement(contentRef.current)
    restoreFocusOnCloseRef.current = Boolean(
      contentElement?.contains(document.activeElement),
    )
    triggerOpenChange(false)
  }, [contentScopeClassName, triggerOpenChange])

  // open 变为 true 时先同步挂载内容，保证浏览器首次绘制的是折叠宽度而不是 trigger。
  React.useLayoutEffect(() => {
    if (open) {
      restoreFocusOnCloseRef.current = null
      restoreFocusAfterCloseRef.current = false
      // 无目标宽度或关闭 motion 时，首次挂载即使用自然宽度，避免窄宽内容换行撑高容器。
      if (!widthMotionEnabled) setContentExpanded(true)
      setRenderContent(true)
    }
  }, [open, widthMotionEnabled])

  /**
   * 驱动开合动画状态机：
   * - 打开时等待一帧再切换宽度，确保浏览器能识别 transition 的起止状态；
   * - 关闭时先切回折叠宽度，再按 token 时长延迟卸载内容；
   * - motion=false 时跳过所有等待，直接进入目标状态。
   */
  React.useEffect(() => {
    if (open) {
      if (!widthMotionEnabled) {
        setContentExpanded(true)
        return undefined
      }

      const frame = requestAnimationFrame(() => {
        setContentExpanded(true)
      })

      return () => cancelAnimationFrame(frame)
    }

    if (!renderContent) return undefined

    setContentExpanded(false)

    const hideContent = () => {
      const contentElement =
        findContentElement(contentRef.current, contentScopeClassName) ??
        getFocusableElement(contentRef.current)
      const focusedInside = Boolean(contentElement?.contains(document.activeElement))

      // 失焦关闭不会抢回焦点；主动/外部关闭也仅在焦点仍留在内容内时恢复。
      restoreFocusAfterCloseRef.current = Boolean(
        (restoreFocusOnCloseRef.current ?? focusedInside) && focusedInside,
      )
      restoreFocusOnCloseRef.current = null
      setRenderContent(false)
    }

    if (!widthMotionEnabled) {
      hideContent()
      return undefined
    }

    const timeout = window.setTimeout(hideContent, getMotionDeadline(token.motionDurationMid))

    return () => window.clearTimeout(timeout)
  }, [contentScopeClassName, open, renderContent, token.motionDurationMid, widthMotionEnabled])

  // 内容挂载完成后再聚焦，兼容 HTMLElement 与 antd 组件 Ref。
  React.useLayoutEffect(() => {
    if (autoFocus && open && renderContent) focusContent(contentRef.current)
  }, [autoFocus, open, renderContent])

  // 关闭动画结束、trigger 重新挂载后同步恢复焦点，避免焦点落到 document.body。
  React.useLayoutEffect(() => {
    if (!renderContent && restoreFocusAfterCloseRef.current) {
      restoreFocusAfterCloseRef.current = false
      triggerRef.current?.focus()
    }
  }, [renderContent])

  const handleTriggerClick: React.MouseEventHandler<HTMLButtonElement> = (event) => {
    // 保留调用方 onClick 的优先处理权；preventDefault 可以阻止本次展开。
    actionIconProps?.onClick?.(event)
    if (event.defaultPrevented) return

    // 点击发生时 trigger 仍在 DOM 中，此时读取宽度可避免按钮与内容切换时跳变。
    const triggerWidth = triggerRef.current?.offsetWidth
    if (triggerWidth) setMeasuredTriggerWidth(triggerWidth)

    triggerOpenChange(true)
  }

  const handleContentBlur: React.FocusEventHandler = (event) => {
    if (!collapseOnBlur) return

    // 优先从事件目标找到带实例 scope 的视觉根节点，兼容 Input.Search 等复合组件：
    // 它们转发的 ref 可能只指向内部 input，但 className 位于更外层的真实根节点。
    const element =
      findContentElement(event.target, contentScopeClassName) ??
      findContentElement(contentRef.current, contentScopeClassName) ??
      getFocusableElement(contentRef.current)
    if (element?.contains(event.relatedTarget as Node | null)) return

    // 焦点已经前往内容外部，按失焦语义关闭，后续不得把焦点抢回 trigger。
    restoreFocusOnCloseRef.current = false
    triggerOpenChange(false)
  }

  const setContentRef = React.useCallback(
    (node: unknown) => {
      contentRef.current = node

      // 内部能力和调用方 ref 共用同一个真实内容实例。
      if (typeof ref === 'function') {
        ref(node)
      } else if (ref) {
        ref.current = node
      }
    },
    [ref],
  )

  // 完全收起时只渲染 ActionIcon；展开内容不会留下额外包装节点。
  if (!renderContent) {
    return (
      <ActionIcon
        {...actionIconProps}
        ref={triggerRef}
        hidden={hidden}
        icon={triggerIcon}
        disabled={disabled}
        size={size}
        className={clsx(
          `${prefixCls}-trigger`,
          actionIconProps?.className,
          mergedClassNames.trigger,
        )}
        style={{ ...actionIconProps?.style, ...mergedStyles.trigger }}
        onClick={handleTriggerClick}
      />
    )
  }

  /**
   * contentProps 是无包装节点设计的核心契约：调用方需要把这些属性透传到真实根节点。
   * 动态 width 始终控制动画端点；用户提供的 overflow/transition 则优先于内部默认值。
   */
  const contentProps: ActionRevealContentProps = {
    ref: setContentRef,
    hidden,
    className: clsx(
      prefixCls,
      {
        [`${prefixCls}-rtl`]: direction === 'rtl',
        [`${prefixCls}-open`]: contentExpanded,
      },
      contentScopeClassName,
      className,
      rootClassName,
      mergedClassNames.content,
    ),
    style: {
      ...mergedContentStyle,
      width: contentExpanded ? targetWidth : mergedCollapsedWidth,
      overflow: mergedContentStyle.overflow ?? 'hidden',
      transition:
        mergedContentStyle.transition ??
        (widthMotionEnabled
          ? `width ${token.motionDurationMid} ${token.motionEaseInOut}`
          : undefined),
    },
    onBlur: handleContentBlur,
  }

  // 关闭动画期间 open=false 但 expanded/renderContent 仍可为 true，调用方可据此区分阶段。
  return content({
    open,
    expanded: contentExpanded,
    close,
    contentProps,
  })
})

ActionReveal.displayName = 'ActionReveal'

export default ActionReveal

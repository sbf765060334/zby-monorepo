import { CloseCircleFilled, SwapRightOutlined } from '@ant-design/icons'
import { InputNumber } from 'antd'
import type { InputNumberProps } from 'antd'
import { getMergedStatus, getStatusClassNames } from 'antd/es/_util/statusUtils'
import DisabledContext from 'antd/es/config-provider/DisabledContext'
import useSize from 'antd/es/config-provider/hooks/useSize'
import { FormItemInputContext } from 'antd/es/form/context'
import useVariant from 'antd/es/form/hooks/useVariants'
import { useIntl } from '@zby/intl'
import * as React from 'react'
import { useInputNumberRangeStyle } from './style'

/**
 * 单个输入框允许承载的值类型。
 *
 * number 对应 antd InputNumber 的普通模式；string 通常来自 stringMode，
 * 用于金额、超大整数或高精度小数，内部比较时不能直接转成 Number。
 */
type ValueType = string | number

/** 范围输入的两侧标识，回调用它告诉调用方当前事件来自哪一侧。 */
type RangeSide = 'start' | 'end'

/** 复用 antd InputNumber 的外观、尺寸、状态类型，保证对外 API 语义一致。 */
type RangeVariant = NonNullable<InputNumberProps['variant']>
type RangeSize = InputNumberProps['size']
type RangeStatus = InputNumberProps['status']

type InputNumberFocusRef = {
  focus: () => void
}

/**
 * InputNumberRange 的标准值结构。
 *
 * - 第 0 项是起始值 start，第 1 项是结束值 end。
 * - null 表示该侧为空；不会用 undefined 表示空值。
 * - T 会跟随 stringMode 等场景变成 string，调用方应按原类型保存。
 */
export type InputNumberRangeValue<T extends ValueType = ValueType> = [T | null, T | null]

/** 允许透传到单侧输入框的 data-* 属性，方便测试选择器和业务埋点。 */
type RangeFieldDataAttributes = {
  [key: `data-${string}`]: string | number | boolean | undefined
}

/**
 * 单侧输入框的定制属性。
 *
 * startProps 只作用于左侧 start 输入框，endProps 只作用于右侧 end 输入框。
 * 这里刻意只暴露安全的输入属性，避免调用方覆盖 value、variant、controls 等
 * 会破坏范围组件整体行为的内部控制项。
 */
export type InputNumberRangeFieldProps<T extends ValueType = ValueType> = {
  /** 单侧 input 的 id。优先级高于组件级 id 自动生成出来的 id。 */
  id?: string
  /** 单侧占位文案。优先级高于组件级 placeholder 对应位置的文案。 */
  placeholder?: string
  /** 透传给单侧 InputNumber 的 prefix，显示在该侧输入框内部。 */
  prefix?: React.ReactNode
  /** 透传给单侧 InputNumber 的 suffix，显示在该侧输入框内部。 */
  suffix?: React.ReactNode
  /** 单侧 input 的 tab 顺序。 */
  tabIndex?: number
  /** 单侧 input 的 name，常用于原生表单或自动填充识别。 */
  name?: string
  /** 单侧 input 的 autoComplete。 */
  autoComplete?: string
  /** 单侧 input 的 inputMode，用于提示移动端键盘类型。 */
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
  /** 单侧 input 的 pattern。 */
  pattern?: string
  /** 单侧 input 的无障碍标签。 */
  'aria-label'?: string
  /**
   * 单侧值变化回调。
   *
   * 这个回调只表示这一侧输入内容变化，不代表整个范围已经提交；
   * 范围级提交结果请使用组件级 onChange。
   */
  onChange?: (value: T | null) => void
  /** 单侧聚焦回调，会先于组件级 onFocus 调用。 */
  onFocus?: React.FocusEventHandler<HTMLInputElement>
  /** 单侧失焦回调，会先于组件级 onBlur 调用。 */
  onBlur?: React.FocusEventHandler<HTMLInputElement>
  /** 单侧原始输入文本回调，透传 antd InputNumber 的 onInput。 */
  onInput?: (text: string) => void
  /** 单侧回车回调；回车后组件还会尝试提交整个范围值。 */
  onPressEnter?: React.KeyboardEventHandler<HTMLInputElement>
} & Partial<RangeFieldDataAttributes>

/** 实际透传给 antd InputNumber 的单侧属性白名单。 */
type RangeFieldForwardProps<T extends ValueType = ValueType> = Pick<
  InputNumberRangeFieldProps<T>,
  | 'tabIndex'
  | 'name'
  | 'autoComplete'
  | 'inputMode'
  | 'pattern'
  | 'aria-label'
  | 'prefix'
  | 'suffix'
  | 'onInput'
> &
  Partial<RangeFieldDataAttributes>

/**
 * 同时透传给 start/end 两个 InputNumber 的数值输入能力。
 *
 * 这些属性会作用到两侧输入框，适合描述统一的数值规则；如果两侧规则不同，
 * 当前组件没有开放分侧 min/max，需要在业务层拆成两个独立输入框处理。
 */
type SharedInputNumberProps<T extends ValueType = ValueType> = {
  /** 两侧共同的最小值限制。 */
  min?: InputNumberProps<T>['min']
  /** 两侧共同的最大值限制。 */
  max?: InputNumberProps<T>['max']
  /** 两侧共同的步进值。 */
  step?: InputNumberProps<T>['step']
  /** 两侧共同的小数精度。 */
  precision?: InputNumberProps<T>['precision']
  /** 两侧共同的展示格式化函数，只影响展示文本。 */
  formatter?: InputNumberProps<T>['formatter']
  /** 两侧共同的输入解析函数，用于把展示文本解析回真实值。 */
  parser?: InputNumberProps<T>['parser']
  /**
   * 是否以字符串形式保存数值。
   *
   * 高精度金额、超大整数、小数位很多的值建议开启；组件排序逻辑会避免
   * 把这类字符串直接转成 Number 导致精度丢失。
   */
  stringMode?: InputNumberProps<T>['stringMode']
  /** 是否允许鼠标滚轮改变数值，语义与 antd InputNumber 保持一致。 */
  changeOnWheel?: InputNumberProps<T>['changeOnWheel']
  /** 是否允许键盘上下键调整数值，语义与 antd InputNumber 保持一致。 */
  keyboard?: InputNumberProps<T>['keyboard']
}

/**
 * InputNumberRange 组件属性。
 *
 * 组件由两个 antd InputNumber 组成：左侧表示 start，右侧表示 end。
 * 输入中的临时值会先保存在内部草稿中，失焦离开整个组件或按 Enter 时才提交
 * 范围级 onChange。
 */
export interface InputNumberRangeProps<
  T extends ValueType = ValueType,
> extends SharedInputNumberProps<T> {
  /**
   * 首次挂载后自动聚焦。
   *
   * 默认聚焦 start；组件 disabled/readOnly 时不会自动聚焦。
   */
  autoFocus?: boolean
  /**
   * 受控范围值。
   *
   * 传入该属性后，组件展示以 value 为准；外部更新 value 时，内部草稿会识别
   * 旧草稿是否过期，避免 focused 状态下继续提交旧值。
   */
  value?: InputNumberRangeValue<T>
  /**
   * 非受控默认值，仅在首次渲染时使用。
   *
   * 如果同时传 value，则 defaultValue 不再参与后续状态控制。
   */
  defaultValue?: InputNumberRangeValue<T>
  /**
   * 范围提交后的回调。
   *
   * 用户输入某一侧时不会立即触发；当焦点离开整个范围、按 Enter、点击 clear，
   * 且最终范围值确实发生变化时触发。
   */
  onChange?: (value: InputNumberRangeValue<T>) => void
  /**
   * 是否自动保证 start <= end。
   *
   * 默认 true。提交时如果 start 大于 end，会自动交换两侧值；stringMode 下会使用
   * 高精度字符串比较，避免大数被 Number 转换丢精度。
   */
  order?: boolean
  /**
   * 两侧占位文案，数组第 0 项用于 start，第 1 项用于 end。
   *
   * 不传时使用国际化默认文案。
   */
  placeholder?: [string, string]
  /** 中间分隔符，默认是 SwapRightOutlined 图标。 */
  separator?: React.ReactNode
  /** 整体左侧前缀，显示在两个输入框外侧。 */
  prefix?: React.ReactNode
  /** 整体右侧后缀，显示在 clear 图标右侧。 */
  suffix?: React.ReactNode
  /**
   * 是否显示清空入口。
   *
   * true 使用默认关闭图标；对象形式可自定义 clearIcon。组件 disabled/readOnly 时
   * 不显示 clear；可编辑状态下点击 clear 会把 start/end 一起清空为 null。
   */
  allowClear?: boolean | { clearIcon?: React.ReactNode }
  /**
   * 整体禁用状态。
   *
   * 该组件按一个完整范围输入控件处理，禁用会同时作用于 start/end 两侧，
   * 不再支持半边禁用，避免 clear、order、提交值对禁用侧产生隐式改写。
   */
  disabled?: boolean
  /**
   * 整体只读。
   *
   * 两侧仍可聚焦和复制内容，但不能编辑；组件只读时不显示 clear。
   */
  readOnly?: boolean
  /**
   * 是否允许提交空边界。
   *
   * boolean 会同时控制两侧；数组形式 [startAllowEmpty, endAllowEmpty] 可分别控制。
   * 例如 allowEmpty={[false, true]} 表示 end 可以为空，但 start 不能为空。
   */
  allowEmpty?: boolean | [boolean, boolean]
  /**
   * 输入框 id。
   *
   * 传字符串时会生成 `${id}-start` 和 `${id}-end`；对象形式可完全自定义两侧 id。
   */
  id?: string | { start?: string; end?: string }
  /** start 输入框的单侧定制属性，优先级高于组件级对应配置。 */
  startProps?: InputNumberRangeFieldProps<T>
  /** end 输入框的单侧定制属性，优先级高于组件级对应配置。 */
  endProps?: InputNumberRangeFieldProps<T>
  /**
   * 任一侧聚焦时触发。
   *
   * info.range 用于区分当前聚焦的是 start 还是 end。
   */
  onFocus?: (event: React.FocusEvent<HTMLInputElement>, info: { range: RangeSide }) => void
  /**
   * 任一侧失焦时触发。
   *
   * 真正提交会延迟到确认焦点离开整个范围组件之后，因此 start/end 之间切换不会提交。
   */
  onBlur?: (event: React.FocusEvent<HTMLInputElement>, info: { range: RangeSide }) => void
  /** 外层容器 className。 */
  className?: string
  /** 外层容器 style。 */
  style?: React.CSSProperties
  /** 外层根 className，通常用于主题或上层样式注入。 */
  rootClassName?: string
  /** 自定义样式前缀，默认 zby-input-number-range。 */
  prefixCls?: string
  /** 组件尺寸，支持 antd InputNumber 的 small/middle/large。 */
  size?: RangeSize
  /** 表单状态，支持 error/warning，并会与 Form.Item 状态合并。 */
  status?: RangeStatus
  /** antd v5/v6 输入类组件外观变体，如 outlined、filled、borderless、underlined。 */
  variant?: RangeVariant
}

const DEFAULT_PREFIX_CLS = 'zby-input-number-range'

function composeClassName(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(' ')
}

/** 在异步回调里读取最新值，避免闭包拿到过期 props/state。 */
function useLatestRef<T>(value: T) {
  const ref = React.useRef(value)

  React.useLayoutEffect(() => {
    ref.current = value
  }, [value])

  return ref
}

/** 将外部传入值统一整理成 [start, end]，空值一律归一成 null。 */
function normalizeRangeValue<T extends ValueType>(
  value: InputNumberRangeValue<T> | null | undefined,
): InputNumberRangeValue<T> {
  if (!Array.isArray(value)) {
    return [null, null]
  }

  return [value[0] ?? null, value[1] ?? null]
}

type DecimalValueParts = {
  negative: boolean
  integer: string
  fraction: string
}

/** 把数字字符串拆成可安全比较的十进制结构，避免 stringMode 高精度值丢失。 */
function parseDecimalValue(value: ValueType): DecimalValueParts | null {
  const match = String(value)
    .trim()
    .match(/^([+-])?(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:[eE]([+-]?\d+))?$/)

  if (!match) {
    return null
  }

  const [, sign, integerPart = '', fractionPart = '', leadingFractionPart = '', exponentPart] =
    match
  const integerDigits = integerPart || '0'
  const fractionDigits = leadingFractionPart || fractionPart || ''
  const exponent = exponentPart ? Number(exponentPart) : 0
  const rawDigits = `${integerDigits}${fractionDigits}` || '0'
  const decimalIndex = integerDigits.length + exponent
  let integer: string
  let fraction: string

  if (decimalIndex <= 0) {
    integer = '0'
    fraction = `${'0'.repeat(Math.abs(decimalIndex))}${rawDigits}`
  } else if (decimalIndex >= rawDigits.length) {
    integer = `${rawDigits}${'0'.repeat(decimalIndex - rawDigits.length)}`
    fraction = ''
  } else {
    integer = rawDigits.slice(0, decimalIndex)
    fraction = rawDigits.slice(decimalIndex)
  }

  integer = integer.replace(/^0+/, '') || '0'
  fraction = fraction.replace(/0+$/, '')

  return {
    negative: sign === '-' && !(integer === '0' && fraction === ''),
    integer,
    fraction,
  }
}

/** 比较两个已标准化的十进制值，返回值语义与 Array.prototype.sort 的 compare 一致。 */
function compareDecimalValue(left: DecimalValueParts, right: DecimalValueParts) {
  if (left.negative !== right.negative) {
    return left.negative ? -1 : 1
  }

  const direction = left.negative ? -1 : 1

  if (left.integer.length !== right.integer.length) {
    return left.integer.length > right.integer.length ? direction : -direction
  }

  if (left.integer !== right.integer) {
    return left.integer > right.integer ? direction : -direction
  }

  const fractionLength = Math.max(left.fraction.length, right.fraction.length)
  const leftFraction = left.fraction.padEnd(fractionLength, '0')
  const rightFraction = right.fraction.padEnd(fractionLength, '0')

  if (leftFraction === rightFraction) {
    return 0
  }

  return leftFraction > rightFraction ? direction : -direction
}

/** 优先按高精度十进制比较；无法解析为普通数值时再退回字符串比较。 */
function compareRangeValue(left: ValueType, right: ValueType) {
  const leftDecimal = parseDecimalValue(left)
  const rightDecimal = parseDecimalValue(right)

  if (leftDecimal && rightDecimal) {
    return compareDecimalValue(leftDecimal, rightDecimal)
  }

  const leftNumber = Number(left)
  const rightNumber = Number(right)

  if (!Number.isNaN(leftNumber) && !Number.isNaN(rightNumber)) {
    return leftNumber === rightNumber ? 0 : leftNumber > rightNumber ? 1 : -1
  }

  return String(left).localeCompare(String(right))
}

/** 根据 order 配置决定是否在提交时交换 start/end。 */
function normalizeOrderedValue<T extends ValueType>(
  value: InputNumberRangeValue<T>,
  order: boolean,
): InputNumberRangeValue<T> {
  const [start, end] = value

  if (order && start != null && end != null && compareRangeValue(start, end) > 0) {
    return [end, start]
  }

  return value
}

function isSameValue<T extends ValueType>(
  prev: InputNumberRangeValue<T>,
  next: InputNumberRangeValue<T>,
) {
  return prev[0] === next[0] && prev[1] === next[1]
}

/** 将 allowEmpty 统一展开成 [startAllowEmpty, endAllowEmpty]。 */
function getAllowEmptyValue(value: boolean | [boolean, boolean] | undefined): [boolean, boolean] {
  if (Array.isArray(value)) {
    return [!!value[0], !!value[1]]
  }

  return [!!value, !!value]
}

/** 只透传白名单字段，避免单侧 props 覆盖组件内部的受控值和视觉结构。 */
function getRangeFieldForwardProps<T extends ValueType = ValueType>(
  props?: InputNumberRangeFieldProps<T>,
): RangeFieldForwardProps<T> {
  if (!props) {
    return {}
  }

  const forwardedProps: RangeFieldForwardProps<T> = {}

  if (props.tabIndex !== undefined) {
    forwardedProps.tabIndex = props.tabIndex
  }
  if (props.name !== undefined) {
    forwardedProps.name = props.name
  }
  if (props.autoComplete !== undefined) {
    forwardedProps.autoComplete = props.autoComplete
  }
  if (props.inputMode !== undefined) {
    forwardedProps.inputMode = props.inputMode
  }
  if (props.pattern !== undefined) {
    forwardedProps.pattern = props.pattern
  }
  if (props['aria-label'] !== undefined) {
    forwardedProps['aria-label'] = props['aria-label']
  }
  if (props.prefix !== undefined) {
    forwardedProps.prefix = props.prefix
  }
  if (props.suffix !== undefined) {
    forwardedProps.suffix = props.suffix
  }
  if (props.onInput !== undefined) {
    forwardedProps.onInput = props.onInput
  }

  Object.keys(props).forEach((key) => {
    if (key.startsWith('data-')) {
      const dataKey = key as keyof RangeFieldDataAttributes
      forwardedProps[dataKey] = props[dataKey]
    }
  })

  return forwardedProps
}

export const InputNumberRange = React.forwardRef<HTMLDivElement, InputNumberRangeProps>(
  (props, ref) => {
    const {
      autoFocus = false,
      value: controlledValue,
      defaultValue,
      onChange,
      order = true,
      placeholder: placeholderProp,
      separator: customSeparator,
      prefix,
      suffix,
      allowClear,
      disabled: disabledProp,
      readOnly,
      allowEmpty: allowEmptyProp,
      id,
      startProps,
      endProps,
      onFocus,
      onBlur,
      className,
      style,
      rootClassName,
      prefixCls = DEFAULT_PREFIX_CLS,
      size: customizeSize,
      status: customStatus,
      variant: customVariant,
      min,
      max,
      step,
      precision,
      formatter,
      parser,
      stringMode,
      changeOnWheel,
      keyboard,
    } = props

    const intl = useIntl()
    const hashId = useInputNumberRangeStyle(prefixCls)
    const ctxDisabled = React.useContext(DisabledContext)
    const { status: contextStatus, hasFeedback } = React.useContext(FormItemInputContext)
    const mergedStatus = getMergedStatus(contextStatus, customStatus)
    const mergedSize = useSize((ctx) => customizeSize ?? ctx)
    const [variant, enableVariantCls] = useVariant('inputNumber', customVariant)
    const rangeRef = React.useRef<HTMLDivElement>(null)
    const startInputRef = React.useRef<InputNumberFocusRef | null>(null)
    const endInputRef = React.useRef<InputNumberFocusRef | null>(null)
    const autoFocusRef = React.useRef(false)
    const scheduledBlurCommitRef = React.useRef<{
      id: number
      type: 'frame' | 'timeout'
    } | null>(null)
    const [focused, setFocused] = React.useState(false)
    /** 是否受控：只要 value 不是 undefined，就由调用方负责保存最终提交值。 */
    const isControlled = controlledValue !== undefined

    React.useImperativeHandle(ref, () => rangeRef.current!)

    /** 取消失焦后延迟提交，避免组件卸载后继续 setState 或触发过期 onChange。 */
    const cancelScheduledBlurCommit = React.useCallback(() => {
      const scheduledBlurCommit = scheduledBlurCommitRef.current

      if (!scheduledBlurCommit) {
        return
      }

      if (scheduledBlurCommit.type === 'frame' && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(scheduledBlurCommit.id)
      } else {
        window.clearTimeout(scheduledBlurCommit.id)
      }

      scheduledBlurCommitRef.current = null
    }, [])

    React.useEffect(() => cancelScheduledBlurCommit, [cancelScheduledBlurCommit])

    const placeholder: [string, string] =
      placeholderProp ??
      ([
        intl.getMessage('zby.ui.inputNumberRange.startPlaceholder', 'Min Value'),
        intl.getMessage('zby.ui.inputNumberRange.endPlaceholder', 'Max Value'),
      ] as [string, string])

    /** 两侧输入框共享同一组数字规则，保证 start/end 的输入行为一致。 */
    const sharedInputProps = React.useMemo<SharedInputNumberProps>(
      () => ({
        min,
        max,
        step,
        precision,
        formatter,
        parser,
        stringMode,
        changeOnWheel,
        keyboard,
      }),
      [changeOnWheel, formatter, keyboard, max, min, parser, precision, step, stringMode],
    )

    const [innerCommittedValue, setInnerCommittedValue] = React.useState<InputNumberRangeValue>(
      () => normalizeRangeValue(defaultValue),
    )
    const mergedCommittedValue = React.useMemo(
      () => (isControlled ? normalizeRangeValue(controlledValue) : innerCommittedValue),
      [controlledValue, innerCommittedValue, isControlled],
    )
    /**
     * focused 时展示草稿值；未 focused 时展示 committed 值。
     *
     * committedValue 记录这份草稿基于哪个外部值生成。外部受控 value 更新后，
     * 如果草稿来源已经过期，就不再展示旧草稿，避免失焦时把旧值提交回父组件。
     */
    const [draftValueState, setDraftValueState] = React.useState<{
      value: InputNumberRangeValue
      committedValue: InputNumberRangeValue
    }>(() => ({
      value: mergedCommittedValue,
      committedValue: mergedCommittedValue,
    }))
    const mergedCommittedValueRef = useLatestRef(mergedCommittedValue)
    const draftValueRef = useLatestRef(draftValueState.value)
    const draftCommittedValueRef = useLatestRef(draftValueState.committedValue)
    const draftValueInSync = isSameValue(draftValueState.committedValue, mergedCommittedValue)
    const displayValue = focused && draftValueInSync ? draftValueState.value : mergedCommittedValue

    const [allowEmptyStart, allowEmptyEnd] = getAllowEmptyValue(allowEmptyProp)
    /** disabled/readOnly 作为范围控件的整体状态，统一作用于 start/end 两侧。 */
    const mergedDisabled = disabledProp ?? ctxDisabled ?? false
    const mergedReadOnly = !!readOnly
    const separator = customSeparator ?? <SwapRightOutlined />

    const startId =
      startProps?.id ?? (typeof id === 'object' ? id?.start : id ? `${id}-start` : undefined)
    const endId = endProps?.id ?? (typeof id === 'object' ? id?.end : id ? `${id}-end` : undefined)
    const startFieldForwardProps = React.useMemo(
      () => getRangeFieldForwardProps(startProps),
      [startProps],
    )
    const endFieldForwardProps = React.useMemo(
      () => getRangeFieldForwardProps(endProps),
      [endProps],
    )

    /** autoFocus 只在首次可执行时触发一次，避免状态变化后反复抢焦点。 */
    React.useEffect(() => {
      if (!autoFocus || autoFocusRef.current || mergedDisabled || mergedReadOnly) {
        return
      }

      autoFocusRef.current = true
      startInputRef.current?.focus()
    }, [autoFocus, mergedDisabled, mergedReadOnly])

    /** 提交最终范围值，并同步非受控内部值和草稿基准。 */
    const emitChange = React.useCallback(
      (nextValue: InputNumberRangeValue) => {
        const prevValue = mergedCommittedValueRef.current
        draftCommittedValueRef.current = nextValue
        draftValueRef.current = nextValue
        setDraftValueState({ value: nextValue, committedValue: nextValue })

        if (isSameValue(prevValue, nextValue)) {
          return
        }

        if (!isControlled) {
          setInnerCommittedValue(nextValue)
        }

        onChange?.(nextValue)
      },
      [draftCommittedValueRef, draftValueRef, isControlled, mergedCommittedValueRef, onChange],
    )

    /** 校验草稿是否允许提交：空值规则由 allowEmpty 决定，完整范围再按 order 排序。 */
    const getCommittedValue = React.useCallback(
      (value: InputNumberRangeValue): InputNumberRangeValue | null => {
        const [start, end] = value
        const bothEmpty = start == null && end == null
        const onlyStart = start != null && end == null
        const onlyEnd = start == null && end != null

        if (bothEmpty) {
          return allowEmptyStart && allowEmptyEnd ? value : null
        }

        if (onlyStart) {
          return allowEmptyEnd ? value : null
        }

        if (onlyEnd) {
          return allowEmptyStart ? value : null
        }

        return normalizeOrderedValue(value, order)
      },
      [allowEmptyEnd, allowEmptyStart, order],
    )

    /** 将当前草稿提交为正式值；草稿过期时回退到最新 committed value。 */
    const commitRange = React.useCallback(
      (nextValue?: InputNumberRangeValue) => {
        const latestCommittedValue = mergedCommittedValueRef.current
        const valueToCommit =
          nextValue ??
          (isSameValue(draftCommittedValueRef.current, latestCommittedValue)
            ? draftValueRef.current
            : latestCommittedValue)
        const committedValue = getCommittedValue(valueToCommit)

        if (!committedValue) {
          draftCommittedValueRef.current = latestCommittedValue
          draftValueRef.current = latestCommittedValue
          setDraftValueState({ value: latestCommittedValue, committedValue: latestCommittedValue })
          return
        }

        emitChange(committedValue)
      },
      [
        draftCommittedValueRef,
        draftValueRef,
        emitChange,
        getCommittedValue,
        mergedCommittedValueRef,
      ],
    )

    /** 更新单侧草稿；如果外部 value 已变化，则先以最新 committed value 作为编辑基准。 */
    const updateDraftValue = React.useCallback(
      (side: RangeSide, next: ValueType | null) => {
        const latestCommittedValue = mergedCommittedValueRef.current
        const baseValue = isSameValue(draftCommittedValueRef.current, latestCommittedValue)
          ? draftValueRef.current
          : latestCommittedValue
        const nextValue: InputNumberRangeValue =
          side === 'start' ? [next, baseValue[1]] : [baseValue[0], next]

        draftCommittedValueRef.current = latestCommittedValue
        draftValueRef.current = nextValue
        setDraftValueState({ value: nextValue, committedValue: latestCommittedValue })
      },
      [draftCommittedValueRef, draftValueRef, mergedCommittedValueRef],
    )

    /** 延迟到下一帧判断焦点位置，避免 start/end 内部切换时误提交。 */
    const scheduleCommitOnBlur = React.useCallback(() => {
      cancelScheduledBlurCommit()

      const runCommit = () => {
        scheduledBlurCommitRef.current = null

        if (!rangeRef.current || rangeRef.current.contains(document.activeElement)) {
          return
        }

        setFocused(false)
        commitRange()
      }

      if (typeof requestAnimationFrame === 'function') {
        scheduledBlurCommitRef.current = {
          id: requestAnimationFrame(runCommit),
          type: 'frame',
        }
        return
      }

      scheduledBlurCommitRef.current = {
        id: window.setTimeout(runCommit, 0),
        type: 'timeout',
      }
    }, [cancelScheduledBlurCommit, commitRange])

    /** 进入编辑态时，用最新 committed value 初始化草稿，保证本轮编辑从最新值开始。 */
    const handleInputFocus = React.useCallback(
      (
        side: RangeSide,
        event: React.FocusEvent<HTMLInputElement>,
        sideOnFocus?: React.FocusEventHandler<HTMLInputElement>,
      ) => {
        if (!focused) {
          const latestCommittedValue = mergedCommittedValueRef.current
          draftCommittedValueRef.current = latestCommittedValue
          draftValueRef.current = latestCommittedValue
          setDraftValueState({ value: latestCommittedValue, committedValue: latestCommittedValue })
        }

        setFocused(true)
        sideOnFocus?.(event)
        onFocus?.(event, { range: side })
      },
      [draftCommittedValueRef, draftValueRef, focused, mergedCommittedValueRef, onFocus],
    )

    const handleInputBlur = React.useCallback(
      (
        side: RangeSide,
        event: React.FocusEvent<HTMLInputElement>,
        sideOnBlur?: React.FocusEventHandler<HTMLInputElement>,
      ) => {
        sideOnBlur?.(event)
        onBlur?.(event, { range: side })
        scheduleCommitOnBlur()
      },
      [onBlur, scheduleCommitOnBlur],
    )

    /** 清空整个范围；禁用或只读时不会展示 clear 入口，因此这里始终提交双侧 null。 */
    const handleClear = React.useCallback(() => {
      emitChange([null, null])
    }, [emitChange])

    const defaultClearIcon = <CloseCircleFilled />
    const mergedAllowClear = allowClear === true ? { clearIcon: defaultClearIcon } : allowClear
    const hasClearableValue = mergedCommittedValue[0] != null || mergedCommittedValue[1] != null
    const showClear = !!mergedAllowClear && !mergedDisabled && !mergedReadOnly && hasClearableValue
    const clearIconNode =
      typeof mergedAllowClear === 'object' && mergedAllowClear?.clearIcon != null
        ? mergedAllowClear.clearIcon
        : showClear
          ? defaultClearIcon
          : null
    const showAffix = showClear || !!suffix

    /** 外层容器统一承接 antd 尺寸、状态、variant、disabled/readOnly 等视觉状态。 */
    const triggerClassName = composeClassName(
      prefixCls,
      hashId,
      rootClassName,
      enableVariantCls && `${prefixCls}-${variant}`,
      focused && `${prefixCls}-focused`,
      mergedDisabled && `${prefixCls}-disabled`,
      mergedReadOnly && `${prefixCls}-readonly`,
      mergedSize === 'large' && `${prefixCls}-lg`,
      mergedSize === 'small' && `${prefixCls}-sm`,
      getStatusClassNames(prefixCls, mergedStatus, hasFeedback),
      className,
    )

    return (
      <div ref={rangeRef} className={triggerClassName} style={style}>
        {prefix && <span className={`${prefixCls}-prefix`}>{prefix}</span>}

        <div className={`${prefixCls}-body`}>
          <InputNumber
            ref={(node) => {
              startInputRef.current = node as InputNumberFocusRef | null
            }}
            {...sharedInputProps}
            {...startFieldForwardProps}
            id={startId}
            value={displayValue[0]}
            size={mergedSize}
            disabled={mergedDisabled}
            readOnly={mergedReadOnly}
            controls={false}
            variant="borderless"
            className={composeClassName(`${prefixCls}-input`, `${prefixCls}-input-start`)}
            placeholder={startProps?.placeholder ?? placeholder[0]}
            onChange={(value) => {
              startProps?.onChange?.(value as ValueType | null)
              updateDraftValue('start', value as ValueType | null)
            }}
            onFocus={(event) => handleInputFocus('start', event, startProps?.onFocus)}
            onBlur={(event) => handleInputBlur('start', event, startProps?.onBlur)}
            onPressEnter={(event) => {
              startProps?.onPressEnter?.(event)
              commitRange()
            }}
          />

          <span className={`${prefixCls}-separator`}>{separator}</span>

          <InputNumber
            ref={(node) => {
              endInputRef.current = node as InputNumberFocusRef | null
            }}
            {...sharedInputProps}
            {...endFieldForwardProps}
            id={endId}
            value={displayValue[1]}
            size={mergedSize}
            disabled={mergedDisabled}
            readOnly={mergedReadOnly}
            controls={false}
            variant="borderless"
            className={composeClassName(`${prefixCls}-input`, `${prefixCls}-input-end`)}
            placeholder={endProps?.placeholder ?? placeholder[1]}
            onChange={(value) => {
              endProps?.onChange?.(value as ValueType | null)
              updateDraftValue('end', value as ValueType | null)
            }}
            onFocus={(event) => handleInputFocus('end', event, endProps?.onFocus)}
            onBlur={(event) => handleInputBlur('end', event, endProps?.onBlur)}
            onPressEnter={(event) => {
              endProps?.onPressEnter?.(event)
              commitRange()
            }}
          />
        </div>

        {showAffix && (
          <span className={`${prefixCls}-affix`}>
            {showClear && clearIconNode && (
              <span
                className={`${prefixCls}-clear`}
                onClick={handleClear}
                onMouseDown={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                }}
                role="button"
                tabIndex={-1}
                aria-label="clear"
              >
                {clearIconNode}
              </span>
            )}
            {suffix && <span className={`${prefixCls}-suffix`}>{suffix}</span>}
          </span>
        )}
      </div>
    )
  },
)

InputNumberRange.displayName = 'InputNumberRange'

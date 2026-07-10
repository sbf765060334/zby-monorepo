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

type ValueType = string | number
type RangeSide = 'start' | 'end'
type RangeVariant = NonNullable<InputNumberProps['variant']>
type RangeSize = InputNumberProps['size']
type RangeStatus = InputNumberProps['status']
type InputNumberFocusRef = {
  focus: () => void
}

export type InputNumberRangeValue<T extends ValueType = ValueType> = [T | null, T | null]

type RangeFieldDataAttributes = {
  [key: `data-${string}`]: string | number | boolean | undefined
}

export type InputNumberRangeFieldProps<T extends ValueType = ValueType> = {
  id?: string
  disabled?: boolean
  readOnly?: boolean
  placeholder?: string
  prefix?: React.ReactNode
  suffix?: React.ReactNode
  tabIndex?: number
  name?: string
  autoComplete?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
  pattern?: string
  'aria-label'?: string
  onChange?: (value: T | null) => void
  onFocus?: React.FocusEventHandler<HTMLInputElement>
  onBlur?: React.FocusEventHandler<HTMLInputElement>
  onInput?: (text: string) => void
  onPressEnter?: React.KeyboardEventHandler<HTMLInputElement>
} & Partial<RangeFieldDataAttributes>

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

type SharedInputNumberProps<T extends ValueType = ValueType> = Pick<
  InputNumberProps<T>,
  | 'min'
  | 'max'
  | 'step'
  | 'precision'
  | 'formatter'
  | 'parser'
  | 'stringMode'
  | 'changeOnWheel'
  | 'keyboard'
>

export interface InputNumberRangeProps<
  T extends ValueType = ValueType,
> extends SharedInputNumberProps<T> {
  autoFocus?: boolean
  value?: InputNumberRangeValue<T>
  defaultValue?: InputNumberRangeValue<T>
  onChange?: (value: InputNumberRangeValue<T>) => void
  order?: boolean
  placeholder?: [string, string]
  separator?: React.ReactNode
  prefix?: React.ReactNode
  suffix?: React.ReactNode
  allowClear?: boolean | { clearIcon?: React.ReactNode }
  disabled?: boolean | [boolean, boolean]
  readOnly?: boolean
  allowEmpty?: boolean | [boolean, boolean]
  id?: string | { start?: string; end?: string }
  startProps?: InputNumberRangeFieldProps<T>
  endProps?: InputNumberRangeFieldProps<T>
  onFocus?: (event: React.FocusEvent<HTMLInputElement>, info: { range: RangeSide }) => void
  onBlur?: (event: React.FocusEvent<HTMLInputElement>, info: { range: RangeSide }) => void
  className?: string
  style?: React.CSSProperties
  rootClassName?: string
  prefixCls?: string
  size?: RangeSize
  status?: RangeStatus
  variant?: RangeVariant
}

const DEFAULT_PREFIX_CLS = 'zby-input-number-range'

function composeClassName(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(' ')
}

function useLatestRef<T>(value: T) {
  const ref = React.useRef(value)

  React.useLayoutEffect(() => {
    ref.current = value
  }, [value])

  return ref
}

function normalizeRangeValue<T extends ValueType>(
  value: InputNumberRangeValue<T> | null | undefined,
): InputNumberRangeValue<T> {
  if (!Array.isArray(value)) {
    return [null, null]
  }

  return [value[0] ?? null, value[1] ?? null]
}

function normalizeOrderedValue<T extends ValueType>(
  value: InputNumberRangeValue<T>,
  order: boolean,
): InputNumberRangeValue<T> {
  const [start, end] = value

  if (order && start != null && end != null && Number(start) > Number(end)) {
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

function getAllowEmptyValue(value: boolean | [boolean, boolean] | undefined): [boolean, boolean] {
  if (Array.isArray(value)) {
    return [!!value[0], !!value[1]]
  }

  return [!!value, !!value]
}

function getSideValue(value: boolean | [boolean, boolean] | undefined, side: RangeSide) {
  if (Array.isArray(value)) {
    return value[side === 'start' ? 0 : 1]
  }

  return value
}

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
    const [focused, setFocused] = React.useState(false)
    const isControlled = controlledValue !== undefined

    React.useImperativeHandle(ref, () => rangeRef.current!)

    const placeholder: [string, string] =
      placeholderProp ??
      ([
        intl.getMessage('zby.ui.inputNumberRange.startPlaceholder', 'Min Value'),
        intl.getMessage('zby.ui.inputNumberRange.endPlaceholder', 'Max Value'),
      ] as [string, string])

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
    const [draftValue, setDraftValue] = React.useState<InputNumberRangeValue>(mergedCommittedValue)
    const mergedCommittedValueRef = useLatestRef(mergedCommittedValue)
    const draftValueRef = useLatestRef(draftValue)
    const displayValue = focused ? draftValue : mergedCommittedValue

    const [allowEmptyStart, allowEmptyEnd] = getAllowEmptyValue(allowEmptyProp)
    const baseDisabled = Array.isArray(disabledProp) ? disabledProp : (disabledProp ?? ctxDisabled)
    const startDisabled = startProps?.disabled ?? getSideValue(baseDisabled, 'start') ?? false
    const endDisabled = endProps?.disabled ?? getSideValue(baseDisabled, 'end') ?? false
    const startReadOnly = !!(startProps?.readOnly ?? readOnly)
    const endReadOnly = !!(endProps?.readOnly ?? readOnly)
    const mergedDisabledAll = !!startDisabled && !!endDisabled
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

    React.useEffect(() => {
      if (!autoFocus || autoFocusRef.current) {
        return
      }

      autoFocusRef.current = true

      if (!startDisabled && !startReadOnly) {
        startInputRef.current?.focus()
        return
      }

      if (!endDisabled && !endReadOnly) {
        endInputRef.current?.focus()
      }
    }, [autoFocus, endDisabled, endReadOnly, startDisabled, startReadOnly])

    const emitChange = React.useCallback(
      (nextValue: InputNumberRangeValue) => {
        const prevValue = mergedCommittedValueRef.current
        draftValueRef.current = nextValue
        setDraftValue(nextValue)

        if (isSameValue(prevValue, nextValue)) {
          return
        }

        if (!isControlled) {
          setInnerCommittedValue(nextValue)
        }

        onChange?.(nextValue)
      },
      [draftValueRef, isControlled, mergedCommittedValueRef, onChange],
    )

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

    const commitRange = React.useCallback(
      (nextValue: InputNumberRangeValue = draftValueRef.current) => {
        const committedValue = getCommittedValue(nextValue)

        if (!committedValue) {
          draftValueRef.current = mergedCommittedValueRef.current
          setDraftValue(mergedCommittedValueRef.current)
          return
        }

        emitChange(committedValue)
      },
      [draftValueRef, emitChange, getCommittedValue, mergedCommittedValueRef],
    )

    const updateDraftValue = React.useCallback(
      (side: RangeSide, next: ValueType | null) => {
        setDraftValue((prev) => {
          const nextValue: InputNumberRangeValue =
            side === 'start' ? [next, prev[1]] : [prev[0], next]
          draftValueRef.current = nextValue
          return nextValue
        })
      },
      [draftValueRef],
    )

    const scheduleCommitOnBlur = React.useCallback(() => {
      const schedule =
        typeof requestAnimationFrame === 'function'
          ? requestAnimationFrame
          : (callback: FrameRequestCallback) => window.setTimeout(callback, 0)

      schedule(() => {
        if (rangeRef.current?.contains(document.activeElement)) {
          return
        }

        setFocused(false)
        commitRange()
      })
    }, [commitRange])

    const handleInputFocus = React.useCallback(
      (
        side: RangeSide,
        event: React.FocusEvent<HTMLInputElement>,
        sideOnFocus?: React.FocusEventHandler<HTMLInputElement>,
      ) => {
        if (!focused) {
          const latestCommittedValue = mergedCommittedValueRef.current
          draftValueRef.current = latestCommittedValue
          setDraftValue(latestCommittedValue)
        }

        setFocused(true)
        sideOnFocus?.(event)
        onFocus?.(event, { range: side })
      },
      [draftValueRef, focused, mergedCommittedValueRef, onFocus],
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

    const handleClear = React.useCallback(() => {
      const emptyValue: InputNumberRangeValue = [null, null]
      draftValueRef.current = emptyValue
      emitChange(emptyValue)
    }, [draftValueRef, emitChange])

    const defaultClearIcon = <CloseCircleFilled />
    const mergedAllowClear = allowClear === true ? { clearIcon: defaultClearIcon } : allowClear
    const showClear =
      !!mergedAllowClear &&
      !mergedDisabledAll &&
      !mergedReadOnly &&
      (mergedCommittedValue[0] != null || mergedCommittedValue[1] != null)
    const clearIconNode =
      typeof mergedAllowClear === 'object' && mergedAllowClear?.clearIcon != null
        ? mergedAllowClear.clearIcon
        : showClear
          ? defaultClearIcon
          : null
    const showAffix = showClear || !!suffix

    const triggerClassName = composeClassName(
      prefixCls,
      hashId,
      rootClassName,
      enableVariantCls && `${prefixCls}-${variant}`,
      focused && `${prefixCls}-focused`,
      mergedDisabledAll && `${prefixCls}-disabled`,
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
            disabled={startDisabled}
            readOnly={startReadOnly}
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
            disabled={endDisabled}
            readOnly={endReadOnly}
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

import * as React from 'react'

/** useControllableValue 的属性名称和默认值配置。 */
export interface UseControllableValueOptions<T> {
  /** props 未提供受控值和默认值属性时使用的内部初始值。 */
  defaultValue?: T
  /** props 中非受控初始值的属性名。 */
  defaultValuePropName?: string
  /** props 中受控值的属性名。 */
  valuePropName?: string
  /** setter 计算出新值后需要调用的 props 回调名。 */
  trigger?: string
}

/**
 * 状态更新器。第一个参数可以是新值或函数式 updater，其余参数会原样传给 trigger。
 */
export type ControllableValueSetter<T> = (
  value: T | ((previous: T) => T),
  ...args: any[]
) => void

const hasOwnProperty = (target: Record<string, any>, key: string) =>
  // 当前编译目标不包含 Object.hasOwn，使用兼容旧运行环境的等价写法。
  // eslint-disable-next-line e18e/prefer-object-has-own
  Object.prototype.hasOwnProperty.call(target, key)

/*
 * 该 hook 将 ref 作为受控值与非受控值共享的同步存储：render 必须立即写入最新受控值，
 * 返回值也必须在同一次 render 中读取该值。这里的读写是受控状态合并算法本身的一部分，
 * 不用于访问 DOM，也不依赖 Effect 时序。
 */

/**
 * 从同一个 props 对象中读取受控值、非受控默认值和状态变化回调。
 *
 * 默认约定对应常见组件属性：
 *
 * - `value`：受控值。
 * - `defaultValue`：非受控初始值。
 * - `onChange`：状态变化回调。
 *
 * options 可以把这组约定映射到其他命名，例如 open/defaultOpen/onOpenChange。
 *
 * 受控判断使用属性所有权，而不是 `value !== undefined`：
 *
 * - props 自身包含 valuePropName 时属于受控模式，包括显式传入 undefined。
 * - props 不包含 valuePropName 时属于非受控模式，setter 会更新内部值并触发渲染。
 *
 * 无论当前是否受控，setter 都会基于当前合并值计算 nextValue，并调用 trigger：
 *
 * - 非受控模式先保存 nextValue，再触发组件重新渲染。
 * - 受控模式不修改最终展示值，等待调用方通过 props 回传新值。
 * - trigger 会收到 nextValue 以及 setter 的其余参数。
 *
 * @param props 同时承载受控值、默认值和变化回调的属性对象。
 * @param options 自定义默认值及三类属性名称。
 * @returns 当前合并值和引用稳定的 setter。
 *
 * @example
 * ```tsx
 * const [open, setOpen] = useControllableValue<boolean>(props, {
 *   defaultValue: false,
 *   valuePropName: 'open',
 *   defaultValuePropName: 'defaultOpen',
 *   trigger: 'onOpenChange',
 * })
 * ```
 */
export default function useControllableValue<T = any>(
  props: Record<string, any> = {},
  options: UseControllableValueOptions<T> = {},
): readonly [T, ControllableValueSetter<T>] {
  const {
    defaultValue,
    defaultValuePropName = 'defaultValue',
    valuePropName = 'value',
    trigger = 'onChange',
  } = options

  // 属性存在即表示受控；该判断能够区分“未传属性”和“显式传入 undefined”。
  const isControlled = hasOwnProperty(props, valuePropName)
  const controlledValue = props[valuePropName] as T

  // ref 只在首次 render 接收初始值；后续非受控值完全由 setter 维护。
  const stateRef = React.useRef<T>(
    isControlled
      ? controlledValue
      : hasOwnProperty(props, defaultValuePropName)
        ? (props[defaultValuePropName] as T)
        : (defaultValue as T),
  )

  if (isControlled) {
    // 本次 render 直接同步外部值，无需通过 Effect 写回内部 state。
    stateRef.current = controlledValue
  }

  // setter 保持稳定，同时通过 ref 获取调用时最新的模式、回调和回调名称。
  const runtimeRef = React.useRef({ isControlled, props, trigger })
  runtimeRef.current = { isControlled, props, trigger }

  // ref 更新本身不会触发 render；该 reducer 只服务于非受控状态刷新。
  const [, forceUpdate] = React.useReducer((count: number) => count + 1, 0)

  const setValue = React.useCallback<ControllableValueSetter<T>>(
    (valueOrUpdater, ...args) => {
      const previousValue = stateRef.current
      const nextValue =
        typeof valueOrUpdater === 'function'
          ? (valueOrUpdater as (previous: T) => T)(previousValue)
          : valueOrUpdater
      const runtime = runtimeRef.current

      if (!runtime.isControlled) {
        stateRef.current = nextValue
        forceUpdate()
      }

      const triggerHandler = runtime.props[runtime.trigger]
      if (typeof triggerHandler === 'function') {
        triggerHandler(nextValue, ...args)
      }
    },
    [],
  )

  return [stateRef.current, setValue] as const
}

import type * as React from 'react'

function fillRef<T>(ref: React.Ref<T> | null | undefined, value: T | null) {
  if (typeof ref === 'function') {
    ref(value)
  } else if (ref && typeof ref === 'object' && 'current' in ref) {
    ;(ref as React.MutableRefObject<T | null>).current = value
  }
}

/**
 * 将内部 viewport、viewportRef 与 viewportProps.ref 合并到同一个回调 ref，
 * 保证底层 primitive 更新真实滚动节点时，所有调用方都能同步拿到相同元素。
 */
export function composeRef<T>(
  ...refs: Array<React.Ref<T> | null | undefined>
): React.RefCallback<T> {
  return (value) => {
    refs.forEach((ref) => fillRef(ref, value))
  }
}

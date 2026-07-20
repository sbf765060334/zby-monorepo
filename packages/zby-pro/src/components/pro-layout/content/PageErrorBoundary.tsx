import { Alert } from 'antd'
import { Component } from 'react'

import type { ErrorInfo, ReactNode } from 'react'

interface PageErrorBoundaryProps {
  children: ReactNode
  /** 只有边界已经报错时，任一 key 变化才允许重新尝试渲染业务页面。 */
  resetKeys: readonly unknown[]
  /** 恢复页面完成挂载后调用，用于补发页面级生命周期事件。 */
  onRecover?: (previousResetKeys: readonly unknown[]) => void
}

interface PageErrorBoundaryState {
  error: Error | null
  info: ErrorInfo | null
  resetKeys: readonly unknown[]
}

/**
 * 支持按页面身份恢复的 React 错误边界。
 *
 * 健康状态下 resetKeys 变化只更新边界快照，不会通过 React key 重建业务组件；只有
 * 已捕获错误且 pathname/element 变化时才清空旧错误。这样共享动态页签的正常参数
 * 切换仍保留组件实例，而一个参数页面的渲染错误不会永久污染后续页面。
 */
export default class PageErrorBoundary extends Component<
  PageErrorBoundaryProps,
  PageErrorBoundaryState
> {
  constructor(props: PageErrorBoundaryProps) {
    super(props)
    this.state = {
      error: null,
      info: null,
      resetKeys: props.resetKeys,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<PageErrorBoundaryState> {
    return { error }
  }

  static getDerivedStateFromProps(
    props: PageErrorBoundaryProps,
    state: PageErrorBoundaryState,
  ): Partial<PageErrorBoundaryState> | null {
    if (areResetKeysEqual(props.resetKeys, state.resetKeys))
      return null

    // 已报错时先保留旧错误完成本轮提交，让 PageContainer 的 layout effect 有机会把
    // Page Context 同步到新 pathname；componentDidUpdate 随后再清错重试。若在这里立即
    // 清错，业务组件会在 Context 仍是旧值时再次抛错，并失去下一次自动恢复机会。
    if (state.error)
      return null

    return {
      resetKeys: props.resetKeys,
    }
  }

  componentDidCatch(_error: Error, info: ErrorInfo) {
    this.setState({ info })
  }

  componentDidUpdate(
    _previousProps: PageErrorBoundaryProps,
    previousState: PageErrorBoundaryState,
  ) {
    if (
      this.state.error &&
      !areResetKeysEqual(this.props.resetKeys, this.state.resetKeys)
    ) {
      this.setState({
        error: null,
        info: null,
        resetKeys: this.props.resetKeys,
      })
      return
    }

    // 子页面已经在本次提交中重新挂载；此时补发事件，订阅者不会错过恢复后的活动状态。
    if (previousState.error && !this.state.error)
      this.props.onRecover?.(previousState.resetKeys)
  }

  render() {
    const { children } = this.props
    const { error, info } = this.state

    if (!error)
      return children

    const componentStack = info?.componentStack
    return (
      <Alert
        type="error"
        title={error.toString()}
        description={componentStack
          ? (
              <pre style={{ fontSize: '0.9em', overflowX: 'auto' }}>
                {componentStack}
              </pre>
            )
          : undefined}
      />
    )
  }
}

function areResetKeysEqual(left: readonly unknown[], right: readonly unknown[]) {
  return left === right || (
    left.length === right.length &&
    left.every((item, index) => Object.is(item, right[index]))
  )
}

import { useIntl } from '@zby/intl'
import { ErrorBoundary } from 'react-error-boundary'

import type { ReactNode } from 'react'
import type {
  ErrorBoundaryProps,
  OnErrorCallback,
} from 'react-error-boundary'
import ExceptionPage from './ExceptionPage'

interface PageErrorBoundaryProps {
  children: ReactNode
  prefixCls: string
  /** 只有边界已经报错时，任一 key 变化才允许重新尝试渲染业务页面。 */
  resetKeys: unknown[]
  /** 原始异常只交给宿主上报，不进入用户可见的 fallback。 */
  onError?: OnErrorCallback
  /** 页面边界真正 reset 前，允许可恢复资源清理自身的失败缓存。 */
  onReset?: ErrorBoundaryProps['onReset']
}

/**
 * 页面渲染域中支持按页面身份恢复的错误边界。
 *
 * react-error-boundary 只在已捕获错误后响应 resetKeys 变化，因此共享动态页签的正常
 * 参数切换仍保留组件实例；错误态则会在 pathname/element 变化提交后自动重新尝试。
 */
export default function PageErrorBoundary(props: PageErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallbackRender={() => (
        <PageErrorFallback prefixCls={props.prefixCls} />
      )}
      resetKeys={props.resetKeys}
      onError={props.onError}
      onReset={props.onReset}
    >
      {props.children}
    </ErrorBoundary>
  )
}

/** 用户只看到稳定的错误提示，原始异常和组件栈不会进入 DOM。 */
function PageErrorFallback(props: { prefixCls: string }) {
  const intl = useIntl()

  return (
    <ExceptionPage
      prefixCls={props.prefixCls}
      role="alert"
      status="500"
      title={intl.getMessage(
        'zby.pro.layout.pageError.title',
        '页面加载失败',
      )}
      description={intl.getMessage(
        'zby.pro.layout.pageError.description',
        '页面暂时无法显示，请联系管理员。',
      )}
    />
  )
}

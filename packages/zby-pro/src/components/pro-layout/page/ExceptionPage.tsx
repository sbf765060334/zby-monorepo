import { Result } from 'antd'

import type { HTMLAttributes, ReactNode } from 'react'

export interface ExceptionPageProps {
  prefixCls: string
  status: '403' | '404' | '500'
  title?: ReactNode
  description: string
  extra?: ReactNode
  role?: HTMLAttributes<HTMLDivElement>['role']
}

/** 页面渲染域内部统一使用的异常状态页。 */
export default function ExceptionPage(props: ExceptionPageProps) {
  const { description, extra, prefixCls, role, status, title = status } = props

  return (
    <div role={role} className={`${prefixCls}-exception-page`}>
      <div className={`${prefixCls}-exception-inner`}>
        <Result
          status={status}
          title={title}
          subTitle={description}
          extra={extra}
        />
      </div>
    </div>
  )
}

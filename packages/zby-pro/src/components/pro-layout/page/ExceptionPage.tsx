import { Result } from 'antd'

export interface ExceptionPageProps {
  prefixCls: string
  status: '403' | '404'
  description: string
}

/** 页面渲染域内部使用的无权限和未找到状态页。 */
export default function ExceptionPage(props: ExceptionPageProps) {
  const { prefixCls, status, description } = props

  return (
    <div className={`${prefixCls}-exception-page`}>
      <div className={`${prefixCls}-exception-inner`}>
        <Result status={status} title={status} subTitle={description} />
      </div>
    </div>
  )
}

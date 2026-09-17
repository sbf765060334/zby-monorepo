import { InputNumberRange } from '@zby/ui'
import { Button, Form, Input, Space } from 'antd'
import * as React from 'react'
import {
  PlaygroundCase,
  PlaygroundStatus,
} from '../../../components/ComponentPlayground'

type AmountFormValues = {
  orderNo?: string
  amountRange?: [number | null, number | null]
}

export default function FormSubmitExample() {
  const [form] = Form.useForm<AmountFormValues>()
  const [submitted, setSubmitted] = React.useState('尚未提交')

  return (
    <PlaygroundCase
      title="Form 提交"
      description="作为 Form.Item 子组件挂载。离开输入框或点提交都会提交草稿；label 点中起始输入框。"
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ orderNo: 'ZBY-000001', amountRange: [100, 500] }}
        onFinish={(values) => setSubmitted(JSON.stringify(values))}
        style={{ width: '100%' }}
      >
        <Form.Item
          name="orderNo"
          label="订单号"
          rules={[{ required: true, message: '请输入订单号' }]}
        >
          <Input placeholder="订单号" />
        </Form.Item>
        <Form.Item
          name="amountRange"
          label="金额范围"
          rules={[
            {
              validator: (_, value) =>
                value?.[0] != null && value?.[1] != null
                  ? Promise.resolve()
                  : Promise.reject(new Error('请输入完整金额范围')),
            },
          ]}
        >
          <InputNumberRange min={0} precision={2} allowClear style={{ width: '100%' }} />
        </Form.Item>
        <Space>
          <Button type="primary" htmlType="submit">
            提交
          </Button>
          <Button
            htmlType="button"
            onClick={() => {
              form.resetFields()
              setSubmitted('尚未提交')
            }}
          >
            重置
          </Button>
        </Space>
      </Form>
      <PlaygroundStatus>{submitted}</PlaygroundStatus>
    </PlaygroundCase>
  )
}

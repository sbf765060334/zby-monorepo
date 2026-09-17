import { DollarOutlined } from '@ant-design/icons'
import type { InputNumberRangeValue } from '@zby/ui'
import { InputNumberRange } from '@zby/ui'
import { Button, Form, Segmented, Space, Switch, Typography } from 'antd'
import * as React from 'react'
import {
  PlaygroundCase,
  PlaygroundControl,
  PlaygroundStatus,
} from '../../../components/ComponentPlayground'

type Status = 'default' | 'warning' | 'error'
type Value = InputNumberRangeValue<number>
const { Text } = Typography
export default function ControlledRangeExample() {
  const [value, setValue] = React.useState<Value>([10, 30])
  const [status, setStatus] = React.useState<Status>('default')
  const [allowClear, setAllowClear] = React.useState(true)
  const [allowEmpty, setAllowEmpty] = React.useState(true)
  const [order, setOrder] = React.useState(true)
  return (
    <PlaygroundCase title="受控范围" description="全部实验状态封装在当前实例。">
      <PlaygroundStatus>{JSON.stringify(value)}</PlaygroundStatus>
      <PlaygroundControl label="Form.Item status">
        <Segmented<Status>
          block
          value={status}
          options={['default', 'warning', 'error']}
          onChange={setStatus}
        />
      </PlaygroundControl>
      <Space wrap>
        <Switch
          checked={allowClear}
          onChange={setAllowClear}
          checkedChildren="清除"
        />
        <Switch
          checked={allowEmpty}
          onChange={setAllowEmpty}
          checkedChildren="空值"
        />
        <Switch checked={order} onChange={setOrder} checkedChildren="排序" />
      </Space>
      <Form layout="vertical">
        <Form.Item
          label="价格范围"
          validateStatus={status === 'default' ? undefined : status}
          hasFeedback={status !== 'default'}
        >
          <InputNumberRange
            value={value}
            onChange={setValue}
            min={0}
            max={1000}
            step={5}
            precision={0}
            allowClear={allowClear}
            allowEmpty={allowEmpty}
            order={order}
            prefix={<DollarOutlined />}
            suffix="RMB"
            style={{ width: '100%' }}
          />
        </Form.Item>
      </Form>
      <Space wrap>
        <Button size="small" onClick={() => setValue([10, 30])}>
          10 / 30
        </Button>
        <Button size="small" onClick={() => setValue([60, 20])}>
          60 / 20
        </Button>
        <Button size="small" onClick={() => setValue([null, null])}>
          置空
        </Button>
      </Space>
      <Text type="secondary">输入离开整体范围或按 Enter 后提交。</Text>
    </PlaygroundCase>
  )
}

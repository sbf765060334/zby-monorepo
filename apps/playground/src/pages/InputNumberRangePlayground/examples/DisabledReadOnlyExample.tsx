import { InputNumberRange } from '@zby/ui'
import { Space } from 'antd'
import { PlaygroundCase } from '../../../components/ComponentPlayground'

export default function DisabledReadOnlyExample() {
  return (
    <PlaygroundCase title="disabled / readOnly">
      <Space orientation="vertical" style={{ width: '100%' }}>
        <InputNumberRange
          defaultValue={[100, 200]}
          disabled
          allowClear
          suffix="pcs"
          style={{ width: '100%' }}
        />
        <InputNumberRange
          defaultValue={[100, 200]}
          readOnly
          allowClear
          suffix="只读"
          style={{ width: '100%' }}
        />
      </Space>
    </PlaygroundCase>
  )
}

import { InputNumberRange } from '@zby/ui'
import { Space } from 'antd'
import { PlaygroundCase } from '../../../components/ComponentPlayground'

export default function StatusExample() {
  return (
    <PlaygroundCase title="error / warning">
      <Space orientation="vertical" style={{ width: '100%' }}>
        <InputNumberRange
          status="error"
          defaultValue={[3, 7]}
          style={{ width: '100%' }}
        />
        <InputNumberRange
          status="warning"
          defaultValue={[3, 7]}
          style={{ width: '100%' }}
        />
      </Space>
    </PlaygroundCase>
  )
}

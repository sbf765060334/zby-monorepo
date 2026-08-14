import { InputNumberRange } from '@zby/ui'
import { Space } from 'antd'
import { PlaygroundCase } from '../../../components/ComponentPlayground'

export default function SizesExample() {
  return (
    <PlaygroundCase title="small / middle / large">
      <Space orientation="vertical" style={{ width: '100%' }}>
        <InputNumberRange
          size="small"
          defaultValue={[1, 9]}
          style={{ width: '100%' }}
        />
        <InputNumberRange defaultValue={[1, 9]} style={{ width: '100%' }} />
        <InputNumberRange
          size="large"
          defaultValue={[1, 9]}
          style={{ width: '100%' }}
        />
      </Space>
    </PlaygroundCase>
  )
}

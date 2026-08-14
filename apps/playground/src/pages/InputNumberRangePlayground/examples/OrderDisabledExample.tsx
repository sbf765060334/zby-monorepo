import { InputNumberRange } from '@zby/ui'
import { PlaygroundCase } from '../../../components/ComponentPlayground'

export default function OrderDisabledExample() {
  return (
    <PlaygroundCase title="order=false">
      <InputNumberRange
        defaultValue={[90, 10]}
        order={false}
        allowClear
        style={{ width: '100%' }}
      />
    </PlaygroundCase>
  )
}

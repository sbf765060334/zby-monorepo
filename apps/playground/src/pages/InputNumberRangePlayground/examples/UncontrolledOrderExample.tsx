import { InputNumberRange } from '@zby/ui'
import { PlaygroundCase } from '../../../components/ComponentPlayground'

export default function UncontrolledOrderExample() {
  return (
    <PlaygroundCase title="非受控 + 自动排序">
      <InputNumberRange
        defaultValue={[90, 10]}
        allowClear
        style={{ width: '100%' }}
      />
    </PlaygroundCase>
  )
}

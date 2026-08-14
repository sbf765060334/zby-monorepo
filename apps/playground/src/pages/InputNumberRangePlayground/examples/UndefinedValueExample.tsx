import { InputNumberRange } from '@zby/ui'
import { PlaygroundCase } from '../../../components/ComponentPlayground'

export default function UndefinedValueExample() {
  return (
    <PlaygroundCase title="value=undefined">
      <InputNumberRange
        value={undefined}
        defaultValue={[5, 15]}
        allowClear
        style={{ width: '100%' }}
      />
    </PlaygroundCase>
  )
}

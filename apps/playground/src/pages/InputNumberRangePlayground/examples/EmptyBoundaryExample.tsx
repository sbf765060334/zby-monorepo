import { InputNumberRange } from '@zby/ui'
import { PlaygroundCase } from '../../../components/ComponentPlayground'

export default function EmptyBoundaryExample() {
  return (
    <PlaygroundCase title="allowEmpty=[false, true]">
      <InputNumberRange
        defaultValue={[10, null]}
        allowEmpty={[false, true]}
        style={{ width: '100%' }}
      />
    </PlaygroundCase>
  )
}

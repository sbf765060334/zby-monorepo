import { InputNumberRange } from '@zby/ui'
import { PlaygroundCase } from '../../../components/ComponentPlayground'

export default function HighPrecisionExample() {
  return (
    <PlaygroundCase title="stringMode 高精度">
      <InputNumberRange
        stringMode
        defaultValue={['9007199254740993.01', '9007199254740999.99']}
        step="0.01"
        precision={2}
        style={{ width: '100%' }}
      />
    </PlaygroundCase>
  )
}

import { PercentageOutlined } from '@ant-design/icons'
import { InputNumberRange } from '@zby/ui'
import { PlaygroundCase } from '../../../components/ComponentPlayground'

export default function StepExample() {
  return (
    <PlaygroundCase title="step / precision / keyboard / wheel">
      <InputNumberRange
        defaultValue={[0.25, 0.75]}
        min={0}
        max={1}
        step={0.05}
        precision={2}
        keyboard
        changeOnWheel
        suffix={<PercentageOutlined />}
        style={{ width: '100%' }}
      />
    </PlaygroundCase>
  )
}

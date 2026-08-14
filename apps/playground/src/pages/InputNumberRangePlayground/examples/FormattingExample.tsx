import { InputNumberRange } from '@zby/ui'
import { PlaygroundCase } from '../../../components/ComponentPlayground'

export default function FormattingExample() {
  return (
    <PlaygroundCase title="金额格式化">
      <InputNumberRange
        defaultValue={[1000, 5000]}
        min={0}
        step={100}
        formatter={(value) =>
          value == null
            ? ''
            : `¥ ${String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
        }
        parser={(value) => Number(value?.replace(/¥\s?|,/g, '') ?? 0)}
        style={{ width: '100%' }}
      />
    </PlaygroundCase>
  )
}

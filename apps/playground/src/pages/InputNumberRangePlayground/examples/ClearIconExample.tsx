import { CloseSquareFilled } from '@ant-design/icons'
import { InputNumberRange } from '@zby/ui'
import { PlaygroundCase } from '../../../components/ComponentPlayground'

export default function ClearIconExample() {
  return (
    <PlaygroundCase title="自定义 clearIcon">
      <InputNumberRange
        defaultValue={[20, 40]}
        allowClear={{ clearIcon: <CloseSquareFilled /> }}
        style={{ width: '100%' }}
      />
    </PlaygroundCase>
  )
}

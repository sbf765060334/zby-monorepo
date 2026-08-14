import { InputNumberRange } from '@zby/ui'
import { Space } from 'antd'
import { PlaygroundCase } from '../../../components/ComponentPlayground'

export default function VariantsExample() {
  return (
    <PlaygroundCase title="全部 variant">
      <Space orientation="vertical" style={{ width: '100%' }}>
        {(['outlined', 'filled', 'borderless', 'underlined'] as const).map(
          (variant) => (
            <InputNumberRange
              key={variant}
              variant={variant}
              defaultValue={[2, 8]}
              prefix={variant}
              style={{ width: '100%' }}
            />
          ),
        )}
      </Space>
    </PlaygroundCase>
  )
}

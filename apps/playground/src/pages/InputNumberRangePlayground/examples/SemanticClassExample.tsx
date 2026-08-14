import { InputNumberRange } from '@zby/ui'
import { Typography, theme } from 'antd'
import { PlaygroundCase } from '../../../components/ComponentPlayground'

const { Text } = Typography
export default function SemanticClassExample() {
  const { token } = theme.useToken()
  return (
    <PlaygroundCase title="className / rootClassName / prefixCls">
      <InputNumberRange
        prefixCls="preview-input-number-range"
        className="input-number-range-class"
        rootClassName="input-number-range-root-class"
        defaultValue={[6, 12]}
        style={{ width: '100%', borderColor: token.colorPrimary }}
      />
      <Text code>preview-input-number-range</Text>
    </PlaygroundCase>
  )
}

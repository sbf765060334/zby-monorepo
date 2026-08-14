import { InputNumberRange } from '@zby/ui'
import { ConfigProvider, Typography } from 'antd'
import { PlaygroundCase } from '../../../components/ComponentPlayground'

const { Text } = Typography
export default function ConfigProviderExample() {
  return (
    <PlaygroundCase title="ConfigProvider 继承">
      <ConfigProvider componentSize="large" componentDisabled>
        <InputNumberRange defaultValue={[8, 18]} style={{ width: '100%' }} />
      </ConfigProvider>
      <Text type="secondary">继承 large 与 disabled。</Text>
    </PlaygroundCase>
  )
}

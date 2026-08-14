import { DollarOutlined } from '@ant-design/icons'
import { InputNumberRange } from '@zby/ui'
import { Typography } from 'antd'
import { PlaygroundCase } from '../../../components/ComponentPlayground'

const { Text } = Typography
export default function PrefixExample() {
  return (
    <PlaygroundCase title="整体与分侧装饰">
      <InputNumberRange
        id="price-range"
        placeholder={['最低价格', '最高价格']}
        prefix={<DollarOutlined />}
        separator="至"
        suffix="CNY"
        startProps={{ prefix: '起', suffix: '元' }}
        endProps={{ prefix: '止', suffix: '元' }}
        style={{ width: '100%' }}
      />
      <Text code>price-range-start / price-range-end</Text>
    </PlaygroundCase>
  )
}

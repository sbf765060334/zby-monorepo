import { ActionText } from '@zby/ui'
import { PlaygroundCase } from '../../../components/ComponentPlayground'
import { LONG_SHOP_NAME } from '../shared'

export default function SingleLineEllipsisExample() {
  return (
    <PlaygroundCase
      title="单行省略"
      description="需要显式传入 ellipsis。限制容器宽度后，悬停文本由原生 title 展示全文。"
    >
      <div style={{ width: '100%', maxWidth: 360, minWidth: 0 }}>
        <ActionText ellipsis>{LONG_SHOP_NAME}</ActionText>
      </div>
    </PlaygroundCase>
  )
}

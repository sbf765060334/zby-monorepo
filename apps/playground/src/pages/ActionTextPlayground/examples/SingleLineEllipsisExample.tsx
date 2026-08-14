import { ActionText } from '@zby/ui'
import { PlaygroundCase } from '../../../components/ComponentPlayground'
import { LONG_SHOP_NAME } from '../shared'

export default function SingleLineEllipsisExample() {
  return (
    <PlaygroundCase
      title="默认单行省略"
      description="限制容器宽度，悬停文本可查看完整内容。"
    >
      <div style={{ width: '100%', maxWidth: 360, minWidth: 0 }}>
        <ActionText>{LONG_SHOP_NAME}</ActionText>
      </div>
    </PlaygroundCase>
  )
}

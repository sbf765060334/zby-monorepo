import { ActionText } from '@zby/ui'
import { PlaygroundCase } from '../../../components/ComponentPlayground'
import { LONG_SHOP_NAME } from '../shared'

export default function MultilineEllipsisExample() {
  return (
    <PlaygroundCase title="两行省略 + 自定义 Tooltip">
      <div style={{ width: '100%', maxWidth: 360, minWidth: 0 }}>
        <ActionText
          ellipsis={{
            rows: 2,
            tooltip: {
              title: `完整名称：${LONG_SHOP_NAME}`,
              placement: 'topLeft',
            },
          }}
        >
          {LONG_SHOP_NAME}
        </ActionText>
      </div>
    </PlaygroundCase>
  )
}

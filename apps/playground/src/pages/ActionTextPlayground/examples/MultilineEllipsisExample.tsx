import { ActionText } from '@zby/ui'
import { PlaygroundCase } from '../../../components/ComponentPlayground'
import { LONG_SHOP_NAME } from '../shared'

export default function MultilineEllipsisExample() {
  return (
    <PlaygroundCase
      title="styles.text 两行省略"
      description="不写 ellipsis。截断样式放在 styles.text 上，组件不会再加单行 nowrap 和 title。"
    >
      <div style={{ width: '100%', maxWidth: 360, minWidth: 0 }}>
        <ActionText
          styles={{
            text: {
              display: '-webkit-box',
              overflow: 'hidden',
              whiteSpace: 'normal',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 2,
            },
          }}
        >
          {LONG_SHOP_NAME}
        </ActionText>
      </div>
    </PlaygroundCase>
  )
}

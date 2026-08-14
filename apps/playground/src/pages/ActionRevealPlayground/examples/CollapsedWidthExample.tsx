import { FilterOutlined } from '@ant-design/icons'
import { ActionReveal } from '@zby/ui'
import { PlaygroundCase } from '../../../components/ComponentPlayground'
import { renderInputContent } from '../shared'

export default function CollapsedWidthExample() {
  return (
    <PlaygroundCase
      title="collapsedWidth"
      description="显式指定 56px 动画起点，展开到 260px。"
    >
      <ActionReveal
        collapsedWidth={56}
        width={260}
        triggerIcon={<FilterOutlined />}
        actionIconProps={{ 'aria-label': '打开自定义折叠宽度' }}
        content={renderInputContent('自定义折叠宽度', <FilterOutlined />)}
      />
    </PlaygroundCase>
  )
}

import { ActionText } from '@zby/ui'
import { PlaygroundCase } from '../../../components/ComponentPlayground'

export default function BasicCopyExample() {
  return (
    <PlaygroundCase title="默认复制">
      <ActionText copyable actionsVisibleOn="always">
        默认复制文本
      </ActionText>
    </PlaygroundCase>
  )
}

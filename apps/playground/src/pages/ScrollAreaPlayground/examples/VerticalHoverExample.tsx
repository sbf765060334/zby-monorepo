import { ScrollArea } from '@zby/ui'
import { PlaygroundCase } from '../../../components/ComponentPlayground'
import { useScrollFrameStyle, VerticalContent } from '../shared'

export default function VerticalHoverExample() {
  const style = useScrollFrameStyle()
  return (
    <PlaygroundCase title="vertical / hover">
      <ScrollArea direction="vertical" scrollbar="hover" style={style}>
        <VerticalContent />
      </ScrollArea>
    </PlaygroundCase>
  )
}

import { ScrollArea } from '@zby/ui'
import { PlaygroundCase } from '../../../components/ComponentPlayground'
import { useScrollFrameStyle, VerticalContent } from '../shared'

export default function VerticalScrollingExample() {
  const style = useScrollFrameStyle()
  return (
    <PlaygroundCase title="vertical / scrolling">
      <ScrollArea direction="vertical" scrollbar="scrolling" style={style}>
        <VerticalContent />
      </ScrollArea>
    </PlaygroundCase>
  )
}

import { ScrollArea } from '@zby/ui'
import { PlaygroundCase } from '../../../components/ComponentPlayground'
import { useScrollFrameStyle, VerticalContent } from '../shared'

export default function ScrollbarOffExample() {
  const style = useScrollFrameStyle()
  return (
    <PlaygroundCase title="scrollbar=false">
      <ScrollArea direction="vertical" scrollbar={false} style={style}>
        <VerticalContent />
      </ScrollArea>
    </PlaygroundCase>
  )
}

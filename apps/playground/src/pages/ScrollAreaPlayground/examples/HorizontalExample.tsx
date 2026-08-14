import { ScrollArea } from '@zby/ui'
import { PlaygroundCase } from '../../../components/ComponentPlayground'
import { HorizontalContent, useScrollFrameStyle } from '../shared'

export default function HorizontalExample() {
  const style = useScrollFrameStyle()
  return (
    <PlaygroundCase title="horizontal / axis mapping">
      <ScrollArea
        direction="horizontal"
        scrollbar="scrolling"
        wheelBehavior="axis-mapping"
        style={style}
      >
        <HorizontalContent />
      </ScrollArea>
    </PlaygroundCase>
  )
}

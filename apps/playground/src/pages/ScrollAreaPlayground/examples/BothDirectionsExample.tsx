import { ScrollArea } from '@zby/ui'
import { PlaygroundCase } from '../../../components/ComponentPlayground'
import { BothContent, useScrollFrameStyle } from '../shared'

export default function BothDirectionsExample() {
  const style = useScrollFrameStyle()
  return (
    <PlaygroundCase title="both / always">
      <ScrollArea direction="both" scrollbar="always" style={style}>
        <BothContent />
      </ScrollArea>
    </PlaygroundCase>
  )
}

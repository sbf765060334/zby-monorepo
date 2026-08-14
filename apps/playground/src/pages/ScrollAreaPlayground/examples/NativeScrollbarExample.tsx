import { ScrollArea } from '@zby/ui'
import { PlaygroundCase } from '../../../components/ComponentPlayground'
import { BothContent, useScrollFrameStyle } from '../shared'

export default function NativeScrollbarExample() {
  const style = useScrollFrameStyle()
  return (
    <PlaygroundCase title='scrollbar="native"'>
      <ScrollArea direction="both" scrollbar="native" style={style}>
        <BothContent />
      </ScrollArea>
    </PlaygroundCase>
  )
}

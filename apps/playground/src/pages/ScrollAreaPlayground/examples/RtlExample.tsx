import { ScrollArea } from '@zby/ui'
import { ConfigProvider } from 'antd'
import { PlaygroundCase } from '../../../components/ComponentPlayground'
import { HorizontalContent, useScrollFrameStyle } from '../shared'

export default function RtlExample() {
  const style = useScrollFrameStyle()
  return (
    <PlaygroundCase title="RTL horizontal">
      <ConfigProvider direction="rtl">
        <ScrollArea
          direction="horizontal"
          scrollbar="always"
          wheelBehavior="axis-mapping"
          style={style}
        >
          <HorizontalContent />
        </ScrollArea>
      </ConfigProvider>
    </PlaygroundCase>
  )
}

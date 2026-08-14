import { ScrollArea } from '@zby/ui'
import { Typography } from 'antd'
import { PlaygroundCase } from '../../../components/ComponentPlayground'
import { HorizontalContent, useScrollFrameStyle } from '../shared'

const { Text } = Typography
export default function CustomPrefixExample() {
  const style = useScrollFrameStyle()
  return (
    <PlaygroundCase title="custom prefixCls">
      <ScrollArea
        prefixCls="zby-demo-scroll-area"
        direction="horizontal"
        scrollbar="always"
        style={style}
      >
        <HorizontalContent />
      </ScrollArea>
      <Text code>zby-demo-scroll-area</Text>
    </PlaygroundCase>
  )
}

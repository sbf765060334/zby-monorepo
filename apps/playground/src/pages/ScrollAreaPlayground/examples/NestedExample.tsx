import { ScrollArea } from '@zby/ui'
import { Typography } from 'antd'
import { PlaygroundCase } from '../../../components/ComponentPlayground'
import { useScrollFrameStyle, VerticalContent } from '../shared'

const { Text, Title } = Typography
export default function NestedExample() {
  const style = useScrollFrameStyle()
  return (
    <PlaygroundCase title="horizontal + nested vertical">
      <ScrollArea
        direction="horizontal"
        scrollbar="always"
        wheelBehavior="axis-mapping"
        style={style}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            width: 840,
            minHeight: '100%',
            padding: 16,
          }}
        >
          <Title level={4} style={{ width: 220, margin: 0 }}>
            外层横向区域
          </Title>
          <ScrollArea
            direction="vertical"
            scrollbar="always"
            style={{ ...style, width: 360, height: 170 }}
          >
            <VerticalContent />
          </ScrollArea>
          <Text style={{ width: 180 }}>尾部区域</Text>
        </div>
      </ScrollArea>
    </PlaygroundCase>
  )
}

import { ScrollArea } from '@zby/ui'
import { ColorPicker, ConfigProvider, InputNumber, Slider } from 'antd'
import * as React from 'react'
import {
  PlaygroundCase,
  PlaygroundControl,
} from '../../../components/ComponentPlayground'
import { useScrollFrameStyle, VerticalContent } from '../shared'

export default function ComponentTokenExample() {
  const style = useScrollFrameStyle()
  const [trackSize, setTrackSize] = React.useState(10)
  const [thumbBg, setThumbBg] = React.useState('#1677ff')
  const [thumbHoverBg, setThumbHoverBg] = React.useState('#52c41a')
  const [zIndex, setZIndex] = React.useState(24)
  return (
    <PlaygroundCase title="组件 Token 实时预览">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: 14,
        }}
      >
        <PlaygroundControl label={`trackSize: ${trackSize}px`}>
          <Slider min={4} max={16} value={trackSize} onChange={setTrackSize} />
        </PlaygroundControl>
        <PlaygroundControl label="thumbBg">
          <ColorPicker
            showText
            value={thumbBg}
            onChange={(_, css) => setThumbBg(css)}
          />
        </PlaygroundControl>
        <PlaygroundControl label="thumbHoverBg">
          <ColorPicker
            showText
            value={thumbHoverBg}
            onChange={(_, css) => setThumbHoverBg(css)}
          />
        </PlaygroundControl>
        <PlaygroundControl label="zIndex">
          <InputNumber
            min={0}
            max={999}
            value={zIndex}
            onChange={(value) => setZIndex(value ?? 0)}
          />
        </PlaygroundControl>
      </div>
      <ConfigProvider
        theme={{
          components: {
            ScrollArea: { trackSize, thumbBg, thumbHoverBg, zIndex },
          },
        }}
      >
        <ScrollArea
          direction="vertical"
          scrollbar="always"
          style={{ ...style, height: 220 }}
        >
          <VerticalContent />
        </ScrollArea>
      </ConfigProvider>
    </PlaygroundCase>
  )
}

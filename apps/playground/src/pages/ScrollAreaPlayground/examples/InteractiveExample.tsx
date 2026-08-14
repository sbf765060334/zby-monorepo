import { ScrollArea } from '@zby/ui'
import type {
  ScrollAreaDirection,
  ScrollAreaScrollbar,
  ScrollAreaWheelBehavior,
} from '@zby/ui'
import { Segmented, Typography } from 'antd'
import * as React from 'react'
import {
  PlaygroundCase,
  PlaygroundControl,
  PlaygroundStatus,
} from '../../../components/ComponentPlayground'
import { getContent, useScrollFrameStyle } from '../shared'

const { Text } = Typography
type ScrollbarMode = 'hover' | 'scrolling' | 'always' | 'native' | 'off'

export default function InteractiveExample() {
  const frameStyle = useScrollFrameStyle()
  const [direction, setDirection] =
    React.useState<ScrollAreaDirection>('vertical')
  const [scrollbarMode, setScrollbarMode] =
    React.useState<ScrollbarMode>('hover')
  const [wheelBehavior, setWheelBehavior] =
    React.useState<ScrollAreaWheelBehavior>('native')
  const [position, setPosition] = React.useState({ left: 0, top: 0 })
  const scrollbar: ScrollAreaScrollbar =
    scrollbarMode === 'off' ? false : scrollbarMode
  return (
    <PlaygroundCase
      title="实时预览"
      description="本实例内组合方向、滚动条策略和滚轮映射。"
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: 14,
        }}
      >
        <PlaygroundControl label="direction">
          <Segmented
            block
            value={direction}
            options={['vertical', 'horizontal', 'both']}
            onChange={(value) => setDirection(value as ScrollAreaDirection)}
          />
        </PlaygroundControl>
        <PlaygroundControl label="scrollbar">
          <Segmented
            block
            value={scrollbarMode}
            options={[
              { label: 'hover', value: 'hover' },
              { label: 'scroll', value: 'scrolling' },
              { label: 'always', value: 'always' },
              { label: 'native', value: 'native' },
              { label: 'off', value: 'off' },
            ]}
            onChange={(value) => setScrollbarMode(value as ScrollbarMode)}
          />
        </PlaygroundControl>
        <PlaygroundControl label="wheelBehavior">
          <Segmented
            block
            value={wheelBehavior}
            options={['axis-mapping', 'native']}
            onChange={(value) =>
              setWheelBehavior(value as ScrollAreaWheelBehavior)
            }
          />
        </PlaygroundControl>
      </div>
      <PlaygroundStatus label="滚动位置">
        left={Math.round(position.left)} / top={Math.round(position.top)}
      </PlaygroundStatus>
      <ScrollArea
        direction={direction}
        scrollbar={scrollbar}
        wheelBehavior={wheelBehavior}
        style={{ ...frameStyle, height: 260 }}
        viewportProps={{
          'aria-label': 'ScrollArea interactive viewport',
          onScroll: (event) =>
            setPosition({
              left: event.currentTarget.scrollLeft,
              top: event.currentTarget.scrollTop,
            }),
        }}
      >
        {getContent(direction)}
      </ScrollArea>
      <Text type="secondary">状态只更新此实例。</Text>
    </PlaygroundCase>
  )
}

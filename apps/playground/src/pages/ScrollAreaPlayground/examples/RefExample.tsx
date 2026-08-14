import { ScrollArea } from '@zby/ui'
import { Button, Space } from 'antd'
import * as React from 'react'
import {
  PlaygroundCase,
  PlaygroundStatus,
} from '../../../components/ComponentPlayground'
import { useScrollFrameStyle, VerticalContent } from '../shared'

export default function RefExample() {
  const style = useScrollFrameStyle()
  const rootRef = React.useRef<HTMLDivElement>(null)
  const viewportRef = React.useRef<HTMLDivElement>(null)
  const viewportPropsRef = React.useRef<HTMLDivElement>(null)
  const [status, setStatus] = React.useState('未检查')
  return (
    <PlaygroundCase title="viewportRef / viewportProps">
      <Space wrap>
        <Button onClick={() => viewportRef.current?.scrollTo({ top: 0 })}>
          顶部
        </Button>
        <Button
          onClick={() =>
            viewportRef.current?.scrollTo({
              top: viewportRef.current.scrollHeight,
              behavior: 'smooth',
            })
          }
        >
          底部
        </Button>
        <Button
          onClick={() =>
            setStatus(
              rootRef.current &&
                viewportRef.current === viewportPropsRef.current
                ? 'root 与 viewport ref 均已就绪'
                : 'Ref 尚未就绪',
            )
          }
        >
          检查 Ref
        </Button>
      </Space>
      <ScrollArea
        ref={rootRef}
        direction="vertical"
        scrollbar="always"
        viewportRef={viewportRef}
        viewportProps={{
          ref: viewportPropsRef,
          tabIndex: 0,
          'aria-label': 'Imperative scroll viewport',
        }}
        style={style}
      >
        <VerticalContent />
      </ScrollArea>
      <PlaygroundStatus>{status}</PlaygroundStatus>
    </PlaygroundCase>
  )
}

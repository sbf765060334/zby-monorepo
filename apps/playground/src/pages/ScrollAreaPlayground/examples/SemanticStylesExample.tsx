import { ScrollArea } from '@zby/ui'
import { theme } from 'antd'
import { PlaygroundCase } from '../../../components/ComponentPlayground'
import { useScrollFrameStyle, VerticalContent } from '../shared'

export default function SemanticStylesExample() {
  const { token } = theme.useToken()
  const style = useScrollFrameStyle()
  return (
    <PlaygroundCase title="classNames / styles">
      <ScrollArea
        direction="vertical"
        scrollbar="always"
        classNames={{
          root: 'scroll-area-semantic-root',
          viewport: 'scroll-area-semantic-viewport',
          content: 'scroll-area-semantic-content',
          verticalTrack: 'scroll-area-semantic-track',
          verticalThumb: 'scroll-area-semantic-thumb',
        }}
        styles={{
          root: { ...style, borderColor: token.colorPrimary },
          viewport: { background: token.colorFillQuaternary },
          content: { minHeight: '100%' },
          verticalTrack: { insetInlineEnd: 6, width: 8 },
          verticalThumb: { background: token.colorSuccess },
        }}
      >
        <VerticalContent />
      </ScrollArea>
    </PlaygroundCase>
  )
}

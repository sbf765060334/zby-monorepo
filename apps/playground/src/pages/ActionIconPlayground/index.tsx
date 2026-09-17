import {
  PlaygroundGrid,
  PlaygroundPage,
  PlaygroundSection,
} from '../../components/ComponentPlayground'
import AttributePlaygroundExample from './examples/AttributePlaygroundExample'
import ColorExample from './examples/ColorExample'
import ConfigProviderExample from './examples/ConfigProviderExample'
import ContentExample from './examples/ContentExample'
import DarkRtlExample from './examples/DarkRtlExample'
import SemanticStylesExample from './examples/SemanticStylesExample'
import SizesExample from './examples/SizesExample'
import StatesExample from './examples/StatesExample'
import TableActionsExample from './examples/TableActionsExample'
import VariantsExample from './examples/VariantsExample'

export default function ActionIconPlayground() {
  return (
    <PlaygroundPage
      title="ActionIcon"
      description="纯图标操作的尺寸、状态、颜色、变体、语义节点和业务场景。"
    >
      <PlaygroundSection title="属性与基础">
        <PlaygroundGrid>
          <AttributePlaygroundExample />
          <SizesExample />
          <StatesExample />
          <ContentExample />
          <ColorExample />
          <VariantsExample />
        </PlaygroundGrid>
      </PlaygroundSection>
      <PlaygroundSection title="语义样式、上下文与场景">
        <PlaygroundGrid>
          <SemanticStylesExample />
          <ConfigProviderExample />
          <DarkRtlExample />
          <TableActionsExample />
        </PlaygroundGrid>
      </PlaygroundSection>
    </PlaygroundPage>
  )
}

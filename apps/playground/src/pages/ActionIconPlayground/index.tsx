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
      description="纯图标操作的尺寸、状态、颜色、变体、语义节点和业务场景完整预览。"
    >
      <PlaygroundSection title="属性实验台">
        <AttributePlaygroundExample />
      </PlaygroundSection>
      <PlaygroundSection title="尺寸与状态">
        <PlaygroundGrid>
          <SizesExample />
          <StatesExample />
          <ContentExample />
        </PlaygroundGrid>
      </PlaygroundSection>
      <PlaygroundSection title="颜色与变体">
        <PlaygroundGrid>
          <ColorExample />
          <VariantsExample />
        </PlaygroundGrid>
      </PlaygroundSection>
      <PlaygroundSection title="语义样式与上下文">
        <PlaygroundGrid>
          <SemanticStylesExample />
          <ConfigProviderExample />
          <DarkRtlExample />
        </PlaygroundGrid>
      </PlaygroundSection>
      <PlaygroundSection title="表格操作列">
        <TableActionsExample />
      </PlaygroundSection>
    </PlaygroundPage>
  )
}

import {
  PlaygroundGrid,
  PlaygroundPage,
  PlaygroundSection,
} from '../../components/ComponentPlayground'
import CollapsedWidthExample from './examples/CollapsedWidthExample'
import CompoundSearchExample from './examples/CompoundSearchExample'
import ControlledOpenExample from './examples/ControlledOpenExample'
import DarkRtlExample from './examples/DarkRtlExample'
import DefaultOpenExample from './examples/DefaultOpenExample'
import ExplicitWidthExample from './examples/ExplicitWidthExample'
import NaturalWidthExample from './examples/NaturalWidthExample'
import SemanticStylesExample from './examples/SemanticStylesExample'
import SizesExample from './examples/SizesExample'
import StyledWidthExample from './examples/StyledWidthExample'
import TriggerStatesExample from './examples/TriggerStatesExample'

export default function ActionRevealPlayground() {
  return (
    <PlaygroundPage
      title="ActionReveal"
      description="行内展开、宽度动画、自然宽度、焦点管理、受控状态和语义样式的完整预览。"
    >
      <PlaygroundSection title="基础展开与宽度">
        <PlaygroundGrid>
          <ExplicitWidthExample />
          <NaturalWidthExample />
          <StyledWidthExample />
        </PlaygroundGrid>
      </PlaygroundSection>
      <PlaygroundSection title="尺寸、初始状态与触发器">
        <PlaygroundGrid>
          <SizesExample />
          <DefaultOpenExample />
          <TriggerStatesExample />
        </PlaygroundGrid>
      </PlaygroundSection>
      <PlaygroundSection title="焦点与受控状态">
        <PlaygroundGrid>
          <CompoundSearchExample />
          <ControlledOpenExample />
          <CollapsedWidthExample />
        </PlaygroundGrid>
      </PlaygroundSection>
      <PlaygroundSection title="语义节点、主题与前缀">
        <PlaygroundGrid>
          <SemanticStylesExample />
          <DarkRtlExample />
        </PlaygroundGrid>
      </PlaygroundSection>
    </PlaygroundPage>
  )
}

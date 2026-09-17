import {
  PlaygroundGrid,
  PlaygroundPage,
  PlaygroundSection,
} from '../../components/ComponentPlayground'
import BothDirectionsExample from './examples/BothDirectionsExample'
import ComponentTokenExample from './examples/ComponentTokenExample'
import CustomPrefixExample from './examples/CustomPrefixExample'
import HorizontalExample from './examples/HorizontalExample'
import InteractiveExample from './examples/InteractiveExample'
import NativeScrollbarExample from './examples/NativeScrollbarExample'
import NestedExample from './examples/NestedExample'
import RefExample from './examples/RefExample'
import RtlExample from './examples/RtlExample'
import ScrollbarOffExample from './examples/ScrollbarOffExample'
import SemanticStylesExample from './examples/SemanticStylesExample'
import VerticalHoverExample from './examples/VerticalHoverExample'
import VerticalScrollingExample from './examples/VerticalScrollingExample'

export default function ScrollAreaPlayground() {
  return (
    <PlaygroundPage
      title="ScrollArea"
      description="滚动方向、滚动条策略、滚轮映射、语义节点、组件 Token 和嵌套场景。"
    >
      <PlaygroundSection title="交互与方向">
        <PlaygroundGrid>
          <InteractiveExample />
          <VerticalHoverExample />
          <VerticalScrollingExample />
          <HorizontalExample />
          <BothDirectionsExample />
          <ScrollbarOffExample />
          <NativeScrollbarExample />
          <NestedExample />
          <RtlExample />
        </PlaygroundGrid>
      </PlaygroundSection>
      <PlaygroundSection title="Ref、语义样式与 Token">
        <PlaygroundGrid>
          <RefExample />
          <SemanticStylesExample />
          <CustomPrefixExample />
          <ComponentTokenExample />
        </PlaygroundGrid>
      </PlaygroundSection>
    </PlaygroundPage>
  )
}

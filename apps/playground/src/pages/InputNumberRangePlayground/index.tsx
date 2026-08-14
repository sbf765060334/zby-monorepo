import {
  PlaygroundGrid,
  PlaygroundPage,
  PlaygroundSection,
} from '../../components/ComponentPlayground'
import AutoFocusExample from './examples/AutoFocusExample'
import ClearIconExample from './examples/ClearIconExample'
import ConfigProviderExample from './examples/ConfigProviderExample'
import ControlledRangeExample from './examples/ControlledRangeExample'
import DisabledReadOnlyExample from './examples/DisabledReadOnlyExample'
import EmptyBoundaryExample from './examples/EmptyBoundaryExample'
import EventPropsExample from './examples/EventPropsExample'
import FormattingExample from './examples/FormattingExample'
import HighPrecisionExample from './examples/HighPrecisionExample'
import OrderDisabledExample from './examples/OrderDisabledExample'
import PrefixExample from './examples/PrefixExample'
import SemanticClassExample from './examples/SemanticClassExample'
import SizesExample from './examples/SizesExample'
import StatusExample from './examples/StatusExample'
import StepExample from './examples/StepExample'
import UncontrolledOrderExample from './examples/UncontrolledOrderExample'
import UndefinedValueExample from './examples/UndefinedValueExample'
import VariantsExample from './examples/VariantsExample'

export default function InputNumberRangePlayground() {
  return (
    <PlaygroundPage
      title="InputNumberRange"
      description="数字范围的草稿提交、排序、空边界、高精度、分侧属性和外观状态完整预览。"
    >
      <PlaygroundSection title="交互实验台">
        <ControlledRangeExample />
      </PlaygroundSection>
      <PlaygroundSection title="值模式与提交规则">
        <PlaygroundGrid>
          <UncontrolledOrderExample />
          <OrderDisabledExample />
          <EmptyBoundaryExample />
          <UndefinedValueExample />
          <ClearIconExample />
        </PlaygroundGrid>
      </PlaygroundSection>
      <PlaygroundSection title="尺寸、变体与状态">
        <PlaygroundGrid>
          <SizesExample />
          <VariantsExample />
          <DisabledReadOnlyExample />
          <StatusExample />
          <ConfigProviderExample />
        </PlaygroundGrid>
      </PlaygroundSection>
      <PlaygroundSection title="数值能力">
        <PlaygroundGrid>
          <FormattingExample />
          <HighPrecisionExample />
          <StepExample />
        </PlaygroundGrid>
      </PlaygroundSection>
      <PlaygroundSection title="分侧属性、事件与前缀">
        <PlaygroundGrid>
          <PrefixExample />
          <EventPropsExample />
          <AutoFocusExample />
          <SemanticClassExample />
        </PlaygroundGrid>
      </PlaygroundSection>
    </PlaygroundPage>
  )
}

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
import FormSubmitExample from './examples/FormSubmitExample'
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
      description="数字范围的草稿提交、Form 对接、排序、空边界、高精度、分侧属性和外观状态。"
    >
      <PlaygroundSection title="受控与表单">
        <PlaygroundGrid>
          <ControlledRangeExample />
          <FormSubmitExample />
          <UncontrolledOrderExample />
        </PlaygroundGrid>
      </PlaygroundSection>
      <PlaygroundSection title="值模式与提交规则">
        <PlaygroundGrid>
          <OrderDisabledExample />
          <EmptyBoundaryExample />
          <UndefinedValueExample />
          <ClearIconExample />
          <AutoFocusExample />
          <EventPropsExample />
        </PlaygroundGrid>
      </PlaygroundSection>
      <PlaygroundSection title="尺寸、变体与状态">
        <PlaygroundGrid>
          <SizesExample />
          <VariantsExample />
          <DisabledReadOnlyExample />
          <StatusExample />
          <ConfigProviderExample />
          <PrefixExample />
        </PlaygroundGrid>
      </PlaygroundSection>
      <PlaygroundSection title="数值能力与样式">
        <PlaygroundGrid>
          <FormattingExample />
          <HighPrecisionExample />
          <StepExample />
          <SemanticClassExample />
        </PlaygroundGrid>
      </PlaygroundSection>
    </PlaygroundPage>
  )
}

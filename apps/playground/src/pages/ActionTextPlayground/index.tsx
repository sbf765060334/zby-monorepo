import {
  PlaygroundGrid,
  PlaygroundPage,
  PlaygroundSection,
} from '../../components/ComponentPlayground'
import AlwaysActionsExample from './examples/AlwaysActionsExample'
import AsyncCopyExample from './examples/AsyncCopyExample'
import BasicCopyExample from './examples/BasicCopyExample'
import ButtonClickExample from './examples/ButtonClickExample'
import ControlledVisitedExample from './examples/ControlledVisitedExample'
import CustomPopoverExample from './examples/CustomPopoverExample'
import DisabledEllipsisExample from './examples/DisabledEllipsisExample'
import HtmlCopyExample from './examples/HtmlCopyExample'
import LinkStatesExample from './examples/LinkStatesExample'
import MultilineEllipsisExample from './examples/MultilineEllipsisExample'
import SemanticStylesExample from './examples/SemanticStylesExample'
import SelfHoverActionsExample from './examples/SelfHoverActionsExample'
import SingleLineEllipsisExample from './examples/SingleLineEllipsisExample'
import TextStyleExample from './examples/TextStyleExample'
import ThemeRtlExample from './examples/ThemeRtlExample'

export default function ActionTextPlayground() {
  return (
    <PlaygroundPage
      title="ActionText"
      description="单行省略、复制、点击访问、自定义操作与主题兼容。"
    >
      <PlaygroundSection title="基础文本与省略">
        <PlaygroundGrid>
          <SingleLineEllipsisExample />
          <MultilineEllipsisExample />
          <DisabledEllipsisExample />
          <TextStyleExample />
        </PlaygroundGrid>
      </PlaygroundSection>
      <PlaygroundSection title="复制能力">
        <PlaygroundGrid>
          <BasicCopyExample />
          <AsyncCopyExample />
          <HtmlCopyExample />
        </PlaygroundGrid>
      </PlaygroundSection>
      <PlaygroundSection title="点击访问状态">
        <PlaygroundGrid>
          <ButtonClickExample />
          <LinkStatesExample />
          <ControlledVisitedExample />
        </PlaygroundGrid>
      </PlaygroundSection>
      <PlaygroundSection title="操作区、语义样式与主题">
        <PlaygroundGrid>
          <SelfHoverActionsExample />
          <AlwaysActionsExample />
          <CustomPopoverExample />
          <SemanticStylesExample />
          <ThemeRtlExample />
        </PlaygroundGrid>
      </PlaygroundSection>
    </PlaygroundPage>
  )
}

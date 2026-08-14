import {
  PlaygroundGrid,
  PlaygroundPage,
  PlaygroundSection,
} from '../../components/ComponentPlayground'
import AdvancedEditExample from './examples/AdvancedEditExample'
import AlwaysActionsExample from './examples/AlwaysActionsExample'
import AsyncCopyExample from './examples/AsyncCopyExample'
import BasicCopyExample from './examples/BasicCopyExample'
import BasicEditExample from './examples/BasicEditExample'
import ButtonClickExample from './examples/ButtonClickExample'
import ControlledEditExample from './examples/ControlledEditExample'
import ControlledVisitedExample from './examples/ControlledVisitedExample'
import DisabledEllipsisExample from './examples/DisabledEllipsisExample'
import HtmlCopyExample from './examples/HtmlCopyExample'
import LinkStatesExample from './examples/LinkStatesExample'
import MultilineEllipsisExample from './examples/MultilineEllipsisExample'
import SemanticStylesExample from './examples/SemanticStylesExample'
import SelfHoverActionsExample from './examples/SelfHoverActionsExample'
import SingleLineEllipsisExample from './examples/SingleLineEllipsisExample'
import ThemeRtlExample from './examples/ThemeRtlExample'

export default function ActionTextPlayground() {
  return (
    <PlaygroundPage
      title="ActionText"
      description="文本省略、复制、编辑、点击访问、自定义操作与主题兼容完整预览。"
    >
      <PlaygroundSection title="基础文本与省略">
        <PlaygroundGrid>
          <SingleLineEllipsisExample />
          <MultilineEllipsisExample />
          <DisabledEllipsisExample />
        </PlaygroundGrid>
      </PlaygroundSection>
      <PlaygroundSection title="复制能力">
        <PlaygroundGrid>
          <BasicCopyExample />
          <AsyncCopyExample />
          <HtmlCopyExample />
        </PlaygroundGrid>
      </PlaygroundSection>
      <PlaygroundSection title="编辑能力">
        <PlaygroundGrid>
          <BasicEditExample />
          <AdvancedEditExample />
          <ControlledEditExample />
        </PlaygroundGrid>
      </PlaygroundSection>
      <PlaygroundSection title="点击访问状态">
        <PlaygroundGrid>
          <ButtonClickExample />
          <LinkStatesExample />
          <ControlledVisitedExample />
        </PlaygroundGrid>
      </PlaygroundSection>
      <PlaygroundSection title="操作区与语义样式">
        <PlaygroundGrid>
          <SelfHoverActionsExample />
          <AlwaysActionsExample />
          <SemanticStylesExample />
        </PlaygroundGrid>
      </PlaygroundSection>
      <PlaygroundSection title="主题、RTL 与前缀兼容">
        <ThemeRtlExample />
      </PlaygroundSection>
    </PlaygroundPage>
  )
}

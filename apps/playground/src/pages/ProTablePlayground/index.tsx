import {
  PlaygroundGrid,
  PlaygroundPage,
  PlaygroundSection,
} from '../../components/ComponentPlayground'
import ComprehensiveExample from './examples/ComprehensiveExample'

export default function ProTablePlayground() {
  return (
    <PlaygroundPage
      packageName="@zby/pro"
      title="ProTable"
      description="查询、分页、视图、列设置、列宽拖拽、全屏、行选择、行高亮、工具栏与操作列。"
    >
      <PlaygroundSection title="综合实例">
        <PlaygroundGrid columns={1}>
          <ComprehensiveExample />
        </PlaygroundGrid>
      </PlaygroundSection>
    </PlaygroundPage>
  )
}

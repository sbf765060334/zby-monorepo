import {
  PlaygroundGrid,
  PlaygroundPage,
  PlaygroundSection,
} from '../../components/ComponentPlayground'
import ComprehensiveExample from './examples/ComprehensiveExample'
import LedgerExample from './examples/LedgerExample'

export default function ProTablePlayground() {
  return (
    <PlaygroundPage
      packageName="@zby/pro"
      title="ProTable"
      description="查询、分页、视图、列设置、列宽拖拽、全屏、行选择、行高亮、工具栏与操作列。"
    >
      <PlaygroundSection
        title="请求参数对照"
        description="筛选、分页、排序各只有一个主人。这个例子把 query、页码、排序和拼好的请求参数摊开，按步骤点就能看见各管各的。"
      >
        <PlaygroundGrid columns={1}>
          <LedgerExample />
        </PlaygroundGrid>
      </PlaygroundSection>
      <PlaygroundSection title="综合实例">
        <PlaygroundGrid columns={1}>
          <ComprehensiveExample />
        </PlaygroundGrid>
      </PlaygroundSection>
    </PlaygroundPage>
  )
}

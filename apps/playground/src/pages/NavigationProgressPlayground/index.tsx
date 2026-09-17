import {
  PlaygroundGrid,
  PlaygroundPage,
  PlaygroundSection,
} from '../../components/ComponentPlayground'
import ManualProgressExample from './examples/ManualProgressExample'

export default function NavigationProgressPlayground() {
  return (
    <PlaygroundPage
      packageName="@zby/pro"
      title="Navigation Progress"
      description="顶部导航进度条的手动触发示例。"
    >
      <PlaygroundSection title="触发方式">
        <PlaygroundGrid>
          <ManualProgressExample />
        </PlaygroundGrid>
      </PlaygroundSection>
    </PlaygroundPage>
  )
}
